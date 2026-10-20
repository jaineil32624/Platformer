/**
 * Pure (Phaser-free) parser that turns an ASCII map into structured data.
 * Keeping it framework-independent makes it trivially unit-testable and lets
 * tools validate levels without booting the game.
 */

export enum TileType {
  Empty = 0,
  Ground = 1,
  Block = 2,
  OneWay = 3,
  Crate = 4,
}

export type EnemyKind = 'slime' | 'beetle' | 'bat';
export type PowerUpKind = 'heart' | 'shield' | 'boots' | 'magnet' | 'life';

export interface GridPos {
  col: number;
  row: number;
}

export interface ParsedLevel {
  width: number;
  height: number;
  /** tiles[row][col] */
  tiles: TileType[][];
  player: GridPos;
  goal: GridPos | null;
  boss: GridPos | null;
  arenaTrigger: GridPos | null;
  coins: GridPos[];
  spikes: GridPos[];
  checkpoints: GridPos[];
  signs: GridPos[];
  enemies: (GridPos & { kind: EnemyKind })[];
  powerups: (GridPos & { kind: PowerUpKind })[];
}

const ENEMY_CHARS: Record<string, EnemyKind> = { S: 'slime', E: 'beetle', b: 'bat' };
const POWERUP_CHARS: Record<string, PowerUpKind> = { h: 'heart', s: 'shield', f: 'boots', m: 'magnet', '1': 'life' };
const TILE_CHARS: Record<string, TileType> = { '#': TileType.Ground, '=': TileType.Block, '-': TileType.OneWay, B: TileType.Crate };

export class LevelParseError extends Error {}

export function parseLevel(map: readonly string[]): ParsedLevel {
  if (!map.length) throw new LevelParseError('Map is empty');
  const height = map.length;
  const width = Math.max(...map.map((r) => r.length));

  const out: ParsedLevel = {
    width,
    height,
    tiles: [],
    player: { col: 1, row: 1 },
    goal: null,
    boss: null,
    arenaTrigger: null,
    coins: [],
    spikes: [],
    checkpoints: [],
    signs: [],
    enemies: [],
    powerups: [],
  };

  let foundPlayer = false;
  for (let row = 0; row < height; row++) {
    const line = map[row].padEnd(width, '.');
    const tileRow: TileType[] = [];
    for (let col = 0; col < width; col++) {
      const ch = line[col];
      tileRow.push(TILE_CHARS[ch] ?? TileType.Empty);
      const pos = { col, row };
      if (ch in ENEMY_CHARS) out.enemies.push({ ...pos, kind: ENEMY_CHARS[ch] });
      else if (ch in POWERUP_CHARS) out.powerups.push({ ...pos, kind: POWERUP_CHARS[ch] });
      else
        switch (ch) {
          case 'P':
            if (foundPlayer) throw new LevelParseError('Map has more than one player start (P)');
            out.player = pos;
            foundPlayer = true;
            break;
          case 'G':
            out.goal = pos;
            break;
          case 'X':
            out.boss = pos;
            break;
          case 'A':
            out.arenaTrigger = pos;
            break;
          case 'C':
            out.coins.push(pos);
            break;
          case '^':
            out.spikes.push(pos);
            break;
          case 'K':
            out.checkpoints.push(pos);
            break;
          case 'i':
            out.signs.push(pos);
            break;
          case '.':
          case '#':
          case '=':
          case '-':
          case 'B':
            break;
          default:
            throw new LevelParseError(`Unknown map character "${ch}" at row ${row}, col ${col}`);
        }
    }
    out.tiles.push(tileRow);
  }

  if (!foundPlayer) throw new LevelParseError('Map has no player start (P)');
  if (!out.goal) throw new LevelParseError('Map has no goal (G)');
  // Checkpoints are activated left-to-right; keep them ordered for respawn logic.
  out.checkpoints.sort((a, b) => a.col - b.col);
  return out;
}

export const isSolid = (t: TileType): boolean => t === TileType.Ground || t === TileType.Block || t === TileType.Crate;
