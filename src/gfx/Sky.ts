import { lerpColor } from '../utils/math';
import type { LevelTheme } from '../levels/types';

/**
 * Day/night colour model. A handful of keyframes across a 24h cycle are
 * blended to produce sky gradient, parallax layer tints and an "ambient"
 * colour that the UI scene multiplies over the world for lighting.
 * Pure function — unit tested and shared by menus and gameplay.
 */

export interface SkyState {
  skyTop: number;
  skyBottom: number;
  far: number;
  mid: number;
  near: number;
  ambient: number;
  /** 0 = full daylight, 1 = deep night. */
  night: number;
}

type Key = [t: number, s: Omit<SkyState, 'night'>, night: number];

const KEYS: Key[] = [
  [0.0, { skyTop: 0x070b26, skyBottom: 0x1b2352, far: 0x2b3468, mid: 0x1e2652, near: 0x141a3a, ambient: 0x8290d6 }, 1],
  [0.2, { skyTop: 0x141d4f, skyBottom: 0x4a3f7d, far: 0x3d3a74, mid: 0x2b3159, near: 0x1d2242, ambient: 0x9a98d4 }, 0.85],
  [0.27, { skyTop: 0x5c8ad8, skyBottom: 0xffb08a, far: 0xa08fc4, mid: 0x7da577, near: 0x5d9455, ambient: 0xffdcc4 }, 0.25],
  [0.36, { skyTop: 0x4aa3f7, skyBottom: 0xc9ecff, far: 0xa9c4e6, mid: 0x8fd18a, near: 0x67bd6b, ambient: 0xfffaf0 }, 0],
  [0.5, { skyTop: 0x3b9cff, skyBottom: 0xbfe6ff, far: 0xaecbed, mid: 0x92d68c, near: 0x6cc06d, ambient: 0xffffff }, 0],
  [0.64, { skyTop: 0x4a8fe0, skyBottom: 0xffd9a8, far: 0xb3a7cf, mid: 0x8fbf7c, near: 0x6aa35c, ambient: 0xfff0dc }, 0.05],
  [0.72, { skyTop: 0x3c55a5, skyBottom: 0xff8f63, far: 0x8f6c9e, mid: 0x667d66, near: 0x46604b, ambient: 0xffc6a2 }, 0.3],
  [0.8, { skyTop: 0x1f2560, skyBottom: 0x9c4f86, far: 0x4c3f72, mid: 0x35395f, near: 0x252b49, ambient: 0x9d8ccb }, 0.7],
  [0.9, { skyTop: 0x0c1234, skyBottom: 0x262c63, far: 0x2f3670, mid: 0x212958, near: 0x161c3e, ambient: 0x8a96d8 }, 0.95],
  [1.0, { skyTop: 0x070b26, skyBottom: 0x1b2352, far: 0x2b3468, mid: 0x1e2652, near: 0x141a3a, ambient: 0x8290d6 }, 1],
];

const FIELDS = ['skyTop', 'skyBottom', 'far', 'mid', 'near', 'ambient'] as const;

export function wrapTime(t: number): number {
  return ((t % 1) + 1) % 1;
}

export function computeSky(time: number, theme: LevelTheme | null = null): SkyState {
  const t = wrapTime(time);
  let i = 0;
  while (i < KEYS.length - 2 && t > KEYS[i + 1][0]) i++;
  const [t0, a, n0] = KEYS[i];
  const [t1, b, n1] = KEYS[i + 1];
  const u = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
  const out = { night: n0 + (n1 - n0) * u } as SkyState;
  for (const f of FIELDS) out[f] = lerpColor(a[f], b[f], u);

  if (theme === 'cave') {
    // Caves: always dim, blue-violet, layers glow faintly.
    out.skyTop = 0x0b0d1f;
    out.skyBottom = 0x1a1d3a;
    out.far = lerpColor(0x262b52, out.far, 0.2);
    out.mid = 0x323a6a;
    out.near = 0x1d2244;
    out.ambient = lerpColor(0xa6b2ec, out.ambient, 0.2);
    out.night = Math.max(out.night, 0.85);
  } else if (theme === 'storm') {
    // Storm: desaturate toward slate and darken.
    for (const f of FIELDS) if (f !== 'ambient') out[f] = lerpColor(out[f], 0x2a3048, 0.35);
    out.ambient = lerpColor(out.ambient, 0x9aa4d8, 0.25);
    out.night = Math.min(1, out.night + 0.1);
  } else if (theme === 'forest') {
    out.mid = lerpColor(out.mid, 0x2f8a4a, 0.25);
    out.near = lerpColor(out.near, 0x2f6a3a, 0.25);
  } else if (theme === 'cliffs') {
    out.far = lerpColor(out.far, 0x8a6ac8, 0.25);
    out.mid = lerpColor(out.mid, 0x6a5a9a, 0.3);
  }
  return out;
}

/** Sun/moon arc positions as fractions of the screen (x 0..1, y 0..1, visible). */
export function celestial(time: number): { sun: [number, number, boolean]; moon: [number, number, boolean] } {
  const t = wrapTime(time);
  const arc = (start: number, len: number): [number, number, boolean] => {
    let u = (t - start) / len;
    if (u < 0) u += 1 / len;
    const visible = u >= 0 && u <= 1;
    return [0.08 + 0.84 * u, 0.62 - Math.sin(Math.PI * Math.min(Math.max(u, 0), 1)) * 0.5, visible];
  };
  return { sun: arc(0.22, 0.58), moon: arc(0.76, 0.5) };
}
