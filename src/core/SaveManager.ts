import { SAVE_SLOTS, STORAGE_PREFIX } from '../config/constants';
import { KeyValueStore, safeParse } from '../utils/storage';

/**
 * SaveManager owns every byte the game persists:
 *  - global Settings (audio, controls, accessibility)
 *  - three independent save slots (progress, records, stats, achievements)
 *
 * Data is versioned; `migrateSlot` upgrades older saves so players never lose
 * progress after an update. All writes go through a debounced `flush()`.
 */

export const SAVE_VERSION = 2;

export type TouchMode = 'auto' | 'on' | 'off';
export type ParticleQuality = 'high' | 'low';

export interface Settings {
  masterVolume: number; // 0..1
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
  muted: boolean;
  touchControls: TouchMode;
  /** Scale multiplier for touch buttons (accessibility). */
  touchScale: number;
  screenShake: boolean;
  particles: ParticleQuality;
  dynamicSky: boolean;
  showFps: boolean;
  haptics: boolean;
  playerName: string;
}

export const DEFAULT_SETTINGS: Settings = {
  masterVolume: 0.8,
  musicVolume: 0.6,
  sfxVolume: 0.8,
  muted: false,
  touchControls: 'auto',
  touchScale: 1,
  screenShake: true,
  particles: 'high',
  dynamicSky: true,
  showFps: false,
  haptics: true,
  playerName: '',
};

export interface LevelRecord {
  completed: boolean;
  bestTimeMs: number | null;
  bestScore: number;
  bestCoins: number;
  stars: number; // 0..3
}

export interface SlotStats {
  playTimeMs: number;
  jumps: number;
  wallJumps: number;
  coins: number;
  enemiesDefeated: number;
  bossesDefeated: number;
  deaths: number;
  powerups: number;
  levelsCompleted: number;
}

export interface CheckpointSave {
  levelId: string;
  index: number;
}

export interface SlotData {
  version: number;
  createdAt: number;
  updatedAt: number;
  /** Index (0-based) of the highest level the player may enter. */
  unlocked: number;
  levels: Record<string, LevelRecord>;
  stats: SlotStats;
  /** Achievement id -> unlock timestamp. */
  achievements: Record<string, number>;
  /** Resume point inside an unfinished level (set at checkpoints). */
  checkpoint: CheckpointSave | null;
}

export interface LevelResult {
  timeMs: number;
  score: number;
  coins: number;
  stars: number;
}

export interface LevelResultOutcome {
  newBestTime: boolean;
  newBestScore: boolean;
  unlockedNext: boolean;
}

export const emptyStats = (): SlotStats => ({
  playTimeMs: 0,
  jumps: 0,
  wallJumps: 0,
  coins: 0,
  enemiesDefeated: 0,
  bossesDefeated: 0,
  deaths: 0,
  powerups: 0,
  levelsCompleted: 0,
});

export const emptyRecord = (): LevelRecord => ({
  completed: false,
  bestTimeMs: null,
  bestScore: 0,
  bestCoins: 0,
  stars: 0,
});

export function createSlotData(now = Date.now()): SlotData {
  return {
    version: SAVE_VERSION,
    createdAt: now,
    updatedAt: now,
    unlocked: 0,
    levels: {},
    stats: emptyStats(),
    achievements: {},
    checkpoint: null,
  };
}

/**
 * Upgrade any older/partial save to the current schema.
 * Returns null if the payload is not a recognisable save.
 */
export function migrateSlot(raw: unknown): SlotData | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<SlotData> & { version?: number; unlockedLevel?: number };
  if (typeof data.createdAt !== 'number') return null;

  const base = createSlotData(data.createdAt);
  // v1 used `unlockedLevel`; v2 renamed it to `unlocked` and added checkpoint.
  const unlocked = typeof data.unlocked === 'number' ? data.unlocked : (data.unlockedLevel ?? 0);
  const levels: Record<string, LevelRecord> = {};
  for (const [id, rec] of Object.entries(data.levels ?? {})) {
    levels[id] = { ...emptyRecord(), ...(rec as Partial<LevelRecord>) };
  }
  return {
    ...base,
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : base.createdAt,
    unlocked: Math.max(0, Math.floor(unlocked)),
    levels,
    stats: { ...emptyStats(), ...(data.stats ?? {}) },
    achievements: { ...(data.achievements ?? {}) },
    checkpoint: data.checkpoint ?? null,
    version: SAVE_VERSION,
  };
}

/** Stars earned for a run: completion, coin mastery (>= 90%), and beating par. */
export function computeStars(coins: number, totalCoins: number, timeMs: number, parTimeSec: number): number {
  let stars = 1;
  if (totalCoins === 0 || coins / totalCoins >= 0.9) stars++;
  if (timeMs <= parTimeSec * 1000) stars++;
  return stars;
}

export class SaveManager {
  private settingsData: Settings;
  private slots: (SlotData | null)[] = [];
  private active: number | null = null;
  private dirty = new Set<string>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private store: KeyValueStore,
    private levelIds: readonly string[],
  ) {
    this.settingsData = { ...DEFAULT_SETTINGS, ...safeParse<Partial<Settings>>(store.get(this.key('settings')), {}) };
    for (let i = 0; i < SAVE_SLOTS; i++) {
      this.slots.push(migrateSlot(safeParse<unknown>(store.get(this.key(`slot${i}`)), null)));
    }
    const last = Number(store.get(this.key('lastSlot')));
    if (Number.isInteger(last) && last >= 0 && last < SAVE_SLOTS && this.slots[last]) this.active = last;
  }

  private key(name: string): string {
    return `${STORAGE_PREFIX}:${name}`;
  }

  // ---------------------------------------------------------------- settings
  get settings(): Readonly<Settings> {
    return this.settingsData;
  }

  updateSettings(patch: Partial<Settings>): void {
    this.settingsData = { ...this.settingsData, ...patch };
    this.markDirty('settings');
  }

  resetSettings(): void {
    this.settingsData = { ...DEFAULT_SETTINGS, playerName: this.settingsData.playerName };
    this.markDirty('settings');
  }

  // ------------------------------------------------------------------- slots
  get activeSlotIndex(): number | null {
    return this.active;
  }

  getSlot(index: number): SlotData | null {
    return this.slots[index] ?? null;
  }

  /** Select a slot as the current profile, creating it if empty. */
  useSlot(index: number): SlotData {
    if (index < 0 || index >= SAVE_SLOTS) throw new RangeError(`Invalid save slot ${index}`);
    if (!this.slots[index]) {
      this.slots[index] = createSlotData();
      this.markDirty(`slot${index}`);
    }
    this.active = index;
    this.store.set(this.key('lastSlot'), String(index));
    return this.slots[index] as SlotData;
  }

  deleteSlot(index: number): void {
    this.slots[index] = null;
    this.store.remove(this.key(`slot${index}`));
    if (this.active === index) {
      this.active = null;
      this.store.remove(this.key('lastSlot'));
    }
  }

  /** The active profile. Falls back to slot 0 so gameplay never runs without a save. */
  get slot(): SlotData {
    if (this.active === null) return this.useSlot(0);
    return this.slots[this.active] as SlotData;
  }

  /** The active profile without creating one (for read-only menus). */
  get slotOrNull(): SlotData | null {
    return this.active === null ? null : this.slots[this.active];
  }

  isLevelUnlocked(index: number): boolean {
    return index <= this.slot.unlocked;
  }

  getRecord(levelId: string): LevelRecord {
    return this.slot.levels[levelId] ?? emptyRecord();
  }

  totalStars(slot: SlotData | null = this.slotOrNull): number {
    if (!slot) return 0;
    return Object.values(slot.levels).reduce((sum, r) => sum + r.stars, 0);
  }

  recordLevelResult(levelId: string, result: LevelResult): LevelResultOutcome {
    const slot = this.slot;
    const prev = slot.levels[levelId] ?? emptyRecord();
    const newBestTime = prev.bestTimeMs === null || result.timeMs < prev.bestTimeMs;
    const newBestScore = result.score > prev.bestScore;
    slot.levels[levelId] = {
      completed: true,
      bestTimeMs: newBestTime ? result.timeMs : prev.bestTimeMs,
      bestScore: Math.max(prev.bestScore, result.score),
      bestCoins: Math.max(prev.bestCoins, result.coins),
      stars: Math.max(prev.stars, result.stars),
    };
    if (!prev.completed) slot.stats.levelsCompleted++;

    const idx = this.levelIds.indexOf(levelId);
    let unlockedNext = false;
    if (idx >= 0 && idx + 1 < this.levelIds.length && slot.unlocked < idx + 1) {
      slot.unlocked = idx + 1;
      unlockedNext = true;
    }
    if (slot.checkpoint?.levelId === levelId) slot.checkpoint = null;
    this.touchSlot();
    this.flush();
    return { newBestTime, newBestScore, unlockedNext };
  }

  setCheckpoint(checkpoint: CheckpointSave | null): void {
    this.slot.checkpoint = checkpoint;
    this.touchSlot();
  }

  addStats(patch: Partial<SlotStats>): void {
    const stats = this.slot.stats;
    for (const [k, v] of Object.entries(patch) as [keyof SlotStats, number][]) {
      stats[k] += v;
    }
    this.touchSlot();
  }

  hasAchievement(id: string): boolean {
    return !!this.slotOrNull?.achievements[id];
  }

  /** Returns true only the first time an achievement is unlocked. */
  unlockAchievement(id: string): boolean {
    const slot = this.slot;
    if (slot.achievements[id]) return false;
    slot.achievements[id] = Date.now();
    this.touchSlot();
    return true;
  }

  // ---------------------------------------------------- export / import
  /** Portable save string (base64 JSON) for backups or moving devices. */
  exportSlot(index: number): string | null {
    const slot = this.slots[index];
    if (!slot) return null;
    return btoa(unescape(encodeURIComponent(JSON.stringify(slot))));
  }

  importSlot(index: number, encoded: string): boolean {
    try {
      const json = decodeURIComponent(escape(atob(encoded.trim())));
      const migrated = migrateSlot(JSON.parse(json));
      if (!migrated) return false;
      this.slots[index] = migrated;
      this.markDirty(`slot${index}`);
      this.flush();
      return true;
    } catch {
      return false;
    }
  }

  /** Erase every slot and reset settings. */
  wipeAll(): void {
    for (let i = 0; i < SAVE_SLOTS; i++) this.deleteSlot(i);
    this.settingsData = { ...DEFAULT_SETTINGS };
    this.markDirty('settings');
    this.flush();
  }

  // ---------------------------------------------------------- persistence
  private touchSlot(): void {
    if (this.active === null) return;
    const slot = this.slots[this.active];
    if (slot) slot.updatedAt = Date.now();
    this.markDirty(`slot${this.active}`);
  }

  private markDirty(name: string): void {
    this.dirty.add(name);
    if (this.flushTimer === null) {
      this.flushTimer = setTimeout(() => this.flush(), 1500);
    }
  }

  /** Write all pending changes immediately. Safe to call often. */
  flush(): void {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    for (const name of this.dirty) {
      if (name === 'settings') {
        this.store.set(this.key('settings'), JSON.stringify(this.settingsData));
      } else if (name.startsWith('slot')) {
        const i = Number(name.slice(4));
        const slot = this.slots[i];
        if (slot) this.store.set(this.key(name), JSON.stringify(slot));
      }
    }
    this.dirty.clear();
  }
}
