# Rat Game · The Great Pastry Heist

A chubby rat, a human pastry chef and one hand-drawn kitchen. Slip out of the hole, climb three pastry tables and bring home an éclair, a macaron and a slice of strawberry cake.

## Play the preview

Download the [V3 preview ZIP](https://github.com/dtoska1/rat-game/raw/refs/heads/v3-rebuild/preview/Rat-Game-V3.zip), extract it, and open **Rat Game V3.html** in a desktop browser. The file bundles the game, artwork, fonts and sound. You can also generate it with `npm ci` and `npm run build:offline`. To run the project locally with Node 22.12 or later:

```sh
npm ci
npm run dev
```

## The kitchen

Move left from home. Jump onto the **mint stool from the side**, walk to the ladder and hold Climb. Use Action beside a small tasting portion to refill your energy. The three samples restore 24, 17 and 37 points respectively. At 100%, take the whole pastry on the other plate. Carry it back to the hole and use Action to stash it. Heavier pastries slow you down.

The chef follows a patrol and needs a clear view to spot you. Hide under a table, inside the blue teapot or in the hole. If he watches you disappear, he can investigate that spot. Knocking the spoon brings him to its location. Boost briefly to cross a dangerous sightline, then eat to refill.

| Action | Keyboard | Touch |
| --- | --- | --- |
| Walk | A / D or left / right arrows | Left / right |
| Variable-height jump | Hold Space | Hold Jump |
| Climb at a ladder | Hold W or up arrow | Hold Climb |
| Taste, take, stash, hide or emerge | E | Contextual Action |
| Boost | Hold Shift while moving | Hold Boost while moving |
| Pause | Esc | Pause button |

## Build and test

```sh
npm run build
npm run preview -- --port 4318
# In a second terminal
npx playwright install chromium
npm run test:game
npm run build:offline
node tests/v3-offline.mjs
```

The browser tests play through the public controls. The opt-in `?debug` overlay reports frame interval and inputs. Its read-only observations let tests verify what happened. `?renderer=webgl` requests Phaser's accelerated renderer. Canvas is the default for this two-dimensional atlas-based scene. The test report records the interval between game-loop frames, CPU time in the Phaser step and the renderer's CPU submission time.

See [the playtest report](docs/PLAYTEST-V3.md), [the approval artwork](docs/ART_DIRECTION_V1.md), and [issue #3](https://github.com/dtoska1/rat-game/issues/3). The V3 workflow runs browser tests and attaches artifacts to the check.

## Artwork and code

The original V3 plates are in `art-source/v3`. Run `node scripts/pack-art.mjs` to regenerate the transparent sprite atlas and illustrated wall. Texture frames use a bottom-centre anchor. The rat's physical half-width is 13 world units and its head clearance is 36. Props and actor poses are drawn independently of collision geometry.

`src/v3` separates the kitchen layout and occlusion, player motion, chef behavior, food interactions, sound, input and Phaser scene. `src/main.ts` owns the page HUD and dialogs. The timing-independent simulation advances at 120 fixed steps per second. Artwork in the older `src/assets` and concept folders is retained for reference.
