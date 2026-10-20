import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/levels/levels';
import { parseLevel, LevelParseError, TileType, isSolid } from '../src/levels/LevelParser';

describe('LevelParser', () => {
  it('parses a minimal map', () => {
    const p = parseLevel(['....', 'P.CG', '####']);
    expect(p.width).toBe(4);
    expect(p.player).toEqual({ col: 0, row: 1 });
    expect(p.coins).toHaveLength(1);
    expect(p.tiles[2][0]).toBe(TileType.Ground);
  });

  it('rejects maps without a player or goal and unknown characters', () => {
    expect(() => parseLevel(['..G', '###'])).toThrow(LevelParseError);
    expect(() => parseLevel(['P..', '###'])).toThrow(LevelParseError);
    expect(() => parseLevel(['P?G', '###'])).toThrow(/Unknown map character/);
  });
});

describe.each(LEVELS.map((l) => [l.id, l] as const))('level "%s"', (_id, def) => {
  const p = parseLevel(def.map);

  it('has equal-width rows', () => {
    expect(new Set(def.map.map((r) => r.length)).size).toBe(1);
  });

  it('starts the player on solid ground', () => {
    const below = p.tiles[p.player.row + 1]?.[p.player.col];
    expect(isSolid(below)).toBe(true);
  });

  it('places the goal on ground and inside the map', () => {
    const g = p.goal!;
    expect(isSolid(p.tiles[g.row + 1][g.col])).toBe(true);
  });

  it('has a tutorial sign entry for every sign marker', () => {
    expect(def.signs.length).toBeGreaterThanOrEqual(p.signs.length);
  });

  it('has coins and a sensible par time', () => {
    expect(p.coins.length).toBeGreaterThan(20);
    expect(def.parTimeSec).toBeGreaterThan(20);
  });

  it('declares a boss only with a spawn and an arena trigger', () => {
    if (def.boss) {
      expect(p.boss).not.toBeNull();
      expect(p.arenaTrigger).not.toBeNull();
      expect(p.arenaTrigger!.col).toBeLessThan(p.boss!.col);
    } else {
      expect(p.boss).toBeNull();
    }
  });

  it('does not bury collectibles inside solid tiles', () => {
    for (const c of [...p.coins, ...p.powerups]) expect(isSolid(p.tiles[c.row][c.col])).toBe(false);
  });
});

describe('level list', () => {
  it('has unique ids and 6 levels with 2 bosses', () => {
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(LEVELS.length);
    expect(LEVELS).toHaveLength(6);
    expect(LEVELS.filter((l) => l.boss)).toHaveLength(2);
  });
});
