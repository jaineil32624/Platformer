import { seededRandom } from '../../utils/math';
import { Ctx, ellipse, radial } from '../draw';

/**
 * Parallax layers are painted in neutral greys/white so the BackgroundScene
 * can tint them per time of day (multiplicative tint). Every layer tiles
 * seamlessly because ridge shapes are built from sine waves whose periods
 * divide the texture width exactly.
 */

export const BG_W = 1024;

function ridge(x: number, waves: [number, number, number][]): number {
  // waves: [amplitude, cycles across the width, phase]
  return waves.reduce((y, [a, k, p]) => y + a * Math.sin((x / BG_W) * Math.PI * 2 * k + p), 0);
}

export function drawMountains(ctx: Ctx, h: number): void {
  // Back range
  const base = h * 0.45;
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= BG_W; x += 4) {
    ctx.lineTo(x, base + ridge(x, [[60, 2, 0.3], [30, 5, 1.2], [12, 11, 2]]));
  }
  ctx.lineTo(BG_W, h);
  ctx.closePath();
  ctx.fillStyle = '#d4d9e6';
  ctx.fill();
  // Snow caps: lighter band clipped near the peaks
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  for (let x = 0; x <= BG_W; x += 4) {
    ctx.lineTo(x, base - 40 + ridge(x, [[60, 2, 0.3], [30, 5, 1.2]]) + 8 * Math.sin(x * 0.08));
  }
  ctx.lineTo(BG_W, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Front range
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= BG_W; x += 4) {
    ctx.lineTo(x, h * 0.62 + ridge(x, [[44, 3, 2.1], [18, 7, 0.4], [8, 13, 1]]));
  }
  ctx.lineTo(BG_W, h);
  ctx.closePath();
  ctx.fillStyle = '#bcc3d6';
  ctx.fill();
}

export function drawHills(ctx: Ctx, h: number, trees = true): void {
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= BG_W; x += 4) {
    ctx.lineTo(x, h * 0.45 + ridge(x, [[34, 2, 1], [16, 4, 0.2], [6, 9, 2]]));
  }
  ctx.lineTo(BG_W, h);
  ctx.closePath();
  ctx.fillStyle = '#e4e4e4';
  ctx.fill();
  if (!trees) return;
  const rnd = seededRandom(42);
  for (let i = 0; i < 26; i++) {
    const x = (i / 26) * BG_W + rnd() * 20;
    const y = h * 0.45 + ridge(x, [[34, 2, 1], [16, 4, 0.2], [6, 9, 2]]) + 6;
    const r = 12 + rnd() * 14;
    ctx.fillStyle = '#c9c9c9';
    ctx.fillRect(x - 2, y - r * 0.4, 4, r);
    ellipse(ctx, x, y - r, r * 0.75, r);
    ctx.fill();
  }
}

export function drawBushes(ctx: Ctx, h: number): void {
  const rnd = seededRandom(7);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= BG_W; x += 4) {
    ctx.lineTo(x, h * 0.6 + ridge(x, [[18, 4, 0.5], [8, 10, 1.4]]));
  }
  ctx.lineTo(BG_W, h);
  ctx.closePath();
  ctx.fill();
  // Tall trees (tileable: the last one wraps)
  for (let i = 0; i < 9; i++) {
    const x = (i / 9) * BG_W + rnd() * 50;
    const trunkH = 70 + rnd() * 60;
    const yb = h * 0.62;
    for (const ox of [0, -BG_W, BG_W]) {
      ctx.fillStyle = '#d6d6d6';
      ctx.fillRect(x + ox - 6, yb - trunkH, 12, trunkH);
      ctx.fillStyle = '#f2f2f2';
      for (let k = 0; k < 3; k++) {
        ellipse(ctx, x + ox + (k - 1) * 22, yb - trunkH - 10 + Math.abs(k - 1) * 14, 34, 30);
        ctx.fill();
      }
      ellipse(ctx, x + ox, yb - trunkH - 34, 30, 28);
      ctx.fill();
    }
  }
}

export function drawCaveFar(ctx: Ctx, h: number): void {
  const rnd = seededRandom(99);
  ctx.fillStyle = '#d0d0d0';
  for (let i = 0; i < 18; i++) {
    const x = (i / 18) * BG_W + rnd() * 30;
    const len = 60 + rnd() * 140;
    const w = 20 + rnd() * 30;
    for (const ox of [0, BG_W, -BG_W]) {
      ctx.beginPath();
      ctx.moveTo(x + ox - w, 0);
      ctx.lineTo(x + ox, len);
      ctx.lineTo(x + ox + w, 0);
      ctx.fill();
      const sl = 40 + rnd() * 120;
      ctx.beginPath();
      ctx.moveTo(x + ox + 40 - w, h);
      ctx.lineTo(x + ox + 40, h - sl);
      ctx.lineTo(x + ox + 40 + w, h);
      ctx.fill();
    }
  }
  ctx.fillRect(0, 0, BG_W, 18);
  ctx.fillRect(0, h - 18, BG_W, 18);
}

export function drawCaveMid(ctx: Ctx, h: number): void {
  const rnd = seededRandom(5);
  for (let i = 0; i < 6; i++) {
    const x = (i / 6) * BG_W + rnd() * 60;
    const w = 50 + rnd() * 40;
    for (const ox of [0, BG_W, -BG_W]) {
      ctx.fillStyle = '#e8e8e8';
      ctx.beginPath();
      ctx.moveTo(x + ox - w, 0);
      ctx.quadraticCurveTo(x + ox - w * 0.3, h * 0.5, x + ox - w, h);
      ctx.lineTo(x + ox + w, h);
      ctx.quadraticCurveTo(x + ox + w * 0.3, h * 0.5, x + ox + w, 0);
      ctx.fill();
      // Crystal clusters (bright, they glow after tinting)
      ctx.fillStyle = '#ffffff';
      for (let k = 0; k < 3; k++) {
        const cy = h * (0.3 + 0.2 * k) + rnd() * 20;
        ctx.beginPath();
        ctx.moveTo(x + ox - 8, cy);
        ctx.lineTo(x + ox - 2, cy - 22);
        ctx.lineTo(x + ox + 4, cy);
        ctx.fill();
      }
    }
  }
}

export function drawCloud(ctx: Ctx, variant: number): void {
  const rnd = seededRandom(variant * 13 + 1);
  ctx.fillStyle = '#ffffff';
  const puffs = 4 + variant;
  for (let i = 0; i < puffs; i++) {
    const x = 40 + (i / (puffs - 1)) * 160;
    const r = 26 + rnd() * 22 * (1 - Math.abs(i / (puffs - 1) - 0.5));
    ellipse(ctx, x, 70 - r * 0.4, r, r * 0.85);
    ctx.fill();
  }
  ctx.fillRect(40, 60, 160, 26);
  ellipse(ctx, 120, 86, 90, 8);
  ctx.fill();
}

export function drawSun(ctx: Ctx): void {
  ellipse(ctx, 128, 128, 128, 128);
  ctx.fillStyle = radial(ctx, 128, 128, 30, 128, [[0, 'rgba(255,250,220,0.9)'], [0.4, 'rgba(255,220,140,0.35)'], [1, 'rgba(255,200,100,0)']]);
  ctx.fill();
  ellipse(ctx, 128, 128, 44, 44);
  ctx.fillStyle = radial(ctx, 128, 128, 0, 44, [[0, '#ffffff'], [0.7, '#fff3b0'], [1, '#ffd34d']]);
  ctx.fill();
}

export function drawMoon(ctx: Ctx): void {
  ellipse(ctx, 128, 128, 120, 120);
  ctx.fillStyle = radial(ctx, 128, 128, 30, 120, [[0, 'rgba(220,230,255,0.45)'], [1, 'rgba(160,180,255,0)']]);
  ctx.fill();
  ellipse(ctx, 128, 128, 38, 38);
  ctx.fillStyle = radial(ctx, 118, 118, 0, 44, [[0, '#ffffff'], [1, '#cfd8f5']]);
  ctx.fill();
  for (const [x, y, r] of [[118, 116, 7], [140, 136, 9], [126, 146, 4], [144, 112, 4]] as const) {
    ellipse(ctx, x, y, r, r);
    ctx.fillStyle = 'rgba(150,165,210,0.45)';
    ctx.fill();
  }
}
