import { describe, expect, it } from 'vitest';
import { compareEntries, LocalLeaderboardProvider, sanitizeName } from '../src/core/LeaderboardService';
import { parseMelody, degreeToMidi, SCALES, TRACKS, midiToFreq } from '../src/core/music';
import { computeSky, wrapTime, celestial } from '../src/gfx/Sky';
import { approach, clamp, formatTime, lerpColor, seededRandom } from '../src/utils/math';
import { MemoryStore } from '../src/utils/storage';
import { TypedEventBus } from '../src/core/EventBus';

describe('LocalLeaderboardProvider', () => {
  it('ranks by score then time and keeps the top 10', async () => {
    const lb = new LocalLeaderboardProvider(new MemoryStore());
    for (let i = 0; i < 12; i++) await lb.submit('a', { name: `P${i}`, score: i * 100, timeMs: 1000, coins: 0, date: i });
    const top = await lb.top('a');
    expect(top).toHaveLength(10);
    expect(top[0].score).toBe(1100);
    expect(await lb.submit('a', { name: 'low', score: 0, timeMs: 1, coins: 0, date: 99 })).toBe(0);
    expect(await lb.submit('a', { name: 'best', score: 5000, timeMs: 1, coins: 0, date: 99 })).toBe(1);
  });

  it('breaks ties by faster time', () => {
    const a = { name: 'a', score: 10, timeMs: 500, coins: 0, date: 0 };
    const b = { name: 'b', score: 10, timeMs: 400, coins: 0, date: 0 };
    expect([a, b].sort(compareEntries)[0].name).toBe('b');
  });

  it('sanitizes names', () => {
    expect(sanitizeName('  <script>  ')).toBe('script');
    expect(sanitizeName('')).toBe('Player');
    expect(sanitizeName('a'.repeat(40))).toHaveLength(14);
  });
});

describe('music', () => {
  it('parses holds and rests', () => {
    const notes = parseMelody('0 . 2 - 4 . .');
    expect(notes).toEqual([
      { step: 0, length: 2, degree: 0 },
      { step: 2, length: 1, degree: 2 },
      { step: 4, length: 3, degree: 4 },
    ]);
  });

  it('every track has 8 melody tokens per bar and valid drum lanes', () => {
    for (const t of Object.values(TRACKS)) {
      expect(t.melody.trim().split(/\s+/).length).toBe(t.progression.length * 8);
      for (const lane of [t.kick, t.snare, t.hat]) expect(lane).toMatch(/^[x.]{16}$/);
    }
  });

  it('maps degrees to MIDI across octaves', () => {
    expect(degreeToMidi(60, SCALES.major, 0)).toBe(60);
    expect(degreeToMidi(60, SCALES.major, 7)).toBe(72);
    expect(degreeToMidi(60, SCALES.major, -1)).toBe(59);
    expect(midiToFreq(69)).toBeCloseTo(440);
  });
});

describe('sky', () => {
  it('is bright at noon and dark at midnight', () => {
    expect(computeSky(0.5).night).toBe(0);
    expect(computeSky(0).night).toBe(1);
    expect(computeSky(0.5).ambient).toBe(0xffffff);
  });
  it('wraps time and keeps caves dark', () => {
    expect(wrapTime(1.25)).toBeCloseTo(0.25);
    expect(wrapTime(-0.25)).toBeCloseTo(0.75);
    expect(computeSky(0.5, 'cave').night).toBeGreaterThan(0.8);
  });
  it('shows the sun at noon and the moon at midnight', () => {
    expect(celestial(0.5).sun[2]).toBe(true);
    expect(celestial(0.5).moon[2]).toBe(false);
    expect(celestial(0.0).moon[2]).toBe(true);
  });
});

describe('math helpers', () => {
  it('works', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(approach(0, 10, 3)).toBe(3);
    expect(approach(10, 0, 30)).toBe(0);
    expect(lerpColor(0x000000, 0xffffff, 0.5)).toBe(0x808080);
    expect(formatTime(65432)).toBe('1:05.4');
    expect(formatTime(null)).toBe('--:--');
    const r1 = seededRandom(1);
    const r2 = seededRandom(1);
    expect(r1()).toBe(r2());
  });
});

describe('EventBus', () => {
  it('delivers, unsubscribes and isolates handler errors', () => {
    const bus = new TypedEventBus();
    let n = 0;
    const off = bus.on('coin-collected', () => n++);
    bus.on('coin-collected', () => {
      throw new Error('boom');
    });
    bus.emit('coin-collected', { total: 1 });
    off();
    bus.emit('coin-collected', { total: 2 });
    expect(n).toBe(1);
  });
});
