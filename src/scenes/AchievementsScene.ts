import { COLORS } from '../config/constants';
import { createSlotData } from '../core/SaveManager';
import { services } from '../core/Services';
import type { Button } from '../ui/Button';
import { BaseMenuScene } from './BaseMenuScene';

/** Achievement gallery for the active save slot, with progress bars. */
export class AchievementsScene extends BaseMenuScene {
  constructor() {
    super('Achievements');
  }

  protected build(): Button[] {
    const { W, H } = this;
    const { achievements, save } = services();
    const defs = achievements.definitions;
    const slot = save.slotOrNull ?? createSlotData();
    const ctx = achievements.context(slot);
    const cols = W > H * 1.2 ? 2 : 1;
    const rows = Math.ceil(defs.length / cols);
    const fit = Math.min(1, (W * 0.95) / (cols * 520 * this.s), (H - 130 * this.s) / (rows * 66 * this.s));
    const s = (this.s = this.s * Math.max(0.45, fit));
    const buttons: Button[] = [this.backButton()];
    const unlocked = defs.filter((d) => slot.achievements[d.id]).length;
    this.heading(`Achievements  ${unlocked}/${defs.length}`, 56);
    if (!save.slotOrNull) this.text(W / 2, 100 * s, 'Pick a save slot to start earning achievements', 'small', COLORS.textDim);

    const cw = 500 * s;
    const ch = 58 * s;
    const top = 120 * s;
    defs.forEach((d, i) => {
      const c = cols === 1 ? 0 : i % cols;
      const r = cols === 1 ? i : Math.floor(i / cols);
      const x = W / 2 + (cols === 1 ? 0 : (c - 0.5) * (cw + 16 * s));
      const y = top + ch / 2 + r * (ch + 8 * s);
      const got = !!slot.achievements[d.id];
      const card = this.add.container(x, y);
      const g = this.add.graphics();
      g.fillStyle(got ? 0x3a4590 : 0x232a5c, 0.95).fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 14 * s);
      g.lineStyle(3 * s, got ? COLORS.accent : 0x0d0f22, 1).strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 14 * s);
      const icon = this.add.image(-cw / 2 + 32 * s, 0, 'icon', got ? d.icon : 'lock').setDisplaySize(34 * s, 34 * s).setTint(got ? COLORS.accent : 0x6b72a8);
      const title = this.add.text(-cw / 2 + 62 * s, -12 * s, d.title, { fontFamily: 'Poppins, sans-serif', fontStyle: '700', fontSize: `${20 * s}px`, color: got ? COLORS.text : '#8f97c9' }).setOrigin(0, 0.5);
      const desc = this.add.text(-cw / 2 + 62 * s, 12 * s, d.description, { fontFamily: 'Poppins, sans-serif', fontStyle: '500', fontSize: `${15 * s}px`, color: COLORS.textDim }).setOrigin(0, 0.5);
      card.add([g, icon, title, desc]);
      if (!got && d.progress) {
        const [cur, max] = d.progress(ctx);
        const bw = 110 * s;
        const bar = this.add.graphics();
        bar.fillStyle(0x0d0f22, 1).fillRoundedRect(cw / 2 - bw - 14 * s, -5 * s, bw, 10 * s, 5 * s);
        bar.fillStyle(COLORS.mint, 1).fillRoundedRect(cw / 2 - bw - 14 * s, -5 * s, Math.max(10 * s, (bw * cur) / max), 10 * s, 5 * s);
        const label = this.add.text(cw / 2 - 14 * s - bw / 2, -18 * s, `${cur}/${max}`, { fontFamily: 'Poppins, sans-serif', fontSize: `${13 * s}px`, color: COLORS.textDim }).setOrigin(0.5);
        card.add([bar, label]);
      } else if (got) {
        card.add(this.add.image(cw / 2 - 30 * s, 0, 'icon', 'check').setDisplaySize(28 * s, 28 * s).setTint(COLORS.mint));
      }
      card.setAlpha(0);
      this.tweens.add({ targets: card, alpha: 1, duration: 250, delay: i * 30 });
    });
    return buttons;
  }

  protected override onBack(): void {
    this.goto('MainMenu');
  }
}
