import type { MusicId } from '../core/music';

/** Visual theme: picks tiles, parallax art and ambient particles. */
export type LevelTheme = 'meadow' | 'forest' | 'cliffs' | 'cave' | 'storm';
export type Weather = 'none' | 'leaves' | 'fireflies' | 'rain' | 'dust';
export type BossKind = 'king' | 'golem';

export interface SignText {
  /** Shown when keyboard/gamepad controls are active. */
  pc: string;
  /** Shown when touch controls are active. */
  touch: string;
}

export interface LevelDefinition {
  id: string;
  name: string;
  subtitle: string;
  theme: LevelTheme;
  /**
   * Time of day across the level, 0..1 where 0 = midnight, 0.25 = sunrise,
   * 0.5 = noon, 0.75 = sunset. The sky blends from `timeStart` to `timeEnd`
   * as the player moves from the left edge to the right edge of the level.
   */
  timeStart: number;
  timeEnd: number;
  music: MusicId;
  weather: Weather;
  /** Par time in seconds for the speed star. */
  parTimeSec: number;
  boss?: BossKind;
  /** Tutorial signs, used in order of the `i` markers in the map. */
  signs: SignText[];
  /**
   * ASCII map, one string per row. Legend:
   *   .  empty            #  ground (auto-tiled)     =  solid block
   *   -  one-way platform  B  crate                   ^  spikes
   *   P  player start      G  goal portal             K  checkpoint
   *   C  coin              S  slime                   E  spiky beetle
   *   b  bat               X  boss spawn              A  boss-arena trigger
   *   h  heart             s  shield                  f  speed boots
   *   m  coin magnet       1  extra life              i  tutorial sign
   */
  map: string[];
}
