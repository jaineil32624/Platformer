import Phaser from 'phaser';
import { DEPTH, PLAYER, POWERUP_DURATION_MS } from '../config/constants';
import { EventBus } from '../core/EventBus';
import { InputManager } from '../core/InputManager';
import { audio } from '../core/AudioManager';
import { Effects } from '../gfx/Effects';
import { approach } from '../utils/math';

export type TimedPowerUp = keyof typeof POWERUP_DURATION_MS;

/**
 * The player character. Movement is a small hand-tuned state machine on top
 * of Arcade physics with the "game feel" helpers platformer players expect:
 * coyote time, jump buffering, variable jump height, wall slide/jump with a
 * brief input lock, double jump, squash & stretch.
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  health: number = PLAYER.maxHealth;
  maxHealth: number = PLAYER.maxHealth;
  dead = false;
  /** Set while a cutscene/level-complete sequence owns the player. */
  frozen = false;

  facing: 1 | -1 = 1;
  private grounded = false;
  private lastGroundedAt = -9999;
  private lastJumpPressedAt = -9999;
  private lastWallAt = -9999;
  private lastWallDir: -1 | 0 | 1 = 0;
  private wallLockUntil = 0;
  private invulnerableUntil = 0;
  private canDoubleJump = true;
  private jumpCutAvailable = false;
  private wasGrounded = false;
  private fallSpeed = 0;
  private wallSliding = false;
  private dustTimer = 0;
  private dropThroughUntil = 0;

  /** Remaining ms per timed power-up. */
  readonly powerups: Record<TimedPowerUp, number> = { shield: 0, boots: 0, magnet: 0 };
  private shieldBubble: Phaser.GameObjects.Image;
  private glow: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private fx: Effects,
  ) {
    super(scene, x, y, 'player', 'idle0');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.player);
    this.body.setSize(PLAYER.bodyWidth, PLAYER.bodyHeight);
    this.body.setOffset((80 - PLAYER.bodyWidth) / 2, 77 - PLAYER.bodyHeight);
    this.body.setMaxVelocityY(1100);
    this.body.setCollideWorldBounds(true);

    this.glow = scene.add
      .image(x, y, 'light')
      .setDepth(DEPTH.glow)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xffd98a)
      .setScale(1.6)
      .setAlpha(0);
    this.shieldBubble = scene.add
      .image(x, y, 'ring')
      .setDepth(DEPTH.player + 1)
      .setTint(0x7ff0ff)
      .setScale(0.72)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);
    this.play('player-idle');
  }

  get isGrounded(): boolean {
    return this.grounded;
  }

  get invulnerable(): boolean {
    return this.scene.time.now < this.invulnerableUntil || this.powerups.shield > 0;
  }

  get hasShield(): boolean {
    return this.powerups.shield > 0;
  }

  /** True while the player is intentionally dropping through one-way platforms. */
  get droppingThrough(): boolean {
    return this.scene.time.now < this.dropThroughUntil;
  }

  /** 0 (day) .. 1 (night): controls how strongly the player's glow shows. */
  setNightAmount(amount: number): void {
    this.glow.setAlpha(0.18 + amount * 0.5);
  }

  // ------------------------------------------------------------------ UPDATE

  override update(time: number, delta: number, input: InputManager): void {
    const dt = delta / 1000;
    this.tickPowerups(delta);
    this.glow.setPosition(this.x, this.y - 4);
    this.shieldBubble.setPosition(this.x, this.y + 2).setVisible(this.hasShield);
    if (this.hasShield) this.shieldBubble.setAlpha(this.powerups.shield < 2000 ? 0.4 + 0.4 * Math.sin(time / 60) : 0.75);

    if (this.dead || this.frozen) return;
    const body = this.body;

    // ---- contact state
    this.grounded = body.blocked.down || body.touching.down;
    if (this.grounded) {
      this.lastGroundedAt = time;
      this.canDoubleJump = true;
    }
    const wallDir: -1 | 0 | 1 = body.blocked.left ? -1 : body.blocked.right ? 1 : 0;
    if (!this.grounded && wallDir !== 0) {
      this.lastWallAt = time;
      this.lastWallDir = wallDir;
    }

    // ---- landing
    if (this.grounded && !this.wasGrounded) {
      if (this.fallSpeed > 380) {
        this.fx.dustAt(this.x, this.body.bottom, 8);
        audio.sfx('land');
        this.squash(1.22, 0.8);
      }
    }
    if (!this.grounded) this.fallSpeed = Math.max(0, body.velocity.y);
    this.wasGrounded = this.grounded;

    // ---- horizontal movement
    const boots = this.powerups.boots > 0;
    const speed = (input.sprint ? PLAYER.sprintSpeed : PLAYER.runSpeed) * (boots ? 1.22 : 1);
    if (time >= this.wallLockUntil) {
      const target = input.axisX * speed;
      const accel = input.axisX !== 0 ? (this.grounded ? PLAYER.groundAccel : PLAYER.airAccel) : this.grounded ? PLAYER.groundDecel : PLAYER.airDecel;
      body.setVelocityX(approach(body.velocity.x, target, accel * dt));
      if (input.axisX !== 0) this.facing = input.axisX > 0 ? 1 : -1;
    }

    // ---- drop through one-way platforms (down + jump)
    if (input.jumpPressed && input.axisY > 0 && this.grounded) {
      this.dropThroughUntil = time + 250;
      input.jumpPressed = false;
    }

    // ---- jumping (buffered)
    if (input.jumpPressed) this.lastJumpPressedAt = time;
    const buffered = time - this.lastJumpPressedAt <= PLAYER.jumpBufferMs;
    if (buffered) {
      const jumpBoost = boots ? 1.08 : 1;
      if (this.grounded || time - this.lastGroundedAt <= PLAYER.coyoteMs) {
        this.doJump(-PLAYER.jumpVelocity * jumpBoost, 'jump');
      } else if (time - this.lastWallAt <= 120 && this.lastWallDir !== 0) {
        const away = -this.lastWallDir as -1 | 1;
        body.setVelocityX(away * PLAYER.wallJumpVelocityX);
        this.facing = away;
        this.wallLockUntil = time + PLAYER.wallJumpLockMs;
        this.canDoubleJump = true;
        this.lastWallAt = -9999;
        this.doJump(-PLAYER.wallJumpVelocityY * jumpBoost, 'wall');
        this.fx.dustAt(this.x - away * 18, this.y, 6);
      } else if (this.canDoubleJump) {
        this.canDoubleJump = false;
        this.doJump(-PLAYER.doubleJumpVelocity * jumpBoost, 'double');
        this.fx.sparkleAt(this.x, this.body.bottom, 10);
        this.fx.ring(this.x, this.body.bottom, 0xfff3b0, 0.9);
      }
    }

    // ---- variable jump height
    if (!input.jumpHeld && this.jumpCutAvailable && body.velocity.y < 0) {
      body.setVelocityY(body.velocity.y * PLAYER.jumpCutMultiplier);
      this.jumpCutAvailable = false;
    }
    if (body.velocity.y >= 0) this.jumpCutAvailable = false;

    // ---- wall slide
    const pushingWall = wallDir !== 0 && input.axisX === wallDir;
    this.wallSliding = !this.grounded && pushingWall && body.velocity.y > 0;
    if (this.wallSliding) {
      body.setVelocityY(Math.min(body.velocity.y, PLAYER.wallSlideMaxSpeed));
      this.dustTimer -= delta;
      if (this.dustTimer <= 0) {
        this.fx.dustAt(this.x + wallDir * 18, this.y + 10, 1);
        this.dustTimer = 90;
      }
    }

    // ---- running dust
    if (this.grounded && Math.abs(body.velocity.x) > PLAYER.runSpeed + 40) {
      this.dustTimer -= delta;
      if (this.dustTimer <= 0) {
        this.fx.dustAt(this.x - this.facing * 12, this.body.bottom, 1);
        this.dustTimer = 70;
      }
    }

    this.updateAnimation(wallDir, input.sprint);
  }

  private doJump(vy: number, kind: 'jump' | 'double' | 'wall'): void {
    this.body.setVelocityY(vy);
    this.lastJumpPressedAt = -9999;
    this.lastGroundedAt = -9999;
    this.grounded = false;
    this.jumpCutAvailable = true;
    this.squash(0.82, 1.2);
    if (kind === 'jump') audio.sfx('jump');
    else if (kind === 'double') {
      audio.sfx('doubleJump');
      this.play('player-spin', true);
      this.scene.tweens.add({ targets: this, angle: this.facing * 360, duration: 320, ease: 'Cubic.easeOut', onComplete: () => this.setAngle(0) });
    } else audio.sfx('wallJump');
    EventBus.emit('player-jump', { double: kind === 'double', wall: kind === 'wall' });
  }

  private squashTween: Phaser.Tweens.Tween | null = null;

  private squash(sx: number, sy: number): void {
    this.squashTween?.stop();
    this.setScale(sx, sy);
    this.squashTween = this.scene.tweens.add({ targets: this, scaleX: 1, scaleY: 1, duration: 220, ease: 'Back.easeOut' });
  }

  private updateAnimation(wallDir: number, sprint: boolean): void {
    if (this.anims.currentAnim?.key === 'player-hurt' && this.scene.time.now < this.invulnerableUntil - PLAYER.invulnerableMs + 300) return;
    const vx = this.body.velocity.x;
    const vy = this.body.velocity.y;
    if (this.wallSliding) {
      this.setFlipX(wallDir < 0);
      this.play('player-wall', true);
      return;
    }
    this.setFlipX(this.facing < 0);
    if (!this.grounded) {
      if (this.anims.currentAnim?.key === 'player-spin' && vy < 120) return;
      this.play(vy < 0 ? 'player-jump' : 'player-fall', true);
    } else if (Math.abs(vx) > 40) {
      this.play(sprint && Math.abs(vx) > PLAYER.runSpeed ? 'player-sprint' : 'player-run', true);
    } else {
      this.play('player-idle', true);
    }
  }

  // --------------------------------------------------------------- COMBAT

  /** Bounce after stomping an enemy. */
  bounce(held: boolean): void {
    this.body.setVelocityY(-(held ? PLAYER.stompBounceHeld : PLAYER.stompBounce));
    this.canDoubleJump = true;
    this.jumpCutAvailable = held;
    this.squash(0.85, 1.15);
  }

  /** Spring-style vertical launch (used by hazards knockback, boss bounce). */
  launch(vx: number, vy: number): void {
    this.body.setVelocity(vx, vy);
  }

  /**
   * Take one point of damage from a source at `fromX`. Returns true if the hit
   * landed (false while invulnerable or shielded).
   */
  hurt(fromX: number, ignoreShield = false): boolean {
    if (this.dead || this.frozen) return false;
    const now = this.scene.time.now;
    if (now < this.invulnerableUntil) return false;
    if (this.powerups.shield > 0 && !ignoreShield) return false;
    this.health = Math.max(0, this.health - 1);
    EventBus.emit('health-changed', { health: this.health, max: this.maxHealth });
    EventBus.emit('player-hurt', { health: this.health });
    this.invulnerableUntil = now + PLAYER.invulnerableMs;
    const dir = this.x < fromX ? -1 : 1;
    this.body.setVelocity(dir * PLAYER.knockbackX, -PLAYER.knockbackY);
    this.wallLockUntil = now + 220;
    this.play('player-hurt', true);
    audio.sfx('hurt');
    this.fx.shake(180, 0.008);
    this.scene.tweens.add({
      targets: this,
      alpha: 0.25,
      duration: 90,
      yoyo: true,
      repeat: Math.floor(PLAYER.invulnerableMs / 180) - 1,
      onComplete: () => this.setAlpha(1),
    });
    return true;
  }

  heal(amount = 1): boolean {
    if (this.health >= this.maxHealth) return false;
    this.health = Math.min(this.maxHealth, this.health + amount);
    EventBus.emit('health-changed', { health: this.health, max: this.maxHealth });
    return true;
  }

  givePowerup(kind: TimedPowerUp): void {
    this.powerups[kind] = POWERUP_DURATION_MS[kind];
  }

  private tickPowerups(delta: number): void {
    for (const k of Object.keys(this.powerups) as TimedPowerUp[]) {
      if (this.powerups[k] <= 0) continue;
      this.powerups[k] = Math.max(0, this.powerups[k] - delta);
      EventBus.emit('powerup-timer', { kind: k, remaining: this.powerups[k], duration: POWERUP_DURATION_MS[k] });
    }
    this.setTint(this.powerups.boots > 0 && Math.floor(this.scene.time.now / 120) % 2 === 0 ? 0xffe0c0 : 0xffffff);
  }

  /** Lose a life: play the death pop. The scene handles respawn timing. */
  die(): void {
    if (this.dead) return;
    this.dead = true;
    this.health = 0;
    EventBus.emit('health-changed', { health: 0, max: this.maxHealth });
    this.body.setVelocity(0, 0);
    this.body.enable = false;
    this.setFrame('dead');
    this.anims.stop();
    audio.sfx('death');
    this.fx.shake(250, 0.012);
    this.fx.burstAt(this.x, this.y, 0xffd34d, 18);
    this.scene.tweens.add({ targets: this, y: this.y - 90, duration: 380, ease: 'Cubic.easeOut', yoyo: false });
    this.scene.tweens.add({ targets: this, y: this.y + 600, delay: 380, duration: 700, ease: 'Cubic.easeIn' });
    this.scene.tweens.add({ targets: this, angle: 540, duration: 1080 });
  }

  /** Bring the player back at a checkpoint with full health. */
  respawn(x: number, y: number): void {
    this.scene.tweens.killTweensOf(this);
    this.dead = false;
    this.frozen = false;
    this.setAngle(0).setAlpha(1).setScale(1);
    this.body.enable = true;
    this.body.reset(x, y);
    this.health = this.maxHealth;
    this.facing = 1;
    this.powerups.shield = 0;
    this.powerups.boots = 0;
    this.powerups.magnet = 0;
    this.invulnerableUntil = this.scene.time.now + 1000;
    this.wasGrounded = false;
    this.fallSpeed = 0;
    EventBus.emit('health-changed', { health: this.health, max: this.maxHealth });
    this.play('player-idle');
    this.fx.sparkleAt(x, y, 14);
  }

  override destroy(fromScene?: boolean): void {
    this.glow?.destroy();
    this.shieldBubble?.destroy();
    super.destroy(fromScene);
  }
}
