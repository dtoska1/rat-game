# 🐀 RAT GAME — Very Serious Rat Business

**Prototype v0.2** · Phaser 3 + TypeScript + Vite · 2D browser game

A very round rat must eat until it reaches 100% energy, steal food from a ridiculous French chef, and bring it home before becoming rat cake. Uses original, separate SVG images so the room, rat, chef and pastries can later be animated and expanded.

## Run locally

Requires **Node.js 22** and npm (Node 20.19+ is also supported by recent Vite versions).

```bash
npm install
npm run dev
```

Open the address Vite prints in the terminal (normally `http://localhost:5173/`). Do **not** double-click `index.html`; TypeScript and imported assets need Vite to run.

To check the build:

```bash
npm run build
npm run preview
```

### Controls

| Key | Action |
|---|---|
| A / D or Left / Right | Move |
| W or Up | Climb near furniture legs / ladder |
| Space | Jump |
| E | Eat food, pick food up at full energy, deliver at hole |
| Shift (hold) | Speed boost (uses energy) |
| S or Down | Hide / emerge at a hiding spot |
| Escape | Pause |

The touch controls below the canvas also work on phones and tablets, although desktop controls and the visual balance are the current focus.

### Objective and initial balance

- Eat food until **100% energy**, then press **E** near food to **carry** rather than eat it.
- Bring **3** stolen items to the hole marked **HOME** on the far right and press **E** to deposit them.
- Boost is faster, but drains **32 energy per second** when running. Carrying slows the rat by **22%**.
- The rat hole is a safe hiding spot. Under-table, cupboard and fridge zones are prototype hiding spots.
- A basic chef patrol/chase/search model is provided as a *prototype*, not finished intelligent AI.
- The rat/chef artwork and first-room layout are original SVG placeholders based on the approved concept sheet. They are not final sprite sheets.

## How to publish with GitHub Pages

1. On GitHub, create a **public** repository named `rat-game` (or any name). Do not initialize it with files if you intend to push this folder.
2. From this folder, run:

   ```bash
   git init
   git add .
   git commit -m "Rat Game: first playable prototype"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/rat-game.git
   git push -u origin main
   ```

3. In GitHub **Settings → Pages → Build and deployment → Source**, choose **GitHub Actions**.
4. The included `.github/workflows/deploy.yml` builds and deploys the site on pushes to `main`. Your site will appear at `https://YOUR_USERNAME.github.io/rat-game/` for that repository name. Other repository names use their own path.

The `vite.config.ts` uses `base: './'` so asset paths also work at a GitHub Pages subpath. **GitHub Education isn't required for this free public static-hosting setup.**

## Project layout

```text
rat-game/
├── src/
│   ├── assets/              Original SVG room, rat, chef, food textures
│   ├── game/KitchenScene.ts  Phaser gameplay and basic enemy behavior
│   ├── main.ts               Game boot, UI, touch controls, restart/pause
│   └── style.css             Playful pastel website UI
├── docs/                    Game design, art direction, production checklist
├── assets/                  Reference art and concept sheets (not runtime assets)
├── .github/workflows/       GitHub Pages deployment
├── index.html
├── package.json
└── vite.config.ts
```

## Limitations and what's next

This is an early playable **prototype**, not a finished game. It has placeholder rat and chef images rather than frame-by-frame sprite animation; the chef uses simple range-based detection rather than true obstacle raycasting, and the layout/controls still require playtesting. Next priorities: better climbing feel, real sprite animations, smarter chef AI, more nuanced collisions, and sound/comedic effects. All balance numbers are provisional.

### Build validation disclosure

The project was assembled in a sandbox without npm registry connectivity. A dependency installation and end-to-end Phaser runtime test could not be completed here. Run `npm install && npm run build` in a network-connected environment; report any errors and we'll fix them. Asset SVGs were rendered independently to verify they're valid.

## Art direction

See [`docs/ART_DIRECTION_V1.md`](docs/ART_DIRECTION_V1.md), [`docs/GAME_DESIGN_V1.md`](docs/GAME_DESIGN_V1.md), and [`docs/ASSET_CHECKLIST.md`](docs/ASSET_CHECKLIST.md).

Art references are source material for the game's *creative direction*; SVGs in `src/assets` are separate provisional gameplay assets. Do not use the flattened concept sheet as collision geometry or a sprite sheet.


## v0.2 bugfix (blank kitchen)

The v0.1 release sometimes displayed only the HTML HUD with an empty peach-colored
stage. This update changes the runtime assets from SVGs to pre-rendered PNGs,
uses the Phaser Canvas renderer, and adds visible startup diagnostics.

For an existing project, replace the extracted files with the v0.2 files
(keep your `.git` directory and local settings), stop the Vite terminal with
Ctrl+C, run `npm install` if needed, and restart with `npm run dev`.
In Chrome, use Cmd+Shift+R for a hard refresh.

If the screen remains blank, open Chrome DevTools → Console and send the **first
red error**. The browser error will identify the remaining issue more precisely.

Note: PNG export sizes match the old Phaser SVG-loader sizes. The original SVG
source files are retained for editable artwork.
