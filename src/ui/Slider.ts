import Phaser from 'phaser';
import { COLORS } from '../config/constants';
import { textStyle } from './theme';

/** Horizontal 0..1 slider with label and live percentage. Drag or tap anywhere on the track. */
export class Slider extends Phaser.GameObjects.Container {
  private track: Phaser.GameObjects.Graphics;
  private knob: Phaser.GameObjects.Arc;
  private valueText: Phaser.GameObjects.Text;
  private trackW: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    s: number,
    label: string,
    private value: number,
    private onChange: (v: number) => void,
  ) {
    super(scene, x, y);
    scene.add.existing(this);
    const labelText = scene.add.text(-width / 2, 0, label, textStyle('body', s)).setOrigin(0, 0.5);
    this.valueText = scene.add.text(width / 2, 0, '', textStyle('body', s, COLORS.textAccent)).setOrigin(1, 0.5);
    this.trackW = width * 0.42;
    const tx = width / 2 - 70 * s - this.trackW;
    this.track = scene.add.graphics({ x: tx, y: 0 });
    this.knob = scene.add.circle(tx, 0, 13 * s, COLORS.accent).setStrokeStyle(4 * s, 0x0d0f22);
    this.add([labelText, this.valueText, this.track, this.knob]);

    const hit = scene.add
      .rectangle(tx + this.trackW / 2, 0, this.trackW + 40 * s, 44 * s, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true, draggable: true });
    this.add(hit);
    const setFromPointer = (p: Phaser.Input.Pointer) => {
      const local = p.x - (this.getWorldTransformMatrix().tx + tx * this.scaleX);
      this.set(Phaser.Math.Clamp(local / (this.trackW * this.scaleX), 0, 1), true);
    };
    hit.on('pointerdown', setFromPointer);
    hit.on('drag', (p: Phaser.Input.Pointer) => setFromPointer(p));
    this.redraw(s);
  }

  private s = 1;

  set(v: number, emit = false): void {
    this.value = Math.round(v * 20) / 20;
    this.redraw(this.s);
    if (emit) this.onChange(this.value);
  }

  /** Keyboard/gamepad nudge. */
  nudge(dir: number): void {
    this.set(Phaser.Math.Clamp(this.value + dir * 0.1, 0, 1), true);
  }

  private redraw(s: number): void {
    this.s = s;
    const h = 10 * s;
    this.track.clear();
    this.track.fillStyle(0x0d0f22, 0.8).fillRoundedRect(0, -h / 2, this.trackW, h, h / 2);
    this.track.fillStyle(COLORS.mint, 1).fillRoundedRect(0, -h / 2, Math.max(h, this.trackW * this.value), h, h / 2);
    this.knob.x = this.track.x + this.trackW * this.value;
    this.valueText.setText(`${Math.round(this.value * 100)}%`);
  }
}
