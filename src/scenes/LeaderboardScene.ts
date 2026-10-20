import { COLORS } from '../config/constants';
import { services } from '../core/Services';
import { LEVELS } from '../levels/levels';
import type { Button } from '../ui/Button';
import { formatTime } from '../utils/math';
import { BaseMenuScene } from './BaseMenuScene';

interface LeaderboardData {
  levelIndex?: number;
}

/** Top-10 scores per level from the configured LeaderboardProvider. */
export class LeaderboardScene extends BaseMenuScene<LeaderboardData> {
  private levelIndex = 0;

  constructor() {
    super('Leaderboard');
  }

  override init(data: LeaderboardData): void {
    super.init(data);
    this.levelIndex = data?.levelIndex ?? 0;
  }

  protected build(): Button[] {
    const { W, H } = this;
    const fit = Math.min(1, (W * 0.96) / (LEVELS.length * 120 * this.s + 40 * this.s), (H - 20 * this.s) / (640 * this.s));
    const s = (this.s = this.s * Math.max(0.5, fit));
    const buttons: Button[] = [this.backButton()];
    this.heading('Leaderboards', 56);
    const lb = services().leaderboard;

    // Level tabs
    const tw = 110 * s;
    LEVELS.forEach((lvl, i) => {
      const b = this.button(W / 2 + (i - (LEVELS.length - 1) / 2) * (tw + 10 * s), 124 * s, {
        label: `${i + 1}`,
        icon: lvl.boss ? 'crown' : undefined,
        width: tw,
        height: 52 * s,
        color: i === this.levelIndex ? COLORS.accentDark : COLORS.panelLight,
        onClick: () => {
          this.levelIndex = i;
          this.rebuild(false);
        },
      }, i * 40);
      buttons.push(b);
    });
    const lvl = LEVELS[this.levelIndex];
    this.text(W / 2, 176 * s, `${lvl.name} · ${lb.label}`, 'body', COLORS.textDim);

    const tableW = Math.min(760 * s, W * 0.94);
    const rowH = 38 * s;
    const top = 210 * s;
    this.panel(W / 2, top + (rowH * 11) / 2 + 6 * s, tableW, rowH * 11 + 24 * s);
    const colsX = [-0.42, -0.3, 0.12, 0.3, 0.44].map((f) => W / 2 + f * tableW);
    const header = ['#', 'Name', 'Score', 'Time', 'Coins'];
    header.forEach((h, i) => this.add.text(colsX[i], top + rowH / 2, h, { fontFamily: 'Poppins, sans-serif', fontStyle: '700', fontSize: `${18 * s}px`, color: COLORS.textAccent }).setOrigin(i === 1 ? 0 : 0.5, 0.5));

    void lb.top(lvl.id, 10).then((entries) => {
      if (!this.scene.isActive()) return;
      if (!entries.length) {
        this.text(W / 2, top + rowH * 4, 'No scores yet — finish this level to set one!', 'body', COLORS.textDim);
        return;
      }
      entries.forEach((e, r) => {
        const y = top + rowH * (r + 1.5);
        const medal = [COLORS.accent, 0xd6dcf0, 0xe0a46b][r];
        const style = (bold: boolean, color: string = COLORS.text) => ({ fontFamily: 'Poppins, sans-serif', fontStyle: bold ? '700' : '500', fontSize: `${18 * s}px`, color });
        if (medal) this.add.circle(colsX[0], y, 14 * s, medal).setStrokeStyle(2 * s, 0x0d0f22);
        this.add.text(colsX[0], y, `${r + 1}`, style(true, medal ? '#1b1f3b' : COLORS.text)).setOrigin(0.5);
        this.add.text(colsX[1], y, e.name, style(true)).setOrigin(0, 0.5);
        this.add.text(colsX[2], y, e.score.toLocaleString(), style(false)).setOrigin(0.5);
        this.add.text(colsX[3], y, formatTime(e.timeMs), style(false)).setOrigin(0.5);
        this.add.text(colsX[4], y, `${e.coins}`, style(false)).setOrigin(0.5);
      });
    });
    void H;
    return buttons;
  }

  protected override onBack(): void {
    this.goto('MainMenu');
  }
}
