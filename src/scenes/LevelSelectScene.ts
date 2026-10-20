import { COLORS } from '../config/constants';
import { services } from '../core/Services';
import { LEVELS } from '../levels/levels';
import type { Button } from '../ui/Button';
import { formatTime } from '../utils/math';
import { BaseMenuScene } from './BaseMenuScene';

/** Grid of levels with stars, best time and lock state. */
export class LevelSelectScene extends BaseMenuScene {
  constructor() {
    super('LevelSelect');
  }

  protected build(): Button[] {
    const { W, H } = this;
    const save = services().save;
    const cols = 3;
    const rows = Math.ceil(LEVELS.length / cols);
    const fit = Math.min(1, (W * 0.94) / (cols * 330 * this.s), (H - 150 * this.s) / (rows * 200 * this.s));
    const s = (this.s = this.s * Math.max(0.6, fit));
    const buttons: Button[] = [this.backButton()];
    this.heading('Select Level', 60);
    const total = save.totalStars();
    this.add.image(W - 120 * s, 60 * s, 'icon', 'star').setDisplaySize(34 * s, 34 * s).setTint(COLORS.accent);
    this.text(W - 64 * s, 60 * s, `${total}/${LEVELS.length * 3}`, 'number', COLORS.textAccent, 0.8);

    const cw = 310 * s;
    const ch = 180 * s;
    const gx = 20 * s;
    const gy = 20 * s;
    const top = Math.max(120 * s, H / 2 - (rows * ch + (rows - 1) * gy) / 2 + 30 * s);
    const cp = save.slot.checkpoint;

    LEVELS.forEach((lvl, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const x = W / 2 + (c - (cols - 1) / 2) * (cw + gx);
      const y = top + ch / 2 + r * (ch + gy);
      const unlocked = save.isLevelUnlocked(i);
      const rec = save.getRecord(lvl.id);
      const btn = this.button(x, y, {
        width: cw,
        height: ch,
        color: unlocked ? (lvl.boss ? 0x5a2f6e : COLORS.panelLight) : 0x2a2f55,
        disabled: !unlocked,
        onClick: () => this.start(lvl.id, cp?.levelId === lvl.id),
      }, 80 + i * 60);
      buttons.push(btn);
      const add = (o: Phaser.GameObjects.GameObject) => btn.add(o);
      add(this.text(-cw / 2 + 34 * s, -ch / 2 + 32 * s, `${i + 1}`, 'heading', COLORS.textAccent, 0.8));
      add(this.text(0, -ch / 2 + 34 * s, lvl.subtitle, 'small', COLORS.textDim));
      add(this.text(0, -10 * s, lvl.name, 'body', COLORS.text).setWordWrapWidth(cw - 40 * s).setAlign('center'));
      if (!unlocked) {
        add(this.add.image(0, 40 * s, 'icon', 'lock').setDisplaySize(40 * s, 40 * s).setTint(0x8a90c0));
        return;
      }
      for (let k = 0; k < 3; k++) {
        add(this.add.image((k - 1) * 40 * s, 36 * s, 'icon', 'star').setDisplaySize(34 * s, 34 * s).setTint(k < rec.stars ? COLORS.accent : 0x1b1f3b));
      }
      add(this.text(0, 68 * s, rec.bestTimeMs != null ? `Best ${formatTime(rec.bestTimeMs)}` : cp?.levelId === lvl.id ? 'Checkpoint saved' : 'Not cleared', 'small', COLORS.textDim));
    });
    return buttons;
  }

  private start(levelId: string, hasCheckpoint: boolean): void {
    if (!hasCheckpoint) return this.goto('Game', { levelId });
    // Offer to resume from the saved checkpoint, or start over.
    this.confirm('Continue from your last checkpoint?', () => this.goto('Game', { levelId, fromCheckpoint: true }), 'Continue', {
      label: 'Restart level',
      onClick: () => this.goto('Game', { levelId }),
    });
  }

  protected override onBack(): void {
    this.goto('Slots');
  }
}
