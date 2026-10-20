import { COLORS } from '../config/constants';
import type { Button } from '../ui/Button';
import { BaseMenuScene } from './BaseMenuScene';
import { leaveGame } from './overlays';

interface GameOverData {
  levelId: string;
}

export class GameOverScene extends BaseMenuScene<GameOverData> {
  constructor() {
    super('GameOver');
  }

  override init(data: GameOverData): void {
    super.init(data);
    this.overlay = true;
  }

  protected build(first: boolean): Button[] {
    const { W, H } = this;
    const s = (this.s = this.s * Math.min(1, H / (480 * this.s)));
    this.panel(W / 2, H / 2, 460 * s, 400 * s);
    const t = this.text(W / 2, H / 2 - 130 * s, 'Game Over', 'title', '#ff8fa3', 0.8);
    if (first) {
      t.setScale(1.6).setAlpha(0);
      this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 500, ease: 'Bounce.easeOut' });
    }
    this.text(W / 2, H / 2 - 66 * s, 'Out of lives — try again!', 'body', COLORS.textDim);
    return [
      this.button(W / 2, H / 2 + 10 * s, { label: 'Retry', icon: 'restart', width: 300 * s, height: 64 * s, color: COLORS.accentDark, onClick: () => leaveGame(this, 'Game', { levelId: this.params.levelId }) }, 300),
      this.button(W / 2, H / 2 + 90 * s, { label: 'Level Select', icon: 'grid', width: 300 * s, height: 64 * s, onClick: () => leaveGame(this, 'LevelSelect') }, 380),
    ];
  }

  protected override onBack(): void {
    leaveGame(this, 'LevelSelect');
  }
}
