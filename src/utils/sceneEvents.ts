import Phaser from 'phaser';
import { EventBus, GameEvents } from '../core/EventBus';

/**
 * Subscribe to the global EventBus for the lifetime of a scene. The handler
 * is removed automatically when the scene shuts down, preventing the classic
 * "listener from a dead scene" leak.
 */
export function listen<K extends keyof GameEvents>(
  scene: Phaser.Scene,
  event: K,
  handler: (payload: GameEvents[K]) => void,
): void {
  const off = EventBus.on(event, handler);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
  scene.events.once(Phaser.Scenes.Events.DESTROY, off);
}
