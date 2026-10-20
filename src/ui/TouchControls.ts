import Phaser from 'phaser';
import { touchState, resetTouchState } from '../core/InputManager';
import { audio } from '../core/AudioManager';

/**
 * On-screen controls for phones and tablets:
 *  - floating virtual joystick on the left half (appears where the thumb lands)
 *  - JUMP and RUN buttons on the right
 * Multi-touch safe: each control tracks its own pointer id.
 */
export class TouchControls {
  private base: Phaser.GameObjects.Image;
  private knob: Phaser.GameObjects.Image;
  private jumpBtn: Phaser.GameObjects.Container;
  private runBtn: Phaser.GameObjects.Container;
  private joyPointer: number | null = null;
  private jumpPointer: number | null = null;
  private runPointer: number | null = null;
  private joyOrigin = new Phaser.Math.Vector2();
  private radius = 80;
  private visible = false;
  private scaleFactor = 1;

  constructor(private scene: Phaser.Scene) {
    scene.input.addPointer(3);
    this.base = scene.add.image(0, 0, 'joy-base').setAlpha(0.85).setDepth(100);
    this.knob = scene.add.image(0, 0, 'joy-knob').setDepth(101);
    this.jumpBtn = this.makeButton('up', 'JUMP');
    this.runBtn = this.makeButton('run', 'RUN');

    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);
    scene.events.once('shutdown', () => {
      scene.input.off('pointerdown', this.onDown, this);
      scene.input.off('pointermove', this.onMove, this);
      scene.input.off('pointerup', this.onUp, this);
      scene.input.off('pointerupoutside', this.onUp, this);
      resetTouchState();
    });
    this.setVisible(false);
  }

  private makeButton(icon: string, label: string): Phaser.GameObjects.Container {
    const bg = this.scene.add.image(0, 0, 'touch-btn');
    const ic = this.scene.add.image(0, -8, 'icon', icon).setDisplaySize(52, 52);
    const tx = this.scene.add
      .text(0, 34, label, { fontFamily: 'Poppins, sans-serif', fontStyle: '700', fontSize: '18px', color: '#ffffff' })
      .setOrigin(0.5)
      .setAlpha(0.85);
    return this.scene.add.container(0, 0, [bg, ic, tx]).setDepth(100);
  }

  layout(width: number, height: number, userScale: number): void {
    const s = Phaser.Math.Clamp(Math.min(width, height * 1.6) / 1100, 0.7, 1.4) * userScale;
    this.scaleFactor = s;
    this.radius = 80 * s;
    this.base.setScale(s);
    this.knob.setScale(s);
    const pad = 28 * s;
    this.jumpBtn.setScale(s).setPosition(width - pad - 75 * s, height - pad - 80 * s);
    this.runBtn.setScale(s * 0.82).setPosition(width - pad - 215 * s, height - pad - 50 * s);
    this.joyOrigin.set(pad + 120 * s, height - pad - 120 * s);
    if (this.joyPointer === null) this.resetJoystick();
  }

  setVisible(v: boolean): void {
    this.visible = v;
    [this.base, this.knob, this.jumpBtn, this.runBtn].forEach((o) => o.setVisible(v));
    if (!v) resetTouchState();
  }

  get isVisible(): boolean {
    return this.visible;
  }

  private resetJoystick(): void {
    this.base.setPosition(this.joyOrigin.x, this.joyOrigin.y).setAlpha(0.55);
    this.knob.setPosition(this.joyOrigin.x, this.joyOrigin.y).setAlpha(0.7);
    touchState.x = 0;
    touchState.y = 0;
  }

  private hitButton(btn: Phaser.GameObjects.Container, p: Phaser.Input.Pointer): boolean {
    const r = 80 * btn.scaleX;
    return Phaser.Math.Distance.Between(p.x, p.y, btn.x, btn.y) < r;
  }

  /** Pointers over other interactive UI (e.g. the pause button) are ignored. */
  private onDown(p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]): void {
    if (!this.visible || over.length) return;
    touchState.used = true;
    audio.unlock();
    const { width } = this.scene.scale;
    if (this.hitButton(this.jumpBtn, p)) {
      this.jumpPointer = p.id;
      touchState.jump = true;
      this.press(this.jumpBtn, true);
    } else if (this.hitButton(this.runBtn, p)) {
      this.runPointer = p.id;
      touchState.sprint = true;
      this.press(this.runBtn, true);
    } else if (p.x < width * 0.5 && this.joyPointer === null) {
      // Floating joystick: re-centre under the thumb.
      this.joyPointer = p.id;
      this.base.setPosition(p.x, p.y).setAlpha(0.9);
      this.knob.setPosition(p.x, p.y).setAlpha(1);
    } else if (p.x >= width * 0.5 && this.jumpPointer === null) {
      // Anywhere else on the right half also jumps — forgiving for big thumbs.
      this.jumpPointer = p.id;
      touchState.jump = true;
      this.press(this.jumpBtn, true);
    }
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (p.id !== this.joyPointer) return;
    const dx = p.x - this.base.x;
    const dy = p.y - this.base.y;
    const len = Math.hypot(dx, dy);
    const max = this.radius;
    const k = len > max ? max / len : 1;
    this.knob.setPosition(this.base.x + dx * k, this.base.y + dy * k);
    // Dead zone + slight curve for precise slow walking.
    const nx = Phaser.Math.Clamp(dx / max, -1, 1);
    const ny = Phaser.Math.Clamp(dy / max, -1, 1);
    touchState.x = Math.abs(nx) < 0.18 ? 0 : Math.sign(nx) * Math.min(1, Math.abs(nx) * 1.25);
    touchState.y = ny;
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (p.id === this.joyPointer) {
      this.joyPointer = null;
      this.resetJoystick();
    }
    if (p.id === this.jumpPointer) {
      this.jumpPointer = null;
      touchState.jump = false;
      this.press(this.jumpBtn, false);
    }
    if (p.id === this.runPointer) {
      this.runPointer = null;
      touchState.sprint = false;
      this.press(this.runBtn, false);
    }
  }

  private press(btn: Phaser.GameObjects.Container, down: boolean): void {
    const base = btn === this.runBtn ? this.scaleFactor * 0.82 : this.scaleFactor;
    btn.setScale(down ? base * 0.9 : base);
    btn.setAlpha(down ? 1 : 0.85);
  }
}
