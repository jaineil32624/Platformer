#!/usr/bin/env node
/**
 * Applies Lumen Leap's native settings to the Capacitor projects.
 * Run once after `npx cap add android` / `npx cap add ios` (it is idempotent):
 *
 *   node scripts/configure-native.mjs
 *
 * Android: landscape lock, immersive fullscreen theme, version from package.json,
 *          release signing read from android/keystore.properties (never committed).
 * iOS:     landscape-only orientations, hidden status bar, full-screen requirement.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const [maj, min, patch] = pkg.version.split('.').map(Number);
const versionCode = maj * 10000 + min * 100 + patch;
let touched = 0;

function patchFile(path, fn) {
  if (!existsSync(path)) return console.log(`skip  ${path} (not found)`);
  const before = readFileSync(path, 'utf8');
  const after = fn(before);
  if (after !== before) {
    writeFileSync(path, after);
    touched++;
    console.log(`patch ${path}`);
  } else console.log(`ok    ${path}`);
}

// ---------------------------------------------------------------- Android
patchFile(join(root, 'android/app/src/main/AndroidManifest.xml'), (xml) => {
  if (!xml.includes('android:screenOrientation')) {
    xml = xml.replace(/<activity(\s)/, '<activity android:screenOrientation="sensorLandscape"$1');
  }
  if (!xml.includes('android.hardware.touchscreen')) {
    xml = xml.replace('</manifest>', '    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />\n    <uses-feature android:name="android.hardware.gamepad" android:required="false" />\n</manifest>');
  }
  return xml;
});

patchFile(join(root, 'android/app/build.gradle'), (g) => {
  g = g.replace(/versionCode \d+/, `versionCode ${versionCode}`).replace(/versionName "[^"]*"/, `versionName "${pkg.version}"`);
  if (!g.includes('keystore.properties')) {
    g = g.replace(
      /android \{/,
      `def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }`,
    );
    g = g.replace(/release \{\s*minifyEnabled false/, 'release {\n            signingConfig keystorePropertiesFile.exists() ? signingConfigs.release : signingConfigs.debug\n            minifyEnabled false');
  }
  return g;
});

patchFile(join(root, 'android/app/src/main/res/values/styles.xml'), (xml) =>
  xml.includes('android:windowFullscreen')
    ? xml
    : xml.replace(
        /(<style name="AppTheme.NoActionBar"[^>]*>)/,
        '$1\n        <item name="android:windowFullscreen">true</item>\n        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>',
      ),
);

// -------------------------------------------------------------------- iOS
patchFile(join(root, 'ios/App/App/Info.plist'), (plist) => {
  const landscape = `<array>\n\t\t<string>UIInterfaceOrientationLandscapeLeft</string>\n\t\t<string>UIInterfaceOrientationLandscapeRight</string>\n\t</array>`;
  plist = plist.replace(/(<key>UISupportedInterfaceOrientations(?:~ipad)?<\/key>\s*)<array>[\s\S]*?<\/array>/g, `$1${landscape}`);
  const add = (key, value) => {
    if (!plist.includes(`<key>${key}</key>`)) plist = plist.replace(/<\/dict>\s*<\/plist>/, `\t<key>${key}</key>\n\t${value}\n</dict>\n</plist>`);
  };
  add('UIStatusBarHidden', '<true/>');
  add('UIViewControllerBasedStatusBarAppearance', '<false/>');
  add('UIRequiresFullScreen', '<true/>');
  add('ITSAppUsesNonExemptEncryption', '<false/>');
  add('CFBundleShortVersionString', `<string>${pkg.version}</string>`);
  return plist;
});

console.log(touched ? `\nUpdated ${touched} file(s).` : '\nEverything already configured.');
