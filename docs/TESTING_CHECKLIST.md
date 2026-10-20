# Release Testing Checklist

Run `npm run typecheck && npm run lint && npm test && npm run build` first — all must pass.

## Every platform

- [ ] Boot: loading bar fills, no console errors, main menu appears in < 3 s
- [ ] Main menu: title animates, sky cycles, all buttons work with mouse, keyboard (arrows + Enter) and gamepad
- [ ] Audio starts after first input; master/music/effects sliders and Mute apply immediately
- [ ] Save slots: create, play, delete (with confirmation); progress summary is correct
- [ ] Level select: locked levels can't be opened; stars and best times show after completion
- [ ] Movement: run, sprint, jump height varies with press length, double jump, wall slide + wall jump,
      drop through one-way platforms (down + jump)
- [ ] Stomp slimes and bats; stomping a beetle hurts; shield destroys enemies on contact
- [ ] Spikes and falling off the world cost health/life; respawn at last checkpoint with full health
- [ ] Checkpoint toast says progress saved; quitting and choosing *Continue* resumes there
- [ ] Every power-up works: heart, shield (timer ring), boots (faster/higher), magnet (pulls coins), 1-Up
- [ ] Game over after last life → Retry and Level Select work
- [ ] Slime King: arena seals, health bar, minions at half HP, portal opens after defeat
- [ ] Storm Golem: only damageable while stunned, rocks + orbs hurt, portal opens after defeat
- [ ] Level complete: stars animate, NEW BEST badges, leaderboard rank, Next/Retry/Levels
- [ ] Final level shows "You saved the night!" and Credits
- [ ] Achievements unlock with a toast and appear in the Achievements screen
- [ ] Leaderboard shows entries per level, sorted by score then time
- [ ] Pause (Esc / Start / ⏸): Resume, Restart, Settings (returns to pause), Level Select, Save & Quit
- [ ] Settings persist after reload (volume, toggles, player name)
- [ ] Reset all progress wipes slots, settings and leaderboards
- [ ] Day/night shifts across a level; toggling *Dynamic day/night* freezes it
- [ ] Screen-shake toggle disables shake *and* flashes; particle quality *Low* reduces effects
- [ ] Resize window / rotate device: menus and HUD re-layout without overlap
- [ ] FPS counter shows ~60 on target hardware throughout a level and the boss fights

## Mobile (Android + iOS)

- [ ] Opens in landscape only, fullscreen, no status bar; splash screen then menu
- [ ] Touch controls appear automatically; joystick follows thumb; multi-touch (move + jump + run)
- [ ] Tapping the right half jumps; buttons sized correctly on phone and tablet; size setting works
- [ ] Backgrounding the app pauses the game and silences audio; resuming restores music
- [ ] Android back button pauses / goes back in menus
- [ ] Vibration on stomps/hits (toggle works)
- [ ] Notch/cutout devices: HUD not hidden behind the cutout
- [ ] Save data survives app restart and update install

## Desktop (Electron)

- [ ] Window opens at 1280×720, resizable, F11 toggles fullscreen, Settings → Fullscreen works
- [ ] Quit button (main menu) closes the app
- [ ] Installer installs/uninstalls cleanly; app icon correct in taskbar/dock

## Web

- [ ] Works in Chrome, Edge, Firefox and Safari (desktop + mobile)
- [ ] Works under a sub-path (GitHub Pages) — no 404s for assets
- [ ] Second load is near-instant and works offline (service worker)

## Store submission

- [ ] Version bumped in `package.json`; `node scripts/configure-native.mjs` re-run
- [ ] `CHANGELOG.md` updated; `sw.js` `CACHE_VERSION` bumped
- [ ] Privacy policy URL live; store screenshots updated
- [ ] ATTRIBUTION.md lists every external asset
