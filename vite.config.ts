import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

/**
 * Vite configuration.
 * - `base: './'` keeps every asset path relative so the same build works on
 *   GitHub Pages, itch.io, inside Electron (file://) and inside Capacitor.
 * - Phaser is split into its own chunk so game-code updates don't bust the
 *   (large, rarely changing) engine cache.
 */
export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1600,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: { phaser: ['phaser'] },
      },
    },
  },
});
