# Build Guide

All platforms share the same web build in `dist/`. Always build the web app first.

## Web

```bash
npm run build      # typecheck + minified build into dist/
npm run preview    # serve it at http://localhost:4173
```

- Asset paths are relative (`base: './'`), so `dist/` works from any folder or sub-path.
- Phaser is split into its own cached chunk; game code is ~150 KB gzipped.
- A service worker (`public/sw.js`) caches the game for offline play on HTTPS hosts. Bump
  `CACHE_VERSION` in it for every release.

## Desktop — Electron

| Target | Command | Output (`release/`) |
|---|---|---|
| Windows | `npm run dist:win` | NSIS installer `.exe` + portable `.exe` |
| macOS | `npm run dist:mac` | `.dmg` + `.zip` (universal per your machine's arch) |
| Linux | `npm run dist:linux` | `.AppImage` |

Configuration lives in the `build` block of `package.json`. Icons come from `build-resources/icon.png`
(1024×1024). For signed/notarized macOS builds set `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`,
`APPLE_APP_SPECIFIC_PASSWORD` and `APPLE_TEAM_ID` before building. For Windows code signing set
`CSC_LINK` / `CSC_KEY_PASSWORD` to your `.pfx` certificate.

## Android — Capacitor

One-time setup is in [SETUP.md](SETUP.md). Then:

```bash
npm run android:open      # build web, sync, open Android Studio
npm run android:release   # build web, sync, gradle bundleRelease + assembleRelease
```

### Release signing

1. Create a keystore **once** and back it up (losing it means you can never update the app):
   ```bash
   keytool -genkey -v -keystore lumen-leap-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias lumenleap
   ```
2. Copy `android-keystore.properties.example` to `android/keystore.properties` and fill it in
   (both files are git-ignored).
3. `npm run android:release` produces:
   - `android/app/build/outputs/bundle/release/app-release.aab` → upload to Google Play
   - `android/app/build/outputs/apk/release/app-release.apk` → sideload / direct distribution

Version name/code come from `package.json` (`1.2.3` → code `10203`); rerun
`node scripts/configure-native.mjs` after bumping the version.

## iOS — Capacitor

```bash
npm run ios:open          # build web, sync, open Xcode
```

In Xcode: select *Any iOS Device* → *Product → Archive* → *Distribute App → App Store Connect*.
The resulting archive is the `.ipa` uploaded to App Store Connect (use *Export* for an ad-hoc `.ipa`).

## Icons & splash screens

Source images are in `resources/` (`icon.png` 1024², `splash.png` 2732²). Regenerate every
platform's icon set with `npm run assets:icons`. To redraw them from the game's art, see
`scripts/icon-art.ts`.

## Continuous integration

- `.github/workflows/ci.yml` — typecheck, lint, test and build on every push/PR.
- `.github/workflows/pages.yml` — deploys `dist/` to GitHub Pages on pushes to `main`.
- `.github/workflows/release.yml` — on a `v*` tag builds Windows + macOS installers and an Android
  debug APK, and attaches them to a GitHub Release.
