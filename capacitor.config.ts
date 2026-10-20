import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor wraps the Vite web build (dist/) into native Android and iOS apps.
 * Run `npm run cap:sync` after every web build to copy it into the native projects.
 */
const config: CapacitorConfig = {
  appId: 'com.jaineilrana.lumenleap',
  appName: 'Lumen Leap',
  webDir: 'dist',
  backgroundColor: '#1b1f3b',
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    contentInset: 'never',
    backgroundColor: '#1b1f3b',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#1b1f3b',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
