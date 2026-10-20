import Phaser from 'phaser';
import { COLORS, DESIGN_HEIGHT, DESIGN_WIDTH, FONT_FAMILY } from '../config/constants';
import { Platform } from '../utils/platform';

/**
 * UI scale for the current screen. 1.0 at 1280x720; grows on big monitors,
 * shrinks on phones but never below a size that keeps touch targets usable.
 */
export function uiScale(scene: Phaser.Scene): number {
  const { width, height } = scene.scale;
  const s = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
  const boost = Platform.isMobileLike() ? 1.18 : 1;
  return Phaser.Math.Clamp(s * boost, 0.5, 1.8);
}

export type TextKind = 'title' | 'heading' | 'body' | 'small' | 'button' | 'number';

export function textStyle(kind: TextKind, s: number, color: string = COLORS.text): Phaser.Types.GameObjects.Text.TextStyle {
  const size = { title: 72, heading: 40, body: 24, small: 19, button: 28, number: 30 }[kind];
  const weight = kind === 'body' || kind === 'small' ? '500' : '700';
  return {
    fontFamily: FONT_FAMILY,
    fontStyle: weight,
    fontSize: `${Math.round(size * s)}px`,
    color,
    stroke: kind === 'title' || kind === 'number' || kind === 'heading' ? '#1b1f3b' : undefined,
    strokeThickness: kind === 'title' ? Math.round(12 * s) : kind === 'heading' || kind === 'number' ? Math.round(7 * s) : 0,
    shadow:
      kind === 'title'
        ? { offsetX: 0, offsetY: Math.round(6 * s), color: '#0d0f22', blur: 0, fill: true, stroke: true }
        : undefined,
  };
}

/** Draw a rounded "card" panel into a Graphics object, centred at 0,0. */
export function drawPanel(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  s: number,
  opts: { fill?: number; alpha?: number; stroke?: number; radius?: number; shadow?: boolean } = {},
): Phaser.GameObjects.Graphics {
  const r = (opts.radius ?? 22) * s;
  g.clear();
  if (opts.shadow !== false) g.fillStyle(0x0d0f22, 0.35).fillRoundedRect(-w / 2, -h / 2 + 8 * s, w, h, r);
  g.fillStyle(opts.fill ?? COLORS.panel, opts.alpha ?? 0.94).fillRoundedRect(-w / 2, -h / 2, w, h, r);
  g.lineStyle(Math.max(2, 4 * s), opts.stroke ?? 0x0d0f22, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, r);
  g.fillStyle(0xffffff, 0.06).fillRoundedRect(-w / 2 + 6 * s, -h / 2 + 6 * s, w - 12 * s, Math.min(h * 0.4, 40 * s), r * 0.7);
  return g;
}
