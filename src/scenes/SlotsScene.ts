import { COLORS, SAVE_SLOTS } from '../config/constants';
import { services } from '../core/Services';
import { LEVELS } from '../levels/levels';
import type { Button } from '../ui/Button';
import { BaseMenuScene } from './BaseMenuScene';

/** Save-slot picker: three independent profiles with progress summaries. */
export class SlotsScene extends BaseMenuScene {
  constructor() {
    super('Slots');
  }

  protected build(): Button[] {
    const { W, H } = this;
    const save = services().save;
    const fit = Math.min(1, (W * 0.94) / (3 * 330 * this.s + 2 * 24 * this.s), H / (560 * this.s));
    const s = (this.s = this.s * fit);
    const buttons: Button[] = [this.backButton()];
    this.heading('Choose a Save', 60);

    const cardW = 330 * s;
    const cardH = 300 * s;
    const gap = 24 * s;
    const totalW = SAVE_SLOTS * cardW + (SAVE_SLOTS - 1) * gap;
    const cy = H * 0.52;
    for (let i = 0; i < SAVE_SLOTS; i++) {
      const cx = W / 2 - totalW / 2 + cardW / 2 + i * (cardW + gap);
      const slot = save.getSlot(i);
      const isActive = save.activeSlotIndex === i;
      this.panel(cx, cy, cardW, cardH, isActive ? COLORS.panelLight : COLORS.panel);
      this.text(cx, cy - cardH / 2 + 34 * s, `Slot ${i + 1}`, 'heading', isActive ? COLORS.textAccent : COLORS.text, 0.75);
      if (slot) {
        const done = Object.values(slot.levels).filter((r) => r.completed).length;
        const stars = save.totalStars(slot);
        const mins = Math.floor(slot.stats.playTimeMs / 60000);
        const last = new Date(slot.updatedAt).toLocaleDateString();
        this.text(cx, cy - 40 * s, `${done}/${LEVELS.length} levels`, 'body');
        this.add.image(cx - 34 * s, cy - 4 * s, 'icon', 'star').setDisplaySize(26 * s, 26 * s).setTint(COLORS.accent);
        this.text(cx + 12 * s, cy - 4 * s, `${stars}/${LEVELS.length * 3}`, 'body', COLORS.textAccent);
        this.text(cx, cy + 30 * s, `${slot.stats.coins} coins · ${mins}m · ${last}`, 'small', COLORS.textDim);
        buttons.push(
          this.button(cx - 34 * s, cy + cardH / 2 - 52 * s, { label: 'Play', icon: 'play', width: 200 * s, height: 60 * s, color: COLORS.accentDark, onClick: () => this.open(i) }, 120 + i * 80),
          this.button(cx + 104 * s, cy + cardH / 2 - 52 * s, {
            icon: 'trash',
            width: 64 * s,
            height: 60 * s,
            color: COLORS.danger,
            onClick: () =>
              this.confirm(`Delete Slot ${i + 1}? This cannot be undone.`, () => {
                save.deleteSlot(i);
                this.rebuild(false);
              }, 'Delete'),
          }, 160 + i * 80),
        );
      } else {
        this.add.image(cx, cy - 10 * s, 'icon', 'save').setDisplaySize(64 * s, 64 * s).setTint(0x5a649e);
        this.text(cx, cy + 40 * s, 'Empty', 'body', COLORS.textDim);
        buttons.push(
          this.button(cx, cy + cardH / 2 - 52 * s, { label: 'New Game', width: 260 * s, height: 60 * s, color: COLORS.mint, textColor: '#1b1f3b', onClick: () => this.open(i) }, 120 + i * 80),
        );
      }
    }
    this.text(W / 2, H - 34 * s, 'Progress saves automatically at checkpoints and level ends.', 'small', COLORS.textDim);
    return buttons;
  }

  private open(i: number): void {
    services().save.useSlot(i);
    services().save.flush();
    this.goto('LevelSelect');
  }

  protected override onBack(): void {
    this.goto('MainMenu');
  }
}
