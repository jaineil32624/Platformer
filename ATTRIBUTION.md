# Asset Attribution

Lumen Leap was built to have **zero third-party art or audio**. Every external
asset that *is* included is listed below with its source, author and license.
When you add an asset, add a row here in the same pull request
(see [CONTRIBUTING.md](CONTRIBUTING.md)).

## External assets shipped with the game

| Asset | Files | Author | Source | License | Required credit |
|---|---|---|---|---|---|
| Poppins (Bold 700, Medium 500), subset to Latin, converted to WOFF | `public/fonts/Poppins-Bold.woff`, `public/fonts/Poppins-Medium.woff` | Indian Type Foundry, Jonny Pinhorn | [Google Fonts](https://fonts.google.com/specimen/Poppins) · [GitHub](https://github.com/itfoundry/Poppins) | [SIL Open Font License 1.1](LICENSES/OFL-Poppins.txt) | Keep the license file with the fonts; may not be sold on its own. Credited in the in-game Credits screen. |

## Original assets (no attribution required)

All of the following are original to this project, generated procedurally in
source code, and covered by the project's [MIT License](LICENSE):

| Asset type | Where it comes from |
|---|---|
| Player, enemy and boss sprites + animations | `src/gfx/art/characters.ts` (Canvas 2D drawing) |
| Tilesets (5 themes), props, coins, power-ups, portal, checkpoints | `src/gfx/art/world.ts` |
| Parallax backgrounds, clouds, sun, moon, stars | `src/gfx/art/backgrounds.ts` |
| UI icons, HUD hearts, touch controls, particles | `src/gfx/art/ui.ts` |
| App icons and splash screens (`resources/`, `build-resources/`, `public/icons/`) | Rendered from the same drawing code by `scripts/icon-art.ts` |
| Music (5 tracks) | Original compositions stored as note data in `src/core/music.ts`, synthesized at runtime with the Web Audio API |
| Sound effects (23) | Synthesized at runtime in `src/core/AudioManager.ts` |
| Level designs | `src/levels/levels.ts`, authored with `scripts/levelgen.py` |

## Third-party code (not assets)

These are npm dependencies, installed at build time and not committed to the
repository. Their licenses are included in `node_modules` and in built apps.

| Package | License |
|---|---|
| [Phaser 3](https://phaser.io) | MIT |
| [Capacitor](https://capacitorjs.com) (core, android, ios, plugins, cli, assets) | MIT |
| [Electron](https://www.electronjs.org) / electron-builder | MIT |
| [Vite](https://vitejs.dev), [Vitest](https://vitest.dev), TypeScript, ESLint, Prettier | MIT / Apache-2.0 |

## Using Kenney / OpenGameArt / itch.io assets later

The project is ready for drop-in art if you prefer hand-made sprites: load
images in `BootScene` instead of (or in addition to) `TextureFactory`, keep the
same texture keys and frame names, and add each pack to the first table above
with its URL, author, license (prefer CC0) and any required credit line. If a
license requires in-game credit (CC-BY), also add it to `CREDITS` in
`src/scenes/CreditsScene.ts`.
