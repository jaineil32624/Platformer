/**
 * Runtime platform detection. Kept dependency-free so it works before
 * Capacitor plugins load and inside unit tests.
 */

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
}

function capacitor(): CapacitorGlobal | undefined {
  return (globalThis as { Capacitor?: CapacitorGlobal }).Capacitor;
}

export const Platform = {
  /** True inside the Android/iOS Capacitor shell. */
  isNative(): boolean {
    return !!capacitor()?.isNativePlatform?.();
  },
  /** 'android' | 'ios' | 'web' */
  name(): string {
    return capacitor()?.getPlatform?.() ?? 'web';
  },
  /** True inside the Electron desktop shell (see electron/preload.cjs). */
  isElectron(): boolean {
    return typeof window !== 'undefined' && !!(window as { lumenDesktop?: unknown }).lumenDesktop;
  },
  /** Best-effort touch detection (also true for touch laptops). */
  isTouch(): boolean {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0;
  },
  /** Phones/tablets: touch device without a fine pointer. */
  isMobileLike(): boolean {
    if (this.isNative()) return true;
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(pointer: coarse)').matches;
  },
  /** Whether quitting the app makes sense (desktop shell or Android). */
  canQuit(): boolean {
    return this.isElectron() || this.name() === 'android';
  },
};

/** Quit the app on platforms that support it. */
export function quitApp(): void {
  const desktop = (window as { lumenDesktop?: { quit: () => void } }).lumenDesktop;
  if (desktop) {
    desktop.quit();
    return;
  }
  const cap = (globalThis as { Capacitor?: { Plugins?: { App?: { exitApp: () => void } } } }).Capacitor;
  cap?.Plugins?.App?.exitApp();
}
