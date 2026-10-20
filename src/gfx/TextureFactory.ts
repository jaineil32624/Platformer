import Phaser from 'phaser';
import { Ctx } from './draw';
import * as C from './art/characters';
import * as W from './art/world';
import * as B from './art/backgrounds';
import * as U from './art/ui';

/**
 * Paints every texture the game uses into canvases at boot and registers them
 * (plus animations) with Phaser. Work is split into small jobs so the Boot
 * scene can render a progress bar between them and the first frame appears
 * instantly even on slow phones.
 */

type Job = { label: string; run: () => void };

export class TextureFactory {
  constructor(private scene: Phaser.Scene) {}

  private canvas(key: string, w: number, h: number): { tex: Phaser.Textures.CanvasTexture; ctx: Ctx } {
    if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    const tex = this.scene.textures.createCanvas(key, Math.ceil(w), Math.ceil(h)) as Phaser.Textures.CanvasTexture;
    return { tex, ctx: tex.getContext() };
  }

  /** Single-image texture. */
  private image(key: string, w: number, h: number, draw: (ctx: Ctx) => void): void {
    const { tex, ctx } = this.canvas(key, w, h);
    draw(ctx);
    tex.refresh();
  }

  /** Horizontal strip of equally sized named frames. */
  private sheet(
    key: string,
    fw: number,
    fh: number,
    frames: readonly string[],
    draw: (ctx: Ctx, frame: string, index: number) => void,
  ): void {
    const pad = 2; // gap between frames prevents bleeding when scaled
    const { tex, ctx } = this.canvas(key, frames.length * (fw + pad), fh);
    frames.forEach((name, i) => {
      const x = i * (fw + pad);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, 0, fw, fh);
      ctx.clip();
      ctx.translate(x, 0);
      draw(ctx, name, i);
      ctx.restore();
      tex.add(name, 0, x, 0, fw, fh);
    });
    tex.refresh();
  }

  jobs(): Job[] {
    return [
      { label: 'Hero', run: () => this.sheet('player', C.PLAYER_FRAME.w, C.PLAYER_FRAME.h, C.PLAYER_FRAMES, (ctx, f) => C.drawPlayer(ctx, f)) },
      {
        label: 'Critters',
        run: () => {
          this.sheet('slime', C.SLIME_FRAME.w, C.SLIME_FRAME.h, C.SLIME_FRAMES, (ctx, f) => C.drawSlime(ctx, f));
          this.sheet('beetle', C.BEETLE_FRAME.w, C.BEETLE_FRAME.h, C.BEETLE_FRAMES, (ctx, f) => C.drawBeetle(ctx, f));
          this.sheet('bat', C.BAT_FRAME.w, C.BAT_FRAME.h, C.BAT_FRAMES, (ctx, f) => C.drawBat(ctx, f));
        },
      },
      {
        label: 'Bosses',
        run: () => {
          this.sheet('king', C.KING_FRAME.w, C.KING_FRAME.h, C.KING_FRAMES, (ctx, f) => C.drawKing(ctx, f));
          this.sheet('golem', C.GOLEM_FRAME.w, C.GOLEM_FRAME.h, C.GOLEM_FRAMES, (ctx, f) => C.drawGolem(ctx, f));
          this.image('rock', 32, 32, (ctx) => C.drawRock(ctx));
          this.image('orb', 36, 36, (ctx) => C.drawOrb(ctx));
        },
      },
      { label: 'Terrain', run: () => this.buildTileset() },
      {
        label: 'Treasure',
        run: () => {
          const coinFrames = Array.from({ length: W.COIN_FRAMES }, (_, i) => `c${i}`);
          this.sheet('coin', 36, 36, coinFrames, (ctx, _f, i) => W.drawCoin(ctx, i));
          this.sheet('powerup', 48, 48, W.POWERUP_ART, (ctx, f) => W.drawPowerUp(ctx, f as W.PowerUpArt));
          this.sheet('powerup-icon', 48, 48, W.POWERUP_ART, (ctx, f) => W.drawPowerUp(ctx, f as W.PowerUpArt, false));
        },
      },
      {
        label: 'Props',
        run: () => {
          this.image('spikes', 64, 64, (ctx) => W.drawSpikes(ctx));
          this.sheet('checkpoint', 52, 120, W.CHECKPOINT_FRAMES, (ctx, f) => W.drawCheckpoint(ctx, f));
          const portalFrames = Array.from({ length: W.PORTAL_FRAMES }, (_, i) => `p${i}`);
          this.sheet('portal', 112, 144, portalFrames, (ctx, _f, i) => W.drawPortal(ctx, i));
          this.image('sign', 64, 64, (ctx) => W.drawSign(ctx));
        },
      },
      {
        label: 'Skies',
        run: () => {
          this.image('bg-mountains', B.BG_W, 420, (ctx) => B.drawMountains(ctx, 420));
          this.image('bg-hills', B.BG_W, 320, (ctx) => B.drawHills(ctx, 320));
          this.image('bg-bushes', B.BG_W, 300, (ctx) => B.drawBushes(ctx, 300));
          this.image('bg-cave-far', B.BG_W, 512, (ctx) => B.drawCaveFar(ctx, 512));
          this.image('bg-cave-mid', B.BG_W, 512, (ctx) => B.drawCaveMid(ctx, 512));
          for (let i = 0; i < 3; i++) this.image(`cloud${i}`, 240, 100, (ctx) => B.drawCloud(ctx, i));
          this.image('sun', 256, 256, (ctx) => B.drawSun(ctx));
          this.image('moon', 256, 256, (ctx) => B.drawMoon(ctx));
        },
      },
      {
        label: 'Sparkles',
        run: () => {
          this.image('p-dot', 32, 32, (ctx) => U.drawSoftDot(ctx, 32));
          this.image('p-spark', 24, 24, (ctx) => U.drawSpark(ctx));
          this.image('p-leaf', 16, 12, (ctx) => U.drawLeaf(ctx));
          this.image('p-rain', 4, 24, (ctx) => U.drawRaindrop(ctx));
          this.image('light', 256, 256, (ctx) => U.drawLight(ctx, 256));
          this.image('vignette', 256, 256, (ctx) => U.drawVignette(ctx, 256));
          this.image('ring', 128, 128, (ctx) => U.drawRing(ctx, 128));
          this.image('pixel', 4, 4, (ctx) => {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 4, 4);
          });
        },
      },
      {
        label: 'Interface',
        run: () => {
          this.sheet('icon', 64, 64, U.ICONS, (ctx, f) => U.drawIcon(ctx, f as U.IconName));
          this.sheet('hud-heart', 40, 40, ['full', 'empty'], (ctx, f) => U.drawHudHeart(ctx, f === 'full'));
          this.image('hud-life', 40, 40, (ctx) => U.drawLifeIcon(ctx));
          this.image('joy-base', 220, 220, (ctx) => U.drawJoystickBase(ctx, 220));
          this.image('joy-knob', 96, 96, (ctx) => U.drawJoystickKnob(ctx, 96));
          this.image('touch-btn', 140, 140, (ctx) => U.drawTouchButton(ctx, 140));
        },
      },
      { label: 'Animations', run: () => this.createAnimations() },
    ];
  }

  /**
   * Tileset with 1px extruded borders (margin 1, spacing 2) so tiles never
   * show seams at fractional camera zoom levels.
   */
  private buildTileset(): void {
    const S = W.TILE_PX;
    const cell = S + 2;
    const { tex, ctx } = this.canvas('tiles', W.TILE_COUNT * cell, cell);
    const paint = (i: number, draw: (c: Ctx) => void) => {
      const x = 1 + i * cell;
      ctx.save();
      ctx.translate(x, 1);
      ctx.beginPath();
      ctx.rect(0, 0, S, S);
      ctx.clip();
      draw(ctx);
      ctx.restore();
      // Extrude edges by one pixel.
      const cv = ctx.canvas;
      ctx.drawImage(cv, x, 1, 1, S, x - 1, 1, 1, S);
      ctx.drawImage(cv, x + S - 1, 1, 1, S, x + S, 1, 1, S);
      ctx.drawImage(cv, x - 1, 1, S + 2, 1, x - 1, 0, S + 2, 1);
      ctx.drawImage(cv, x - 1, S, S + 2, 1, x - 1, S + 1, S + 2, 1);
    };
    W.THEMES.forEach((theme, ti) => {
      W.TILE_VARIANTS.forEach((variant, vi) => {
        paint(W.tileIndex(theme, variant), (c) => W.drawThemeTile(c, theme, variant, ti * 31 + vi * 7 + 1));
      });
    });
    paint(W.sharedTileIndex('block'), (c) => W.drawBlock(c));
    paint(W.sharedTileIndex('oneway'), (c) => W.drawOneWay(c));
    paint(W.sharedTileIndex('crate'), (c) => W.drawCrate(c));
    tex.refresh();
  }

  private createAnimations(): void {
    const a = this.scene.anims;
    const make = (key: string, tex: string, frames: string[], frameRate: number, repeat = -1, yoyo = false) => {
      if (a.exists(key)) a.remove(key);
      a.create({ key, frames: frames.map((frame) => ({ key: tex, frame })), frameRate, repeat, yoyo });
    };
    make('player-idle', 'player', ['idle0', 'idle1', 'idle2', 'idle3'], 6);
    make('player-run', 'player', ['run0', 'run1', 'run2', 'run3', 'run4', 'run5'], 14);
    make('player-sprint', 'player', ['run0', 'run1', 'run2', 'run3', 'run4', 'run5'], 20);
    make('player-jump', 'player', ['jump'], 1, 0);
    make('player-fall', 'player', ['fall'], 1, 0);
    make('player-wall', 'player', ['wall'], 1, 0);
    make('player-hurt', 'player', ['hurt'], 1, 0);
    make('player-spin', 'player', ['spin'], 1, 0);
    make('slime-move', 'slime', ['move0', 'move1', 'move2', 'move3'], 8);
    make('beetle-walk', 'beetle', ['walk0', 'walk1', 'walk2', 'walk3'], 10);
    make('bat-fly', 'bat', ['fly0', 'fly1', 'fly2', 'fly3'], 12);
    make('coin-spin', 'coin', ['c0', 'c1', 'c2', 'c3', 'c4', 'c5'], 10);
    make('portal-spin', 'portal', Array.from({ length: W.PORTAL_FRAMES }, (_, i) => `p${i}`), 12);
    make('checkpoint-on', 'checkpoint', ['on0', 'on1', 'on2'], 8, -1, true);
    make('king-idle', 'king', ['idle0', 'idle1'], 4);
    make('golem-idle', 'golem', ['idle0', 'idle1'], 3);
  }
}
