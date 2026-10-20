import { seededRandom } from '../../utils/math';
import { Ctx, OUTLINE, ellipse, eye, fillStroke, heartPath, radial, roundRect, shade, starPath, vGradient } from '../draw';
import type { LevelTheme } from '../../levels/types';

/* ------------------------------------------------------------------- TILES */

export const TILE_PX = 64;

interface ThemeColors {
  top: string; // grass / cap
  topDark: string;
  fill: string;
  fillDark: string;
  speck: string;
  accent?: string; // crystals, flowers
}

export const THEME_COLORS: Record<LevelTheme, ThemeColors> = {
  meadow: { top: '#7be06a', topDark: '#3fa34d', fill: '#b9773f', fillDark: '#8a5230', speck: '#d89a5c', accent: '#ffe066' },
  forest: { top: '#56c46e', topDark: '#2f8a4a', fill: '#7a5238', fillDark: '#553826', speck: '#9b6c4b', accent: '#ff8fb1' },
  cliffs: { top: '#b39af5', topDark: '#7a5fd0', fill: '#6f5c93', fillDark: '#4b3d68', speck: '#8d7ab3', accent: '#ffd34d' },
  cave: { top: '#7f92b8', topDark: '#4f6187', fill: '#3d4763', fillDark: '#2a3149', speck: '#56638a', accent: '#5ff3ff' },
  storm: { top: '#eaf2ff', topDark: '#b6c4e0', fill: '#4e5670', fillDark: '#363c52', speck: '#67708d', accent: '#9fb4ff' },
};

/** Order of tile variants within each theme block in the tileset. */
export const TILE_VARIANTS = ['top', 'topL', 'topR', 'single', 'fill', 'under'] as const;
export type TileVariant = (typeof TILE_VARIANTS)[number];
export const THEMES: LevelTheme[] = ['meadow', 'forest', 'cliffs', 'cave', 'storm'];
/** Shared (theme-independent) tiles appended after the theme blocks. */
export const SHARED_TILES = ['block', 'oneway', 'crate'] as const;

export function tileIndex(theme: LevelTheme, variant: TileVariant): number {
  return THEMES.indexOf(theme) * TILE_VARIANTS.length + TILE_VARIANTS.indexOf(variant);
}
export function sharedTileIndex(name: (typeof SHARED_TILES)[number]): number {
  return THEMES.length * TILE_VARIANTS.length + SHARED_TILES.indexOf(name);
}
export const TILE_COUNT = THEMES.length * TILE_VARIANTS.length + SHARED_TILES.length;

function speckle(ctx: Ctx, c: ThemeColors, seed: number, y0: number): void {
  const rnd = seededRandom(seed);
  for (let i = 0; i < 9; i++) {
    const x = 6 + rnd() * 52;
    const y = y0 + rnd() * (60 - y0);
    ellipse(ctx, x, y, 2 + rnd() * 3, 1.5 + rnd() * 2);
    ctx.fillStyle = i % 3 === 0 ? c.fillDark : c.speck;
    ctx.fill();
  }
}

export function drawThemeTile(ctx: Ctx, theme: LevelTheme, variant: TileVariant, seed: number): void {
  const c = THEME_COLORS[theme];
  const S = TILE_PX;
  // Base fill
  ctx.fillStyle = vGradient(ctx, 0, S, [[0, c.fill], [1, shade(c.fill, -0.12)]]);
  ctx.fillRect(0, 0, S, S);
  speckle(ctx, c, seed, variant === 'fill' || variant === 'under' ? 4 : 22);

  if (variant === 'under') {
    ctx.fillStyle = vGradient(ctx, S - 18, S, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(20,10,40,0.45)']]);
    ctx.fillRect(0, S - 18, S, 18);
    ctx.fillStyle = c.fillDark;
    for (let x = 4; x < S; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, S - 3);
      ctx.lineTo(x + 6, S - 3);
      ctx.lineTo(x + 3, S + 0);
      ctx.fill();
    }
    ctx.fillRect(0, S - 4, S, 4);
    return;
  }
  if (variant === 'fill') return;

  // Top cap (grass, moss, snow or crystals)
  const leftRound = variant === 'topL' || variant === 'single';
  const rightRound = variant === 'topR' || variant === 'single';
  const capH = 18;
  ctx.beginPath();
  ctx.moveTo(0, capH);
  for (let x = 0; x <= S; x += 8) {
    const dip = (x / 8) % 2 === 0 ? 6 : 0;
    ctx.lineTo(x, capH + dip);
  }
  ctx.lineTo(S, 0);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fillStyle = vGradient(ctx, 0, capH + 6, [[0, shade(c.top, 0.2)], [0.6, c.top], [1, c.topDark]]);
  ctx.fill();
  // Highlight line
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(0, 3, S, 3);
  // Outline top edge
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(0, 0, S, 3);

  if (leftRound || rightRound) {
    // Cut rounded corners by clearing outside an arc, then outline the curve.
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    const r = 14;
    if (leftRound) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(r, 0);
      ctx.arcTo(0, 0, 0, r, r);
      ctx.closePath();
      ctx.fill();
    }
    if (rightRound) {
      ctx.beginPath();
      ctx.moveTo(S, 0);
      ctx.lineTo(S - r, 0);
      ctx.arcTo(S, 0, S, r, r);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.lineWidth = 3;
    ctx.strokeStyle = OUTLINE;
    ctx.beginPath();
    if (leftRound) {
      ctx.moveTo(1.5, S);
      ctx.lineTo(1.5, 14);
      ctx.arcTo(1.5, 1.5, 14, 1.5, 12.5);
    }
    if (rightRound) {
      ctx.moveTo(S - 1.5, S);
      ctx.lineTo(S - 1.5, 14);
      ctx.arcTo(S - 1.5, 1.5, S - 14, 1.5, 12.5);
    }
    ctx.stroke();
  }

  // Decorations
  const rnd = seededRandom(seed * 7 + 3);
  if (c.accent && rnd() < 0.55) {
    const x = 12 + rnd() * 40;
    if (theme === 'cave' || theme === 'storm') {
      ctx.beginPath();
      ctx.moveTo(x, 4);
      ctx.lineTo(x + 4, -8);
      ctx.lineTo(x + 8, 4);
      ctx.closePath();
      fillStroke(ctx, c.accent, 1.5);
    } else {
      ellipse(ctx, x, 9, 2.6, 2.6);
      ctx.fillStyle = c.accent;
      ctx.fill();
    }
  }
}

export function drawBlock(ctx: Ctx): void {
  const S = TILE_PX;
  roundRect(ctx, 1.5, 1.5, S - 3, S - 3, 8);
  fillStroke(ctx, vGradient(ctx, 0, S, [[0, '#ffe3a3'], [1, '#d99b4a']]), 3);
  ctx.strokeStyle = 'rgba(42,27,61,0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(4, S / 2);
  ctx.lineTo(S - 4, S / 2);
  ctx.moveTo(S / 2, 4);
  ctx.lineTo(S / 2, S / 2);
  ctx.moveTo(S / 4, S / 2);
  ctx.lineTo(S / 4, S - 4);
  ctx.moveTo((3 * S) / 4, S / 2);
  ctx.lineTo((3 * S) / 4, S - 4);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillRect(8, 6, S - 16, 3);
}

export function drawOneWay(ctx: Ctx): void {
  const S = TILE_PX;
  // Support brackets
  for (const x of [10, S - 18]) {
    ctx.beginPath();
    ctx.moveTo(x, 18);
    ctx.lineTo(x + 8, 18);
    ctx.lineTo(x + 4, 30);
    ctx.closePath();
    fillStroke(ctx, '#8a5a35', 2);
  }
  roundRect(ctx, -2, 2, S + 4, 18, 5);
  fillStroke(ctx, vGradient(ctx, 2, 20, [[0, '#e0a96b'], [1, '#a8693c']]), 3);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(0, 6, S, 2);
  ctx.fillStyle = 'rgba(42,27,61,0.4)';
  ctx.fillRect(S / 2 - 1, 4, 2, 14);
}

export function drawCrate(ctx: Ctx): void {
  const S = TILE_PX;
  roundRect(ctx, 2, 2, S - 4, S - 4, 6);
  fillStroke(ctx, vGradient(ctx, 0, S, [[0, '#d99a5b'], [1, '#9c5f31']]), 3);
  roundRect(ctx, 9, 9, S - 18, S - 18, 3);
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(42,27,61,0.55)';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(11, 11);
  ctx.lineTo(S - 11, S - 11);
  ctx.moveTo(S - 11, 11);
  ctx.lineTo(11, S - 11);
  ctx.stroke();
}

/* ----------------------------------------------------------------- PICKUPS */

export const COIN_FRAMES = 6;

export function drawCoin(ctx: Ctx, i: number): void {
  const cx = 18;
  const cy = 18;
  const a = (i / COIN_FRAMES) * Math.PI;
  const sx = Math.max(0.18, Math.abs(Math.cos(a)));
  ellipse(ctx, cx, cy, 14 * sx, 14);
  fillStroke(ctx, vGradient(ctx, 4, 32, [[0, '#fff2a8'], [0.45, '#ffd34d'], [1, '#e08a12']]), 2.5);
  if (sx > 0.4) {
    ellipse(ctx, cx, cy, 8.5 * sx, 8.5);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(176,96,10,0.8)';
    ctx.stroke();
    starPath(ctx, cx, cy, 4, 5 * sx, 2 * sx, 0);
    ctx.fillStyle = '#fff8d0';
    ctx.fill();
  }
  ellipse(ctx, cx - 5 * sx, cy - 6, 2.5 * sx, 3.5);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fill();
}

export type PowerUpArt = 'heart' | 'shield' | 'boots' | 'magnet' | 'life';
export const POWERUP_ART: PowerUpArt[] = ['heart', 'shield', 'boots', 'magnet', 'life'];

export function drawPowerUp(ctx: Ctx, kind: PowerUpArt, bubble = true): void {
  const cx = 24;
  const cy = 24;
  if (bubble) {
    ellipse(ctx, cx, cy, 21, 21);
    ctx.fillStyle = radial(ctx, cx, cy, 4, 22, [[0, 'rgba(255,255,255,0.05)'], [0.8, 'rgba(180,230,255,0.25)'], [1, 'rgba(255,255,255,0.7)']]);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.stroke();
    ellipse(ctx, cx - 9, cy - 10, 5, 3, -0.6);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fill();
  }
  switch (kind) {
    case 'heart':
      heartPath(ctx, cx, cy + 2, 26);
      fillStroke(ctx, vGradient(ctx, 10, 36, [[0, '#ff8fa3'], [1, '#e0244a']]), 2.5);
      ellipse(ctx, cx - 6, cy - 3, 3, 2, -0.6);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fill();
      break;
    case 'shield':
      ctx.beginPath();
      ctx.moveTo(cx, cy - 13);
      ctx.lineTo(cx + 12, cy - 8);
      ctx.quadraticCurveTo(cx + 11, cy + 8, cx, cy + 14);
      ctx.quadraticCurveTo(cx - 11, cy + 8, cx - 12, cy - 8);
      ctx.closePath();
      fillStroke(ctx, vGradient(ctx, cy - 13, cy + 14, [[0, '#a6fbff'], [1, '#1fa4c9']]), 2.5);
      starPath(ctx, cx, cy, 5, 6, 2.6);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      break;
    case 'boots':
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy - 12);
      ctx.lineTo(cx + 2, cy - 12);
      ctx.lineTo(cx + 2, cy + 2);
      ctx.lineTo(cx + 13, cy + 5);
      ctx.quadraticCurveTo(cx + 15, cy + 12, cx + 10, cy + 12);
      ctx.lineTo(cx - 9, cy + 12);
      ctx.closePath();
      fillStroke(ctx, vGradient(ctx, cy - 12, cy + 12, [[0, '#ffb067'], [1, '#e2541c']]), 2.5);
      // Wing
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy - 6);
      ctx.quadraticCurveTo(cx - 20, cy - 16, cx - 18, cy - 2);
      ctx.quadraticCurveTo(cx - 14, cy, cx - 8, cy);
      ctx.closePath();
      fillStroke(ctx, '#ffffff', 2);
      break;
    case 'magnet':
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.arc(cx, cy - 1, 10, Math.PI, 0, true);
      ctx.lineWidth = 12;
      ctx.strokeStyle = OUTLINE;
      ctx.stroke();
      ctx.lineWidth = 7;
      ctx.strokeStyle = '#ff4d6d';
      ctx.stroke();
      for (const s of [-1, 1]) {
        roundRect(ctx, cx + s * 10 - 5, cy - 14, 10, 9, 2);
        fillStroke(ctx, '#e6ecf5', 2.5);
      }
      break;
    case 'life': {
      ellipse(ctx, cx, cy + 2, 14, 13);
      fillStroke(ctx, radial(ctx, cx, cy, 2, 16, [[0, '#fff3b0'], [0.6, '#ffd34d'], [1, '#ff9f1c']], cx - 4, cy - 5), 2.5);
      eye(ctx, cx - 4, cy, 3, 4);
      eye(ctx, cx + 5, cy, 3, 4);
      ctx.font = '700 11px Poppins, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 3;
      ctx.textAlign = 'center';
      ctx.strokeText('1UP', cx, cy - 12);
      ctx.fillText('1UP', cx, cy - 12);
      break;
    }
  }
}

/* ------------------------------------------------------------------- PROPS */

export function drawSpikes(ctx: Ctx): void {
  const S = TILE_PX;
  ctx.fillStyle = '#4a4f6a';
  ctx.fillRect(0, S - 8, S, 8);
  for (let i = 0; i < 4; i++) {
    const x = 2 + i * 15;
    ctx.beginPath();
    ctx.moveTo(x, S - 6);
    ctx.lineTo(x + 7.5, S - 40);
    ctx.lineTo(x + 15, S - 6);
    ctx.closePath();
    fillStroke(ctx, vGradient(ctx, S - 40, S, [[0, '#ffffff'], [0.5, '#c3cbe0'], [1, '#7c86a6']]), 2.5);
  }
}

export const CHECKPOINT_FRAMES = ['off', 'on0', 'on1', 'on2'] as const;

export function drawCheckpoint(ctx: Ctx, frame: string): void {
  const lit = frame !== 'off';
  const flick = lit ? Number(frame.slice(2)) : 0;
  // Post
  roundRect(ctx, 20, 40, 10, 76, 4);
  fillStroke(ctx, vGradient(ctx, 40, 116, [[0, '#a87445'], [1, '#6b4426']]), 3);
  roundRect(ctx, 10, 108, 30, 10, 4);
  fillStroke(ctx, '#6b4426', 3);
  // Glow
  if (lit) {
    ellipse(ctx, 25, 26, 26 + flick * 2, 26 + flick * 2);
    ctx.fillStyle = radial(ctx, 25, 26, 0, 28, [[0, 'rgba(255,240,170,0.75)'], [1, 'rgba(255,200,80,0)']]);
    ctx.fill();
  }
  // Lantern
  roundRect(ctx, 11, 12, 28, 30, 8);
  fillStroke(ctx, lit ? radial(ctx, 25, 27, 2, 18, [[0, '#fffbe0'], [0.5, '#ffd34d'], [1, '#ff9f1c']]) : '#4a4f6a', 3);
  roundRect(ctx, 8, 6, 34, 8, 4);
  fillStroke(ctx, '#3b2a5a', 2.5);
  if (lit) {
    starPath(ctx, 25, 27, 4, 8 - flick, 3, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
}

export const PORTAL_FRAMES = 8;

export function drawPortal(ctx: Ctx, i: number): void {
  const cx = 56;
  const cy = 72;
  ellipse(ctx, cx, cy, 52, 68);
  ctx.fillStyle = radial(ctx, cx, cy, 10, 68, [[0, 'rgba(255,250,220,0.95)'], [0.45, 'rgba(255,211,77,0.6)'], [1, 'rgba(180,90,255,0)']]);
  ctx.fill();
  ellipse(ctx, cx, cy, 36, 52);
  fillStroke(ctx, radial(ctx, cx, cy, 2, 52, [[0, '#fffbe0'], [0.5, '#c9a6ff'], [1, '#6b3fd6']]), 4);
  ctx.save();
  ellipse(ctx, cx, cy, 34, 50);
  ctx.clip();
  const rot = (i / PORTAL_FRAMES) * Math.PI * 2;
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    const a0 = rot + (k * Math.PI) / 2;
    for (let t = 0; t < 1; t += 0.05) {
      const r = 6 + t * 46;
      const a = a0 + t * 4;
      const x = cx + Math.cos(a) * r * 0.7;
      const y = cy + Math.sin(a) * r;
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.stroke();
  }
  ctx.restore();
}

export function drawSign(ctx: Ctx): void {
  roundRect(ctx, 27, 30, 10, 32, 3);
  fillStroke(ctx, '#7a4f2c', 2.5);
  roundRect(ctx, 6, 8, 52, 30, 7);
  fillStroke(ctx, vGradient(ctx, 8, 38, [[0, '#e7b47a'], [1, '#b47a45']]), 3);
  ctx.font = '700 22px Poppins, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = OUTLINE;
  ctx.fillText('!', 32, 24);
}
