# Setup

## Everyone

1. Install **Node.js 22 LTS** (20.19+ works) — https://nodejs.org
2. Install **Visual Studio Code** and accept the recommended extensions when prompted.
3. `npm install`, then `npm run dev`.

> Tip: `npm run dev` prints a *Network* URL. Open it on your phone (same Wi-Fi) to test touch controls
> instantly, without building an app.

## Android (Windows, macOS or Linux)

1. Install **Android Studio** (it bundles the Android SDK and a JDK 21).
2. In Android Studio → *SDK Manager*, install the latest **Android SDK Platform** and **Build-Tools**.
3. Set `ANDROID_HOME` (Android Studio shows the SDK path) if the CLI can't find the SDK.
4. First time only, create the native project:
   ```bash
   npm run build
   npx cap add android
   npm run assets:icons            # generates launcher icons + splash from resources/
   node scripts/configure-native.mjs
   ```
5. `npm run android:open` opens the project in Android Studio. Press ▶ to run on a device/emulator.

## iOS (macOS only)

1. Install **Xcode** (App Store) and run it once to accept the license.
2. Sign in to your Apple ID in *Xcode → Settings → Accounts* (a free account can run on your own device;
   App Store publishing needs the paid Apple Developer Program).
3. First time only:
   ```bash
   npm run build
   npx cap add ios
   npm run assets:icons
   node scripts/configure-native.mjs
   ```
4. `npm run ios:open`, choose your Team under *Signing & Capabilities*, then press ▶.

## Desktop (Windows / macOS)

Nothing extra — `npm install` downloads Electron. Run `npm run electron:dev`.
To build a macOS installer you must be on a Mac; Windows installers build on Windows
(or use the GitHub Actions release workflow, which builds both).

## Troubleshooting

| Problem | Fix |
|---|---|
| `npx cap add` says web assets missing | Run `npm run build` first — Capacitor copies `dist/`. |
| Blank screen in the Android app | Run `npm run cap:sync` after every web change. |
| No sound | Browsers start audio only after the first tap/key press — this is expected. |
| Gradle JDK errors | Android Studio → Settings → Build Tools → Gradle → use the embedded JDK (21). |
| `electron` failed to download | Behind a proxy set `ELECTRON_MIRROR`, or skip with `ELECTRON_SKIP_BINARY_DOWNLOAD=1` if you only need web/mobile. |
