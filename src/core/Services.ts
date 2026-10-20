import { LEVELS, LEVEL_IDS } from '../levels/levels';
import { LocalStore } from '../utils/storage';
import { AchievementManager } from './AchievementManager';
import { audio } from './AudioManager';
import { LeaderboardProvider, LocalLeaderboardProvider } from './LeaderboardService';
import { SaveManager } from './SaveManager';

/**
 * Service locator for long-lived systems that must outlive scene changes.
 * Created once in main.ts via `initServices()` — never at import time — so
 * modules stay side-effect free and unit-testable.
 */
export interface GameServices {
  save: SaveManager;
  leaderboard: LeaderboardProvider;
  achievements: AchievementManager;
  audio: typeof audio;
}

let instance: GameServices | null = null;

export function initServices(): GameServices {
  if (instance) return instance;
  const store = new LocalStore();
  const save = new SaveManager(store, LEVEL_IDS);
  const achievements = new AchievementManager(save, LEVELS.length);
  achievements.parLookup = (id) => LEVELS.find((l) => l.id === id)?.parTimeSec ?? 0;
  achievements.start();
  audio.applySettings(save.settings);
  instance = { save, leaderboard: new LocalLeaderboardProvider(store), achievements, audio };
  return instance;
}

export function services(): GameServices {
  if (!instance) throw new Error('Services not initialised — call initServices() first');
  return instance;
}
