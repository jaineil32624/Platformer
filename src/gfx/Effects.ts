import Phaser from 'phaser';
import { DEPTH } from '../config/constants';
import { services } from '../core/Services';

/**
 * Pooled particle bursts and camera juice for a gameplay scene. Emitters are
 * created once and re-used with `explode()`, so effects allocate nothing per
 * frame. Respects the "particles" and "screen shake" accessibility settings.
 */
export class Effects {
  private dust: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparkle: Phaser.GameObjects.Particles.ParticleEmitter;
  private burst: Phaser.GameObjects.Particles.ParticleEmitter;
  private confetti: Phaser.GameObjects.Particles.ParticleEmitter;
  private rings: Phaser.GameObjects.Image[] = [];

  constructor(private scene: Phaser.Scene) {
    const add = (texture: string, config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig) => {
      const e = scene.add.particles(0, 0, texture, { ...config, emitting: false });
      e.setDepth(DEPTH.particles);
      return e;
    };
    this.dust = add('p-dot', {
      lifespan: { min: 280, max: 480 },
      speedX: { min: -90, max: 90 },
      speedY: { min: -120, max: -30 },
      scale: { start: 0.55, end: 0 },
      alpha: { start: 0.75, end: 0 },
      tint: 0xf3e7d3,
    });
    this.sparkle = add('p-spark', {
      lifespan: { min: 300, max: 600 },
      speed: { min: 60, max: 200 },
      scale: { start: 0.8, end: 0 },
      rotate: { min: 0, max: 360 },
      tint: [0xfff3b0, 0xffd34d, 0xffffff],
      blendMode: Phaser.BlendModes.ADD,
    });
    this.burst = add('p-dot', {
      lifespan: { min: 300, max: 700 },
      speed: { min: 120, max: 360 },
      scale: { start: 0.9, end: 0 },
      alpha: { start: 1, end: 0 },
      gravityY: 600,
    });
    this.confetti = add('pixel', {
      lifespan: { min: 900, max: 1600 },
      speed: { min: 200, max: 520 },
      angle: { min: 220, max: 320 },
      gravityY: 700,
      scale: { min: 1.5, max: 3 },
      rotate: { min: 0, max: 360 },
      tint: [0xffd34d, 0x4be3b0, 0xff5470, 0x7ec8ff, 0xc9a6ff],
    });
  }

  private get low(): boolean {
    return services().save.settings.particles === 'low';
  }

  private n(count: number): number {
    return this.low ? Math.max(1, Math.ceil(count / 3)) : count;
  }

  dustAt(x: number, y: number, count = 6): void {
    this.dust.explode(this.n(count), x, y);
  }

  sparkleAt(x: number, y: number, count = 8): void {
    this.sparkle.explode(this.n(count), x, y);
  }

  burstAt(x: number, y: number, tint: number | number[], count = 14): void {
    this.burst.setParticleTint(Array.isArray(tint) ? tint[0] : tint);
    this.burst.explode(this.n(count), x, y);
  }

  confettiAt(x: number, y: number, count = 60): void {
    this.confetti.explode(this.n(count), x, y);
  }

  /** Expanding shockwave ring (stomps, boss slams). */
  ring(x: number, y: number, tint = 0xffffff, scale = 1.4): void {
    let img = this.rings.find((r) => !r.active);
    if (!img) {
      img = this.scene.add.image(0, 0, 'ring').setDepth(DEPTH.particles).setBlendMode(Phaser.BlendModes.ADD);
      this.rings.push(img);
    }
    img.setActive(true).setVisible(true).setPosition(x, y).setScale(0.2).setAlpha(0.9).setTint(tint);
    this.scene.tweens.add({
      targets: img,
      scale,
      alpha: 0,
      duration: 380,
      ease: 'Cubic.easeOut',
      onComplete: () => img?.setActive(false).setVisible(false),
    });
  }

  shake(durationMs: number, intensity: number): void {
    if (!services().save.settings.screenShake) return;
    this.scene.cameras.main.shake(durationMs, intensity);
  }

  flash(durationMs = 120, r = 255, g = 255, b = 255): void {
    if (!services().save.settings.screenShake) return; // flashing is grouped with shake for photosensitive players
    this.scene.cameras.main.flash(durationMs, r, g, b);
  }

  /** Floating "+10" style text. */
  popText(x: number, y: number, text: string, color = '#ffd34d'): void {
    const t = this.scene.add
      .text(x, y, text, {
        fontFamily: 'Poppins, sans-serif',
        fontStyle: '700',
        fontSize: '22px',
        color,
        stroke: '#1b1f3b',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.particles + 1);
    this.scene.tweens.add({
      targets: t,
      y: y - 50,
      alpha: 0,
      duration: 750,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }
}
