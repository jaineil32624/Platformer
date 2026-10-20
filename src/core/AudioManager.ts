import { Settings } from './SaveManager';
import { MusicId, SCALES, TRACKS, TrackDef, degreeToMidi, midiToFreq, parseMelody, MelodyNote } from './music';

/**
 * AudioManager — a self-contained Web Audio engine.
 *
 * Why synthesize instead of loading files? Zero download size, zero licensing
 * questions, instant start-up, and every sound can be tweaked in code.
 *
 * Graph:  voices ─► musicBus ─┐
 *                             ├─► master ─► compressor ─► destination
 *         sfx    ─► sfxBus  ──┘
 *
 * Browsers only allow audio after a user gesture, so `unlock()` is called from
 * the first pointer/key event. Before that every call is a silent no-op.
 */

export type SfxName =
  | 'jump'
  | 'doubleJump'
  | 'wallJump'
  | 'land'
  | 'coin'
  | 'stomp'
  | 'hurt'
  | 'death'
  | 'powerup'
  | 'checkpoint'
  | 'oneUp'
  | 'click'
  | 'hover'
  | 'back'
  | 'bossHit'
  | 'bossRoar'
  | 'explosion'
  | 'win'
  | 'gameOver'
  | 'achievement'
  | 'throw'
  | 'slam'
  | 'portal';

interface ToneOpts {
  type?: OscillatorType;
  attack?: number;
  release?: number;
  gain?: number;
  /** Frequency to glide to over the note's duration. */
  slideTo?: number;
  filter?: number;
  q?: number;
  detune?: number;
  dest?: AudioNode;
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private duck!: GainNode;
  private noise!: AudioBuffer;

  private settings: Pick<Settings, 'masterVolume' | 'musicVolume' | 'sfxVolume' | 'muted'> = {
    masterVolume: 0.8,
    musicVolume: 0.6,
    sfxVolume: 0.8,
    muted: false,
  };

  // Sequencer state
  private currentId: MusicId | null = null;
  private track: TrackDef | null = null;
  private melody: MelodyNote[] = [];
  private trackGain: GainNode | null = null;
  private step = 0;
  private nextStepTime = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private pendingMusic: MusicId | null = null;
  private lastSfx = new Map<SfxName, number>();

  get unlocked(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  get currentMusic(): MusicId | null {
    return this.currentId ?? this.pendingMusic;
  }

  /** Create/resume the AudioContext. Must be called from a user gesture. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctor =
          window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor({ latencyHint: 'interactive' });
        this.buildGraph();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      if (this.pendingMusic) {
        const id = this.pendingMusic;
        this.pendingMusic = null;
        this.playMusic(id);
      }
    } catch (err) {
      console.warn('[audio] unable to start Web Audio', err);
    }
  }

  private buildGraph(): void {
    const ctx = this.ctx as AudioContext;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 12;
    comp.ratio.value = 4;
    comp.connect(ctx.destination);

    this.master = ctx.createGain();
    this.master.connect(comp);
    this.duck = ctx.createGain();
    this.duck.connect(this.master);
    this.musicBus = ctx.createGain();
    this.musicBus.connect(this.duck);
    this.sfxBus = ctx.createGain();
    this.sfxBus.connect(this.master);

    // One second of white noise, reused for drums and impacts.
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    this.applyVolumes();
  }

  applySettings(s: Pick<Settings, 'masterVolume' | 'musicVolume' | 'sfxVolume' | 'muted'>): void {
    this.settings = { ...s };
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const m = this.settings.muted ? 0 : this.settings.masterVolume;
    this.master.gain.setTargetAtTime(m, t, 0.03);
    // Square the slider value for a more natural perceived loudness curve.
    this.musicBus.gain.setTargetAtTime(this.settings.musicVolume ** 2 * 0.9, t, 0.03);
    this.sfxBus.gain.setTargetAtTime(this.settings.sfxVolume ** 2, t, 0.03);
  }

  /** Lower the music (e.g. while paused) without stopping it. */
  setDucked(ducked: boolean): void {
    if (!this.ctx) return;
    this.duck.gain.setTargetAtTime(ducked ? 0.3 : 1, this.ctx.currentTime, 0.12);
  }

  /** Pause/resume everything (app backgrounded). */
  setSuspended(suspended: boolean): void {
    if (!this.ctx) return;
    if (suspended) void this.ctx.suspend();
    else void this.ctx.resume();
  }

  // ===================================================================== MUSIC

  playMusic(id: MusicId, fadeSeconds = 0.8): void {
    if (!this.ctx) {
      this.pendingMusic = id;
      return;
    }
    if (this.currentId === id) return;
    this.stopMusic(fadeSeconds);

    const ctx = this.ctx;
    this.currentId = id;
    this.track = TRACKS[id];
    this.melody = parseMelody(this.track.melody);
    this.trackGain = ctx.createGain();
    this.trackGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.trackGain.gain.exponentialRampToValueAtTime(1, ctx.currentTime + fadeSeconds);
    this.trackGain.connect(this.musicBus);
    this.step = 0;
    this.nextStepTime = ctx.currentTime + 0.08;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  stopMusic(fadeSeconds = 0.6): void {
    this.pendingMusic = null;
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    if (this.ctx && this.trackGain) {
      const g = this.trackGain;
      const t = this.ctx.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + fadeSeconds);
      setTimeout(() => g.disconnect(), fadeSeconds * 1000 + 100);
    }
    this.trackGain = null;
    this.currentId = null;
    this.track = null;
  }

  /** Look-ahead scheduler: queue every 16th-note step due in the next 150ms. */
  private schedule(): void {
    if (!this.ctx || !this.track || !this.trackGain) return;
    const lookAhead = 0.15;
    const sixteenth = 60 / this.track.bpm / 4;
    // If the tab was throttled we may be far behind; skip ahead instead of bursting.
    if (this.nextStepTime < this.ctx.currentTime - 0.2) this.nextStepTime = this.ctx.currentTime + 0.02;
    while (this.nextStepTime < this.ctx.currentTime + lookAhead) {
      this.playStep(this.step, this.nextStepTime, sixteenth);
      this.step++;
      this.nextStepTime += sixteenth;
    }
  }

  private playStep(step: number, time: number, sixteenth: number): void {
    const tr = this.track as TrackDef;
    const out = this.trackGain as GainNode;
    const scale = SCALES[tr.scale];
    const stepsPerBar = 16;
    const loopSteps = tr.progression.length * stepsPerBar;
    const s = step % loopSteps;
    const bar = Math.floor(s / stepsPerBar);
    const inBar = s % stepsPerBar;
    const chordDegree = tr.progression[bar];
    const chord = [0, 2, 4].map((o) => degreeToMidi(tr.key - 12, scale, chordDegree + o));
    const bassNote = degreeToMidi(tr.key - 24, scale, chordDegree);

    // ---- drums
    const d = tr.mix.drums;
    if (tr.kick[inBar] === 'x') this.kick(time, 0.9 * d, out);
    if (tr.snare[inBar] === 'x') this.snare(time, 0.55 * d, out);
    if (tr.hat[inBar] === 'x') this.hat(time, (inBar % 4 === 0 ? 0.32 : 0.2) * d, out);

    // ---- bass
    const b = tr.mix.bass;
    if (tr.bass === 'drive') {
      this.tone(time, midiToFreq(bassNote), sixteenth * 0.9, { type: 'sawtooth', gain: 0.22 * b, filter: 700, dest: out });
    } else if (tr.bass === 'eighths' && inBar % 2 === 0) {
      const n = inBar % 8 === 6 ? bassNote + 12 : bassNote;
      this.tone(time, midiToFreq(n), sixteenth * 1.7, { type: 'triangle', gain: 0.5 * b, dest: out });
    } else if (tr.bass === 'pulse' && inBar % 4 === 0) {
      this.tone(time, midiToFreq(bassNote), sixteenth * 3.6, { type: 'triangle', gain: 0.55 * b, release: 0.12, dest: out });
    }

    // ---- arpeggio (chord tones cycling every 16th)
    if (tr.arp && tr.mix.arp > 0) {
      const pattern = [0, 1, 2, 1];
      const n = chord[pattern[inBar % 4]] + 12;
      this.tone(time, midiToFreq(n), sixteenth * 0.8, {
        type: 'square',
        gain: 0.12 * tr.mix.arp,
        filter: 1800,
        dest: out,
      });
    }

    // ---- pad (held chord, retriggered each bar)
    if (tr.pad && inBar === 0 && tr.mix.pad > 0) {
      const dur = sixteenth * 16;
      for (const n of chord) {
        this.tone(time, midiToFreq(n), dur, {
          type: 'sawtooth',
          gain: 0.07 * tr.mix.pad,
          attack: dur * 0.3,
          release: dur * 0.3,
          filter: 900,
          detune: 7,
          dest: out,
        });
      }
    }

    // ---- melody (8th-note grid → every other 16th)
    if (inBar % 2 === 0) {
      const eighth = Math.floor(s / 2);
      const note = this.melody.find((m) => m.step === eighth);
      if (note) {
        const freq = midiToFreq(degreeToMidi(tr.key, scale, note.degree));
        this.tone(time, freq, note.length * sixteenth * 2 * 0.92, {
          type: tr.lead,
          gain: 0.3 * tr.mix.lead,
          filter: tr.lead === 'sawtooth' ? 2600 : 4000,
          attack: 0.01,
          release: 0.08,
          dest: out,
        });
      }
    }
  }

  // ============================================================ SYNTH VOICES

  private tone(time: number, freq: number, dur: number, o: ToneOpts = {}): void {
    const ctx = this.ctx as AudioContext;
    const osc = ctx.createOscillator();
    osc.type = o.type ?? 'square';
    osc.frequency.setValueAtTime(freq, time);
    if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slideTo), time + dur);
    if (o.detune) osc.detune.value = (Math.random() * 2 - 1) * o.detune;

    const g = ctx.createGain();
    const peak = o.gain ?? 0.2;
    const attack = o.attack ?? 0.005;
    const release = Math.min(o.release ?? 0.05, dur);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), time + attack);
    g.gain.setValueAtTime(Math.max(peak, 0.0002), time + Math.max(attack, dur - release));
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    let node: AudioNode = osc;
    if (o.filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.filter;
      f.Q.value = o.q ?? 0.7;
      osc.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(o.dest ?? this.sfxBus);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  private noiseBurst(
    time: number,
    dur: number,
    gain: number,
    filterType: BiquadFilterType,
    freq: number,
    dest: AudioNode,
    sweepTo?: number,
  ): void {
    const ctx = this.ctx as AudioContext;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.setValueAtTime(freq, time);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, time + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(time, Math.random() * 0.5);
    src.stop(time + dur + 0.02);
  }

  private kick(time: number, gain: number, dest: AudioNode): void {
    this.tone(time, 150, 0.22, { type: 'sine', slideTo: 42, gain, release: 0.2, dest });
  }

  private snare(time: number, gain: number, dest: AudioNode): void {
    this.noiseBurst(time, 0.16, gain, 'bandpass', 1900, dest);
    this.tone(time, 190, 0.08, { type: 'triangle', gain: gain * 0.5, slideTo: 120, dest });
  }

  private hat(time: number, gain: number, dest: AudioNode): void {
    this.noiseBurst(time, 0.05, gain * 0.5, 'highpass', 7500, dest);
  }

  // ===================================================================== SFX

  /**
   * Play a named sound effect. `pitch` (1 = default) adds variety, e.g. coin
   * streaks rise in pitch. Identical effects are rate-limited to avoid
   * clipping when many fire on the same frame.
   */
  sfx(name: SfxName, pitch = 1): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const last = this.lastSfx.get(name) ?? -1;
    if (now - last < 0.035) return;
    this.lastSfx.set(name, now);

    const t = now + 0.005;
    const out = this.sfxBus;
    const p = pitch;
    switch (name) {
      case 'jump':
        this.tone(t, 300 * p, 0.14, { type: 'square', slideTo: 620 * p, gain: 0.16, filter: 3000 });
        break;
      case 'doubleJump':
        this.tone(t, 420 * p, 0.12, { type: 'square', slideTo: 900 * p, gain: 0.14, filter: 3500 });
        this.tone(t + 0.05, 640 * p, 0.12, { type: 'triangle', slideTo: 1200 * p, gain: 0.12 });
        break;
      case 'wallJump':
        this.noiseBurst(t, 0.06, 0.25, 'bandpass', 1200, out);
        this.tone(t, 360 * p, 0.14, { type: 'square', slideTo: 760 * p, gain: 0.14, filter: 2800 });
        break;
      case 'land':
        this.noiseBurst(t, 0.08, 0.22, 'lowpass', 600, out, 200);
        break;
      case 'coin':
        this.tone(t, 988 * p, 0.07, { type: 'square', gain: 0.12, filter: 5000 });
        this.tone(t + 0.06, 1319 * p, 0.16, { type: 'square', gain: 0.12, filter: 5000, release: 0.12 });
        break;
      case 'stomp':
        this.tone(t, 220, 0.16, { type: 'square', slideTo: 70, gain: 0.25, filter: 1500 });
        this.noiseBurst(t, 0.1, 0.3, 'lowpass', 1400, out);
        break;
      case 'hurt':
        this.tone(t, 480, 0.25, { type: 'sawtooth', slideTo: 140, gain: 0.2, filter: 1800 });
        this.noiseBurst(t, 0.12, 0.2, 'bandpass', 900, out);
        break;
      case 'death':
        [523, 392, 311, 233].forEach((f, i) =>
          this.tone(t + i * 0.12, f, 0.16, { type: 'square', gain: 0.16, filter: 2000 }),
        );
        break;
      case 'powerup':
        [523, 659, 784, 1047, 1319].forEach((f, i) =>
          this.tone(t + i * 0.055, f, 0.12, { type: 'square', gain: 0.12, filter: 4500 }),
        );
        break;
      case 'checkpoint':
        [659, 880, 1175].forEach((f, i) => this.tone(t + i * 0.09, f, 0.22, { type: 'triangle', gain: 0.22 }));
        break;
      case 'oneUp':
        [659, 784, 1319, 1047, 1175, 1568].forEach((f, i) =>
          this.tone(t + i * 0.08, f, 0.12, { type: 'square', gain: 0.12, filter: 4000 }),
        );
        break;
      case 'click':
        this.tone(t, 880, 0.05, { type: 'triangle', gain: 0.18, slideTo: 1200 });
        break;
      case 'hover':
        this.tone(t, 660, 0.03, { type: 'sine', gain: 0.08 });
        break;
      case 'back':
        this.tone(t, 700, 0.07, { type: 'triangle', gain: 0.16, slideTo: 420 });
        break;
      case 'bossHit':
        this.tone(t, 160, 0.3, { type: 'sawtooth', slideTo: 60, gain: 0.3, filter: 1200 });
        this.noiseBurst(t, 0.25, 0.35, 'lowpass', 2000, out, 300);
        break;
      case 'bossRoar':
        this.tone(t, 110, 0.9, { type: 'sawtooth', slideTo: 55, gain: 0.25, filter: 700, attack: 0.08, release: 0.4 });
        this.noiseBurst(t, 0.8, 0.18, 'bandpass', 500, out, 200);
        break;
      case 'explosion':
        this.noiseBurst(t, 0.6, 0.5, 'lowpass', 1800, out, 80);
        this.tone(t, 90, 0.5, { type: 'sine', slideTo: 30, gain: 0.35 });
        break;
      case 'slam':
        this.noiseBurst(t, 0.35, 0.45, 'lowpass', 900, out, 60);
        this.tone(t, 70, 0.35, { type: 'sine', slideTo: 35, gain: 0.4 });
        break;
      case 'throw':
        this.noiseBurst(t, 0.14, 0.18, 'bandpass', 600, out, 2400);
        break;
      case 'win':
        [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) =>
          this.tone(t + i * 0.1, f, i === 6 ? 0.5 : 0.14, { type: 'square', gain: 0.14, filter: 4000, release: 0.1 }),
        );
        break;
      case 'gameOver':
        [392, 370, 349, 330].forEach((f, i) =>
          this.tone(t + i * 0.28, f, 0.3, { type: 'triangle', gain: 0.25, release: 0.15 }),
        );
        break;
      case 'achievement':
        [784, 988, 1175, 1568].forEach((f, i) =>
          this.tone(t + i * 0.07, f, 0.25, { type: 'triangle', gain: 0.2, release: 0.18 }),
        );
        break;
      case 'portal':
        this.tone(t, 300, 0.8, { type: 'sine', slideTo: 1400, gain: 0.2, attack: 0.1, release: 0.3 });
        this.tone(t, 450, 0.8, { type: 'triangle', slideTo: 2100, gain: 0.1, attack: 0.1, release: 0.3 });
        break;
    }
  }
}

/** Single shared instance — the audio graph must outlive scene changes. */
export const audio = new AudioManager();
