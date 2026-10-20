import { Platform } from './platform';

type Strength = 'light' | 'medium' | 'heavy';

interface HapticsPlugin {
  impact(options: { style: 'LIGHT' | 'MEDIUM' | 'HEAVY' }): Promise<void>;
}

let enabled = true;

/** Toggled from settings. */
export function setHapticsEnabled(on: boolean): void {
  enabled = on;
}

/**
 * Short vibration for impacts. Uses the native Capacitor Haptics plugin on
 * iOS/Android (registered natively once `@capacitor/haptics` is installed),
 * falling back to the Vibration API on Android browsers. No-op elsewhere.
 */
export function haptic(strength: Strength): void {
  if (!enabled) return;
  try {
    if (Platform.isNative()) {
      const plugins = (globalThis as { Capacitor?: { Plugins?: { Haptics?: HapticsPlugin } } }).Capacitor?.Plugins;
      const style = strength === 'light' ? 'LIGHT' : strength === 'medium' ? 'MEDIUM' : 'HEAVY';
      void plugins?.Haptics?.impact({ style }).catch(() => undefined);
      return;
    }
    if (Platform.isMobileLike() && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(strength === 'light' ? 10 : strength === 'medium' ? 20 : 35);
    }
  } catch {
    /* haptics are best-effort */
  }
}
