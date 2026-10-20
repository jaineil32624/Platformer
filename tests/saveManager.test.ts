import { describe, expect, it } from 'vitest';
import { SaveManager, computeStars, migrateSlot, createSlotData, DEFAULT_SETTINGS } from '../src/core/SaveManager';
import { MemoryStore } from '../src/utils/storage';

const IDS = ['a', 'b', 'c'];

describe('SaveManager', () => {
  it('creates a slot on first use and persists it on flush', () => {
    const store = new MemoryStore();
    const save = new SaveManager(store, IDS);
    expect(save.getSlot(0)).toBeNull();
    save.useSlot(0);
    save.flush();
    const reloaded = new SaveManager(store, IDS);
    expect(reloaded.getSlot(0)).not.toBeNull();
    expect(reloaded.activeSlotIndex).toBe(0);
  });

  it('records results, keeps bests and unlocks the next level', () => {
    const save = new SaveManager(new MemoryStore(), IDS);
    save.useSlot(1);
    const first = save.recordLevelResult('a', { timeMs: 50000, score: 900, coins: 10, stars: 2 });
    expect(first).toEqual({ newBestTime: true, newBestScore: true, unlockedNext: true });
    const second = save.recordLevelResult('a', { timeMs: 60000, score: 1000, coins: 5, stars: 1 });
    expect(second.newBestTime).toBe(false);
    expect(second.newBestScore).toBe(true);
    const rec = save.getRecord('a');
    expect(rec.bestTimeMs).toBe(50000);
    expect(rec.stars).toBe(2);
    expect(rec.bestCoins).toBe(10);
    expect(save.isLevelUnlocked(1)).toBe(true);
    expect(save.isLevelUnlocked(2)).toBe(false);
    expect(save.slot.stats.levelsCompleted).toBe(1);
  });

  it('only unlocks an achievement once', () => {
    const save = new SaveManager(new MemoryStore(), IDS);
    save.useSlot(0);
    expect(save.unlockAchievement('x')).toBe(true);
    expect(save.unlockAchievement('x')).toBe(false);
  });

  it('round-trips export / import', () => {
    const save = new SaveManager(new MemoryStore(), IDS);
    save.useSlot(0);
    save.addStats({ coins: 42 });
    const code = save.exportSlot(0) as string;
    expect(save.importSlot(2, code)).toBe(true);
    expect(save.getSlot(2)?.stats.coins).toBe(42);
    expect(save.importSlot(2, 'not valid')).toBe(false);
  });

  it('survives corrupt storage and merges new settings defaults', () => {
    const store = new MemoryStore();
    store.set('lumen-leap:settings', '{"musicVolume":0.1');
    store.set('lumen-leap:slot0', 'garbage');
    const save = new SaveManager(store, IDS);
    expect(save.settings).toEqual(DEFAULT_SETTINGS);
    expect(save.getSlot(0)).toBeNull();
  });

  it('deleting the active slot clears it', () => {
    const save = new SaveManager(new MemoryStore(), IDS);
    save.useSlot(2);
    save.deleteSlot(2);
    expect(save.activeSlotIndex).toBeNull();
    expect(save.getSlot(2)).toBeNull();
  });
});

describe('migrateSlot', () => {
  it('upgrades v1 saves (unlockedLevel) to the current schema', () => {
    const v1 = { version: 1, createdAt: 1, unlockedLevel: 3, levels: { a: { completed: true } } };
    const m = migrateSlot(v1);
    expect(m?.unlocked).toBe(3);
    expect(m?.levels.a.bestScore).toBe(0);
    expect(m?.checkpoint).toBeNull();
    expect(m?.stats.jumps).toBe(0);
  });

  it('rejects non-saves', () => {
    expect(migrateSlot(null)).toBeNull();
    expect(migrateSlot({ foo: 1 })).toBeNull();
    expect(migrateSlot(createSlotData())).not.toBeNull();
  });
});

describe('computeStars', () => {
  it('awards completion, coin and time stars', () => {
    expect(computeStars(0, 10, 999999, 60)).toBe(1);
    expect(computeStars(9, 10, 999999, 60)).toBe(2);
    expect(computeStars(9, 10, 60000, 60)).toBe(3);
    expect(computeStars(0, 0, 70000, 60)).toBe(2);
  });
});
