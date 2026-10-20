import { Ctx, OUTLINE, ellipse, fillStroke, heartPath, radial, roundRect, starPath, vGradient } from '../draw';

/**
 * Monochrome (white) UI icons, 64x64, tinted at runtime. Drawn with thick
 * rounded strokes so they stay legible at small sizes on phones.
 */
export const ICONS = [
  'pause', 'play', 'gear', 'trophy', 'star', 'lock', 'back', 'music', 'sound', 'mute',
  'restart', 'home', 'grid', 'crown', 'coin', 'boot', 'bolt', 'heart', 'clock', 'moon',
  'shield', 'close', 'check', 'user', 'chart', 'info', 'exit', 'fullscreen', 'up', 'run',
  'save', 'trash', 'magnet', 'skull',
] as const;
export type IconName = (typeof ICONS)[number];

export function drawIcon(ctx: Ctx, name: IconName): void {
  const c = 32;
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const line = (pts: number[][]) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  };
  switch (name) {
    case 'pause':
      roundRect(ctx, 16, 14, 11, 36, 3);
      ctx.fill();
      roundRect(ctx, 37, 14, 11, 36, 3);
      ctx.fill();
      break;
    case 'play':
      ctx.beginPath();
      ctx.moveTo(20, 12);
      ctx.lineTo(50, 32);
      ctx.lineTo(20, 52);
      ctx.closePath();
      ctx.fill();
      break;
    case 'gear':
      for (let i = 0; i < 8; i++) {
        ctx.save();
        ctx.translate(c, c);
        ctx.rotate((i * Math.PI) / 4);
        roundRect(ctx, -5, -27, 10, 14, 2);
        ctx.fill();
        ctx.restore();
      }
      ellipse(ctx, c, c, 17, 17);
      ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      ellipse(ctx, c, c, 7, 7);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      break;
    case 'trophy':
      ctx.beginPath();
      ctx.moveTo(18, 10);
      ctx.lineTo(46, 10);
      ctx.lineTo(44, 30);
      ctx.quadraticCurveTo(32, 42, 20, 30);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(16, 20, 7, Math.PI * 0.5, Math.PI * 1.5);
      ctx.arc(48, 20, 7, Math.PI * 1.5, Math.PI * 0.5);
      ctx.stroke();
      ctx.fillRect(28, 36, 8, 10);
      roundRect(ctx, 18, 46, 28, 8, 3);
      ctx.fill();
      break;
    case 'star':
      starPath(ctx, c, c + 2, 5, 26, 11);
      ctx.fill();
      break;
    case 'lock':
      roundRect(ctx, 14, 28, 36, 26, 6);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(c, 28, 11, Math.PI, 0);
      ctx.stroke();
      break;
    case 'back':
      line([[38, 14], [20, 32], [38, 50]]);
      break;
    case 'up':
      line([[14, 40], [32, 20], [50, 40]]);
      break;
    case 'run':
      line([[14, 16], [30, 32], [14, 48]]);
      line([[34, 16], [50, 32], [34, 48]]);
      break;
    case 'music':
      ctx.fillRect(38, 10, 6, 34);
      ellipse(ctx, 32, 46, 10, 8, -0.4);
      ctx.fill();
      line([[41, 12], [52, 20]]);
      break;
    case 'sound':
    case 'mute':
      ctx.beginPath();
      ctx.moveTo(10, 24);
      ctx.lineTo(20, 24);
      ctx.lineTo(32, 12);
      ctx.lineTo(32, 52);
      ctx.lineTo(20, 40);
      ctx.lineTo(10, 40);
      ctx.closePath();
      ctx.fill();
      if (name === 'sound') {
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(34, 32, 10, -0.8, 0.8);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(34, 32, 19, -0.8, 0.8);
        ctx.stroke();
      } else {
        line([[40, 24], [54, 40]]);
        line([[54, 24], [40, 40]]);
      }
      break;
    case 'restart':
      ctx.beginPath();
      ctx.arc(c, c, 18, -Math.PI * 0.35, Math.PI * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(30, 4);
      ctx.lineTo(44, 14);
      ctx.lineTo(30, 22);
      ctx.closePath();
      ctx.fill();
      break;
    case 'home':
      ctx.beginPath();
      ctx.moveTo(32, 10);
      ctx.lineTo(54, 30);
      ctx.lineTo(48, 30);
      ctx.lineTo(48, 52);
      ctx.lineTo(16, 52);
      ctx.lineTo(16, 30);
      ctx.lineTo(10, 30);
      ctx.closePath();
      ctx.fill();
      break;
    case 'grid':
      for (const x of [12, 36]) for (const y of [12, 36]) {
        roundRect(ctx, x, y, 16, 16, 4);
        ctx.fill();
      }
      break;
    case 'crown':
      ctx.beginPath();
      ctx.moveTo(10, 48);
      ctx.lineTo(8, 18);
      ctx.lineTo(22, 30);
      ctx.lineTo(32, 12);
      ctx.lineTo(42, 30);
      ctx.lineTo(56, 18);
      ctx.lineTo(54, 48);
      ctx.closePath();
      ctx.fill();
      break;
    case 'coin':
      ellipse(ctx, c, c, 22, 22);
      ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      starPath(ctx, c, c, 4, 11, 4, 0);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      break;
    case 'boot':
      ctx.beginPath();
      ctx.moveTo(18, 10);
      ctx.lineTo(34, 10);
      ctx.lineTo(34, 32);
      ctx.lineTo(52, 38);
      ctx.quadraticCurveTo(56, 52, 46, 52);
      ctx.lineTo(16, 52);
      ctx.closePath();
      ctx.fill();
      break;
    case 'bolt':
      ctx.beginPath();
      ctx.moveTo(36, 6);
      ctx.lineTo(14, 36);
      ctx.lineTo(30, 36);
      ctx.lineTo(26, 58);
      ctx.lineTo(50, 26);
      ctx.lineTo(34, 26);
      ctx.closePath();
      ctx.fill();
      break;
    case 'heart':
      heartPath(ctx, c, c + 4, 44);
      ctx.fill();
      break;
    case 'clock':
      ctx.lineWidth = 5;
      ellipse(ctx, c, c, 22, 22);
      ctx.stroke();
      line([[32, 18], [32, 32], [42, 38]]);
      break;
    case 'moon':
      ellipse(ctx, c, c, 22, 22);
      ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      ellipse(ctx, c + 12, c - 8, 18, 18);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      break;
    case 'shield':
      ctx.beginPath();
      ctx.moveTo(32, 8);
      ctx.lineTo(52, 16);
      ctx.quadraticCurveTo(50, 44, 32, 56);
      ctx.quadraticCurveTo(14, 44, 12, 16);
      ctx.closePath();
      ctx.fill();
      break;
    case 'magnet':
      ctx.lineWidth = 10;
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.arc(c, 30, 15, Math.PI, 0, true);
      ctx.stroke();
      ctx.fillRect(12, 14, 10, 10);
      ctx.fillRect(42, 14, 10, 10);
      break;
    case 'close':
      line([[18, 18], [46, 46]]);
      line([[46, 18], [18, 46]]);
      break;
    case 'check':
      line([[14, 34], [27, 46], [50, 18]]);
      break;
    case 'user':
      ellipse(ctx, c, 22, 11, 11);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(c, 54, 22, 18, 0, Math.PI, 0);
      ctx.fill();
      break;
    case 'chart':
      roundRect(ctx, 10, 34, 12, 20, 2);
      ctx.fill();
      roundRect(ctx, 26, 14, 12, 40, 2);
      ctx.fill();
      roundRect(ctx, 42, 24, 12, 30, 2);
      ctx.fill();
      break;
    case 'info':
      ellipse(ctx, c, 14, 5, 5);
      ctx.fill();
      roundRect(ctx, 27, 24, 10, 30, 3);
      ctx.fill();
      break;
    case 'exit':
      ctx.lineWidth = 5;
      line([[30, 12], [12, 12], [12, 52], [30, 52]]);
      line([[24, 32], [52, 32]]);
      line([[42, 22], [52, 32], [42, 42]]);
      break;
    case 'fullscreen':
      line([[12, 24], [12, 12], [24, 12]]);
      line([[40, 12], [52, 12], [52, 24]]);
      line([[52, 40], [52, 52], [40, 52]]);
      line([[24, 52], [12, 52], [12, 40]]);
      break;
    case 'save':
      roundRect(ctx, 10, 10, 44, 44, 6);
      ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillRect(18, 10, 24, 14);
      roundRect(ctx, 18, 34, 28, 14, 3);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      break;
    case 'trash':
      roundRect(ctx, 16, 20, 32, 36, 4);
      ctx.fill();
      ctx.fillRect(10, 12, 44, 6);
      ctx.fillRect(26, 6, 12, 6);
      break;
    case 'skull':
      ellipse(ctx, c, 28, 20, 18);
      ctx.fill();
      ctx.fillRect(22, 38, 20, 14);
      ctx.globalCompositeOperation = 'destination-out';
      ellipse(ctx, 24, 28, 6, 6);
      ctx.fill();
      ellipse(ctx, 40, 28, 6, 6);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      break;
  }
}

export function drawHudHeart(ctx: Ctx, full: boolean): void {
  heartPath(ctx, 20, 20, 32);
  if (full) {
    fillStroke(ctx, vGradient(ctx, 4, 36, [[0, '#ff8fa3'], [1, '#e0244a']]), 3);
    ellipse(ctx, 13, 14, 4, 3, -0.6);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fill();
  } else {
    fillStroke(ctx, 'rgba(30,25,60,0.55)', 3);
  }
}

/* -------------------------------------------------------------- PARTICLES */

export function drawSoftDot(ctx: Ctx, size: number): void {
  const r = size / 2;
  ellipse(ctx, r, r, r, r);
  ctx.fillStyle = radial(ctx, r, r, 0, r, [[0, 'rgba(255,255,255,1)'], [0.45, 'rgba(255,255,255,0.8)'], [1, 'rgba(255,255,255,0)']]);
  ctx.fill();
}

export function drawSpark(ctx: Ctx): void {
  starPath(ctx, 12, 12, 4, 12, 3, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

export function drawLeaf(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(1, 6);
  ctx.quadraticCurveTo(8, -2, 15, 6);
  ctx.quadraticCurveTo(8, 14, 1, 6);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

export function drawRaindrop(ctx: Ctx): void {
  ctx.fillStyle = vGradient(ctx, 0, 24, [[0, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0.9)']]);
  ctx.fillRect(1, 0, 2, 24);
}

/** Large radial light used for glows, night lighting and the vignette cut-out. */
export function drawLight(ctx: Ctx, size: number): void {
  const r = size / 2;
  ctx.fillStyle = radial(ctx, r, r, 0, r, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']]);
  ctx.fillRect(0, 0, size, size);
}

export function drawVignette(ctx: Ctx, size: number): void {
  const r = size / 2;
  ctx.fillStyle = radial(ctx, r, r, r * 0.45, r * 1.05, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.85)']]);
  ctx.fillRect(0, 0, size, size);
}

export function drawRing(ctx: Ctx, size: number): void {
  const r = size / 2;
  ellipse(ctx, r, r, r - 4, r - 4);
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
}

/* ------------------------------------------------------------ TOUCH PAD */

export function drawJoystickBase(ctx: Ctx, size: number): void {
  const r = size / 2;
  ellipse(ctx, r, r, r - 3, r - 3);
  ctx.fillStyle = 'rgba(20,24,60,0.35)';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    ctx.save();
    ctx.translate(r + Math.cos(a) * (r - 22), r + Math.sin(a) * (r - 22));
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-4, -8);
    ctx.lineTo(-4, 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

export function drawJoystickKnob(ctx: Ctx, size: number): void {
  const r = size / 2;
  ellipse(ctx, r, r, r - 3, r - 3);
  ctx.fillStyle = radial(ctx, r, r, 2, r, [[0, 'rgba(255,255,255,0.85)'], [1, 'rgba(200,210,255,0.55)']], r - 8, r - 10);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.stroke();
}

export function drawTouchButton(ctx: Ctx, size: number): void {
  const r = size / 2;
  ellipse(ctx, r, r, r - 3, r - 3);
  ctx.fillStyle = 'rgba(20,24,60,0.4)';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.stroke();
}

export function drawLifeIcon(ctx: Ctx): void {
  ellipse(ctx, 20, 22, 15, 14);
  fillStroke(ctx, radial(ctx, 20, 20, 2, 16, [[0, '#fff3b0'], [0.6, '#ffd34d'], [1, '#ff9f1c']], 16, 15), 3);
  for (const x of [16, 25]) {
    ellipse(ctx, x, 21, 2.5, 3.5);
    ctx.fillStyle = OUTLINE;
    ctx.fill();
  }
}
