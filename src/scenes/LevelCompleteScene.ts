import { COLORS } from '../config/constants';
import { audio } from '../core/AudioManager';
import { LEVELS } from '../levels/levels';
import type { Button } from '../ui/Button';
import { formatTime } from '../utils/math';
import { BaseMenuScene } from './BaseMenuScene';
import type { LevelResultData } from './GameScene';
import { leaveGame } from './overlays';

export class LevelCompleteScene extends BaseMenuScene<LevelResultData> {
  constructor() {
    super('LevelComplete');
  }

  override init(data: LevelResultData): void {
    super.init(data);
    this.overlay = true;
  }

  override create(): void {
    super.create();
    audio.playMusic('menu', 1.5);
  }

  protected build(first: boolean): Button[] {
    const { W, H } = this;
    const r = this.params;
    const fit = Math.min(1, H / (660 * this.s), W / (620 * this.s));
    const s = (this.s = this.s * fit);
    const idx = LEVELS.findIndex((l) => l.id === r.levelId);
    const next = LEVELS[idx + 1];
    const isFinal = !next;
    const pw = 560 * s;
    const ph = 600 * s;
    const top = H / 2 - ph / 2;
    this.panel(W / 2, H / 2, pw, ph);
    this.text(W / 2, top + 54 * s, isFinal ? 'You saved the night!' : 'Level Complete!', 'heading', COLORS.textAccent);
    this.text(W / 2, top + 96 * s, LEVELS[idx]?.name ?? '', 'small', COLORS.textDim);

    // Stars pop in one by one.
    for (let i = 0; i < 3; i++) {
      const earned = r.starFlags ? r.starFlags[i] : i < r.stars;
      const star = this.add.image(W / 2 + (i - 1) * 96 * s, top + 168 * s - (i === 1 ? 14 * s : 0), 'icon', 'star')
        .setDisplaySize(84 * s, 84 * s)
        .setTint(earned ? COLORS.accent : 0x1b1f3b);
      if (first) {
        const sc = star.scale;
        star.setScale(0);
        this.tweens.add({
          targets: star,
          scale: sc,
          duration: 380,
          delay: 300 + i * 260,
          ease: 'Back.easeOut',
          onStart: () => earned && audio.sfx('coin', 1 + i * 0.25),
        });
      }
    }
    const labels = ['Clear', 'Coins ≥ 90%', 'Under par'];
    labels.forEach((l, i) => this.text(W / 2 + (i - 1) * 96 * s, top + 222 * s, l, 'small', COLORS.textDim, 0.75));

    const rows: [string, string, boolean][] = [
      ['Time', formatTime(r.timeMs), r.newBestTime],
      ['Coins', `${r.coins} / ${r.totalCoins}`, false],
      ['Enemies', `${r.enemies}`, false],
      ['Lives lost', `${r.deaths}`, false],
      ['Score', r.score.toLocaleString(), r.newBestScore],
    ];
    rows.forEach(([k, v, best], i) => {
      const y = top + 270 * s + i * 40 * s;
      this.add.text(W / 2 - pw / 2 + 60 * s, y, k, { fontFamily: 'Poppins, sans-serif', fontStyle: '500', fontSize: `${22 * s}px`, color: COLORS.textDim }).setOrigin(0, 0.5);
      this.add.text(W / 2 + pw / 2 - 60 * s, y, v, { fontFamily: 'Poppins, sans-serif', fontStyle: '700', fontSize: `${22 * s}px`, color: COLORS.text }).setOrigin(1, 0.5);
      if (best) {
        const tag = this.add.text(W / 2 + 40 * s, y, 'NEW BEST', { fontFamily: 'Poppins, sans-serif', fontStyle: '700', fontSize: `${14 * s}px`, color: '#1b1f3b', backgroundColor: '#4be3b0', padding: { x: 6 * s, y: 2 * s } }).setOrigin(0.5);
        this.tweens.add({ targets: tag, scale: 1.12, duration: 400, yoyo: true, repeat: -1 });
      }
    });
    if (r.rank > 0) this.text(W / 2, top + 476 * s, `Leaderboard rank #${r.rank}`, 'small', COLORS.textAccent);

    const by = top + ph - 56 * s;
    const buttons: Button[] = [];
    if (next) buttons.push(this.button(W / 2 + 150 * s, by, { label: 'Next', icon: 'play', width: 200 * s, height: 62 * s, color: COLORS.accentDark, onClick: () => leaveGame(this, 'Game', { levelId: next.id }) }, 400));
    else buttons.push(this.button(W / 2 + 150 * s, by, { label: 'Credits', icon: 'info', width: 200 * s, height: 62 * s, color: COLORS.accentDark, onClick: () => leaveGame(this, 'Credits') }, 400));
    buttons.push(
      this.button(W / 2 - 150 * s, by, { label: 'Levels', icon: 'grid', width: 200 * s, height: 62 * s, onClick: () => leaveGame(this, 'LevelSelect') }, 300),
      this.button(W / 2, by, { icon: 'restart', width: 70 * s, height: 62 * s, onClick: () => leaveGame(this, 'Game', { levelId: r.levelId }) }, 350),
    );
    return buttons;
  }

  protected override onBack(): void {
    leaveGame(this, 'LevelSelect');
  }
}
