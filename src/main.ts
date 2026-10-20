import Phaser from 'phaser';
import { audio } from './core/AudioManager';
import { initServices } from './core/Services';
import { AchievementsScene } from './scenes/AchievementsScene';
import { BackgroundScene } from './scenes/BackgroundScene';
import { BootScene } from './scenes/BootScene';
import { CreditsScene } from './scenes/CreditsScene';
import { GameOverScene } from './scenes/GameOverScene';
import { GameScene } from './scenes/GameScene';
import { LeaderboardScene } from './scenes/LeaderboardScene';
import { LevelCompleteScene } from './scenes/LevelCompleteScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { PauseScene } from './scenes/PauseScene';
import { SettingsScene } from './scenes/SettingsScene';
import { SlotsScene } from './scenes/SlotsScene';
import { UIScene } from './scenes/UIScene';
import { setHapticsEnabled } from './utils/haptics';
import { Platform } from './utils/platform';

/**
 * Entry point: initialise long-lived services, then boot Phaser.
 * Scene order matters for rendering — Background is sent to the back at runtime.
 */
const services = initServices();
setHapticsEnabled(services.save.settings.haptics);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1b1f3b',
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  render: {
    antialias: true,
    powerPreference: 'high-performance',
  },
  fps: { target: 60, smoothStep: true },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 2400 }, fixedStep: true, fps: 60, debug: false },
  },
  input: { gamepad: true, activePointers: 4 },
  dom: { createContainer: true },
  audio: { noAudio: true }, // our own Web Audio engine handles all sound
  scene: [
    BootScene,
    BackgroundScene,
    MainMenuScene,
    SlotsScene,
    LevelSelectScene,
    SettingsScene,
    AchievementsScene,
    LeaderboardScene,
    CreditsScene,
    GameScene,
    UIScene,
    PauseScene,
    LevelCompleteScene,
    GameOverScene,
  ],
});

// Browsers require a user gesture before audio can play.
const unlock = () => audio.unlock();
window.addEventListener('pointerdown', unlock, { passive: true });
window.addEventListener('keydown', unlock);
window.addEventListener('touchend', unlock, { passive: true });

// Save + silence when the app goes to the background; resume on return.
document.addEventListener('visibilitychange', () => {
  const hidden = document.hidden;
  if (hidden) services.save.flush();
  audio.setSuspended(hidden);
});
window.addEventListener('pagehide', () => services.save.flush());

// Track play time for the active slot (once per second, cheap).
setInterval(() => {
  if (!document.hidden && game.scene.isActive('Game') && services.save.activeSlotIndex !== null) {
    services.save.addStats({ playTimeMs: 1000 });
  }
}, 1000);

// Android hardware back button → pause / go back.
if (Platform.isNative()) {
  const app = (globalThis as { Capacitor?: { Plugins?: { App?: { addListener: (e: string, cb: () => void) => void } } } }).Capacitor
    ?.Plugins?.App;
  app?.addListener('backButton', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27 } as KeyboardEventInit));
  });
}

// Offline support for the plain web build only.
if (!Platform.isNative() && !Platform.isElectron() && location.protocol.startsWith('http') && 'serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => undefined));
}

// Handy for debugging in the browser console.
(window as unknown as { game?: Phaser.Game }).game = game;
