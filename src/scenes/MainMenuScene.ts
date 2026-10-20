import Phaser from 'phaser';
import { COLORS } from '../config/constants';
import { audio } from '../core/AudioManager';
import type { Button } from '../ui/Button';
import { Platform, quitApp } from '../utils/platform';
import { BaseMenuScene } from './BaseMenuScene';
import type { BackgroundScene } from './BackgroundScene';


export class MainMenuScene extends BaseMenuScene {
  constructor() {
    super('MainMenu');
  }

  override create(): void {
    (this.scene.get('Background') as BackgroundScene).configure(null);
    audio.playMusic('menu');
    super.create();
  }

  protected build(first: boolean): Button[] {
    const { W, H, s } = this;
    const compact = H < 520 * s;

    // ---- animated logo
    const titleY = H * (compact ? 0.2 : 0.24);
    const word = 'LUMEN LEAP';
    const letters: Phaser.GameObjects.Text[] = [];
    const style = { ...this.textStyleTitle() };
    let totalW = 0;
    const measures = [...word].map((ch) => {
      const t = this.add.text(0, 0, ch, style).setOrigin(0.5);
      totalW += ch === ' ' ? t.width * 0.6 : t.width * 0.94;
      letters.push(t);
      return t.width;
    });
    let x = W / 2 - totalW / 2;
    letters.forEach((t, i) => {
      const w = word[i] === ' ' ? measures[i] * 0.6 : measures[i] * 0.94;
      // Each letter lives in its own container: the container drops in, the letter bobs.
      const holder = this.add.container(x + w / 2, titleY, [t]);
      t.setPosition(0, 0);
      x += w;
      t.setColor(i % 2 === 0 ? '#ffd34d' : '#fff3b0');
      if (first) {
        holder.setY(titleY - 120 * s).setAlpha(0);
        this.tweens.add({ targets: holder, y: titleY, alpha: 1, duration: 600, delay: i * 50, ease: 'Bounce.easeOut' });
      }
      this.tweens.add({ targets: t, y: -8 * s, duration: 900, delay: i * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
    this.text(W / 2, titleY + 62 * s, 'A tiny light on a big adventure', 'body', '#ffffff').setStroke('#1b1f3b', 6 * s);

    // ---- hero bouncing beside the logo
    const hero = this.add.sprite(W / 2 - totalW / 2 - 60 * s, titleY + 10 * s, 'player', 'idle0').setScale(s * 1.3);
    hero.play('player-idle');
    this.tweens.add({ targets: hero, y: hero.y - 26 * s, duration: 520, yoyo: true, repeat: -1, ease: 'Quad.easeOut' });
    const glow = this.add.image(hero.x, hero.y, 'light').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffd98a).setAlpha(0.5).setScale(s * 1.4);
    this.tweens.add({ targets: glow, y: glow.y - 26 * s, duration: 520, yoyo: true, repeat: -1, ease: 'Quad.easeOut' });

    // ---- buttons
    const buttons: Button[] = [];
    const playY = H * (compact ? 0.52 : 0.55);
    buttons.push(
      this.button(W / 2, playY, { label: 'PLAY', icon: 'play', width: 340 * s, height: 86 * s, color: COLORS.accentDark, onClick: () => this.goto('Slots') }, 200),
    );
    const items: [string, string, () => void][] = [
      ['Awards', 'trophy', () => this.goto('Achievements')],
      ['Scores', 'chart', () => this.goto('Leaderboard')],
      ['Settings', 'gear', () => this.goto('Settings', { returnTo: 'MainMenu' })],
      ['Credits', 'info', () => this.goto('Credits')],
    ];
    if (Platform.canQuit()) items.push(['Quit', 'exit', () => quitApp()]);
    const bw = 150 * s;
    const gap = 18 * s;
    const rowW = items.length * bw + (items.length - 1) * gap;
    const rowY = playY + (compact ? 105 : 120) * s;
    items.forEach(([label, icon, fn], i) => {
      buttons.push(
        this.button(W / 2 - rowW / 2 + bw / 2 + i * (bw + gap), rowY, { label, icon, width: bw, height: 64 * s, small: true, onClick: fn }, 300 + i * 60),
      );
    });

    const version = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '1.0.0';
    this.add.text(W - 16 * s, H - 12 * s, `v${version}`, { fontFamily: 'Poppins, sans-serif', fontSize: `${14 * s}px`, color: '#aeb6e8' }).setOrigin(1, 1);
    this.add.text(16 * s, H - 12 * s, Platform.isMobileLike() ? 'Tap to play' : 'Arrows / Enter to navigate', { fontFamily: 'Poppins, sans-serif', fontSize: `${14 * s}px`, color: '#aeb6e8' }).setOrigin(0, 1);
    return buttons;
  }

  private textStyleTitle(): Phaser.Types.GameObjects.Text.TextStyle {
    const s = this.s;
    const size = Math.min(96 * s, this.W / 8);
    return {
      fontFamily: 'Poppins, sans-serif',
      fontStyle: '700',
      fontSize: `${size}px`,
      color: '#ffd34d',
      stroke: '#1b1f3b',
      strokeThickness: Math.round(size * 0.16),
      shadow: { offsetX: 0, offsetY: Math.round(size * 0.08), color: '#0d0f22', blur: 0, fill: true, stroke: true },
    };
  }

  protected override onBack(): void {
    if (Platform.canQuit()) this.confirm('Quit Lumen Leap?', () => quitApp(), 'Quit');
  }
}
