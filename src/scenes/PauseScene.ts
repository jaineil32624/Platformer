import { COLORS } from '../config/constants';
import { audio } from '../core/AudioManager';
import { services } from '../core/Services';
import { getLevel } from '../levels/levels';
import type { Button } from '../ui/Button';
import { BaseMenuScene } from './BaseMenuScene';
import { leaveGame } from './overlays';

interface PauseData {
  levelId: string;
}

export class PauseScene extends BaseMenuScene<PauseData> {
  constructor() {
    super('Pause');
  }

  override init(data: PauseData): void {
    super.init(data);
    this.overlay = true;
  }

  override create(): void {
    super.create();
    // Coming back from the Settings overlay.
    this.events.on('wake', () => this.rebuild(false));
  }

  protected build(first: boolean): Button[] {
    const { W, H } = this;
    const fit = Math.min(1, H / (620 * this.s));
    const s = (this.s = this.s * fit);
    const lvl = getLevel(this.params.levelId);
    const pw = 420 * s;
    const ph = 560 * s;
    const p = this.panel(W / 2, H / 2, pw, ph);
    if (first) {
      p.setScale(0.8).setAlpha(0);
      this.tweens.add({ targets: p, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });
    }
    this.text(W / 2, H / 2 - ph / 2 + 50 * s, 'Paused', 'heading', COLORS.text);
    this.text(W / 2, H / 2 - ph / 2 + 92 * s, lvl?.name ?? '', 'small', COLORS.textDim);

    const items: [string, string, () => void, number?][] = [
      ['Resume', 'play', () => this.resume(), COLORS.accentDark],
      ['Restart', 'restart', () => leaveGame(this, 'Game', { levelId: this.params.levelId })],
      ['Settings', 'gear', () => this.openSettings()],
      ['Level Select', 'grid', () => leaveGame(this, 'LevelSelect')],
      ['Save & Quit', 'home', () => leaveGame(this, 'MainMenu')],
    ];
    return items.map(([label, icon, fn, color], i) =>
      this.button(W / 2, H / 2 - ph / 2 + 160 * s + i * 80 * s, { label, icon, width: 320 * s, height: 64 * s, color, onClick: fn }, first ? 60 + i * 40 : 0),
    );
  }

  private resume(): void {
    audio.setDucked(false);
    this.scene.stop();
    this.scene.resume('UI');
    this.scene.resume('Game');
  }

  private openSettings(): void {
    services().save.flush();
    this.scene.launch('Settings', { returnTo: 'Pause' });
    this.scene.sleep();
  }

  protected override onBack(): void {
    this.resume();
  }
}
