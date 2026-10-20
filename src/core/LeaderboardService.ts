import { STORAGE_PREFIX } from '../config/constants';
import { KeyValueStore, safeParse } from '../utils/storage';

/**
 * Leaderboards are accessed through a provider interface so the game works
 * fully offline today (LocalLeaderboardProvider) and can be pointed at an
 * online backend later (Google Play Games, Game Center, Firebase, Supabase…)
 * by implementing `LeaderboardProvider` — see docs/ARCHITECTURE.md.
 */

export interface LeaderboardEntry {
  name: string;
  score: number;
  timeMs: number;
  coins: number;
  date: number;
}

export interface LeaderboardProvider {
  readonly label: string;
  submit(levelId: string, entry: LeaderboardEntry): Promise<number>;
  top(levelId: string, limit?: number): Promise<LeaderboardEntry[]>;
}

/** Highest score first; ties broken by faster time, then earlier date. */
export function compareEntries(a: LeaderboardEntry, b: LeaderboardEntry): number {
  return b.score - a.score || a.timeMs - b.timeMs || a.date - b.date;
}

export function sanitizeName(name: string): string {
  const clean = name.replace(/[^\p{L}\p{N} _\-.]/gu, '').trim().slice(0, 14);
  return clean || 'Player';
}

export class LocalLeaderboardProvider implements LeaderboardProvider {
  readonly label = 'This device';
  static readonly MAX_ENTRIES = 10;

  constructor(private store: KeyValueStore) {}

  private key(levelId: string): string {
    return `${STORAGE_PREFIX}:lb:${levelId}`;
  }

  private read(levelId: string): LeaderboardEntry[] {
    const list = safeParse<LeaderboardEntry[]>(this.store.get(this.key(levelId)), []);
    return Array.isArray(list) ? list.filter((e) => e && typeof e.score === 'number') : [];
  }

  /** Inserts an entry and returns its 1-based rank, or 0 if it didn't place. */
  async submit(levelId: string, entry: LeaderboardEntry): Promise<number> {
    const clean = { ...entry, name: sanitizeName(entry.name) };
    const list = this.read(levelId);
    list.push(clean);
    list.sort(compareEntries);
    const trimmed = list.slice(0, LocalLeaderboardProvider.MAX_ENTRIES);
    this.store.set(this.key(levelId), JSON.stringify(trimmed));
    const rank = trimmed.indexOf(clean);
    return rank >= 0 ? rank + 1 : 0;
  }

  async top(levelId: string, limit = LocalLeaderboardProvider.MAX_ENTRIES): Promise<LeaderboardEntry[]> {
    return this.read(levelId).sort(compareEntries).slice(0, limit);
  }

  clearAll(levelIds: readonly string[]): void {
    for (const id of levelIds) this.store.remove(this.key(id));
  }
}
