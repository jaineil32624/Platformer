import Phaser from 'phaser';
import { DEPTH } from '../config/constants';
import { audio } from '../core/AudioManager';
import { EventBus } from '../core/EventBus';
import { Effects } from '../gfx/Effects';
import type { BossKind } from '../levels/types';

export interface BossContext {
  fx: Effects;
  /** Fire a projectile. `gravity` = true for arcing rocks. */
  spawnProjectile(kind: 'rock' | 'orb', x: number, y: number, vx: number, vy: number, gravity: boolean): void;
  /** Spawn a minion (Slime King calls for help). */
  spawnMinion(x: number, y: number): void;
  /** Number of living minions. */
  minionCount(): number;
  arena: { left: number; right: number; floor: number };
}

/**
 * Base boss: health, hit invulnerability, health-bar events, and the defeat
 * sequence. Concrete bosses implement a timer-driven state machine in `think`.
 */
export abstract class Boss extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  abstract readonly kind: BossKind;
  abstract readonly displayName: string;
  readonly maxHp: number;
  hp: number;
  alive = true;
  active_ = false; // fight started
  protected mode: string = 'intro';
  protected stateTime = 0;
  protected invulnerableUntil = 0;
  onDefeated: (() => void) | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    maxHp: number,
    protected ctx: BossContext,
  ) {
    super(scene, x, y, texture, 'idle0');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.boss);
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.setVisible(false);
    this.body.enable = false;
  }

  /** Called when the player enters the arena. */
  begin(): void {
    this.active_ = true;
    this.setVisible(true);
    this.body.enable = true;
    this.enter('intro', 0);
    this.setAlpha(0);
    this.scene.tweens.add({ targets: this, alpha: 1, duration: 500 });
    audio.sfx('bossRoar');
    this.ctx.fx.shake(600, 0.01);
    this.emitHealth();
  }

  protected enter(name: string, time: number): void {
    this.mode = name;
    this.stateTime = time;
  }

  protected emitHealth(): void {
    EventBus.emit('boss-health', { current: this.hp, max: this.maxHp, name: this.displayName });
  }

  get invulnerable(): boolean {
    return this.scene.time.now < this.invulnerableUntil;
  }

  /** Whether a stomp from above right now would damage the boss. */
  abstract get vulnerable(): boolean;

  tick(time: number, delta: number, px: number, py: number): void {
    if (!this.alive || !this.active_) return;
    if (this.stateTime === 0) this.stateTime = time;
    this.think(time, delta, px, py);
  }

  protected abstract think(time: number, delta: number, px: number, py: number): void;

  /** Apply one hit. Returns true if it landed. */
  takeHit(): boolean {
    if (!this.alive || this.invulnerable || !this.vulnerable) return false;
    this.hp--;
    this.invulnerableUntil = this.scene.time.now + 900;
    this.emitHealth();
    audio.sfx('bossHit');
    this.ctx.fx.shake(220, 0.012);
    this.ctx.fx.burstAt(this.x, this.body.top + 20, 0xffffff, 16);
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(90, () => this.clearTint());
    this.scene.tweens.add({ targets: this, alpha: 0.5, duration: 100, yoyo: true, repeat: 3 });
    if (this.hp <= 0) this.defeat();
    else this.onHit();
    return true;
  }

  protected onHit(): void {}

  private defeat(): void {
    this.alive = false;
    this.body.setVelocity(0, 0);
    this.body.setAllowGravity(false);
    this.body.enable = false;
    EventBus.emit('boss-health', null);
    audio.sfx('explosion');
    const fx = this.ctx.fx;
    fx.flash(250);
    // A rolling chain of explosions, then the boss pops.
    for (let i = 0; i < 6; i++) {
      this.scene.time.delayedCall(i * 160, () => {
        const ox = Phaser.Math.Between(-this.displayWidth / 3, this.displayWidth / 3);
        const oy = Phaser.Math.Between(-this.displayHeight / 2, 0);
        fx.burstAt(this.x + ox, this.y + oy, [0xffd34d, 0xff5470], 14);
        fx.ring(this.x + ox, this.y + oy, 0xffd34d, 1.6);
        fx.shake(140, 0.01);
        audio.sfx('stomp');
      });
    }
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.3,
      scaleY: 0.2,
      alpha: 0,
      delay: 900,
      duration: 400,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        fx.confettiAt(this.x, this.y - 60, 80);
        audio.sfx('explosion');
        EventBus.emit('boss-defeated', { kind: this.kind });
        this.onDefeated?.();
        this.destroy();
      },
    });
  }
}

/* ===================================================================== KING */

/**
 * The Slime King: leaps at the player, lands with a shockwave, and summons
 * slimes once he's at half health. Stomp his head to damage him.
 */
export class SlimeKing extends Boss {
  readonly kind = 'king' as const;
  readonly displayName = 'The Slime King';
  private pendingLand = false;

  constructor(scene: Phaser.Scene, x: number, y: number, ctx: BossContext) {
    super(scene, x, y, 'king', 6, ctx);
    this.body.setSize(160, 116).setOffset(30, 72);
  }

  get vulnerable(): boolean {
    return true;
  }

  private get angry(): boolean {
    return this.hp <= this.maxHp / 2;
  }

  protected think(time: number, _delta: number, px: number): void {
    const b = this.body;
    const elapsed = time - this.stateTime;
    const grounded = b.blocked.down;
    switch (this.mode) {
      case 'intro':
        this.play('king-idle', true);
        if (elapsed > 1300) this.enter('idle', time);
        break;
      case 'idle':
        b.setVelocityX(0);
        this.play('king-idle', true);
        if (elapsed > (this.angry ? 650 : 1100)) this.enter('crouch', time);
        break;
      case 'crouch':
        this.anims.stop();
        this.setFrame('squash');
        if (elapsed > 420) {
          // Aim to land near the player: airtime ≈ 2 * vy / g.
          const vy = this.angry ? 1250 : 1150;
          const airtime = (2 * vy) / 2400;
          const vx = Phaser.Math.Clamp((px - this.x) / airtime, -620, 620);
          b.setVelocity(vx, -vy);
          this.setFrame('jump');
          this.pendingLand = true;
          this.enter('air', time);
        }
        break;
      case 'air':
        this.setFlipX(b.velocity.x < 0);
        if (elapsed > 150 && grounded && this.pendingLand) {
          this.pendingLand = false;
          b.setVelocityX(0);
          this.setFrame('squash');
          audio.sfx('slam');
          this.ctx.fx.shake(260, 0.016);
          this.ctx.fx.ring(this.x, b.bottom, 0xff8fc8, 3);
          this.ctx.fx.dustAt(this.x - 70, b.bottom, 8);
          this.ctx.fx.dustAt(this.x + 70, b.bottom, 8);
          // Shockwave orbs along the floor when angry.
          if (this.angry) {
            for (const dir of [-1, 1]) this.ctx.spawnProjectile('orb', this.x + dir * 90, b.bottom - 18, dir * 360, 0, false);
          }
          if (this.angry && this.ctx.minionCount() < 2 && Math.random() < 0.6) {
            this.ctx.spawnMinion(this.x + Phaser.Math.Between(-60, 60), b.top - 10);
          }
          this.enter('land', time);
        }
        break;
      case 'land':
        if (elapsed > 260) this.enter('idle', time);
        break;
    }
  }

  protected override onHit(): void {
    this.setFrame('hurt');
  }
}

/* ==================================================================== GOLEM */

/**
 * The Storm Golem: lumbers toward the player, hurls rocks, and performs a
 * ground slam that leaves him stunned — the only time his glowing core can be
 * stomped. At half health he throws more and his slam releases orbs.
 */
export class StormGolem extends Boss {
  readonly kind = 'golem' as const;
  readonly displayName = 'The Storm Golem';
  private cycle = 0;
  private landed = false;

  constructor(scene: Phaser.Scene, x: number, y: number, ctx: BossContext) {
    super(scene, x, y, 'golem', 6, ctx);
    this.body.setSize(130, 180).setOffset(45, 36);
  }

  get vulnerable(): boolean {
    return this.mode === 'stunned';
  }

  private get angry(): boolean {
    return this.hp <= this.maxHp / 2;
  }

  protected think(time: number, _delta: number, px: number, py: number): void {
    const b = this.body;
    const elapsed = time - this.stateTime;
    const a = this.ctx.arena;
    switch (this.mode) {
      case 'intro':
        this.play('golem-idle', true);
        if (elapsed > 1400) this.enter('walk', time);
        break;
      case 'walk': {
        this.play('golem-idle', true);
        const dir = px < this.x ? -1 : 1;
        const speed = this.angry ? 120 : 80;
        const nearWall = (dir < 0 && this.x < a.left + 120) || (dir > 0 && this.x > a.right - 120);
        b.setVelocityX(nearWall ? 0 : dir * speed);
        this.setFlipX(dir < 0);
        if (elapsed > (this.angry ? 1100 : 1600)) {
          b.setVelocityX(0);
          this.cycle++;
          this.enter(this.cycle % 3 === 0 ? 'slamWindup' : 'throwWindup', time);
        }
        break;
      }
      case 'throwWindup':
        this.anims.stop();
        this.setFrame('windup');
        if (elapsed > 520) {
          this.throwRocks(px, py);
          this.setFrame('slam');
          this.enter('recover', time);
        }
        break;
      case 'recover':
        if (elapsed > 600) this.enter('walk', time);
        break;
      case 'slamWindup':
        this.anims.stop();
        this.setFrame('windup');
        if (elapsed > 600) {
          b.setVelocity(Phaser.Math.Clamp((px - this.x) * 1.2, -380, 380), -900);
          this.landed = false;
          this.enter('slamAir', time);
        }
        break;
      case 'slamAir':
        if (elapsed > 200 && b.blocked.down && !this.landed) {
          this.landed = true;
          b.setVelocityX(0);
          this.setFrame('slam');
          audio.sfx('slam');
          this.ctx.fx.shake(380, 0.02);
          this.ctx.fx.ring(this.x, b.bottom, 0x5ff3ff, 3.4);
          for (const dir of [-1, 1]) {
            this.ctx.spawnProjectile('orb', this.x + dir * 80, b.bottom - 18, dir * (this.angry ? 420 : 340), 0, false);
          }
          this.enter('stunned', time);
        }
        break;
      case 'stunned':
        this.anims.stop();
        this.setFrame('stunned');
        if (elapsed > 2300) this.enter('walk', time);
        break;
    }
  }

  private throwRocks(px: number, py: number): void {
    audio.sfx('throw');
    const count = this.angry ? 5 : 3;
    const handX = this.x + (this.flipX ? -70 : 70);
    const handY = this.y - 80;
    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * 0.28;
      const t = 0.9 + Math.abs(spread) * 0.4; // flight time
      const vx = (px - handX) / t + spread * 260;
      const vy = (py - handY - 0.5 * 2400 * 0.55 * t * t) / t; // rocks use 55% gravity
      this.ctx.spawnProjectile('rock', handX, handY, vx, Phaser.Math.Clamp(vy, -1200, 200), true);
    }
    if (this.angry) {
      const ang = Phaser.Math.Angle.Between(this.x, this.y - 90, px, py);
      this.ctx.spawnProjectile('orb', this.x, this.y - 90, Math.cos(ang) * 300, Math.sin(ang) * 300, false);
    }
  }

  protected override onHit(): void {
    this.setFrame('hurt');
    // Knocked out of the stun so the player must wait for the next slam.
    this.scene.time.delayedCall(300, () => {
      if (this.alive) this.enter('walk', this.scene.time.now);
    });
  }
}
