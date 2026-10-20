/**
 * Canvas 2D drawing helpers used by TextureFactory to paint all game art at
 * boot. Everything is vector-drawn into canvases, so the game ships with no
 * image files and scales cleanly on any screen density.
 */

export type Ctx = CanvasRenderingContext2D;

export const OUTLINE = '#2a1b3d';

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function ellipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
}

/** Fill the current path, then stroke it with the shared outline color. */
export function fillStroke(ctx: Ctx, fill: string | CanvasGradient, lineWidth = 3, stroke = OUTLINE): void {
  ctx.fillStyle = fill;
  ctx.fill();
  if (lineWidth > 0) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = stroke;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

export function vGradient(ctx: Ctx, y0: number, y1: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

export function radial(
  ctx: Ctx,
  x: number,
  y: number,
  r0: number,
  r1: number,
  stops: [number, string][],
  fx = x,
  fy = y,
): CanvasGradient {
  const g = ctx.createRadialGradient(fx, fy, r0, x, y, r1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

/** Simple cartoon eye: white sclera, dark pupil, specular highlight. */
export function eye(ctx: Ctx, x: number, y: number, rx: number, ry: number, lookX = 1, lookY = 0, closed = false): void {
  if (closed) {
    ctx.beginPath();
    ctx.moveTo(x - rx, y);
    ctx.quadraticCurveTo(x, y + ry * 0.6, x + rx, y);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = OUTLINE;
    ctx.lineCap = 'round';
    ctx.stroke();
    return;
  }
  ellipse(ctx, x, y, rx, ry);
  fillStroke(ctx, '#ffffff', 2);
  ellipse(ctx, x + lookX * rx * 0.35, y + lookY * ry * 0.3, rx * 0.55, ry * 0.62);
  ctx.fillStyle = OUTLINE;
  ctx.fill();
  ellipse(ctx, x + lookX * rx * 0.35 - rx * 0.22, y - ry * 0.28, rx * 0.2, ry * 0.2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

/** Five/four-pointed star path. */
export function starPath(ctx: Ctx, cx: number, cy: number, points: number, outer: number, inner: number, rot = -Math.PI / 2): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rot + (i * Math.PI) / points;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function heartPath(ctx: Ctx, cx: number, cy: number, size: number): void {
  const s = size / 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.9);
  ctx.bezierCurveTo(cx - s * 1.5, cy - s * 0.1, cx - s * 0.9, cy - s * 1.25, cx, cy - s * 0.45);
  ctx.bezierCurveTo(cx + s * 0.9, cy - s * 1.25, cx + s * 1.5, cy - s * 0.1, cx, cy + s * 0.9);
  ctx.closePath();
}

/** Hex string helper for 0xRRGGBB numbers. */
export const hex = (n: number): string => '#' + n.toString(16).padStart(6, '0');

/** Shade a #rrggbb color by `amt` (-1 darker .. +1 lighter). */
export function shade(color: string, amt: number): string {
  const n = parseInt(color.slice(1), 16);
  let r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  if (amt >= 0) {
    r += (255 - r) * amt;
    g += (255 - g) * amt;
    b += (255 - b) * amt;
  } else {
    r *= 1 + amt;
    g *= 1 + amt;
    b *= 1 + amt;
  }
  return hex((Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b));
}
