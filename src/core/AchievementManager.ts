import { EventBus } from './EventBus';
import { SaveManager, SlotData } from './SaveManager';

/**
 * Achievements are declared as data. Each one has a `check` that receives the
 * current slot (stats + records) and the event that just happened. The
 * manager listens to the global EventBus, keeps stats up to date and unlocks
 * anything whose condition becomes true.
 */

export type AchievementIcon = 'star' | 'coin' | 'boot' | 'crown' | 'bolt' | 'heart' | 'clock' | 'moon' | 'shield' | 'trophy';

export interface AchievementContext {
  slot: SlotData;
  totalStarsPossible: number;
  lastLevel?: { levelId: string; deaths: number; stars: number; timeMs: number; underPar: boolean };
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: AchievementIcon;
  check(ctx: AchievementContext): boolean;
  /** Optional progress for display (current / target). */
  progress?(ctx: AchievementContext): [number, number];
}

const totalStars = (slot: SlotData) => Object.values(slot.levels).reduce((s, r) => s + r.stars, 0);

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  {
    id: 'first_steps',
    title: 'First Light',
    description: 'Complete Sunrise Meadow.',
    icon: 'star',
    check: ({ slot }) => !!slot.levels['meadow']?.completed,
  },
  {
    id: 'coins_100',
    title: 'Pocket Change',
    description: 'Collect 100 coins.',
    icon: 'coin',
    check: ({ slot }) => slot.stats.coins >= 100,
    progress: ({ slot }) => [Math.min(slot.stats.coins, 100), 100],
  },
  {
    id: 'coins_500',
    title: 'Treasure Hunter',
    description: 'Collect 500 coins.',
    icon: 'coin',
    check: ({ slot }) => slot.stats.coins >= 500,
    progress: ({ slot }) => [Math.min(slot.stats.coins, 500), 500],
  },
  {
    id: 'stomper',
    title: 'Stomp Squad',
    description: 'Defeat 25 enemies.',
    icon: 'boot',
    check: ({ slot }) => slot.stats.enemiesDefeated >= 25,
    progress: ({ slot }) => [Math.min(slot.stats.enemiesDefeated, 25), 25],
  },
  {
    id: 'wall_runner',
    title: 'Wall Runner',
    description: 'Perform 25 wall jumps.',
    icon: 'bolt',
    check: ({ slot }) => slot.stats.wallJumps >= 25,
    progress: ({ slot }) => [Math.min(slot.stats.wallJumps, 25), 25],
  },
  {
    id: 'bouncy',
    title: 'Spring in the Step',
    description: 'Jump 500 times.',
    icon: 'boot',
    check: ({ slot }) => slot.stats.jumps >= 500,
    progress: ({ slot }) => [Math.min(slot.stats.jumps, 500), 500],
  },
  {
    id: 'king_slayer',
    title: 'Crown Breaker',
    description: 'Defeat the Slime King.',
    icon: 'crown',
    check: ({ slot }) => !!slot.levels['hollow']?.completed,
  },
  {
    id: 'night_owl',
    title: 'Night Owl',
    description: 'Complete Twilight Cliffs.',
    icon: 'moon',
    check: ({ slot }) => !!slot.levels['cliffs']?.completed,
  },
  {
    id: 'storm_breaker',
    title: 'Eye of the Storm',
    description: 'Defeat the Storm Golem and finish the game.',
    icon: 'trophy',
    check: ({ slot }) => !!slot.levels['peak']?.completed,
  },
  {
    id: 'flawless',
    title: 'Untouchable',
    description: 'Complete a level without losing a life.',
    icon: 'heart',
    check: ({ lastLevel }) => !!lastLevel && lastLevel.deaths === 0,
  },
  {
    id: 'speedrunner',
    title: 'Speedrunner',
    description: 'Beat any level under its par time.',
    icon: 'clock',
    check: ({ lastLevel }) => !!lastLevel?.underPar,
  },
  {
    id: 'perfectionist',
    title: 'Perfectionist',
    description: 'Earn 3 stars on a level.',
    icon: 'star',
    check: ({ slot }) => Object.values(slot.levels).some((r) => r.stars >= 3),
  },
  {
    id: 'power_hungry',
    title: 'Power Hungry',
    description: 'Collect 15 power-ups.',
    icon: 'shield',
    check: ({ slot }) => slot.stats.powerups >= 15,
    progress: ({ slot }) => [Math.min(slot.stats.powerups, 15), 15],
  },
  {
    id: 'completionist',
    title: 'Starlit',
    description: 'Earn every star in the game.',
    icon: 'trophy',
    check: (ctx) => totalStars(ctx.slot) >= ctx.totalStarsPossible,
    progress: (ctx) => [totalStars(ctx.slot), ctx.totalStarsPossible],
  },
];

export class AchievementManager {
  private unsubscribers: (() => void)[] = [];
  private levelCount: number;

  constructor(
    private save: SaveManager,
    levelCount: number,
  ) {
    this.levelCount = levelCount;
  }

  get definitions(): readonly AchievementDef[] {
    return ACHIEVEMENTS;
  }

  context(slot: SlotData): AchievementContext {
    return { slot, totalStarsPossible: this.levelCount * 3 };
  }

  /** Subscribe to gameplay events. Call once at boot. */
  start(): void {
    const on = EventBus.on.bind(EventBus);
    this.unsubscribers.push(
      on('coin-collected', () => this.bump({ coins: 1 })),
      on('enemy-defeated', () => this.bump({ enemiesDefeated: 1 })),
      on('boss-defeated', () => this.bump({ bossesDefeated: 1 })),
      on('player-jump', (e) => this.bump(e.wall ? { jumps: 1, wallJumps: 1 } : { jumps: 1 })),
      on('player-died', () => this.bump({ deaths: 1 })),
      on('powerup-collected', () => this.bump({ powerups: 1 })),
      on('level-complete', (e) => {
        // Records are written by the game scene before this fires.
        this.evaluate({
          levelId: e.levelId,
          deaths: e.deaths,
          stars: e.stars,
          timeMs: e.timeMs,
          underPar: e.stars >= 3 || this.isUnderPar(e.levelId, e.timeMs),
        });
      }),
    );
  }

  /** Optional hook set by the game to answer "was this run under par?". */
  parLookup: ((levelId: string) => number) | null = null;

  private isUnderPar(levelId: string, timeMs: number): boolean {
    const par = this.parLookup?.(levelId);
    return par !== undefined && timeMs <= par * 1000;
  }

  stop(): void {
    this.unsubscribers.forEach((u) => u());
    this.unsubscribers = [];
  }

  private bump(stats: Parameters<SaveManager['addStats']>[0]): void {
    this.save.addStats(stats);
    this.evaluate();
  }

  /** Check all locked achievements and unlock any that now pass. */
  evaluate(lastLevel?: AchievementContext['lastLevel']): string[] {
    const slot = this.save.slot;
    const ctx: AchievementContext = { ...this.context(slot), lastLevel };
    const unlocked: string[] = [];
    for (const a of ACHIEVEMENTS) {
      if (slot.achievements[a.id]) continue;
      let passed = false;
      try {
        passed = a.check(ctx);
      } catch (err) {
        console.error(`[achievements] check failed for ${a.id}`, err);
      }
      if (passed && this.save.unlockAchievement(a.id)) {
        unlocked.push(a.id);
        EventBus.emit('achievement-unlocked', { id: a.id, title: a.title });
      }
    }
    return unlocked;
  }
}
