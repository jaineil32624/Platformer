import { Ctx, OUTLINE, ellipse, eye, fillStroke, radial, roundRect, vGradient, starPath } from '../draw';

/* ------------------------------------------------------------------ PLAYER */

export const PLAYER_FRAME = { w: 80, h: 80 };
export const PLAYER_FRAMES = [
  'idle0', 'idle1', 'idle2', 'idle3',
  'run0', 'run1', 'run2', 'run3', 'run4', 'run5',
  'jump', 'fall', 'wall', 'hurt', 'dead', 'spin',
] as const;

interface PlayerPose {
  bob: number;
  sx: number;
  sy: number;
  lean: number;
  footL: [number, number];
  footR: [number, number];
  armL: number; // radians, 0 = down
  armR: number;
  eyes: 'open' | 'closed' | 'hurt' | 'look-back';
  scarf: number; // flutter phase
}

const basePose = (): PlayerPose => ({
  bob: 0,
  sx: 1,
  sy: 1,
  lean: 0,
  footL: [-8, 0],
  footR: [8, 0],
  armL: 0.3,
  armR: -0.3,
  eyes: 'open',
  scarf: 0,
});

function poseFor(frame: string): PlayerPose {
  const p = basePose();
  if (frame.startsWith('idle')) {
    const i = Number(frame.slice(4));
    p.bob = [0, -1, -2, -1][i];
    p.sy = [1, 1.02, 1.035, 1.02][i];
    p.sx = 2 - p.sy;
    p.scarf = i * 0.6;
    if (i === 2) p.eyes = 'open';
  } else if (frame.startsWith('run')) {
    const i = Number(frame.slice(3));
    const ph = (i / 6) * Math.PI * 2;
    p.footL = [Math.sin(ph) * 11, -Math.max(0, Math.cos(ph)) * 7];
    p.footR = [-Math.sin(ph) * 11, -Math.max(0, -Math.cos(ph)) * 7];
    p.bob = -Math.abs(Math.sin(ph)) * 3;
    p.lean = 0.09;
    p.armL = 0.6 + Math.sin(ph) * 0.7;
    p.armR = -0.6 + Math.sin(ph) * 0.7;
    p.scarf = ph;
  } else if (frame === 'jump') {
    p.sx = 0.9;
    p.sy = 1.12;
    p.footL = [-6, -8];
    p.footR = [6, -6];
    p.armL = 2.4;
    p.armR = -2.4;
    p.bob = -3;
    p.scarf = 1;
  } else if (frame === 'fall') {
    p.sx = 1.06;
    p.sy = 0.96;
    p.footL = [-11, 2];
    p.footR = [11, 2];
    p.armL = 2.0;
    p.armR = -2.0;
    p.scarf = 2.5;
  } else if (frame === 'wall') {
    p.sx = 0.92;
    p.sy = 1.04;
    p.footL = [-4, -4];
    p.footR = [10, -10];
    p.armR = -2.2;
    p.armL = 0.4;
    p.eyes = 'look-back';
    p.lean = -0.06;
  } else if (frame === 'hurt') {
    p.sx = 1.12;
    p.sy = 0.9;
    p.eyes = 'hurt';
    p.armL = 1.8;
    p.armR = -1.8;
  } else if (frame === 'dead') {
    p.eyes = 'hurt';
    p.lean = 0.5;
    p.armL = 2.6;
    p.armR = -2.6;
  } else if (frame === 'spin') {
    p.sx = 1.05;
    p.sy = 0.95;
    p.eyes = 'closed';
    p.footL = [-6, -9];
    p.footR = [6, -9];
    p.armL = 1.6;
    p.armR = -1.6;
  }
  return p;
}

/** Paint "Lumi", the hero: a glowing star-sprite with a teal scarf. Faces right. */
export function drawPlayer(ctx: Ctx, frame: string): void {
  const p = poseFor(frame);
  const cx = 40;
  const ground = 77;
  const bodyCy = 50 + p.bob;

  ctx.save();
  ctx.translate(cx, ground);
  ctx.rotate(p.lean);
  ctx.translate(-cx, -ground);

  // Scarf tail (behind body)
  const sw = Math.sin(p.scarf) * 4;
  ctx.beginPath();
  ctx.moveTo(cx - 10, bodyCy + 8);
  ctx.quadraticCurveTo(cx - 24, bodyCy + 4 + sw, cx - 34, bodyCy + 10 - sw);
  ctx.lineTo(cx - 30, bodyCy + 18 - sw);
  ctx.quadraticCurveTo(cx - 20, bodyCy + 14 + sw, cx - 8, bodyCy + 16);
  ctx.closePath();
  fillStroke(ctx, '#2ec4b6', 2.5);

  // Legs/feet
  const foot = (fx: number, fy: number) => {
    roundRect(ctx, cx + fx - 7, ground - 9 + fy, 14, 9, 4.5);
    fillStroke(ctx, '#3b2a5a', 2.5);
  };
  foot(p.footL[0], p.footL[1]);

  // Arms
  const arm = (side: -1 | 1, angle: number) => {
    const ax = cx + side * 19 * p.sx;
    const ay = bodyCy + 4;
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(angle);
    ellipse(ctx, 0, 8, 5, 9);
    fillStroke(ctx, '#ffc23d', 2.5);
    ctx.restore();
  };
  arm(-1, p.armL);

  // Body
  const rx = 21 * p.sx;
  const ry = 22 * p.sy;
  const by = ground - 8 - ry;
  ellipse(ctx, cx, by, rx, ry);
  fillStroke(
    ctx,
    radial(ctx, cx, by, 2, ry * 1.2, [
      [0, '#fff3b0'],
      [0.55, '#ffd34d'],
      [1, '#ff9f1c'],
    ], cx - 7, by - 9),
    3,
  );
  // Belly
  ellipse(ctx, cx + 3, by + 9, rx * 0.55, ry * 0.42);
  ctx.fillStyle = 'rgba(255,250,225,0.75)';
  ctx.fill();

  // Scarf band
  ctx.save();
  ellipse(ctx, cx, by, rx, ry);
  ctx.clip();
  ctx.beginPath();
  ctx.ellipse(cx, by + 6, rx + 2, 5, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#2ec4b6';
  ctx.fill();
  ctx.fillStyle = '#7ff0e4';
  ctx.fillRect(cx - rx, by + 3, rx * 2, 2);
  ctx.restore();

  // Antenna with glowing bulb
  ctx.beginPath();
  ctx.moveTo(cx + 2, by - ry + 3);
  ctx.quadraticCurveTo(cx + 4, by - ry - 9, cx + 11, by - ry - 13);
  ctx.lineWidth = 3;
  ctx.strokeStyle = OUTLINE;
  ctx.lineCap = 'round';
  ctx.stroke();
  ellipse(ctx, cx + 12, by - ry - 14, 11, 11);
  ctx.fillStyle = radial(ctx, cx + 12, by - ry - 14, 0, 11, [
    [0, 'rgba(255,255,220,0.9)'],
    [1, 'rgba(255,230,120,0)'],
  ]);
  ctx.fill();
  ellipse(ctx, cx + 12, by - ry - 14, 4.5, 4.5);
  fillStroke(ctx, '#fffbe0', 2);

  // Face
  const ey = by - 3;
  if (p.eyes === 'hurt') {
    for (const ex of [cx + 4, cx + 15]) {
      ctx.beginPath();
      ctx.moveTo(ex - 4, ey - 4);
      ctx.lineTo(ex + 4, ey + 4);
      ctx.moveTo(ex + 4, ey - 4);
      ctx.lineTo(ex - 4, ey + 4);
      ctx.lineWidth = 3;
      ctx.strokeStyle = OUTLINE;
      ctx.stroke();
    }
  } else {
    const look = p.eyes === 'look-back' ? -1 : 1;
    eye(ctx, cx + 4, ey, 5.5, 7, look, 0, p.eyes === 'closed');
    eye(ctx, cx + 15, ey, 5.5, 7, look, 0, p.eyes === 'closed');
  }
  // Cheek + mouth
  ellipse(ctx, cx + 19, ey + 9, 3.5, 2.2);
  ctx.fillStyle = 'rgba(255,110,130,0.7)';
  ctx.fill();
  ctx.beginPath();
  if (p.eyes === 'hurt') ctx.ellipse(cx + 10, ey + 11, 3, 2.5, 0, 0, Math.PI * 2);
  else ctx.arc(cx + 10, ey + 8, 3.5, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();

  // Front arm + foot on top of body
  arm(1, p.armR);
  foot(p.footR[0], p.footR[1]);
  ctx.restore();
}

/* ------------------------------------------------------------------ SLIME */

export const SLIME_FRAME = { w: 64, h: 56 };
export const SLIME_FRAMES = ['move0', 'move1', 'move2', 'move3', 'hit'] as const;

export function drawSlime(ctx: Ctx, frame: string, colors = { top: '#8ff07a', mid: '#4ccf62', bot: '#239a4a' }): void {
  const sq: Record<string, [number, number]> = {
    move0: [1, 1],
    move1: [1.08, 0.9],
    move2: [1, 1],
    move3: [0.93, 1.08],
    hit: [1.32, 0.42],
  };
  const [sx, sy] = sq[frame];
  const cx = 32;
  const bottom = 54;
  const w = 25 * sx;
  const h = 34 * sy;
  ctx.beginPath();
  ctx.moveTo(cx - w, bottom);
  ctx.bezierCurveTo(cx - w - 2, bottom - h * 0.75, cx - w * 0.55, bottom - h, cx, bottom - h);
  ctx.bezierCurveTo(cx + w * 0.55, bottom - h, cx + w + 2, bottom - h * 0.75, cx + w, bottom);
  ctx.closePath();
  fillStroke(ctx, vGradient(ctx, bottom - h, bottom, [[0, colors.top], [0.5, colors.mid], [1, colors.bot]]), 3);
  ellipse(ctx, cx - w * 0.45, bottom - h * 0.68, w * 0.18, h * 0.12, -0.5);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fill();
  const ey = bottom - h * 0.48;
  const closed = frame === 'hit';
  eye(ctx, cx - 3, ey, 4.5 * sx, 5.5 * sy, 1, 0.2, closed);
  eye(ctx, cx + 9, ey, 4.5 * sx, 5.5 * sy, 1, 0.2, closed);
  ctx.beginPath();
  ctx.arc(cx + 4, ey + 8 * sy, 3, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.lineWidth = 2;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
}

/* ----------------------------------------------------------------- BEETLE */

export const BEETLE_FRAME = { w: 68, h: 56 };
export const BEETLE_FRAMES = ['walk0', 'walk1', 'walk2', 'walk3', 'hit'] as const;

export function drawBeetle(ctx: Ctx, frame: string): void {
  const flip = frame === 'hit';
  if (flip) {
    ctx.translate(0, 56);
    ctx.scale(1, -1);
    ctx.translate(0, 6);
  }
  const i = flip ? 0 : Number(frame.slice(4));
  const cx = 32;
  const base = 46;
  // Legs
  for (let k = 0; k < 3; k++) {
    const lx = cx - 14 + k * 13;
    const off = Math.sin((i / 4) * Math.PI * 2 + k * 2) * 4;
    ctx.beginPath();
    ctx.moveTo(lx, base - 4);
    ctx.lineTo(lx + off, base + 7);
    ctx.lineWidth = 4;
    ctx.strokeStyle = OUTLINE;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  // Spikes
  for (let k = 0; k < 4; k++) {
    const sx = cx - 17 + k * 10;
    ctx.beginPath();
    ctx.moveTo(sx - 5, base - 22);
    ctx.lineTo(sx, base - 38 - (k % 2) * 3);
    ctx.lineTo(sx + 5, base - 22);
    ctx.closePath();
    fillStroke(ctx, vGradient(ctx, base - 40, base - 22, [[0, '#ffffff'], [1, '#b8c0d8']]), 2.5);
  }
  // Shell
  ellipse(ctx, cx - 2, base - 14, 24, 15);
  fillStroke(ctx, vGradient(ctx, base - 30, base, [[0, '#c065d6'], [0.6, '#7d3a9b'], [1, '#4f2266']]), 3);
  ctx.beginPath();
  ctx.moveTo(cx - 2, base - 28);
  ctx.lineTo(cx - 2, base - 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(42,27,61,0.6)';
  ctx.stroke();
  ellipse(ctx, cx - 12, base - 21, 6, 3, -0.4);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fill();
  // Head
  ellipse(ctx, cx + 22, base - 10, 11, 10);
  fillStroke(ctx, '#3b2a5a', 3);
  eye(ctx, cx + 25, base - 12, 3.5, 4, 1, 0, flip);
  // Angry brow
  ctx.beginPath();
  ctx.moveTo(cx + 20, base - 19);
  ctx.lineTo(cx + 29, base - 15);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#ff5470';
  ctx.stroke();
}

/* -------------------------------------------------------------------- BAT */

export const BAT_FRAME = { w: 72, h: 52 };
export const BAT_FRAMES = ['fly0', 'fly1', 'fly2', 'fly3', 'hit'] as const;

export function drawBat(ctx: Ctx, frame: string): void {
  const i = frame === 'hit' ? 1 : Number(frame.slice(3));
  const flap = [-0.9, 0, 0.7, 0][i];
  const cx = 36;
  const cy = 26;
  const wing = (side: -1 | 1) => {
    ctx.save();
    ctx.translate(cx + side * 8, cy);
    ctx.scale(side, 1);
    ctx.rotate(flap);
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.quadraticCurveTo(14, -16, 28, -8);
    ctx.lineTo(24, 0);
    ctx.lineTo(18, -2);
    ctx.lineTo(14, 5);
    ctx.lineTo(8, 2);
    ctx.lineTo(2, 6);
    ctx.closePath();
    fillStroke(ctx, '#6a4fa8', 2.5);
    ctx.restore();
  };
  wing(-1);
  wing(1);
  // Ears
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + s * 4, cy - 10);
    ctx.lineTo(cx + s * 9, cy - 20);
    ctx.lineTo(cx + s * 11, cy - 7);
    ctx.closePath();
    fillStroke(ctx, '#4b3a78', 2.5);
  }
  ellipse(ctx, cx, cy, 13, 12);
  fillStroke(ctx, vGradient(ctx, cy - 12, cy + 12, [[0, '#7d64c4'], [1, '#3e2d6b']]), 3);
  const closed = frame === 'hit';
  if (closed) {
    eye(ctx, cx - 5, cy - 1, 3.5, 4, 0, 0, true);
    eye(ctx, cx + 5, cy - 1, 3.5, 4, 0, 0, true);
  } else {
    for (const s of [-1, 1]) {
      ellipse(ctx, cx + s * 5, cy - 2, 3.8, 4.4);
      fillStroke(ctx, '#ffe066', 1.5);
      ellipse(ctx, cx + s * 5, cy - 1, 1.6, 2.6);
      ctx.fillStyle = OUTLINE;
      ctx.fill();
    }
  }
  // Fangs
  ctx.fillStyle = '#ffffff';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + s * 3 - 1.5, cy + 6);
    ctx.lineTo(cx + s * 3, cy + 10);
    ctx.lineTo(cx + s * 3 + 1.5, cy + 6);
    ctx.fill();
  }
}

/* ------------------------------------------------------------ SLIME KING */

export const KING_FRAME = { w: 220, h: 190 };
export const KING_FRAMES = ['idle0', 'idle1', 'squash', 'jump', 'hurt'] as const;

export function drawKing(ctx: Ctx, frame: string): void {
  const sq: Record<string, [number, number]> = {
    idle0: [1, 1],
    idle1: [1.04, 0.96],
    squash: [1.22, 0.72],
    jump: [0.86, 1.14],
    hurt: [1.1, 0.88],
  };
  const [sx, sy] = sq[frame];
  const cx = 110;
  const bottom = 186;
  const w = 88 * sx;
  const h = 128 * sy;
  ctx.beginPath();
  ctx.moveTo(cx - w, bottom);
  ctx.bezierCurveTo(cx - w - 8, bottom - h * 0.8, cx - w * 0.6, bottom - h, cx, bottom - h);
  ctx.bezierCurveTo(cx + w * 0.6, bottom - h, cx + w + 8, bottom - h * 0.8, cx + w, bottom);
  ctx.closePath();
  fillStroke(ctx, vGradient(ctx, bottom - h, bottom, [[0, '#ffa6d2'], [0.5, '#f05ca8'], [1, '#a8317a']]), 4);
  ellipse(ctx, cx - w * 0.45, bottom - h * 0.7, w * 0.16, h * 0.1, -0.5);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fill();
  // Bubbles inside
  for (const [bx, by, r] of [[-30, -40, 7], [36, -30, 5], [10, -18, 4]] as const) {
    ellipse(ctx, cx + bx * sx, bottom + by * sy, r, r);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fill();
  }
  // Face
  const ey = bottom - h * 0.52;
  const hurt = frame === 'hurt';
  eye(ctx, cx - 22, ey, 13 * sx, 15 * sy, 0.3, 0.3, hurt);
  eye(ctx, cx + 22, ey, 13 * sx, 15 * sy, 0.3, 0.3, hurt);
  ctx.lineWidth = 5;
  ctx.strokeStyle = OUTLINE;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 38, ey - 22 * sy);
  ctx.lineTo(cx - 10, ey - 14 * sy);
  ctx.moveTo(cx + 38, ey - 22 * sy);
  ctx.lineTo(cx + 10, ey - 14 * sy);
  ctx.stroke();
  // Mouth with teeth
  const my = ey + 30 * sy;
  ctx.beginPath();
  ctx.moveTo(cx - 26, my);
  ctx.quadraticCurveTo(cx, my + 22 * sy, cx + 26, my);
  ctx.closePath();
  fillStroke(ctx, '#5a1340', 3);
  ctx.fillStyle = '#ffffff';
  for (const tx of [-14, 8]) {
    ctx.beginPath();
    ctx.moveTo(cx + tx, my + 1);
    ctx.lineTo(cx + tx + 6, my + 1);
    ctx.lineTo(cx + tx + 3, my + 8);
    ctx.fill();
  }
  // Crown
  const top = bottom - h - 6;
  ctx.beginPath();
  ctx.moveTo(cx - 34, top + 18);
  ctx.lineTo(cx - 38, top - 18);
  ctx.lineTo(cx - 18, top - 2);
  ctx.lineTo(cx, top - 26);
  ctx.lineTo(cx + 18, top - 2);
  ctx.lineTo(cx + 38, top - 18);
  ctx.lineTo(cx + 34, top + 18);
  ctx.closePath();
  fillStroke(ctx, vGradient(ctx, top - 26, top + 18, [[0, '#fff2a8'], [0.5, '#ffd34d'], [1, '#e08a12']]), 3.5);
  for (const [gx, col] of [[-22, '#4be3b0'], [0, '#ff5470'], [22, '#5aa9ff']] as const) {
    ellipse(ctx, cx + gx, top + 8, 5, 5);
    fillStroke(ctx, col, 2);
  }
}

/* ------------------------------------------------------------ STORM GOLEM */

export const GOLEM_FRAME = { w: 220, h: 220 };
export const GOLEM_FRAMES = ['idle0', 'idle1', 'windup', 'slam', 'stunned', 'hurt'] as const;

export function drawGolem(ctx: Ctx, frame: string): void {
  const cx = 110;
  const bottom = 216;
  const stunned = frame === 'stunned';
  const bob = frame === 'idle1' ? -3 : 0;
  const armRaise = frame === 'windup' ? -60 : frame === 'slam' ? 18 : 0;
  const armSpread = frame === 'slam' ? 18 : 0;
  const tilt = stunned ? 0.08 : 0;
  ctx.save();
  ctx.translate(cx, bottom);
  ctx.rotate(tilt);
  ctx.translate(-cx, -bottom);
  const stone = (y0: number, y1: number) =>
    vGradient(ctx, y0, y1, [[0, '#a3b1cf'], [0.5, '#6f7ea3'], [1, '#48526f']]);

  // Legs
  for (const s of [-1, 1]) {
    roundRect(ctx, cx + s * 30 - 20, bottom - 44, 40, 44, 12);
    fillStroke(ctx, stone(bottom - 44, bottom), 4);
  }
  // Torso
  roundRect(ctx, cx - 62, bottom - 150 + bob, 124, 112, 34);
  fillStroke(ctx, stone(bottom - 150, bottom - 38), 4);
  // Cracks
  ctx.beginPath();
  ctx.moveTo(cx - 40, bottom - 128 + bob);
  ctx.lineTo(cx - 28, bottom - 112 + bob);
  ctx.lineTo(cx - 36, bottom - 96 + bob);
  ctx.moveTo(cx + 44, bottom - 70 + bob);
  ctx.lineTo(cx + 30, bottom - 60 + bob);
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(42,27,61,0.55)';
  ctx.stroke();
  // Core
  const coreCol = stunned ? ['#fffbe0', '#ffd34d', '#ff9f1c'] : ['#e8ffff', '#5ff3ff', '#1a8fb8'];
  ellipse(ctx, cx, bottom - 94 + bob, 30, 30);
  ctx.fillStyle = radial(ctx, cx, bottom - 94 + bob, 0, 30, [[0, stunned ? 'rgba(255,240,150,0.9)' : 'rgba(120,240,255,0.7)'], [1, 'rgba(0,0,0,0)']]);
  ctx.fill();
  starPath(ctx, cx, bottom - 94 + bob, 4, 17, 8, 0);
  fillStroke(ctx, radial(ctx, cx, bottom - 94 + bob, 0, 17, [[0, coreCol[0]], [0.5, coreCol[1]], [1, coreCol[2]]]), 3);
  // Head
  roundRect(ctx, cx - 38, bottom - 196 + bob, 76, 56, 18);
  fillStroke(ctx, stone(bottom - 196, bottom - 140), 4);
  // Eyes
  const eyeY = bottom - 170 + bob;
  if (stunned) {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 4; a += 0.3) {
        const r = a * 1.4;
        const x = cx + s * 16 + Math.cos(a) * r;
        const y = eyeY + Math.sin(a) * r;
        if (a === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#fffbe0';
      ctx.stroke();
    }
  } else {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + s * 6, eyeY - 2);
      ctx.lineTo(cx + s * 28, eyeY - 8);
      ctx.lineTo(cx + s * 26, eyeY + 4);
      ctx.lineTo(cx + s * 8, eyeY + 4);
      ctx.closePath();
      ctx.fillStyle = frame === 'hurt' ? '#ffffff' : '#5ff3ff';
      ctx.shadowColor = '#5ff3ff';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
  // Arms (boulders)
  for (const s of [-1, 1]) {
    const ax = cx + s * (82 + armSpread);
    const ay = bottom - 108 + armRaise + bob;
    ellipse(ctx, ax, ay, 26, 22);
    fillStroke(ctx, stone(ay - 22, ay + 22), 4);
    ellipse(ctx, ax + s * 2, ay + 40, 30, 26);
    fillStroke(ctx, stone(ay + 14, ay + 66), 4);
    ctx.beginPath();
    ctx.moveTo(ax - 10, ay + 32);
    ctx.lineTo(ax + 6, ay + 46);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(95,243,255,0.8)';
    ctx.stroke();
  }
  ctx.restore();
}

/* ------------------------------------------------------------ PROJECTILES */

export function drawRock(ctx: Ctx): void {
  ctx.beginPath();
  const pts = [[16, 2], [27, 7], [30, 18], [22, 29], [9, 28], [2, 17], [6, 6]];
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  fillStroke(ctx, vGradient(ctx, 2, 30, [[0, '#b7c3de'], [1, '#55607e']]), 3);
  ctx.beginPath();
  ctx.moveTo(10, 12);
  ctx.lineTo(18, 18);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(95,243,255,0.9)';
  ctx.stroke();
}

export function drawOrb(ctx: Ctx): void {
  ellipse(ctx, 18, 18, 17, 17);
  ctx.fillStyle = radial(ctx, 18, 18, 0, 17, [[0, 'rgba(230,255,255,1)'], [0.4, 'rgba(95,243,255,0.9)'], [1, 'rgba(26,143,184,0)']]);
  ctx.fill();
  ellipse(ctx, 18, 18, 7, 7);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}
