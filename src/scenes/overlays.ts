import Phaser from 'phaser';
import { audio } from '../core/AudioManager';
import { services } from '../core/Services';

/** Tear down the gameplay scenes and go to another scene (from an overlay). */
export function leaveGame(scene: Phaser.Scene, target: string, data?: object): void {
  services().save.flush();
  audio.setDucked(false);
  scene.scene.stop('UI');
  scene.scene.stop('Game');
  scene.scene.start(target, data);
}
