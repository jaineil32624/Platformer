/**
 * Minimal key/value storage abstraction. The default implementation wraps
 * localStorage (persistent in browsers, Electron and Capacitor WebViews) and
 * silently falls back to memory when storage is unavailable (private mode,
 * sandboxed iframes) so the game never crashes because it cannot save.
 */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export class MemoryStore implements KeyValueStore {
  private data = new Map<string, string>();
  get(key: string): string | null {
    return this.data.has(key) ? (this.data.get(key) as string) : null;
  }
  set(key: string, value: string): void {
    this.data.set(key, value);
  }
  remove(key: string): void {
    this.data.delete(key);
  }
}

export class LocalStore implements KeyValueStore {
  private fallback = new MemoryStore();
  private available: boolean;

  constructor() {
    this.available = LocalStore.probe();
    if (!this.available) console.warn('[storage] localStorage unavailable — progress will not persist this session.');
  }

  private static probe(): boolean {
    try {
      const k = '__lumen_probe__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch {
      return false;
    }
  }

  get(key: string): string | null {
    if (!this.available) return this.fallback.get(key);
    try {
      return window.localStorage.getItem(key);
    } catch {
      return this.fallback.get(key);
    }
  }

  set(key: string, value: string): void {
    if (!this.available) return this.fallback.set(key, value);
    try {
      window.localStorage.setItem(key, value);
    } catch (err) {
      // Quota exceeded or storage revoked: keep playing with in-memory data.
      console.warn('[storage] write failed, using memory fallback', err);
      this.fallback.set(key, value);
    }
  }

  remove(key: string): void {
    this.fallback.remove(key);
    if (!this.available) return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

/** Parse JSON without throwing; returns fallback on any error. */
export function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
