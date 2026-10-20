# Architecture

## Scenes

```
Boot ──► Background (always running, renders first: sky, sun/moon, stars, clouds, parallax)
     └─► MainMenu ─► Slots ─► LevelSelect ─► Game ◄─► UI (HUD, lighting, weather, touch controls)
                 ├─► Settings / Achievements / Leaderboard / Credits
Game overlays: Pause (─► Settings overlay) · LevelComplete · GameOver
```

- **Game** owns rules and entities; it never draws HUD. It calls `ui.setTimer()`,
  `ui.setAmbient()` and `background.follow()` each frame and emits facts on the EventBus.
- **UI** listens to the EventBus (`health-changed`, `coin-collected`, `boss-health`, `toast`,
  `achievement-unlocked`, …). Game logic and UI logic never touch each other's objects.
- Menus extend `BaseMenuScene`, which rebuilds the layout on resize/rotation, provides keyboard/gamepad
  focus navigation (`FocusGroup`) and fade transitions.

## Core systems (`src/core`) — Phaser-free and unit-tested

| Module | Responsibility |
|---|---|
| `SaveManager` | Settings + 3 versioned save slots, debounced writes, migration, export/import |
| `AchievementManager` | Declarative achievement list; updates stats from events and unlocks |
| `LeaderboardService` | `LeaderboardProvider` interface + offline `LocalLeaderboardProvider` |
| `AudioManager` + `music.ts` | Web Audio synth: look-ahead sequencer for music, one-shot SFX, buses |
| `InputManager` | Merges keyboard, gamepad and touch into one per-frame snapshot |
| `EventBus` | Typed global events (`GameEvents`) |
| `Services` | Creates the singletons once at startup |

## Gameplay

- `Player` — state machine over Arcade physics with coyote time, jump buffering, variable jump height,
  wall slide/jump (with a short input lock), double jump, invulnerability frames, timed power-ups.
- `Enemy` subclasses — `Slime`, `Beetle` (walkers that turn at ledges) and `Bat` (hover/swoop/return).
  Enemies outside the camera (+300px) are put to sleep (`body.moves = false`).
- `Boss` subclasses — timer-driven state machines; `takeHit()` handles i-frames, the health bar and the
  defeat sequence. Bosses spawn projectiles/minions through a `BossContext` the scene provides.
- `LevelWorld` — builds the tilemap from the ASCII map with per-theme auto-tiling, one-way platform
  faces, hazards, pickups, checkpoints, signs and the portal.

## Rendering & performance

- All art is painted once at boot into canvas textures (`TextureFactory`), sliced into small jobs so the
  loading bar animates. No image/audio downloads → fast start, tiny bundle.
- Tileset tiles are extruded by 1px to avoid seams at fractional zoom.
- Coins and power-ups use distance checks instead of physics bodies; particle emitters are pooled.
- Physics runs at a fixed 60Hz step; camera zoom adapts so ~10.5 tiles are visible vertically.
- Lighting = one `MULTIPLY` rectangle tinted by the sky model + a vignette + an additive player glow.

## Extending

**New level** — add an entry to `src/levels/levels.ts` (map legend is documented in `levels/types.ts`).
`npm test` validates every map (player on ground, goal reachable on ground, signs, bosses).

**New enemy** — subclass `Enemy`, implement `think()`, add a map character in `LevelParser`, draw its
frames in `gfx/art/characters.ts` and register the sheet + animation in `TextureFactory`.

**New achievement** — add an object to `ACHIEVEMENTS` with a `check(ctx)` (and optional `progress`).

**Online leaderboard** — implement `LeaderboardProvider` (e.g. Firebase, Supabase, Play Games,
Game Center) and return it from `initServices()` in `core/Services.ts`.

**Hand-drawn art** — load images in `BootScene` with the same texture keys/frame names; nothing else
changes. Record the source and license in `ATTRIBUTION.md`.
