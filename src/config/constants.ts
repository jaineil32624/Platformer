/**
 * Global tuning constants. Gameplay feel lives here so designers can tweak
 * numbers without hunting through entity code.
 */

/** World tile size in pixels. All level coordinates are multiples of this. */
export const TILE = 64;

/** Reference resolution used for UI scaling (16:9). */
export const DESIGN_WIDTH = 1280;
export const DESIGN_HEIGHT = 720;

/** How many tiles tall the camera should show (camera zoom is derived from this). */
export const VISIBLE_TILES_TALL = 10.5;

export const FONT_FAMILY = 'Poppins, "Segoe UI", system-ui, sans-serif';

export const PHYSICS = {
  gravity: 2400,
  maxFallSpeed: 1100,
  tileBias: 40,
} as const;

/** Player movement tuning. Velocities are in px/s, times in ms. */
export const PLAYER = {
  bodyWidth: 34,
  bodyHeight: 50,
  runSpeed: 380,
  sprintSpeed: 560,
  groundAccel: 3600,
  groundDecel: 4200,
  airAccel: 2400,
  airDecel: 1200,
  jumpVelocity: 980,
  doubleJumpVelocity: 860,
  /** Releasing jump early multiplies upward velocity by this (variable jump height). */
  jumpCutMultiplier: 0.45,
  wallSlideMaxSpeed: 170,
  wallJumpVelocityX: 460,
  wallJumpVelocityY: 920,
  /** Horizontal input is ignored this long after a wall jump so the kick feels right. */
  wallJumpLockMs: 170,
  coyoteMs: 110,
  jumpBufferMs: 130,
  stompBounce: 760,
  stompBounceHeld: 980,
  maxHealth: 3,
  startLives: 3,
  invulnerableMs: 1300,
  knockbackX: 380,
  knockbackY: 560,
} as const;

export const POWERUP_DURATION_MS = {
  shield: 10000,
  boots: 10000,
  magnet: 12000,
} as const;

export const SCORE = {
  coin: 10,
  enemy: 50,
  boss: 1000,
  noDeathBonus: 500,
  /** Points per second under par time. */
  timeBonusPerSecond: 20,
} as const;

/** Draw order. Higher renders on top. */
export const DEPTH = {
  backgroundDecor: 5,
  tiles: 10,
  hazards: 12,
  pickups: 20,
  checkpoint: 18,
  enemies: 30,
  boss: 32,
  player: 40,
  projectiles: 45,
  particles: 50,
  glow: 55,
  foreground: 60,
} as const;

/** Shared palette so UI and art stay consistent. */
export const COLORS = {
  ink: 0x1b1f3b,
  inkSoft: 0x2c3470,
  panel: 0x232a5c,
  panelLight: 0x3a4590,
  accent: 0xffd34d,
  accentDark: 0xff9f1c,
  mint: 0x4be3b0,
  danger: 0xff5470,
  sky: 0x7ec8ff,
  white: 0xffffff,
  text: '#fdf6e3',
  textDim: '#aeb6e8',
  textAccent: '#ffd34d',
} as const;

export const SAVE_SLOTS = 3;
export const STORAGE_PREFIX = 'lumen-leap';
