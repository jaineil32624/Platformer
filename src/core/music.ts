/**
 * Original procedural soundtrack, written as data for the AudioManager's
 * step sequencer. Every note here is original to this project, so the music
 * needs no attribution and has no licensing risk.
 *
 * Notation
 *  - `progression`: one chord per bar, given as a scale degree (0 = tonic).
 *  - `melody`: one token per 8th note. Numbers are scale degrees (7 = an
 *    octave up, -1 = one degree below the tonic). `.` holds the previous note,
 *    `-` is a rest.
 *  - drum lanes are 16 steps per bar: `x` = hit, `.` = silence.
 */

export type MusicId = 'menu' | 'day' | 'dusk' | 'night' | 'boss';

export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
} as const;

export type LeadVoice = 'triangle' | 'square' | 'sawtooth';

export interface TrackDef {
  bpm: number;
  /** MIDI note of the tonic used for the melody octave. */
  key: number;
  scale: keyof typeof SCALES;
  progression: number[];
  melody: string;
  lead: LeadVoice;
  /** 'eighths' = steady bass, 'drive' = 16ths, 'pulse' = root on beats. */
  bass: 'eighths' | 'drive' | 'pulse';
  arp: boolean;
  pad: boolean;
  kick: string;
  snare: string;
  hat: string;
  /** Per-track mix trims (0..1). */
  mix: { lead: number; bass: number; arp: number; pad: number; drums: number };
}

export const TRACKS: Record<MusicId, TrackDef> = {
  menu: {
    bpm: 92,
    key: 65, // F
    scale: 'major',
    progression: [0, 5, 3, 4],
    melody: [
      '4 . 2 . 4 5 4 .',
      '2 . 0 . 2 . - .',
      '3 . 4 . 5 . 7 .',
      '6 . 5 . 4 . . .',
    ].join(' '),
    lead: 'triangle',
    bass: 'pulse',
    arp: true,
    pad: true,
    kick: 'x.......x.......',
    snare: '................',
    hat: '....x.......x...',
    mix: { lead: 0.55, bass: 0.5, arp: 0.22, pad: 0.18, drums: 0.35 },
  },
  day: {
    bpm: 128,
    key: 67, // G
    scale: 'major',
    progression: [0, 4, 5, 3, 0, 4, 3, 4],
    melody: [
      '0 . 2 4 . 4 5 4',
      '2 . . 1 2 . - .',
      '5 . 4 2 . 0 2 .',
      '3 . . 2 3 4 5 .',
      '7 . 6 7 . 4 . .',
      '6 . 5 4 . 2 4 .',
      '5 . 4 3 . 2 1 .',
      '1 . 2 . 4 . . -',
    ].join(' '),
    lead: 'square',
    bass: 'eighths',
    arp: true,
    pad: false,
    kick: 'x.......x.x.....',
    snare: '....x.......x...',
    hat: 'x.x.x.x.x.x.x.x.',
    mix: { lead: 0.32, bass: 0.55, arp: 0.16, pad: 0, drums: 0.55 },
  },
  dusk: {
    bpm: 112,
    key: 62, // D
    scale: 'major',
    progression: [5, 3, 0, 4],
    melody: [
      '5 . 4 . 5 7 . .',
      '4 . 3 . 2 . 0 .',
      '2 . 4 . 7 . 6 5',
      '4 . . . 1 . 2 .',
    ].join(' '),
    lead: 'triangle',
    bass: 'eighths',
    arp: true,
    pad: true,
    kick: 'x.......x.......',
    snare: '....x.......x...',
    hat: '..x...x...x...x.',
    mix: { lead: 0.5, bass: 0.5, arp: 0.18, pad: 0.14, drums: 0.45 },
  },
  night: {
    bpm: 88,
    key: 57, // A minor
    scale: 'minor',
    progression: [0, 5, 3, 4],
    melody: [
      '4 . . 2 4 . 7 .',
      '5 . . . 4 . 2 .',
      '3 . . 2 0 . 2 3',
      '4 . . . - . . .',
    ].join(' '),
    lead: 'triangle',
    bass: 'pulse',
    arp: true,
    pad: true,
    kick: 'x.........x.....',
    snare: '........x.......',
    hat: '....x.......x..x',
    mix: { lead: 0.45, bass: 0.45, arp: 0.2, pad: 0.2, drums: 0.3 },
  },
  boss: {
    bpm: 150,
    key: 64, // E minor
    scale: 'minor',
    progression: [0, 0, 5, 6, 0, 0, 3, 4],
    melody: [
      '0 . 0 2 3 . 2 .',
      '0 . -1 . 0 . 4 .',
      '5 . 4 . 3 . 4 .',
      '6 . 5 . 6 . 7 .',
      '7 . 7 6 5 . 4 .',
      '3 . 4 . 5 . 3 .',
      '2 . 3 . 5 . 3 .',
      '4 . . . 6 . . .',
    ].join(' '),
    lead: 'sawtooth',
    bass: 'drive',
    arp: false,
    pad: true,
    kick: 'x...x...x...x...',
    snare: '....x.......x..x',
    hat: 'xxxxxxxxxxxxxxxx',
    mix: { lead: 0.26, bass: 0.5, arp: 0, pad: 0.12, drums: 0.55 },
  },
};

export interface MelodyNote {
  /** Start, in 8th-note steps from the start of the loop. */
  step: number;
  /** Length in 8th-note steps. */
  length: number;
  degree: number;
}

/** Parse the melody string into discrete notes (holds merged into lengths). */
export function parseMelody(src: string): MelodyNote[] {
  const tokens = src.trim().split(/\s+/);
  const notes: MelodyNote[] = [];
  let current: MelodyNote | null = null;
  tokens.forEach((tok, i) => {
    if (tok === '.') {
      if (current) current.length++;
      return;
    }
    if (tok === '-') {
      current = null;
      return;
    }
    const degree = Number(tok);
    if (!Number.isFinite(degree)) throw new Error(`Bad melody token "${tok}" at ${i}`);
    current = { step: i, length: 1, degree };
    notes.push(current);
  });
  return notes;
}

/** Convert a scale degree (may be negative or > 6) to a MIDI note. */
export function degreeToMidi(key: number, scale: readonly number[], degree: number): number {
  const octave = Math.floor(degree / scale.length);
  const idx = ((degree % scale.length) + scale.length) % scale.length;
  return key + octave * 12 + scale[idx];
}

export const midiToFreq = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);
