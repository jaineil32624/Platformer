# Deployment

## GitHub repository & Pages (web)

1. Push to `main`. In the repo go to **Settings → Pages → Source: GitHub Actions**.
2. The `pages.yml` workflow builds and publishes. Your game will be at
   `https://<user>.github.io/lumen-leap/`.

## itch.io (web)

`npm run build`, zip the **contents** of `dist/` (index.html at the zip root), upload as an HTML game,
tick *This file will be played in the browser*, set the viewport to 1280×720 and enable *Fullscreen button*
and *Mobile friendly (landscape)*.

## GitHub Releases (desktop + APK)

```bash
npm version patch          # bumps package.json and creates a git tag
git push --follow-tags
```

The `release.yml` workflow attaches the Windows installer, macOS DMG and Android APK to the release.

## Google Play

1. Build a signed AAB (`npm run android:release`, see BUILD.md).
2. In [Play Console](https://play.google.com/console) → *Create app* → name **Lumen Leap**, *Game*, *Free*.
3. Fill **Store listing** from [store/STORE_LISTING.md](../store/STORE_LISTING.md): icon 512×512
   (`public/icons/icon-512.png`), feature graphic 1024×500, at least 2 phone screenshots (landscape).
4. **App content**: privacy policy URL (host [store/PRIVACY_POLICY.md](../store/PRIVACY_POLICY.md), e.g. on
   GitHub Pages), Ads: *No*, Data safety: *No data collected or shared*, Target audience, Content rating
   questionnaire (expect *Everyone*).
5. Create an **Internal testing** release, upload the `.aab`, add testers. New personal developer
   accounts must run a **closed test with at least 12 testers for 14 days** before production access.
6. Promote to Production when ready. Keep *Play App Signing* enabled.

## Apple App Store

1. Enrol in the Apple Developer Program. In App Store Connect create an app with bundle ID
   `com.jaineilrana.lumenleap`.
2. In Xcode set version/build, then *Product → Archive → Distribute App → App Store Connect → Upload*.
3. Fill metadata from [store/STORE_LISTING.md](../store/STORE_LISTING.md); screenshots for 6.9" and 6.5"
   iPhones and 13" iPad (landscape).
4. *App Privacy*: **Data Not Collected**. Age rating: 4+.
5. Add the build to TestFlight, test, then *Submit for Review*.

## Changing the app ID

The ID `com.jaineilrana.lumenleap` appears in `capacitor.config.ts` and `package.json` (`build.appId`).
Change both **before** running `npx cap add` the first time — it's permanent once published.
