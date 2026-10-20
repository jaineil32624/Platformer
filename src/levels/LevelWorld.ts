import Phaser from 'phaser';
import { DEPTH, TILE } from '../config/constants';
import type { WorldQuery } from '../entities/Enemy';
import { sharedTileIndex, tileIndex } from '../gfx/art/world';
import { GridPos, ParsedLevel, PowerUpKind, TileType, isSolid, parseLevel } from './LevelParser';
import type { LevelDefinition, LevelTheme } from './types';

export interface Pickup<K = PowerUpKind> {
  sprite: Phaser.GameObjects.Sprite;
  kind: K;
  baseY: number;
}

export interface Checkpoint {
  sprite: Phaser.GameObjects.Sprite;
  index: number;
  x: number;
  y: number;
  active: boolean;
}

export interface Sign {
  sprite: Phaser.GameObjects.Image;
  bubble: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  x: number;
  y: number;
  index: number;
  shown: boolean;
}

/** World-space centre-bottom of a grid cell. */
export const cellBottom = (p: GridPos) => ({ x: p.col * TILE + TILE / 2, y: (p.row + 1) * TILE });
export const cellCenter = (p: GridPos) => ({ x: p.col * TILE + TILE / 2, y: p.row * TILE + TILE / 2 });

/**
 * Builds the playable world for a level definition: the collision tilemap
 * (auto-tiled per theme), hazards, pickups, checkpoints, signs and the goal.
 * Enemies and bosses are spawned by the GameScene from `parsed` data.
 */
export class LevelWorld implements WorldQuery {
  readonly parsed: ParsedLevel;
  readonly map: Phaser.Tilemaps.Tilemap;
  readonly layer: Phaser.Tilemaps.TilemapLayer;
  readonly widthPx: number;
  readonly heightPx: number;
  readonly spikes: Phaser.Physics.Arcade.StaticGroup;
  readonly coins: Phaser.GameObjects.Sprite[] = [];
  readonly powerups: Pickup[] = [];
  readonly checkpoints: Checkpoint[] = [];
  readonly signs: Sign[] = [];
  readonly goal: Phaser.GameObjects.Sprite;
  readonly coinTotal: number;
  private oneWayIndex = sharedTileIndex('oneway');

  constructor(
    private scene: Phaser.Scene,
    readonly def: LevelDefinition,
  ) {
    this.parsed = parseLevel(def.map);
    const p = this.parsed;
    this.widthPx = p.width * TILE;
    this.heightPx = p.height * TILE;

    // ---- tilemap
    const data = p.tiles.map((row, r) => row.map((t, c) => this.tileFor(t, r, c, def.theme)));
    this.map = scene.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const tileset = this.map.addTilesetImage('tiles', 'tiles', TILE, TILE, 1, 2) as Phaser.Tilemaps.Tileset;
    this.layer = this.map.createLayer(0, tileset, 0, 0) as Phaser.Tilemaps.TilemapLayer;
    this.layer.setDepth(DEPTH.tiles);
    this.layer.setCollisionByExclusion([-1]);
    // One-way platforms only collide on their top face.
    this.layer.forEachTile((tile) => {
      if (tile.index === this.oneWayIndex) tile.setCollision(false, false, true, false);
    });

    // ---- spikes
    this.spikes = scene.physics.add.staticGroup();
    for (const s of p.spikes) {
      const { x, y } = cellBottom(s);
      const spike = this.spikes.create(x, y - TILE / 2, 'spikes') as Phaser.Physics.Arcade.Sprite;
      spike.setDepth(DEPTH.hazards);
      const body = spike.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(52, 26).setOffset(6, 38);
    }

    // ---- coins (collected by distance check, no physics bodies needed)
    for (const c of p.coins) {
      const { x, y } = cellCenter(c);
      const coin = scene.add.sprite(x, y, 'coin', 'c0').setDepth(DEPTH.pickups);
      coin.play({ key: 'coin-spin', startFrame: (c.col + c.row) % 6 });
      this.coins.push(coin);
    }
    this.coinTotal = this.coins.length;

    // ---- power-ups
    for (const pu of p.powerups) {
      const { x, y } = cellCenter(pu);
      const sprite = scene.add.sprite(x, y, 'powerup', pu.kind).setDepth(DEPTH.pickups);
      this.powerups.push({ sprite, kind: pu.kind, baseY: y });
    }

    // ---- checkpoints
    p.checkpoints.forEach((cp, index) => {
      const { x, y } = cellBottom(cp);
      const sprite = scene.add.sprite(x, y, 'checkpoint', 'off').setOrigin(0.5, 1).setDepth(DEPTH.checkpoint);
      this.checkpoints.push({ sprite, index, x, y: y - 40, active: false });
    });

    // ---- tutorial signs
    p.signs.forEach((sg, index) => {
      const { x, y } = cellBottom(sg);
      const sprite = scene.add.image(x, y, 'sign').setOrigin(0.5, 1).setDepth(DEPTH.backgroundDecor);
      const label = scene.add
        .text(0, 0, '', {
          fontFamily: 'Poppins, sans-serif',
          fontStyle: '700',
          fontSize: '20px',
          color: '#1b1f3b',
          align: 'center',
          lineSpacing: 2,
        })
        .setOrigin(0.5);
      const bg = scene.add.graphics();
      const bubble = scene.add.container(x, y - 110, [bg, label]).setDepth(DEPTH.foreground).setAlpha(0).setScale(0.8);
      bubble.setData('bg', bg);
      this.signs.push({ sprite, bubble, label, x, y, index, shown: false });
    });

    // ---- goal portal
    const g = cellBottom(p.goal as GridPos);
    this.goal = scene.add.sprite(g.x, g.y + 4, 'portal', 'p0').setOrigin(0.5, 1).setDepth(DEPTH.checkpoint);
    this.goal.play('portal-spin');
    if (def.boss) this.goal.setVisible(false).setActive(false);
  }

  /** Pick the auto-tile variant for a cell based on its neighbours. */
  private tileFor(t: TileType, r: number, c: number, theme: LevelTheme): number {
    switch (t) {
      case TileType.Empty:
        return -1;
      case TileType.Block:
        return sharedTileIndex('block');
      case TileType.OneWay:
        return sharedTileIndex('oneway');
      case TileType.Crate:
        return sharedTileIndex('crate');
      case TileType.Ground: {
        const tiles = this.parsed.tiles;
        const solid = (rr: number, cc: number) => {
          if (rr < 0) return false;
          if (rr >= tiles.length) return true;
          if (cc < 0 || cc >= tiles[0].length) return true;
          return tiles[rr][cc] === TileType.Ground;
        };
        if (!solid(r - 1, c)) {
          const l = solid(r, c - 1);
          const rt = solid(r, c + 1);
          if (!l && !rt) return tileIndex(theme, 'single');
          if (!l) return tileIndex(theme, 'topL');
          if (!rt) return tileIndex(theme, 'topR');
          return tileIndex(theme, 'top');
        }
        if (!solid(r + 1, c)) return tileIndex(theme, 'under');
        return tileIndex(theme, 'fill');
      }
    }
  }

  isOneWay(tile: Phaser.Tilemaps.Tile): boolean {
    return tile.index === this.oneWayIndex;
  }

  isGroundAt(x: number, y: number): boolean {
    const tile = this.layer.getTileAtWorldXY(x, y);
    return !!tile && tile.index !== -1;
  }

  /** Is there solid (non one-way) terrain at this cell? */
  isSolidCell(col: number, row: number): boolean {
    const r = this.parsed.tiles[row];
    return !!r && isSolid(r[col]);
  }

  /** Fill a column with crates to seal the boss arena behind the player. */
  sealColumn(col: number, fromRow: number, toRow: number): void {
    for (let row = fromRow; row <= toRow; row++) {
      if (this.parsed.tiles[row]?.[col] !== TileType.Empty) continue;
      const tile = this.layer.putTileAt(sharedTileIndex('block'), col, row);
      tile.setCollision(true, true, true, true);
      tile.setAlpha(0);
      this.scene.tweens.add({ targets: tile, alpha: 1, duration: 250, delay: (toRow - row) * 40 });
    }
  }

  /** Sign text measures itself, so the bubble is drawn when first shown. */
  setSignText(sign: Sign, text: string): void {
    if (sign.label.text === text) return;
    sign.label.setText(text);
    const bg = sign.bubble.getData('bg') as Phaser.GameObjects.Graphics;
    const w = sign.label.width + 36;
    const h = sign.label.height + 26;
    bg.clear();
    bg.fillStyle(0x000000, 0.25).fillRoundedRect(-w / 2 + 4, -h / 2 + 6, w, h, 16);
    bg.fillStyle(0xfff6dd, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 16);
    bg.lineStyle(4, 0x1b1f3b, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
    bg.fillStyle(0xfff6dd, 1).fillTriangle(-12, h / 2 - 2, 12, h / 2 - 2, 0, h / 2 + 16);
    bg.lineStyle(4, 0x1b1f3b, 1).lineBetween(-12, h / 2, 0, h / 2 + 16).lineBetween(12, h / 2, 0, h / 2 + 16);
  }
}
