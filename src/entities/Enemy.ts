import Phaser from 'phaser';
import { DEPTH } from '../config/constants';
import { audio } from '../core/AudioManager';
import { EventBus } from '../core/EventBus';
import { Effects } from '../gfx/Effects';
import type { EnemyKind } from '../levels/LevelParser';

/** What enemies need to know about the level (kept minimal on purpose). */
export interface WorldQuery {
  /** True if a tile that can be stood on exists at this world position. */
  isGroundAt(x: number, y: number): boolean;
}

/**
 * Base enemy. Subclasses implement `think()` for their AI; the base class
 * handles defeat effects, activation range (enemies far off-screen sleep to
 * save CPU on phones) and the stomp contract.
 */
export abstract class Enemy extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  abstract readonly kind: EnemyKind;
  /** Can the player defeat this enemy by landing on it? */
  abstract readonly stompable: boolean;
  alive = true;
  protected dir: -1 | 1 = -1;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    protected world: WorldQuery,
    protected fx: Effects,
  ) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.enemies);
  }

  /** Called every frame by the scene while the enemy is near the camera. */
  tick(time: number, delta: number, playerX: number, playerY: number): void {
    if (!this.alive) return;
    this.think(time, delta, playerX, playerY);
  }

  protected abstract think(time: number, delta: number, playerX: number, playerY: number): void;

  /** Frame shown when defeated. */
  protected hitFrame = 'hit';
  protected burstTint = 0x8ff07a;

  defeat(byStomp: boolean): void {
    if (!this.alive) return;
    this.alive = false;
    this.body.enable = false;
    this.anims.stop();
    this.setFrame(this.hitFrame);
    audio.sfx('stomp');
    this.fx.burstAt(this.x, this.y, this.burstTint, 12);
    this.fx.ring(this.x, this.y + 10, 0xffffff, 1);
    this.fx.popText(this.x, this.y - 30, '+50', '#ffffff');
    EventBus.emit('enemy-defeated', { kind: this.kind, byStomp });
    this.scene.tweens.add({
      targets: this,
      scaleY: byStomp ? 0.5 : 1,
      alpha: 0,
      y: this.y + (byStomp ? 8 : -30),
      angle: byStomp ? 0 : 180,
      duration: 420,
      ease: 'Cubic.easeIn',
      onComplete: () => this.destroy(),
    });
  }
}

/** Patrolling ground enemy that turns at walls and ledges. */
abstract class Walker extends Enemy {
  protected abstract speed: number;

  protected think(): void {
    const b = this.body;
    if (b.blocked.left) this.dir = 1;
    else if (b.blocked.right) this.dir = -1;
    else if (b.blocked.down) {
      // Turn around at ledges instead of walking off.
      const aheadX = this.dir > 0 ? b.right + 4 : b.left - 4;
      if (!this.world.isGroundAt(aheadX, b.bottom + 6)) this.dir = (this.dir * -1) as -1 | 1;
    }
    b.setVelocityX(this.dir * this.speed);
    this.setFlipX(this.dir < 0);
  }
}

export class Slime extends Walker {
  readonly kind = 'slime' as const;
  readonly stompable = true;
  protected speed = 70;

  constructor(scene: Phaser.Scene, x: number, y: number, world: WorldQuery, fx: Effects) {
    super(scene, x, y, 'slime', world, fx);
    this.body.setSize(44, 30).setOffset(10, 25);
    this.play({ key: 'slime-move', startFrame: Phaser.Math.Between(0, 3) });
    this.burstTint = 0x8ff07a;
  }

  protected override think(): void {
    super.think();
    // Slimes are drawn facing right; mirror when moving left.
    this.setFlipX(this.dir < 0);
  }
}

export class Beetle extends Walker {
  readonly kind = 'beetle' as const;
  /** Spikes on its back — stomping it hurts. Avoid it or use a shield. */
  readonly stompable = false;
  protected speed = 105;

  constructor(scene: Phaser.Scene, x: number, y: number, world: WorldQuery, fx: Effects) {
    super(scene, x, y, 'beetle', world, fx);
    this.body.setSize(50, 28).setOffset(8, 22);
    this.play('beetle-walk');
    this.burstTint = 0xc065d6;
  }
}

/** Flying enemy: hovers at home, swoops at the player when close. */
export class Bat extends Enemy {
  readonly kind = 'bat' as const;
  readonly stompable = true;
  private home: Phaser.Math.Vector2;
  private mode: 'hover' | 'swoop' | 'return' = 'hover';
  private stateUntil = 0;
  private target = new Phaser.Math.Vector2();
  private phase = Math.random() * Math.PI * 2;

  constructor(scene: Phaser.Scene, x: number, y: number, world: WorldQuery, fx: Effects) {
    super(scene, x, y, 'bat', world, fx);
    this.body.setAllowGravity(false);
    this.body.setSize(36, 26).setOffset(18, 14);
    this.home = new Phaser.Math.Vector2(x, y);
    this.play('bat-fly');
    this.burstTint = 0x7d64c4;
  }

  protected think(time: number, delta: number, px: number, py: number): void {
    const b = this.body;
    const dt = delta / 1000;
    this.phase += dt * 3;
    switch (this.mode) {
      case 'hover': {
        b.setVelocity(Math.cos(this.phase * 0.5) * 50, Math.sin(this.phase) * 60);
        const dx = px - this.x;
        const dy = py - this.y;
        if (time > this.stateUntil && Math.abs(dx) < 330 && dy > -40 && dy < 420) {
          this.mode = 'swoop';
          this.stateUntil = time + 1100;
          this.target.set(px, py);
          const ang = Phaser.Math.Angle.Between(this.x, this.y, px, py);
          b.setVelocity(Math.cos(ang) * 300, Math.sin(ang) * 300);
          this.setTint(0xffb0c0);
        }
        break;
      }
      case 'swoop':
        if (time > this.stateUntil) {
          this.mode = 'return';
          this.clearTint();
        }
        break;
      case 'return': {
        const d = Phaser.Math.Distance.Between(this.x, this.y, this.home.x, this.home.y);
        if (d < 12) {
          this.mode = 'hover';
          this.stateUntil = time + 900;
          b.setVelocity(0, 0);
        } else {
          const ang = Phaser.Math.Angle.Between(this.x, this.y, this.home.x, this.home.y);
          b.setVelocity(Math.cos(ang) * 180, Math.sin(ang) * 180);
        }
        break;
      }
    }
    this.setFlipX(b.velocity.x < 0);
  }
}
