import Phaser from 'phaser';
import { COLORS, PLAYER } from '../config/constants';
import { touchState } from '../core/InputManager';
import { services } from '../core/Services';
import { getLevel } from '../levels/levels';
import type { Weather } from '../levels/types';
import { TouchControls } from '../ui/TouchControls';
import { textStyle, uiScale } from '../ui/theme';
import { formatTime } from '../utils/math';
import { Platform } from '../utils/platform';
import { listen } from '../utils/sceneEvents';

interface UIData {
  levelId: string;
  lives: number;
  coinTotal: number;
}

/**
 * Heads-up display + screen-space effects that sit above the world:
 * ambient lighting overlay (day/night), vignette, weather, HUD, boss bar,
 * toasts, achievement pop-ups and the touch controls.
 */
export class UIScene extends Phaser.Scene {
  private ambient!: Phaser.GameObjects.Rectangle;
  private vignette!: Phaser.GameObjects.Image;
  private flashRect!: Phaser.GameObjects.Rectangle;
  private weather: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private weatherKind: Weather = 'none';

  private hearts: Phaser.GameObjects.Image[] = [];
  private livesText!: Phaser.GameObjects.Text;
  private livesIcon!: Phaser.GameObjects.Image;
  private coinIcon!: Phaser.GameObjects.Image;
  private coinText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private fpsText!: Phaser.GameObjects.Text;
  private pauseBtn!: Phaser.GameObjects.Container;
  private powerIcons = new Map<string, { icon: Phaser.GameObjects.Image; ring: Phaser.GameObjects.Graphics }>();
  private bossBar!: Phaser.GameObjects.Container;
  private bossFill!: Phaser.GameObjects.Graphics;
  private bossName!: Phaser.GameObjects.Text;
  private toastY = 0;
  private touch!: TouchControls;

  private health: number = PLAYER.maxHealth;
  private maxHealth: number = PLAYER.maxHealth;
  private coinTotal = 0;
  private lives: number = PLAYER.startLives;
  private bossRatio = 1;
  private s = 1;
  private levelId = '';
  private nextLightning = 0;

  constructor() {
    super('UI');
  }

  init(data: UIData): void {
    this.levelId = data.levelId;
    this.lives = data.lives;
    this.coinTotal = data.coinTotal;
    this.health = PLAYER.maxHealth;
    this.powerIcons.clear();
    this.hearts = [];
  }

  create(): void {
    const def = getLevel(this.levelId);
    this.s = uiScale(this);

    this.ambient = this.add.rectangle(0, 0, 10, 10, 0xffffff).setOrigin(0).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.vignette = this.add.image(0, 0, 'vignette').setOrigin(0).setAlpha(0);
    this.setupWeather(def?.weather ?? 'none');
    this.events.once('shutdown', () => this.weather?.destroy());
    this.flashRect = this.add.rectangle(0, 0, 10, 10, 0xe8f0ff).setOrigin(0).setAlpha(0);

    for (let i = 0; i < PLAYER.maxHealth; i++) this.hearts.push(this.add.image(0, 0, 'hud-heart', 'full'));
    this.livesIcon = this.add.image(0, 0, 'hud-life');
    this.livesText = this.add.text(0, 0, '', textStyle('number', this.s)).setOrigin(0, 0.5);
    this.coinIcon = this.add.image(0, 0, 'coin', 'c0');
    this.coinText = this.add.text(0, 0, '', textStyle('number', this.s)).setOrigin(0, 0.5);
    this.timerText = this.add.text(0, 0, '0:00.0', textStyle('number', this.s)).setOrigin(0.5, 0.5);
    this.fpsText = this.add.text(0, 0, '', textStyle('small', this.s, '#9fffcf')).setOrigin(1, 0);

    // Pause button (always visible; essential on touch devices)
    const pbg = this.add.circle(0, 0, 32, 0x1b1f3b, 0.55).setStrokeStyle(3, 0xffffff, 0.6);
    const pic = this.add.image(0, 0, 'icon', 'pause').setDisplaySize(30, 30);
    this.pauseBtn = this.add.container(0, 0, [pbg, pic]).setSize(64, 64).setInteractive({ useHandCursor: true });
    this.pauseBtn.on('pointerup', () => {
      touchState.pause = true;
    });

    // Boss bar
    const bbg = this.add.graphics();
    this.bossFill = this.add.graphics();
    this.bossName = this.add.text(0, -26, '', textStyle('body', this.s, '#ffd1dc')).setOrigin(0.5);
    this.bossBar = this.add.container(0, 0, [bbg, this.bossFill, this.bossName]).setVisible(false);
    this.bossBar.setData('bg', bbg);

    this.touch = new TouchControls(this);

    // ---- events
    listen(this, 'health-changed', ({ health, max }) => {
      const lost = health < this.health;
      this.health = health;
      this.maxHealth = max;
      this.refreshHearts(lost);
    });
    listen(this, 'lives-changed', ({ lives }) => {
      this.lives = lives;
      this.livesText.setText(`×${lives}`);
      this.tweens.add({ targets: this.livesText, scale: 1.3, duration: 120, yoyo: true });
    });
    listen(this, 'coin-collected', ({ total }) => {
      this.coinText.setText(`${total}/${this.coinTotal}`);
      this.tweens.killTweensOf(this.coinIcon);
      this.coinIcon.setScale(this.s * 1.3);
      this.tweens.add({ targets: this.coinIcon, scale: this.s * 0.95, duration: 160 });
    });
    listen(this, 'powerup-timer', ({ kind, remaining, duration }) => this.updatePowerIcon(kind, remaining / duration));
    listen(this, 'boss-health', (b) => this.updateBoss(b));
    listen(this, 'toast', ({ text, color }) => this.toast(text, color));
    listen(this, 'achievement-unlocked', ({ title }) => this.achievementToast(title));

    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
    this.layout();
    this.refreshHearts(false);
    this.livesText.setText(`×${this.lives}`);
    this.coinText.setText(`0/${this.coinTotal}`);
    if (def) this.levelBanner(def.name, def.subtitle);
  }

  /** Whether the on-screen controls are showing (affects tutorial text). */
  get touchVisible(): boolean {
    return this.touch?.isVisible ?? false;
  }

  private shouldShowTouch(): boolean {
    const mode = services().save.settings.touchControls;
    if (mode === 'on') return true;
    if (mode === 'off') return false;
    return Platform.isMobileLike() || touchState.used;
  }

  private layout(): void {
    const { width, height } = this.scale;
    const s = (this.s = uiScale(this));
    const safe = 18 * s;
    this.ambient.setSize(width, height);
    this.flashRect.setSize(width, height);
    this.vignette.setDisplaySize(width, height);

    let x = safe + 20 * s;
    const y = safe + 22 * s;
    this.hearts.forEach((h, i) => h.setPosition(x + i * 40 * s, y).setScale(s));
    x += this.hearts.length * 40 * s + 16 * s;
    this.livesIcon.setPosition(x, y).setScale(s * 0.9);
    this.livesText.setPosition(x + 22 * s, y).setStyle(textStyle('number', s));
    this.coinIcon.setPosition(safe + 20 * s, y + 46 * s).setScale(s * 0.95);
    this.coinText.setPosition(safe + 42 * s, y + 46 * s).setStyle(textStyle('number', s));
    this.timerText.setPosition(width / 2, y).setStyle(textStyle('number', s));
    this.pauseBtn.setPosition(width - safe - 32 * s, y + 10 * s).setScale(s * 1.1);
    this.fpsText.setPosition(width - safe - 80 * s, safe).setStyle(textStyle('small', s, '#9fffcf'));

    // Boss bar
    const bw = Math.min(520 * s, width * 0.6);
    const bh = 22 * s;
    this.bossBar.setPosition(width / 2, y + 74 * s);
    const bg = this.bossBar.getData('bg') as Phaser.GameObjects.Graphics;
    bg.clear().fillStyle(0x0d0f22, 0.8).fillRoundedRect(-bw / 2 - 4, -bh / 2 - 4, bw + 8, bh + 8, bh / 2 + 4);
    this.bossBar.setData('w', bw);
    this.bossBar.setData('h', bh);
    this.bossName.setStyle(textStyle('body', s, '#ffd1dc')).setY(-bh - 10 * s);
    this.drawBossFill();

    let i = 0;
    for (const { icon, ring } of this.powerIcons.values()) {
      const px = safe + 30 * s + i * 62 * s;
      const py = y + 100 * s;
      icon.setPosition(px, py).setScale(s * 0.85);
      ring.setPosition(px, py);
      i++;
    }

    this.touch.layout(width, height, services().save.settings.touchScale);
    this.touch.setVisible(this.shouldShowTouch());
  }

  private refreshHearts(lost: boolean): void {
    this.hearts.forEach((h, i) => {
      const full = i < this.health;
      h.setFrame(full ? 'full' : 'empty');
      if (lost && i === this.health) {
        this.tweens.add({ targets: h, scale: this.s * 1.5, duration: 100, yoyo: true });
      }
    });
    // Low-health heartbeat
    this.tweens.killTweensOf(this.hearts[0]);
    this.hearts[0]?.setScale(this.s);
    if (this.health === 1) this.tweens.add({ targets: this.hearts[0], scale: this.s * 1.2, duration: 300, yoyo: true, repeat: -1 });
    void this.maxHealth;
  }

  private updatePowerIcon(kind: string, ratio: number): void {
    let entry = this.powerIcons.get(kind);
    if (!entry && ratio > 0) {
      entry = { icon: this.add.image(0, 0, 'powerup-icon', kind), ring: this.add.graphics() };
      this.powerIcons.set(kind, entry);
      this.layout();
    }
    if (!entry) return;
    if (ratio <= 0) {
      entry.icon.destroy();
      entry.ring.destroy();
      this.powerIcons.delete(kind);
      this.layout();
      return;
    }
    const r = 26 * this.s;
    entry.ring.clear();
    entry.ring.lineStyle(5 * this.s, 0x0d0f22, 0.6).strokeCircle(0, 0, r);
    entry.ring.lineStyle(5 * this.s, ratio < 0.25 ? COLORS.danger : COLORS.mint, 1);
    entry.ring.beginPath();
    entry.ring.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
    entry.ring.strokePath();
    entry.icon.setAlpha(ratio < 0.25 && Math.floor(this.time.now / 150) % 2 ? 0.4 : 1);
  }

  private updateBoss(b: { current: number; max: number; name: string } | null): void {
    if (!b) {
      if (this.bossBar.visible) this.tweens.add({ targets: this.bossBar, alpha: 0, duration: 400, onComplete: () => this.bossBar.setVisible(false) });
      return;
    }
    if (!this.bossBar.visible) {
      this.bossBar.setVisible(true).setAlpha(0);
      this.tweens.add({ targets: this.bossBar, alpha: 1, duration: 400 });
    }
    this.bossName.setText(b.name);
    this.bossRatio = b.current / b.max;
    this.drawBossFill();
    this.tweens.add({ targets: this.bossBar, x: this.bossBar.x + 6, duration: 50, yoyo: true, repeat: 2 });
  }

  private drawBossFill(): void {
    const w = (this.bossBar.getData('w') as number) ?? 300;
    const h = (this.bossBar.getData('h') as number) ?? 20;
    this.bossFill.clear();
    this.bossFill.fillStyle(0x3a1030, 1).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    if (this.bossRatio > 0) {
      this.bossFill.fillGradientStyle(0xff8fb1, 0xff8fb1, 0xff2e63, 0xff2e63, 1);
      this.bossFill.fillRect(-w / 2 + h / 4, -h / 2 + 2, Math.max(0, (w - h / 2) * this.bossRatio), h - 4);
    }
  }

  // ------------------------------------------------------------ TOASTS

  toast(text: string, color: string = COLORS.text): void {
    const { width } = this.scale;
    const s = this.s;
    const t = this.add.text(width / 2, 140 * s + this.toastY, text, textStyle('heading', s * 0.8, color)).setOrigin(0.5).setAlpha(0);
    this.toastY += 50 * s;
    this.tweens.add({ targets: t, alpha: 1, y: t.y - 10 * s, duration: 250, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: t,
      alpha: 0,
      delay: 1900,
      duration: 400,
      onComplete: () => {
        t.destroy();
        this.toastY = Math.max(0, this.toastY - 50 * s);
      },
    });
  }

  private achievementToast(title: string): void {
    const { width } = this.scale;
    const s = this.s;
    const w = 380 * s;
    const h = 86 * s;
    const g = this.add.graphics();
    g.fillStyle(0x0d0f22, 0.4).fillRoundedRect(-w / 2, -h / 2 + 6 * s, w, h, 18 * s);
    g.fillStyle(COLORS.panel, 0.97).fillRoundedRect(-w / 2, -h / 2, w, h, 18 * s);
    g.lineStyle(4 * s, COLORS.accent, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 18 * s);
    const icon = this.add.image(-w / 2 + 44 * s, 0, 'icon', 'trophy').setDisplaySize(46 * s, 46 * s).setTint(COLORS.accent);
    const head = this.add.text(-w / 2 + 82 * s, -16 * s, 'Achievement unlocked!', textStyle('small', s, COLORS.textAccent)).setOrigin(0, 0.5);
    const name = this.add.text(-w / 2 + 82 * s, 14 * s, title, textStyle('body', s)).setOrigin(0, 0.5);
    const c = this.add.container(width + w, this.scale.height - h - 30 * s, [g, icon, head, name]);
    this.tweens.add({ targets: c, x: width - w / 2 - 24 * s, duration: 420, ease: 'Back.easeOut' });
    this.tweens.add({ targets: c, x: width + w, delay: 3200, duration: 380, ease: 'Cubic.easeIn', onComplete: () => c.destroy() });
    services().audio.sfx('achievement');
  }

  private levelBanner(name: string, subtitle: string): void {
    const { width, height } = this.scale;
    const s = this.s;
    const sub = this.add.text(width / 2, height * 0.32, subtitle.toUpperCase(), textStyle('body', s, COLORS.textAccent)).setOrigin(0.5);
    const title = this.add.text(width / 2, height * 0.32 + 52 * s, name, textStyle('title', s * 0.85)).setOrigin(0.5);
    for (const [i, t] of [sub, title].entries()) {
      t.setAlpha(0).setY(t.y + 30 * s);
      this.tweens.add({ targets: t, alpha: 1, y: t.y - 30 * s, duration: 500, delay: 200 + i * 120, ease: 'Back.easeOut' });
      this.tweens.add({ targets: t, alpha: 0, y: t.y - 60 * s, delay: 2400, duration: 500, onComplete: () => t.destroy() });
    }
  }

  // ------------------------------------------------------------ WORLD FX

  private setupWeather(kind: Weather): void {
    this.weatherKind = kind;
    const { width, height } = this.scale;
    const low = services().save.settings.particles === 'low';
    const rate = (n: number) => (low ? n * 3 : n);
    switch (kind) {
      case 'rain':
        this.weather = this.add.particles(0, -30, 'p-rain', {
          x: { min: -200, max: width + 200 },
          lifespan: 900,
          speedY: { min: 1100, max: 1400 },
          speedX: -220,
          rotate: 12,
          alpha: { min: 0.25, max: 0.6 },
          scaleY: { min: 1, max: 1.8 },
          frequency: rate(8),
          quantity: 2,
        });
        break;
      case 'leaves':
        this.weather = this.add.particles(0, -20, 'p-leaf', {
          x: { min: 0, max: width * 1.3 },
          lifespan: 9000,
          speedY: { min: 40, max: 90 },
          speedX: { min: -80, max: -20 },
          rotate: { start: 0, end: 720 },
          scale: { min: 0.8, max: 1.4 },
          tint: [0x8bd66b, 0xf2b84b, 0xe9845a],
          alpha: 0.8,
          frequency: rate(700),
        });
        break;
      case 'fireflies':
      case 'dust':
        this.weather = this.add.particles(0, 0, 'p-dot', {
          x: { min: 0, max: width },
          y: { min: height * 0.2, max: height },
          lifespan: { min: 2500, max: 5000 },
          speedX: { min: -25, max: 25 },
          speedY: { min: -30, max: 10 },
          scale: kind === 'fireflies' ? { start: 0.35, end: 0.05 } : { start: 0.2, end: 0.05 },
          // Fade in and out over each particle's life.
          alpha: { onUpdate: (_p: unknown, _k: string, t: number) => Math.sin(t * Math.PI) * 0.9 },
          tint: kind === 'fireflies' ? [0xfff27a, 0xd8ff7a] : [0x9fd8ff, 0xc9b6ff],
          blendMode: Phaser.BlendModes.ADD,
          frequency: rate(160),
        });
        break;
      default:
        this.weather = null;
    }
  }

  setAmbient(color: number, night: number): void {
    this.ambient.setFillStyle(color, 1);
    const caveOrNight = this.weatherKind === 'dust' ? 0.45 : night * 0.4;
    this.vignette.setAlpha(caveOrNight);
  }

  setTimer(ms: number): void {
    this.timerText.setText(formatTime(ms));
  }

  override update(time: number): void {
    const settings = services().save.settings;
    this.fpsText.setVisible(settings.showFps);
    if (settings.showFps) this.fpsText.setText(`${Math.round(this.game.loop.actualFps)} FPS`);
    const shouldShow = this.shouldShowTouch();
    if (shouldShow !== this.touch.isVisible) this.touch.setVisible(shouldShow);

    // Storm lightning
    if (this.weatherKind === 'rain' && time > this.nextLightning) {
      this.nextLightning = time + Phaser.Math.Between(5000, 11000);
      if (settings.screenShake) {
        this.flashRect.setAlpha(0.55);
        this.tweens.add({ targets: this.flashRect, alpha: 0, duration: 450, ease: 'Cubic.easeOut' });
      }
    }
  }
}
