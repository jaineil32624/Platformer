# Contributing

Thanks for helping make Lumen Leap better!

## Workflow

1. Fork and create a branch: `git checkout -b feature/my-change`.
2. `npm install`, then `npm run dev`.
3. Before opening a PR run: `npm run typecheck && npm run lint && npm test && npm run build`.
4. Open a pull request describing **what** changed and **how you tested it** (see
   [docs/TESTING_CHECKLIST.md](docs/TESTING_CHECKLIST.md)). Include a screenshot/GIF for visual changes.

## Code style

- TypeScript strict mode; Prettier formatting (`npm run format`); ESLint must pass.
- Keep gameplay rules in `scenes/GameScene.ts`/`entities`, presentation in `scenes/UIScene.ts`/`ui`,
  and engine-independent logic in `core/` (with unit tests).
- Put tuning numbers in `src/config/constants.ts`, not inline.
- Comment the *why* for anything non-obvious (physics tricks, timing windows, state machines).
- Communicate between systems with the typed `EventBus` rather than direct references.

## Assets

Only add assets you are allowed to redistribute. Prefer **CC0** (Kenney.nl, OpenGameArt CC0, itch.io
CC0 packs) or OFL fonts from Google Fonts. **Every external asset must be listed in
[ATTRIBUTION.md](ATTRIBUTION.md)** with source URL, author, license and required credit in the same PR.
PRs adding unattributed or non-commercially-licensed assets will not be merged.

## Levels

Maps are ASCII in `src/levels/levels.ts` (legend in `src/levels/types.ts`). `npm test` validates maps.
Playtest every jump with *and* without double jump where intended.

## Commits

Use clear, present-tense messages (`Add bat swoop telegraph`, `Fix wall-jump on one-way tiles`).
