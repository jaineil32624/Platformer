import { COLORS } from '../config/constants';
import type { Button } from '../ui/Button';
import { BaseMenuScene } from './BaseMenuScene';

const CREDITS: [string, string][] = [
  ['LUMEN LEAP', 'title'],
  ['Created by', 'h'],
  ['Jaineil Rana', 'p'],
  ['Design · Code · Art · Music', 'h'],
  ['All sprites, tiles, backgrounds, music and sound', 'p'],
  ['effects are generated procedurally in code.', 'p'],
  ['Font', 'h'],
  ['Poppins by Indian Type Foundry & Jonny Pinhorn', 'p'],
  ['SIL Open Font License 1.1 · Google Fonts', 'p'],
  ['Engine & Tools', 'h'],
  ['Phaser 3 (MIT) · TypeScript · Vite', 'p'],
  ['Capacitor (MIT) · Electron (MIT)', 'p'],
  ['Thanks for playing!', 'h'],
  ['See ATTRIBUTION.md for full license details.', 'p'],
];

/** Auto-scrolling credits roll. Tap/click or press a key to speed it up. */
export class CreditsScene extends BaseMenuScene {
  private roll: Phaser.GameObjects.Container | null = null;
  private speed = 40;

  constructor() {
    super('Credits');
  }

  protected build(): Button[] {
    const { W, H, s } = this;
    const buttons = [this.backButton()];
    this.roll = this.add.container(W / 2, H);
    let y = 0;
    for (const [line, kind] of CREDITS) {
      const t =
        kind === 'title'
          ? this.text(0, y, line, 'title', COLORS.textAccent, 0.9)
          : kind === 'h'
            ? this.text(0, y, line, 'heading', COLORS.textAccent, 0.7)
            : this.text(0, y, line, 'body', COLORS.text);
      this.roll.add(t);
      y += (kind === 'title' ? 120 : kind === 'h' ? 70 : 40) * s;
    }
    this.roll.setData('height', y);
    this.input.on('pointerdown', () => (this.speed = 160));
    this.input.on('pointerup', () => (this.speed = 40));
    return buttons;
  }

  override update(_t: number, delta: number): void {
    if (!this.roll) return;
    this.roll.y -= (this.speed * this.s * delta) / 1000;
    const h = this.roll.getData('height') as number;
    if (this.roll.y < -h) this.roll.y = this.H;
  }

  protected override onBack(): void {
    this.goto('MainMenu');
  }
}
