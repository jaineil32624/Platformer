import Phaser from 'phaser';
import { celestial, computeSky, SkyState } from '../gfx/Sky';
import type { LevelTheme } from '../levels/types';
import { lerpColor, seededRandom } from '../utils/math';

interface Layer {
  sprite: Phaser.GameObjects.TileSprite;
  factor: number;
  /** Fraction of screen height where the layer's top sits. */
  top: number;
  tintKey: 'far' | 'mid' | 'near';
}

/**
 * Always-running scene rendered underneath everything: sky gradient, sun,
 * moon, stars, drifting clouds and three parallax layers. Gameplay drives it
 * with `follow()`; menus leave it in auto-scroll "attract" mode where the
 * day/night cycle plays on its own.
 */
export class BackgroundScene extends Phaser.Scene {
  private sky!: Phaser.GameObjects.Graphics;
  private sun!: Phaser.GameObjects.Image;
  private moon!: Phaser.GameObjects.Image;
  private stars: Phaser.GameObjects.Image[] = [];
  private clouds: Phaser.GameObjects.Image[] = [];
  private layers: Layer[] = [];
  private theme: LevelTheme | null = null;

  private time_ = 0.3;
  private scrollX = 0;
  private scrollY = 0;
  private attract = true;
  private lastSky: SkyState | null = null;
  private skyRedrawAt = 0;

  constructor() {
    super('Background');
  }

  create(): void {
    this.sky = this.add.graphics();
    this.moon = this.add.image(0, 0, 'moon');
    this.sun = this.add.image(0, 0, 'sun');
    const rnd = seededRandom(2024);
    for (let i = 0; i < 70; i++) {
      const s = this.add.image(0, 0, 'p-dot').setScale(0.12 + rnd() * 0.22).setBlendMode(Phaser.BlendModes.ADD);
      s.setData('fx', rnd());
      s.setData('fy', rnd() * 0.6);
      s.setData('tw', rnd() * Math.PI * 2);
      this.stars.push(s);
    }
    for (let i = 0; i < 5; i++) {
      const c = this.add.image(0, 0, `cloud${i % 3}`);
      c.setData('fx', rnd());
      c.setData('fy', 0.08 + rnd() * 0.3);
      c.setData('speed', 6 + rnd() * 10);
      c.setData('depth', 0.04 + rnd() * 0.06);
      this.clouds.push(c);
    }
    this.buildLayers(null);
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.layout, this));
    this.layout();
  }

  /** Switch theme (null = menu default). */
  configure(theme: LevelTheme | null, time?: number): void {
    if (this.theme !== theme) this.buildLayers(theme);
    this.theme = theme;
    this.attract = theme === null;
    if (time !== undefined) this.time_ = time;
    this.lastSky = null;
  }

  /** Called by GameScene each frame with its camera position and level time. */
  follow(scrollX: number, scrollY: number, time: number): void {
    this.attract = false;
    this.scrollX = scrollX;
    this.scrollY = scrollY;
    this.time_ = time;
  }

  get skyState(): SkyState {
    return this.lastSky ?? computeSky(this.time_, this.theme);
  }

  private buildLayers(theme: LevelTheme | null): void {
    this.layers.forEach((l) => l.sprite.destroy());
    this.layers = [];
    const cave = theme === 'cave';
    const defs: [string, number, number, Layer['tintKey']][] = cave
      ? [
          ['bg-cave-far', 0.12, 0.0, 'far'],
          ['bg-cave-mid', 0.3, 0.0, 'mid'],
        ]
      : [
          ['bg-mountains', 0.08, 0.2, 'far'],
          ['bg-hills', 0.22, 0.42, 'mid'],
          ['bg-bushes', 0.42, 0.55, 'near'],
        ];
    for (const [key, factor, top, tintKey] of defs) {
      const tex = this.textures.get(key).getSourceImage();
      const sprite = this.add.tileSprite(0, 0, this.scale.width, tex.height, key).setOrigin(0, 0);
      this.layers.push({ sprite, factor, top, tintKey });
    }
    this.stars.forEach((s) => s.setVisible(!cave));
    this.clouds.forEach((c) => c.setVisible(!cave));
    this.sun.setVisible(!cave);
    this.moon.setVisible(!cave);
    this.layout();
  }

  private layout(): void {
    const { width, height } = this.scale;
    for (const l of this.layers) {
      const texH = this.textures.get(l.sprite.texture.key).getSourceImage().height;
      if (l.sprite.texture.key.startsWith('bg-cave')) {
        const s = Math.max(height / 720, 0.5);
        l.sprite.setTileScale(s, s).setSize(width, height).setPosition(0, 0);
        continue;
      }
      // Scale so the layer always reaches the bottom of the screen (plus margin for vertical parallax).
      const s = Math.max(height / 720, (height * (1 - l.top) + 50) / texH);
      l.sprite.setTileScale(s, s).setSize(width, texH * s).setPosition(0, height * l.top);
    }
    this.lastSky = null;
  }

  override update(time: number, delta: number): void {
    const dt = delta / 1000;
    const { width, height } = this.scale;
    if (this.attract) {
      this.scrollX += dt * 40;
      this.time_ = (this.time_ + dt / 90) % 1; // one full day every 90s in menus
    }

    // Sky colours are cheap to compute but redrawing the gradient every frame
    // isn't necessary — 10 Hz is visually identical.
    if (!this.lastSky || time > this.skyRedrawAt) {
      this.skyRedrawAt = time + 100;
      const s = computeSky(this.time_, this.theme);
      this.lastSky = s;
      this.sky.clear();
      this.sky.fillGradientStyle(s.skyTop, s.skyTop, s.skyBottom, s.skyBottom, 1);
      this.sky.fillRect(0, 0, width, height);
      for (const l of this.layers) l.sprite.setTint(s[l.tintKey]);
      const cloudTint = lerpColor(0xffffff, s.far, 0.45 + s.night * 0.4);
      this.clouds.forEach((c) => c.setTint(cloudTint).setAlpha(0.9 - s.night * 0.55));
    }
    const s = this.lastSky;

    // Sun & moon
    const cel = celestial(this.time_);
    const sz = Math.max(0.6, height / 900);
    this.sun.setPosition(cel.sun[0] * width, cel.sun[1] * height).setScale(sz).setAlpha(cel.sun[2] ? 1 : 0);
    this.moon.setPosition(cel.moon[0] * width, cel.moon[1] * height).setScale(sz).setAlpha(cel.moon[2] ? 1 : 0);

    // Stars twinkle at night
    for (const st of this.stars) {
      const tw = (st.getData('tw') as number) + dt * 2;
      st.setData('tw', tw);
      st.setPosition((st.getData('fx') as number) * width, (st.getData('fy') as number) * height);
      st.setAlpha(Math.max(0, s.night - 0.2) * (0.55 + 0.45 * Math.sin(tw)));
    }

    // Clouds drift and parallax slightly
    for (const c of this.clouds) {
      let fx = (c.getData('fx') as number) + (dt * (c.getData('speed') as number)) / width;
      if (fx > 1.2) fx -= 1.4;
      c.setData('fx', fx);
      const px = fx * width - this.scrollX * (c.getData('depth') as number);
      const wrapped = ((px % (width + 300)) + width + 300) % (width + 300) - 150;
      c.setPosition(wrapped, (c.getData('fy') as number) * height).setScale(sz);
    }

    // Parallax
    for (const l of this.layers) {
      const ts = l.sprite.tileScaleX;
      l.sprite.tilePositionX = (this.scrollX * l.factor) / ts;
      if (!l.sprite.texture.key.startsWith('bg-cave')) {
        l.sprite.y = height * l.top - Phaser.Math.Clamp(this.scrollY * l.factor * 0.15, -40, 40);
      } else {
        l.sprite.tilePositionY = (this.scrollY * l.factor * 0.3) / ts;
      }
    }
  }
}
