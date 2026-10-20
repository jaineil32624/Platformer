import Phaser from 'phaser';
import { COLORS } from '../config/constants';
import { audio } from '../core/AudioManager';
import { EventBus } from '../core/EventBus';
import { ParticleQuality, Settings, TouchMode } from '../core/SaveManager';
import { services } from '../core/Services';
import { LEVEL_IDS } from '../levels/levels';
import { LocalLeaderboardProvider } from '../core/LeaderboardService';
import type { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { setHapticsEnabled } from '../utils/haptics';
import { Platform } from '../utils/platform';
import { BaseMenuScene } from './BaseMenuScene';

interface SettingsData {
  /** Scene to return to. When 'Pause', Settings runs as an overlay. */
  returnTo?: string;
}

/**
 * Settings: audio mix, controls, display/accessibility, profile name and data
 * reset. Every change is applied live and persisted immediately.
 */
export class SettingsScene extends BaseMenuScene<SettingsData> {
  private nameInput: Phaser.GameObjects.DOMElement | null = null;

  constructor() {
    super('Settings');
  }

  override init(data: SettingsData): void {
    super.init(data);
    this.overlay = data?.returnTo === 'Pause';
  }

  private update_(patch: Partial<Settings>): void {
    const save = services().save;
    save.updateSettings(patch);
    audio.applySettings(save.settings);
    setHapticsEnabled(save.settings.haptics);
    EventBus.emit('settings-changed', undefined);
  }

  protected build(): Button[] {
    const { W, H } = this;
    const st = services().save.settings;
    const rowsPerCol = 7;
    const fit = Math.min(1, (W * 0.96) / (2 * 520 * this.s + 40 * this.s), (H - 40 * this.s) / ((150 + rowsPerCol * 66) * this.s));
    const s = (this.s = this.s * Math.max(0.55, fit));
    const buttons: Button[] = [this.backButton()];
    this.heading('Settings', 56);

    const colW = 500 * s;
    const leftX = W / 2 - colW / 2 - 20 * s;
    const rightX = W / 2 + colW / 2 + 20 * s;
    const top = 130 * s;
    const rowH = 64 * s;
    this.panel(leftX, top + (rowsPerCol * rowH) / 2 - 10 * s, colW + 30 * s, rowsPerCol * rowH + 30 * s);
    this.panel(rightX, top + (rowsPerCol * rowH) / 2 - 10 * s, colW + 30 * s, rowsPerCol * rowH + 30 * s);

    // ---------- left column: audio + gameplay
    let y = top + 18 * s;
    const sliders: [string, keyof Settings][] = [
      ['Master', 'masterVolume'],
      ['Music', 'musicVolume'],
      ['Effects', 'sfxVolume'],
    ];
    for (const [label, key] of sliders) {
      new Slider(this, leftX, y, colW - 20 * s, s, label, st[key] as number, (v) => {
        this.update_({ [key]: v } as Partial<Settings>);
        if (key === 'sfxVolume') audio.sfx('coin');
      });
      y += rowH;
    }
    const toggleRow = (x: number, yy: number, label: string, value: string, onClick: () => void, delay: number) => {
      this.add.text(x - colW / 2 + 10 * s, yy, label, { fontFamily: 'Poppins, sans-serif', fontStyle: '500', fontSize: `${24 * s}px`, color: COLORS.text }).setOrigin(0, 0.5);
      const b = this.button(x + colW / 2 - 100 * s, yy, { label: value, width: 190 * s, height: 50 * s, small: true, onClick }, delay);
      buttons.push(b);
      return b;
    };
    const onOff = (v: boolean) => (v ? 'On' : 'Off');
    toggleRow(leftX, y, 'Mute all', onOff(st.muted), () => this.toggle('muted'), 60);
    y += rowH;
    toggleRow(leftX, y, 'Screen shake & flash', onOff(st.screenShake), () => this.toggle('screenShake'), 80);
    y += rowH;
    toggleRow(leftX, y, 'Dynamic day/night', onOff(st.dynamicSky), () => this.toggle('dynamicSky'), 100);
    y += rowH;
    toggleRow(leftX, y, 'Vibration', onOff(st.haptics), () => this.toggle('haptics'), 120);

    // ---------- right column: controls + display + profile
    y = top + 18 * s;
    const touchNext: Record<TouchMode, TouchMode> = { auto: 'on', on: 'off', off: 'auto' };
    toggleRow(rightX, y, 'Touch controls', cap(st.touchControls), () => this.set({ touchControls: touchNext[st.touchControls] }), 60);
    y += rowH;
    const sizes = [0.8, 1, 1.2, 1.4];
    const sizeName = (v: number) => ({ 0.8: 'Small', 1: 'Normal', 1.2: 'Large', 1.4: 'Huge' })[v as 0.8] ?? 'Normal';
    toggleRow(rightX, y, 'Touch button size', sizeName(st.touchScale), () => {
      const i = sizes.indexOf(st.touchScale);
      this.set({ touchScale: sizes[(i + 1) % sizes.length] });
    }, 80);
    y += rowH;
    const pNext: Record<ParticleQuality, ParticleQuality> = { high: 'low', low: 'high' };
    toggleRow(rightX, y, 'Particles', cap(st.particles), () => this.set({ particles: pNext[st.particles] }), 100);
    y += rowH;
    toggleRow(rightX, y, 'Show FPS', onOff(st.showFps), () => this.toggle('showFps'), 120);
    y += rowH;
    if (!Platform.isNative()) {
      toggleRow(rightX, y, 'Fullscreen', this.scale.isFullscreen ? 'On' : 'Off', () => this.toggleFullscreen(), 140);
      y += rowH;
    }
    // Player name (used for leaderboards)
    this.add.text(rightX - colW / 2 + 10 * s, y, 'Player name', { fontFamily: 'Poppins, sans-serif', fontStyle: '500', fontSize: `${24 * s}px`, color: COLORS.text }).setOrigin(0, 0.5);
    this.nameInput = this.add.dom(rightX + colW / 2 - 100 * s, y).createFromHTML(
      `<input type="text" maxlength="14" placeholder="Player" aria-label="Player name"
        style="width:${180 * s}px;height:${44 * s}px;font:600 ${20 * s}px Poppins,sans-serif;border-radius:${12 * s}px;
        border:${3 * s}px solid #0d0f22;background:#fdf6e3;color:#1b1f3b;padding:0 ${10 * s}px;box-sizing:border-box;outline:none" />`,
    );
    const input = (this.nameInput.node as HTMLElement).querySelector('input');
    if (input) {
      input.value = st.playerName;
      input.addEventListener('input', () => this.update_({ playerName: input.value.slice(0, 14) }));
      input.addEventListener('keydown', (e) => e.stopPropagation());
    }
    y += rowH;
    buttons.push(
      this.button(rightX, y, { label: 'Reset all progress', icon: 'trash', width: 330 * s, height: 52 * s, color: COLORS.danger, small: true, onClick: () => this.resetAll() }, 160),
    );
    return buttons;
  }

  private toggle(key: 'muted' | 'screenShake' | 'dynamicSky' | 'haptics' | 'showFps'): void {
    this.set({ [key]: !services().save.settings[key] } as Partial<Settings>);
  }

  private set(patch: Partial<Settings>): void {
    this.update_(patch);
    this.rebuild(false);
  }

  private toggleFullscreen(): void {
    const desktop = (window as { lumenDesktop?: { toggleFullscreen: () => void } }).lumenDesktop;
    if (desktop) desktop.toggleFullscreen();
    else if (this.scale.isFullscreen) this.scale.stopFullscreen();
    else this.scale.startFullscreen();
    this.time.delayedCall(300, () => this.rebuild(false));
  }

  private resetAll(): void {
    this.confirm('Erase ALL save slots, settings and local leaderboards?', () => {
      const { save, leaderboard } = services();
      save.wipeAll();
      if (leaderboard instanceof LocalLeaderboardProvider) leaderboard.clearAll(LEVEL_IDS);
      audio.applySettings(save.settings);
      this.update_({});
      this.rebuild(false);
    }, 'Erase');
  }

  protected override onBack(): void {
    services().save.flush();
    const back = this.params.returnTo ?? 'MainMenu';
    if (this.overlay) {
      this.scene.stop();
      this.scene.wake(back);
    } else this.goto(back);
  }
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
