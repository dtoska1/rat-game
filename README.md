# Rat Game · The Great Pastry Heist

A hand-drawn kitchen stealth platformer starring a round rat, three pastries, a very upset human chef, and an increasingly chaotic bonus heist.

**[Play Rat Game V3.7](https://dtoska1.github.io/rat-game/)** · [Source](https://github.com/dtoska1/rat-game) · [Playtest notes](docs/PLAYTEST-V3.md)

## Play

- **iPhone / touch devices:** Turn your phone **sideways** (either landscape orientation). Portrait mode shows a rotate prompt and pauses the current run. Use the on-screen arrows, **Jump**, context-sensitive **Action**, **Boost**, and **Squeak**. The **Swap** control exchanges thumb zones.
- **Desktop:** Use **A/D** or **←/→** to move, **Space / W / ↑** to jump, **E** for Action, **Shift** to boost, **Q** to squeak, and **Esc** to pause.
- **Original story:** Steal and stash the éclair, macaron, and strawberry cake; then collect three hidden cheeses, use two prank devices, and escape.
- **HARD Chaos:** Start directly in the bonus round against two moving mops, timed steam vents, and a more aggressive chef. Three optional notebook pranks vary between runs.

Your best score is saved in your browser. The original V1/V2 illustrated kitchen and both supplied sketches remain part of the game.

## Run locally

Requires Node.js 22 (see `.nvmrc`).

```sh
npm ci
npm run dev
```

Vite displays the local URL. To test the production build:

```sh
npm run build
npm run preview -- --port 4318 --strictPort
```

## Play offline

The self-contained HTML is built and browser-tested with networking disabled.
On GitHub, open [Standalone offline game](https://github.com/dtoska1/rat-game/actions/workflows/offline.yml), choose a **successful** run on `main`, and download the `rat-game-offline-html` artifact. Extract the ZIP and open `Rat Game V3.html` in a desktop browser.

To create your own copy, run `npm run build:offline` and then
`node tests/v3-offline.mjs` (Chromium required). The older files under `preview/phone/` and the historical preview ZIP are **not** the current release.

## Automated tests

With the preview server running at `http://127.0.0.1:4318/`, in another terminal:

```sh
npx playwright install chromium
npm run test:layout
npm run test:features
npm run test:game
node tests/v3-portrait-gate.mjs
```

The orientation regression has a historical filename, but tests **landscape-only** play. The [Kitchen playtest workflow](.github/workflows/verify.yml) also runs Chromium and WebKit checks on pull requests. [GitHub Pages](.github/workflows/pages.yml) deploys `main` automatically.

Troubleshooting: add `?debug` to the game URL for diagnostic information; `?quality=low` reduces mobile rendering resolution. Cloud browser tests cannot establish physical iPhone frame rate.

## Where things live

| Location | Purpose |
| --- | --- |
| `src/main.ts`, `src/style.css` | Game page, HUD, touch layout and orientation |
| `src/v3/` | Phaser scene, physics, chef, objectives, controls and game art |
| `src/assets/` | Classic illustrated kitchen and game assets |
| `art-source/`, `assets/concept/` | Original artwork and design references |
| `tests/`, `.github/workflows/` | Playwright regression suite and automated builds |
| `docs/` | Design, test evidence and [V3 release history](docs/RELEASE_NOTES_V3.md) |
| `docs/archive/` | Preserved early V0.x bugfix and art-pack notes |
| `preview/` | Historical packaged builds, **not** the production website |

The older compiled previews are kept for historical compatibility; use the GitHub Pages link above for the current game. Please don't commit regenerated `dist/`, `node_modules/`, or temporary Playwright output.
