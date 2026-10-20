import Phaser from 'phaser';
import { COLORS } from '../config/constants';
import { audio } from '../core/AudioManager';
import { textStyle } from './theme';

export interface ButtonOptions {
  label?: string;
  icon?: string;
  width: number;
  height: number;
  scale: number;
  color?: number;
  textColor?: string;
  onClick: () => void;
  disabled?: boolean;
  /** Smaller font for long labels. */
  small?: boolean;
}

/**
 * Rounded, animated button usable by mouse, touch, keyboard and gamepad.
 * Focus is managed by `FocusGroup`; the button only knows how to look focused.
 */
export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private label?: Phaser.GameObjects.Text;
  private iconImg?: Phaser.GameObjects.Image;
  private focused = false;
  private hovered = false;
  disabled: boolean;
  readonly bw: number;
  readonly bh: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private opts: ButtonOptions,
  ) {
    super(scene, x, y);
    scene.add.existing(this);
    this.bw = opts.width;
    this.bh = opts.height;
    this.disabled = !!opts.disabled;
    const s = opts.scale;
    this.bg = scene.add.graphics();
    this.add(this.bg);

    const hasLabel = !!opts.label;
    if (opts.icon) {
      const size = Math.min(opts.height * 0.52, 44 * s);
      this.iconImg = scene.add.image(0, 0, 'icon', opts.icon).setDisplaySize(size, size);
      this.iconImg.setTint(opts.textColor ? Phaser.Display.Color.HexStringToColor(opts.textColor).color : 0xffffff);
      this.add(this.iconImg);
    }
    if (hasLabel) {
      this.label = scene.add
        .text(0, 0, opts.label as string, textStyle(opts.small ? 'body' : 'button', s, opts.textColor ?? COLORS.text))
        .setOrigin(0.5);
      this.add(this.label);
    }
    if (this.iconImg && this.label) {
      const gap = 10 * s;
      const total = this.iconImg.displayWidth + gap + this.label.width;
      this.iconImg.x = -total / 2 + this.iconImg.displayWidth / 2;
      this.label.x = this.iconImg.x + this.iconImg.displayWidth / 2 + gap + this.label.width / 2;
    }
    this.redraw();

    this.setSize(this.bw, this.bh);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerover', () => {
      if (this.disabled) return;
      this.hovered = true;
      audio.sfx('hover');
      this.redraw();
      this.scene.tweens.add({ targets: this, scale: 1.05, duration: 120, ease: 'Back.easeOut' });
    });
    this.on('pointerout', () => {
      this.hovered = false;
      this.redraw();
      this.scene.tweens.add({ targets: this, scale: 1, duration: 120 });
    });
    this.on('pointerdown', () => {
      if (this.disabled) return;
      this.scene.tweens.add({ targets: this, scale: 0.94, duration: 70 });
    });
    this.on('pointerup', () => {
      if (this.disabled) return;
      this.scene.tweens.add({ targets: this, scale: this.hovered ? 1.05 : 1, duration: 100 });
      this.activate();
    });
  }

  activate(): void {
    if (this.disabled) return;
    audio.unlock();
    audio.sfx('click');
    this.opts.onClick();
  }

  setFocused(f: boolean): void {
    this.focused = f;
    this.redraw();
    this.scene.tweens.add({ targets: this, scale: f ? 1.06 : 1, duration: 120, ease: 'Back.easeOut' });
  }

  setLabel(text: string): void {
    this.label?.setText(text);
  }

  setDisabled(d: boolean): void {
    this.disabled = d;
    this.redraw();
  }

  private redraw(): void {
    const s = this.opts.scale;
    const w = this.bw;
    const h = this.bh;
    const r = Math.min(h / 2, 20 * s);
    const base = this.disabled ? 0x3a3f66 : (this.opts.color ?? COLORS.panelLight);
    const g = this.bg;
    g.clear();
    g.fillStyle(0x0d0f22, 0.45).fillRoundedRect(-w / 2, -h / 2 + 6 * s, w, h, r);
    g.fillStyle(base, 1).fillRoundedRect(-w / 2, -h / 2, w, h, r);
    g.fillStyle(0xffffff, this.hovered || this.focused ? 0.22 : 0.12).fillRoundedRect(-w / 2 + 4 * s, -h / 2 + 4 * s, w - 8 * s, h * 0.42, r * 0.8);
    const stroke = this.focused ? COLORS.accent : 0x0d0f22;
    g.lineStyle(Math.max(2, (this.focused ? 5 : 4) * s), stroke, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    this.setAlpha(this.disabled ? 0.6 : 1);
  }
}

/**
 * Keyboard / gamepad navigation between buttons. Arrow keys / WASD / d-pad
 * move focus spatially; Enter / Space / A activate; Esc / B triggers `onBack`.
 */
export class FocusGroup {
  private items: Button[] = [];
  private index = -1;
  private padPrev: Record<string, boolean> = {};

  constructor(
    private scene: Phaser.Scene,
    private onBack?: () => void,
  ) {
    const kb = scene.input.keyboard;
    kb?.on('keydown', this.onKey, this);
    scene.events.on('update', this.pollPad, this);
    scene.events.once('shutdown', () => this.destroy());
  }

  get buttons(): Button[] {
    return this.items;
  }

  set(items: Button[], focusFirst = false): void {
    this.items = items.filter((b) => !b.disabled);
    this.index = -1;
    if (focusFirst && this.items.length) this.focus(0);
  }

  private focus(i: number): void {
    if (this.index >= 0) this.items[this.index]?.setFocused(false);
    this.index = i;
    this.items[i]?.setFocused(true);
    audio.sfx('hover');
  }

  private move(dx: number, dy: number): void {
    if (!this.items.length) return;
    if (this.index < 0) return this.focus(0);
    const cur = this.items[this.index];
    const m = cur.getWorldTransformMatrix();
    let best = -1;
    let bestScore = Infinity;
    this.items.forEach((b, i) => {
      if (i === this.index) return;
      const t = b.getWorldTransformMatrix();
      const ox = t.tx - m.tx;
      const oy = t.ty - m.ty;
      const along = ox * dx + oy * dy;
      if (along <= 4) return;
      const across = Math.abs(ox * dy - oy * dx);
      const score = along + across * 2.5;
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    });
    if (best >= 0) this.focus(best);
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.scene.scene.isActive()) return;
    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.move(0, -1);
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.move(0, 1);
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.move(-1, 0);
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.move(1, 0);
        break;
      case 'Enter':
      case 'Space':
        if (this.index >= 0) this.items[this.index]?.activate();
        break;
      case 'Escape':
      case 'Backspace':
        if (this.onBack) {
          audio.sfx('back');
          this.onBack();
        }
        break;
    }
  }

  private pollPad(): void {
    const gp = this.scene.input.gamepad;
    if (!gp || gp.total === 0 || !this.scene.scene.isActive()) return;
    const pad = gp.getPad(0);
    if (!pad) return;
    const state: Record<string, boolean> = {
      up: pad.up || pad.leftStick.y < -0.6,
      down: pad.down || pad.leftStick.y > 0.6,
      left: pad.left || pad.leftStick.x < -0.6,
      right: pad.right || pad.leftStick.x > 0.6,
      a: pad.A,
      b: pad.B,
    };
    const pressed = (k: string) => state[k] && !this.padPrev[k];
    if (pressed('up')) this.move(0, -1);
    if (pressed('down')) this.move(0, 1);
    if (pressed('left')) this.move(-1, 0);
    if (pressed('right')) this.move(1, 0);
    if (pressed('a') && this.index >= 0) this.items[this.index]?.activate();
    if (pressed('b') && this.onBack) this.onBack();
    this.padPrev = state;
  }

  destroy(): void {
    this.scene.input.keyboard?.off('keydown', this.onKey, this);
    this.scene.events.off('update', this.pollPad, this);
  }
}
