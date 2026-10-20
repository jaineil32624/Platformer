/**
 * Renders the app icon and splash screen from the same vector art the game
 * uses. Run in a browser (see scripts/render-icons.py) — outputs PNG data URLs.
 */
import { drawPlayer } from '../src/gfx/art/characters';
import { radial, starPath } from '../src/gfx/draw';

function icon(size: number, maskable: boolean): string {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = radial(ctx, size / 2, size * 0.4, 0, size * 0.75, [[0, '#3a4590'], [1, '#1b1f3b']]);
  ctx.fillRect(0, 0, size, size);
  // soft glow + stars
  ctx.fillStyle = radial(ctx, size / 2, size * 0.5, 0, size * 0.42, [[0, 'rgba(255,230,140,0.55)'], [1, 'rgba(255,200,80,0)']]);
  ctx.fillRect(0, 0, size, size);
  for (const [x, y, r] of [[0.18, 0.2, 0.025], [0.82, 0.16, 0.018], [0.85, 0.78, 0.022], [0.14, 0.8, 0.015]]) {
    starPath(ctx, x * size, y * size, 4, r * size, r * size * 0.35, 0);
    ctx.fillStyle = '#fff3b0';
    ctx.fill();
  }
  const scale = (size / 80) * (maskable ? 0.62 : 0.8);
  ctx.save();
  ctx.translate(size / 2 - 40 * scale, size / 2 - 44 * scale);
  ctx.scale(scale, scale);
  drawPlayer(ctx, 'jump');
  ctx.restore();
  return c.toDataURL('image/png');
}

function splash(size: number): string {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = radial(ctx, size / 2, size / 2, 0, size * 0.7, [[0, '#2c3470'], [1, '#1b1f3b']]);
  ctx.fillRect(0, 0, size, size);
  const scale = size / 80 / 6;
  ctx.save();
  ctx.translate(size / 2 - 40 * scale, size / 2 - 60 * scale);
  ctx.scale(scale, scale);
  drawPlayer(ctx, 'idle0');
  ctx.restore();
  ctx.font = `700 ${size * 0.045}px Poppins, sans-serif`;
  ctx.textAlign = 'center';
  ctx.lineWidth = size * 0.008;
  ctx.strokeStyle = '#1b1f3b';
  ctx.fillStyle = '#ffd34d';
  ctx.strokeText('LUMEN LEAP', size / 2, size / 2 + size * 0.1);
  ctx.fillText('LUMEN LEAP', size / 2, size / 2 + size * 0.1);
  return c.toDataURL('image/png');
}

(window as unknown as { render: () => Promise<Record<string, string>> }).render = async () => {
  await document.fonts.load('700 40px Poppins');
  return {
    'icon-1024': icon(1024, false),
    'icon-maskable-512': icon(512, true),
    'icon-512': icon(512, false),
    'icon-192': icon(192, false),
    splash: splash(2732),
  };
};
