import Phaser from 'phaser';
import { DEPTH, PHYSICS, PLAYER, SCORE, TILE, VISIBLE_TILES_TALL } from '../config/constants';
import { audio } from '../core/AudioManager';
import { EventBus } from '../core/EventBus';
import { InputManager } from '../core/InputManager';
import { computeStars } from '../core/SaveManager';
import { services } from '../core/Services';
import { Bat, Beetle, Enemy, Slime } from '../entities/Enemy';
import { Boss, BossContext, SlimeKing, StormGolem } from '../entities/Boss';
import { Player } from '../entities/Player';
import { Effects } from '../gfx/Effects';
import { computeSky } from '../gfx/Sky';
import { LEVELS, getLevel } from '../levels/levels';
import { Checkpoint, LevelWorld, cellBottom } from '../levels/LevelWorld';
import type { LevelDefinition } from '../levels/types';
import { haptic } from '../utils/haptics';
import { clamp, lerp } from '../utils/math';
import type { BackgroundScene } from './BackgroundScene';
import type { UIScene } from './UIScene';

export interface GameSceneData {
  levelId: string;
  /** Resume from the checkpoint stored in the save slot. */
  fromCheckpoint?: boolean;
}

export interface LevelResultData {
  levelId: string;
  timeMs: number;
  coins: number;
  totalCoins: number;
  enemies: number;
  deaths: number;
  score: number;
  stars: number;
  /** Which star criteria were met: [clear, coins >= 90%, under par]. */
  starFlags: [boolean, boolean, boolean];
  newBestTime: boolean;
  newBestScore: boolean;
  rank: number;
}

/**
 * The gameplay scene: owns the world, the player, enemies, bosses and the
 * rules (lives, checkpoints, scoring, completion). Rendering of the sky and
 * the HUD live in BackgroundScene and UIScene; this scene talks to them via
 * small method calls and the EventBus — never by reaching into their objects.
 */
export class GameScene extends Phaser.Scene {
  private def!: LevelDefinition;
  private world!: LevelWorld;
  private player!: Player;
  private input_!: InputManager;
  private fx!: Effects;
  private enemies: Enemy[] = [];
  private enemyGroup!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private boss: Boss | null = null;
  private bg!: BackgroundScene;
  private ui!: UIScene;

  // Run state
  private lives: number = PLAYER.startLives;
  private coins = 0;
  private enemiesDefeated = 0;
  private bossBonus = 0;
  private deaths = 0;
  private elapsedMs = 0;
  private checkpointIndex = -1;
  private respawnPoint = { x: 0, y: 0 };
  private arenaActive = false;
  private finished = false;
  private skyTime = 0;

  constructor() {
    super('Game');
  }

  init(data: GameSceneData): void {
    const def = getLevel(data.levelId) ?? LEVELS[0];
    this.def = def;
    this.enemies = [];
    this.boss = null;
    this.lives = PLAYER.startLives;
    this.coins = 0;
    this.enemiesDefeated = 0;
    this.bossBonus = 0;
    this.deaths = 0;
    this.elapsedMs = 0;
    this.checkpointIndex = -1;
    this.arenaActive = false;
    this.finished = false;
    const cp = services().save.slot.checkpoint;
    if (data.fromCheckpoint && cp?.levelId === def.id) this.checkpointIndex = cp.index;
  }

  create(): void {
    const def = this.def;
    this.fx = new Effects(this);
    this.world = new LevelWorld(this, def);
    const w = this.world;

    // ---- physics world
    this.physics.world.gravity.y = PHYSICS.gravity;
    this.physics.world.TILE_BIAS = PHYSICS.tileBias;
    this.physics.world.setBounds(0, -TILE * 4, w.widthPx, w.heightPx + TILE * 8, true, true, false, false);

    // ---- player
    const start = cellBottom(w.parsed.player);
    this.respawnPoint = { x: start.x, y: start.y - 40 };
    if (this.checkpointIndex >= 0) {
      const cp = w.checkpoints[this.checkpointIndex];
      if (cp) {
        this.respawnPoint = { x: cp.x, y: cp.y };
        for (let i = 0; i <= this.checkpointIndex; i++) this.lightCheckpoint(w.checkpoints[i], false);
      }
    }
    this.player = new Player(this, this.respawnPoint.x, this.respawnPoint.y, this.fx);
    this.input_ = new InputManager(this);

    // ---- enemies
    this.enemyGroup = this.physics.add.group({ allowGravity: true });
    for (const e of w.parsed.enemies) {
      const { x, y } = cellBottom(e);
      this.spawnEnemy(e.kind, x, e.kind === 'bat' ? y - TILE / 2 : y - 24);
    }

    // ---- projectiles (boss attacks)
    this.projectiles = this.physics.add.group({ allowGravity: false });

    // ---- boss
    if (def.boss && w.parsed.boss) {
      const { x, y } = cellBottom(w.parsed.boss);
      const trig = w.parsed.arenaTrigger ?? w.parsed.boss;
      const ctx: BossContext = {
        fx: this.fx,
        spawnProjectile: (kind, px, py, vx, vy, gravity) => this.spawnProjectile(kind, px, py, vx, vy, gravity),
        spawnMinion: (mx, my) => this.spawnEnemy('slime', mx, my),
        minionCount: () => this.enemies.filter((e) => e.alive && e.kind === 'slime' && e.getData('minion')).length,
        arena: { left: (trig.col - 3) * TILE, right: w.widthPx - TILE * 3, floor: y },
      };
      this.boss = def.boss === 'king' ? new SlimeKing(this, x, y - 100, ctx) : new StormGolem(this, x, y - 110, ctx);
      this.boss.onDefeated = () => this.onBossDefeated();
    }

    // ---- collisions
    this.physics.add.collider(this.player, w.layer, undefined, this.oneWayFilter, this);
    this.physics.add.collider(this.enemyGroup, w.layer, undefined, (_e, tile) => !this.isOneWayFromBelow(_e, tile), this);
    if (this.boss) this.physics.add.collider(this.boss, w.layer);
    this.physics.add.collider(this.projectiles, w.layer, (proj) => this.popProjectile(proj as Phaser.Physics.Arcade.Image));
    this.physics.add.overlap(this.player, this.enemyGroup, (_p, e) => this.onEnemyContact(e as Enemy));
    this.physics.add.overlap(this.player, w.spikes, (_p, s) => this.onSpikes(s as Phaser.GameObjects.Image));
    this.physics.add.overlap(this.player, this.projectiles, (_p, pr) => this.onProjectile(pr as Phaser.Physics.Arcade.Image));
    if (this.boss) this.physics.add.overlap(this.player, this.boss, () => this.onBossContact());

    // ---- camera
    const cam = this.cameras.main;
    cam.setBounds(0, 0, w.widthPx, w.heightPx);
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.setDeadzone(80, 90);
    cam.roundPixels = false;
    this.applyZoom();
    this.scale.on('resize', this.applyZoom, this);

    // ---- companion scenes
    this.bg = this.scene.get('Background') as BackgroundScene;
    this.bg.configure(def.theme, def.timeStart);
    this.scene.sendToBack('Background');
    this.scene.launch('UI', { levelId: def.id, lives: this.lives, coinTotal: w.coinTotal });
    this.ui = this.scene.get('UI') as UIScene;

    audio.playMusic(def.music);
    services().save.flush();

    // Pause automatically when the app is backgrounded (phones!).
    const onHidden = () => this.pauseGame();
    this.game.events.on(Phaser.Core.Events.HIDDEN, onHidden);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.HIDDEN, onHidden);
      this.scale.off('resize', this.applyZoom, this);
      EventBus.emit('boss-health', null);
    });
    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      this.input_.reset();
      audio.setDucked(false);
    });

    cam.fadeIn(400, 27, 31, 59);
    EventBus.emit('health-changed', { health: this.player.health, max: this.player.maxHealth });
    EventBus.emit('lives-changed', { lives: this.lives });
  }

  private applyZoom(): void {
    const { width, height } = this.scale;
    // Show ~10.5 tiles vertically, but never fewer than ~9 tiles horizontally (tall phones).
    const byHeight = height / (TILE * VISIBLE_TILES_TALL);
    const byWidth = width / (TILE * 9);
    this.cameras.main.setZoom(clamp(Math.min(byHeight, byWidth), 0.4, 2.2));
  }

  // ---------------------------------------------------------------- SPAWNING

  private spawnEnemy(kind: 'slime' | 'beetle' | 'bat', x: number, y: number): Enemy {
    const Ctor = kind === 'slime' ? Slime : kind === 'beetle' ? Beetle : Bat;
    const e = new Ctor(this, x, y, this.world, this.fx);
    this.enemyGroup.add(e);
    if (kind === 'bat') e.body.setAllowGravity(false);
    if (this.arenaActive) {
      e.setData('minion', true);
      e.setScale(0.2);
      this.tweens.add({ targets: e, scale: 1, duration: 300, ease: 'Back.easeOut' });
    }
    this.enemies.push(e);
    return e;
  }

  private spawnProjectile(kind: 'rock' | 'orb', x: number, y: number, vx: number, vy: number, gravity: boolean): void {
    const p = this.projectiles.get(x, y, kind) as Phaser.Physics.Arcade.Image | null;
    if (!p) return;
    p.setTexture(kind).setActive(true).setVisible(true).setDepth(DEPTH.projectiles);
    p.body!.enable = true;
    p.body!.reset(x, y);
    const body = p.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(gravity);
    body.setGravityY(gravity ? -PHYSICS.gravity * 0.45 : 0);
    body.setCircle(kind === 'orb' ? 12 : 13, kind === 'orb' ? 6 : 3, kind === 'orb' ? 6 : 3);
    body.setVelocity(vx, vy);
    p.setBlendMode(kind === 'orb' ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
    p.setData('expires', this.time.now + 4000);
    p.setAngularVelocity?.(kind === 'rock' ? 400 : 0);
  }

  private popProjectile(p: Phaser.Physics.Arcade.Image): void {
    if (!p.active) return;
    this.fx.dustAt(p.x, p.y, 5);
    p.setActive(false).setVisible(false);
    if (p.body) p.body.enable = false;
  }

  // -------------------------------------------------------------- COLLISION

  /** One-way platforms: ignore from below, and while the player drops through. */
  private oneWayFilter(_obj: unknown, tileObj: unknown): boolean {
    const tile = tileObj as Phaser.Tilemaps.Tile;
    if (!this.world.isOneWay(tile)) return true;
    if (this.player.droppingThrough) return false;
    const body = this.player.body;
    return body.velocity.y >= 0 && body.bottom - body.velocity.y / 60 <= tile.pixelY + 8;
  }

  private isOneWayFromBelow(obj: unknown, tileObj: unknown): boolean {
    const tile = tileObj as Phaser.Tilemaps.Tile;
    if (!this.world.isOneWay(tile)) return false;
    const body = (obj as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.Body;
    return body.bottom > tile.pixelY + 10;
  }

  private stompCheck(targetTop: number): boolean {
    const b = this.player.body;
    return b.velocity.y > 50 && b.bottom - targetTop < 30 + b.velocity.y / 60;
  }

  private onEnemyContact(e: Enemy): void {
    if (!e.alive || this.player.dead || this.finished) return;
    if (this.stompCheck(e.body.top)) {
      if (e.stompable) {
        e.defeat(true);
        this.enemiesDefeated++;
        this.player.bounce(this.input_.jumpHeld);
        this.fx.shake(80, 0.004);
        haptic('light');
        return;
      }
      // Spiky beetle: stomping hurts, but bounce away so you don't get stuck.
      if (this.player.hasShield) {
        e.defeat(false);
        this.enemiesDefeated++;
        this.player.bounce(true);
        return;
      }
      if (this.player.hurt(e.x)) this.player.launch((this.player.x < e.x ? -1 : 1) * 300, -700);
      this.checkHealth();
      return;
    }
    if (this.player.hasShield) {
      e.defeat(false);
      this.enemiesDefeated++;
      return;
    }
    this.player.hurt(e.x);
    this.checkHealth();
  }

  private onSpikes(spike: Phaser.GameObjects.Image): void {
    if (this.player.dead || this.finished) return;
    if (this.player.hurt(spike.x, true)) {
      this.player.launch((this.player.x < spike.x ? -1 : 1) * 220, -820);
      haptic('medium');
    }
    this.checkHealth();
  }

  private onProjectile(p: Phaser.Physics.Arcade.Image): void {
    if (!p.active || this.player.dead) return;
    this.popProjectile(p);
    if (this.player.hasShield) return;
    this.player.hurt(p.x);
    this.checkHealth();
  }

  private onBossContact(): void {
    const boss = this.boss;
    if (!boss || !boss.alive || !boss.active_ || this.player.dead || this.finished) return;
    if (this.stompCheck(boss.body.top + 10)) {
      if (boss.takeHit()) {
        this.player.bounce(true);
        haptic('heavy');
        return;
      }
      // Not vulnerable (or still flashing): bounce off harmlessly if flashing, else take damage.
      this.player.bounce(true);
      if (!boss.invulnerable) {
        this.player.hurt(boss.x);
        this.checkHealth();
      }
      return;
    }
    if (this.player.hurt(boss.x)) this.player.launch((this.player.x < boss.x ? -1 : 1) * 520, -620);
    this.checkHealth();
  }

  private checkHealth(): void {
    if (this.player.health <= 0 && !this.player.dead) this.loseLife();
  }

  // ------------------------------------------------------------------ RULES

  private loseLife(): void {
    if (this.player.dead || this.finished) return;
    this.player.die();
    haptic('heavy');
    this.lives--;
    this.deaths++;
    EventBus.emit('player-died', { livesLeft: this.lives });
    EventBus.emit('lives-changed', { lives: this.lives });
    this.time.delayedCall(1300, () => {
      if (this.lives > 0) {
        this.cameras.main.fadeOut(220, 27, 31, 59);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          this.player.respawn(this.respawnPoint.x, this.respawnPoint.y);
          this.cameras.main.fadeIn(300, 27, 31, 59);
        });
      } else {
        this.gameOver();
      }
    });
  }

  private gameOver(): void {
    this.finished = true;
    audio.stopMusic(0.5);
    audio.sfx('gameOver');
    services().save.flush();
    this.scene.pause();
    this.scene.pause('UI');
    this.scene.launch('GameOver', { levelId: this.def.id });
  }

  private lightCheckpoint(cp: Checkpoint, announce: boolean): void {
    if (cp.active) return;
    cp.active = true;
    cp.sprite.play('checkpoint-on');
    if (!announce) return;
    this.checkpointIndex = cp.index;
    this.respawnPoint = { x: cp.x, y: cp.y };
    audio.sfx('checkpoint');
    this.fx.sparkleAt(cp.x, cp.y - 50, 16);
    this.fx.ring(cp.x, cp.y - 50, 0xffd34d, 1.4);
    // Heal to full at checkpoints — a kindness that keeps momentum.
    this.player.heal(this.player.maxHealth);
    services().save.setCheckpoint({ levelId: this.def.id, index: cp.index });
    services().save.flush();
    EventBus.emit('checkpoint-reached', { index: cp.index });
    EventBus.emit('toast', { text: 'Checkpoint! Progress saved', color: '#ffd34d' });
  }

  private startBossFight(): void {
    if (this.arenaActive || !this.boss || !this.world.parsed.arenaTrigger) return;
    this.arenaActive = true;
    const trig = this.world.parsed.arenaTrigger;
    const sealCol = trig.col - 4;
    this.world.sealColumn(sealCol, 0, trig.row);
    this.respawnPoint = { x: (sealCol + 2) * TILE, y: trig.row * TILE };
    const cam = this.cameras.main;
    const left = (sealCol + 1) * TILE;
    cam.setBounds(left, 0, this.world.widthPx - left, this.world.heightPx);
    audio.playMusic('boss', 0.4);
    this.time.delayedCall(500, () => this.boss?.begin());
    EventBus.emit('toast', { text: this.boss.displayName.toUpperCase(), color: '#ff5470' });
  }

  private onBossDefeated(): void {
    this.bossBonus += SCORE.boss;
    this.enemies.forEach((e) => e.alive && e.defeat(false));
    audio.playMusic(this.def.music, 1.2);
    const g = this.world.goal;
    g.setVisible(true).setActive(true).setScale(0.1).setAlpha(0);
    this.tweens.add({ targets: g, scale: 1, alpha: 1, duration: 700, ease: 'Back.easeOut' });
    audio.sfx('portal');
    this.fx.sparkleAt(g.x, g.y - 70, 20);
    EventBus.emit('toast', { text: 'The portal has opened!', color: '#4be3b0' });
  }

  private collectCoin(coin: Phaser.GameObjects.Sprite): void {
    coin.setActive(false);
    this.coins++;
    audio.sfx('coin', 1 + Math.min(this.coins % 10, 8) * 0.02);
    this.fx.sparkleAt(coin.x, coin.y, 5);
    EventBus.emit('coin-collected', { total: this.coins });
    this.tweens.add({
      targets: coin,
      y: coin.y - 30,
      alpha: 0,
      scale: 1.4,
      duration: 220,
      onComplete: () => coin.setVisible(false),
    });
  }

  private collectPowerUp(pu: LevelWorld['powerups'][number]): void {
    pu.sprite.setActive(false).setVisible(false);
    const p = this.player;
    switch (pu.kind) {
      case 'heart':
        if (!p.heal(1)) this.coins += 5; // full health: bonus coins instead
        break;
      case 'life':
        this.lives++;
        EventBus.emit('lives-changed', { lives: this.lives });
        audio.sfx('oneUp');
        break;
      case 'shield':
      case 'boots':
      case 'magnet':
        p.givePowerup(pu.kind);
        break;
    }
    if (pu.kind !== 'life') audio.sfx('powerup');
    this.fx.burstAt(pu.sprite.x, pu.sprite.y, 0xffffff, 12);
    this.fx.ring(pu.sprite.x, pu.sprite.y, 0x7ff0ff, 1.2);
    haptic('light');
    const names = { heart: 'Heart', life: '1-Up!', shield: 'Shield', boots: 'Speed Boots', magnet: 'Coin Magnet' };
    this.fx.popText(pu.sprite.x, pu.sprite.y - 30, names[pu.kind], '#7ff0ff');
    EventBus.emit('powerup-collected', { kind: pu.kind });
  }

  private completeLevel(): void {
    if (this.finished) return;
    this.finished = true;
    const p = this.player;
    p.frozen = true;
    p.body.setVelocity(0, 0);
    p.body.setAllowGravity(false);
    audio.stopMusic(0.4);
    audio.sfx('win');
    haptic('heavy');
    const g = this.world.goal;
    this.tweens.add({ targets: p, x: g.x, y: g.y - 70, scale: 0.1, angle: 720, alpha: 0, duration: 900, ease: 'Cubic.easeIn' });
    this.fx.confettiAt(g.x, g.y - 80, 70);

    const def = this.def;
    const total = this.world.coinTotal;
    const timeMs = Math.round(this.elapsedMs);
    const underParSec = Math.max(0, def.parTimeSec - timeMs / 1000);
    const score =
      this.coins * SCORE.coin +
      this.enemiesDefeated * SCORE.enemy +
      this.bossBonus +
      Math.round(underParSec * SCORE.timeBonusPerSecond) +
      (this.deaths === 0 ? SCORE.noDeathBonus : 0);
    const stars = computeStars(this.coins, total, timeMs, def.parTimeSec);
    const { save, leaderboard } = services();
    const outcome = save.recordLevelResult(def.id, { timeMs, score, coins: this.coins, stars });
    EventBus.emit('level-complete', { levelId: def.id, timeMs, coins: this.coins, totalCoins: total, deaths: this.deaths, score, stars });

    const name = save.settings.playerName || 'Player';
    void leaderboard
      .submit(def.id, { name, score, timeMs, coins: this.coins, date: Date.now() })
      .catch(() => 0)
      .then((rank) => {
        const result: LevelResultData = {
          levelId: def.id,
          timeMs,
          coins: this.coins,
          totalCoins: total,
          enemies: this.enemiesDefeated,
          deaths: this.deaths,
          score,
          stars,
          starFlags: [true, total === 0 || this.coins / total >= 0.9, timeMs <= def.parTimeSec * 1000],
          newBestTime: outcome.newBestTime,
          newBestScore: outcome.newBestScore,
          rank: rank ?? 0,
        };
        this.time.delayedCall(1100, () => {
          this.scene.pause();
          this.scene.pause('UI');
          this.scene.launch('LevelComplete', result);
        });
      });
  }

  pauseGame(): void {
    if (this.finished || !this.scene.isActive()) return;
    audio.setDucked(true);
    services().save.flush();
    this.scene.pause();
    this.scene.pause('UI');
    this.scene.launch('Pause', { levelId: this.def.id });
  }

  // ----------------------------------------------------------------- UPDATE

  override update(time: number, delta: number): void {
    const dt = Math.min(delta, 50);
    this.input_.update();
    if (this.input_.pausePressed) {
      this.pauseGame();
      return;
    }
    if (!this.finished) this.elapsedMs += dt;
    const p = this.player;
    p.update(time, dt, this.input_);

    // Fell out of the world
    if (!p.dead && p.y > this.world.heightPx + 80) {
      p.health = 0;
      this.loseLife();
    }

    // Enemies sleep when far from the camera (big CPU win on phones).
    const view = this.cameras.main.worldView;
    const margin = 300;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e.active) {
        this.enemies.splice(i, 1);
        continue;
      }
      const near = e.x > view.x - margin && e.x < view.right + margin && e.y > view.y - margin && e.y < view.bottom + margin;
      if (e.alive) e.body.moves = near;
      if (near) e.tick(time, dt, p.x, p.y);
      if (e.alive && e.y > this.world.heightPx + 200) e.destroy();
    }
    this.boss?.tick(time, dt, p.x, p.y);

    // Projectiles expire
    this.projectiles.children.each((obj) => {
      const pr = obj as Phaser.Physics.Arcade.Image;
      if (pr.active && (time > (pr.getData('expires') as number) || pr.y > this.world.heightPx + 100)) this.popProjectile(pr);
      return true;
    });

    this.updatePickups(time, dt);
    this.updateWorldTriggers();
    this.updateSky();
    this.ui.setTimer(this.elapsedMs);
  }

  private updatePickups(time: number, dt: number): void {
    const p = this.player;
    if (p.dead) return;
    const magnet = p.powerups.magnet > 0;
    const px = p.x;
    const py = p.y;
    for (const coin of this.world.coins) {
      if (!coin.active) continue;
      const dx = px - coin.x;
      const dy = py - coin.y;
      const d2 = dx * dx + dy * dy;
      if (magnet && d2 < 260 * 260) {
        const d = Math.sqrt(d2) || 1;
        const pull = (dt / 1000) * 900;
        coin.x += (dx / d) * Math.min(pull, d);
        coin.y += (dy / d) * Math.min(pull, d);
      }
      if (d2 < 44 * 44) this.collectCoin(coin);
    }
    for (const pu of this.world.powerups) {
      if (!pu.sprite.active) continue;
      pu.sprite.y = pu.baseY + Math.sin(time / 300 + pu.baseY) * 6;
      if (Phaser.Math.Distance.Between(px, py, pu.sprite.x, pu.sprite.y) < 50) this.collectPowerUp(pu);
    }
  }

  private updateWorldTriggers(): void {
    const p = this.player;
    const w = this.world;
    if (p.dead || this.finished) return;

    for (const cp of w.checkpoints) {
      if (!cp.active && Math.abs(p.x - cp.x) < 40 && Math.abs(p.y - cp.y) < 120) this.lightCheckpoint(cp, true);
    }

    const touch = this.input_.lastDevice === 'touch' || this.ui.touchVisible;
    for (const s of w.signs) {
      const near = Math.abs(p.x - s.x) < 170 && Math.abs(p.y - s.y) < 200;
      if (near !== s.shown) {
        s.shown = near;
        const text = this.def.signs[s.index];
        if (near && text) w.setSignText(s, touch ? text.touch : text.pc);
        this.tweens.add({ targets: s.bubble, alpha: near ? 1 : 0, scale: near ? 1 : 0.8, duration: 200, ease: 'Back.easeOut' });
      }
    }

    const trig = w.parsed.arenaTrigger;
    if (trig && !this.arenaActive && p.x > trig.col * TILE) this.startBossFight();

    const g = w.goal;
    if (g.active && g.visible && Math.abs(p.x - g.x) < 46 && Math.abs(p.y - (g.y - 60)) < 80) this.completeLevel();
  }

  private updateSky(): void {
    const cam = this.cameras.main;
    const progress = clamp(this.player.x / this.world.widthPx, 0, 1);
    const dynamic = services().save.settings.dynamicSky;
    const target = dynamic ? lerp(this.def.timeStart, this.def.timeEnd, progress) : this.def.timeStart;
    this.skyTime = this.skyTime === 0 ? target : lerp(this.skyTime, target, 0.02);
    this.bg.follow(cam.scrollX, cam.scrollY, this.skyTime);
    const sky = computeSky(this.skyTime, this.def.theme);
    this.player.setNightAmount(sky.night);
    this.ui.setAmbient(sky.ambient, sky.night);
  }

  /** Remaining lives (used by HUD on launch). */
  get livesLeft(): number {
    return this.lives;
  }
}
