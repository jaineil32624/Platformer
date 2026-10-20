/** Small math helpers shared across systems. */

export const clamp = (v: number, min: number, max: number): number => (v < min ? min : v > max ? max : v);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Frame-rate independent exponential smoothing factor. */
export const damp = (lambda: number, dtSeconds: number): number => 1 - Math.exp(-lambda * dtSeconds);

/** Move `current` toward `target` by at most `maxDelta`. */
export function approach(current: number, target: number, maxDelta: number): number {
  if (current < target) return Math.min(current + maxDelta, target);
  return Math.max(current - maxDelta, target);
}

/** Linearly interpolate two 0xRRGGBB colors. */
export function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255,
    ag = (a >> 8) & 255,
    ab = a & 255;
  const br = (b >> 16) & 255,
    bg = (b >> 8) & 255,
    bb = b & 255;
  const r = Math.round(lerp(ar, br, t));
  const g = Math.round(lerp(ag, bg, t));
  const bl = Math.round(lerp(ab, bb, t));
  return (r << 16) | (g << 8) | bl;
}

/** Format milliseconds as m:ss.t */
export function formatTime(ms: number | null | undefined): string {
  if (ms == null || !isFinite(ms)) return '--:--';
  const totalTenths = Math.floor(ms / 100);
  const tenths = totalTenths % 10;
  const totalSeconds = Math.floor(totalTenths / 10);
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60);
  return `${m}:${s.toString().padStart(2, '0')}.${tenths}`;
}

/** Deterministic PRNG (mulberry32) so procedural art is identical every run. */
export function seededRandom(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
