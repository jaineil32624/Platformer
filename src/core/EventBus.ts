/**
 * Typed, global event bus used to decouple gameplay from UI, audio and
 * achievements. Gameplay code emits facts ("a coin was collected"); listeners
 * decide what to do with them.
 */

export interface GameEvents {
  'coin-collected': { total: number };
  'enemy-defeated': { kind: string; byStomp: boolean };
  'boss-defeated': { kind: string };
  'boss-health': { current: number; max: number; name: string } | null;
  'player-jump': { double: boolean; wall: boolean };
  'player-hurt': { health: number };
  'player-died': { livesLeft: number };
  'health-changed': { health: number; max: number };
  'lives-changed': { lives: number };
  'powerup-collected': { kind: string };
  'powerup-timer': { kind: string; remaining: number; duration: number };
  'checkpoint-reached': { index: number };
  'level-complete': {
    levelId: string;
    timeMs: number;
    coins: number;
    totalCoins: number;
    deaths: number;
    score: number;
    stars: number;
  };
  'achievement-unlocked': { id: string; title: string };
  'toast': { text: string; color?: string };
  'settings-changed': undefined;
}

type Handler<T> = (payload: T) => void;

export class TypedEventBus {
  private handlers = new Map<keyof GameEvents, Set<Handler<unknown>>>();

  on<K extends keyof GameEvents>(event: K, handler: Handler<GameEvents[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as Handler<unknown>);
    return () => this.off(event, handler);
  }

  off<K extends keyof GameEvents>(event: K, handler: Handler<GameEvents[K]>): void {
    this.handlers.get(event)?.delete(handler as Handler<unknown>);
  }

  emit<K extends keyof GameEvents>(event: K, payload: GameEvents[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    // Copy so handlers may unsubscribe while being called.
    for (const h of [...set]) {
      try {
        h(payload);
      } catch (err) {
        console.error(`[EventBus] handler for "${String(event)}" threw`, err);
      }
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const EventBus = new TypedEventBus();
