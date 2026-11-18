# Rat Game · The Great Pastry Heist

A chubby rat, a human pastry chef and one hand-drawn kitchen. Slip out of the hole, climb three pastry tables and bring home an éclair, a macaron and a slice of strawberry cake. Then survive a tougher second shift to pocket three secret cheeses and get home.

## Play the preview

Open the [playable branch preview](https://raw.githack.com/dtoska1/rat-game/v3-rebuild/preview/phone/index.html) in your phone or desktop browser. Press **Start heist**. On a phone, hold a direction with one thumb and tap **Jump** with the other. Landscape shows more of the kitchen.

For offline desktop play, download the [V3 preview ZIP](https://github.com/dtoska1/rat-game/raw/refs/heads/v3-rebuild/preview/Rat-Game-V3.zip), extract it, and open **Rat Game V3.html**. To run the project locally with Node 22.12 or later:

```sh
npm ci
npm run dev
```

## V3.6 — the original drawings on the kitchen wall

The two **actual uploaded PDF drawings** now appear in the playable kitchen and a dedicated art gallery. This is faithful artwork from the files, not a newly imagined drawing or a generated replacement. Both PDFs were rasterized as monochrome ink and embedded in portable, self-contained SVG assets, so no third-party image host is needed.

- **k🫶🏼 (FEATURED):** the primary piece is framed prominently beside the rat's home (visible as soon as a run starts), is the first artwork shown in the gallery, and gets the larger card in the page's Art Wall. It retains the car, cat, characters, sun, clouds and original handwritten notes.
- **rat game sketch.pdf:** the smaller second frame depicts the original kitchen concept—windows, table, chef, rat, house, utensils and food. This is also available full size in the gallery.
- **How to see the art:** click **🎨 Drawings** in the game header, **✎ Art** inside the game (including full-screen phone landscape), or click the artwork itself on the kitchen wall. Switch between originals with the two gallery tabs.
- Viewing artwork pauses gameplay and resumes without resetting your heist. It doesn't affect mission balance, original kitchen background, Hard Chaos, or mobile controls.

## V3.5 — Hard Chaos difficulty

Select **⚡ Play HARD Chaos** to start a genuinely more demanding kitchen run without repeating the pastry missions. The Original Story and its existing bonus stage remain at their previous difficulty.

- **Two moving mop bots:** the original mop is faster and a second coral-colored bot patrols the far aisle. Both gain speed as you steal cheese; the green MOP switch disables **both** for 9 seconds (15 seconds in Classic).
- **Two timed steam vents:** grates at x=1680 and x=905 cycle every 9.5 seconds: 5.5 seconds clear, 1.5 seconds **amber warning**, then 2.5 seconds of **red hot steam**. Jump above the jet or hide in cover; crossing an active jet at floor level costs 13 energy and alerts the chef. Hazards pause when the game is paused.
- **Chef fury:** sight, patrol and chase speeds rise with each collected cheese. The final dash adds another pressure increase.
- **Fewer safety resources:** start at 65 energy, get 14 energy for each cheese instead of 18, PUFF blinds for 5 seconds instead of 8, and QUACK restores 20 energy instead of 30.
- **38-second finale:** after three cheeses and two pranks, escape home within 38 seconds instead of 50.

The HUD now tells you when steam is dangerous, and **skipped** pastries are no longer displayed as if they were earned. Hard Chaos scores exclude skipped pastry points and use separate medal thresholds, making high ranks meaningful. The V3.5 release label confirms the new build is loaded.

## V3.4 — launch Chaos instantly (now Hard Chaos in V3.5)

The main title screen now has two conspicuous options: **⚡ Play HARD Chaos** starts directly with the roaming mop, sabotage switches, secret cheeses, Squeak ability, three randomized optional prank tasks and the timed finale. **Original story** keeps the original three pastry deliveries, after which the same bonus stage unlocks. A visible `V3.4 · NEW MODE` marker in the header and in-game ribbon make it obvious whether the new release loaded. Restarting the selected heist preserves its mode. The original V1/V2 illustrated kitchen background is unchanged.

## The classic kitchen and the bonus mission

V3 now uses the **original V1/V2 illustrated room** (`src/assets/room.png`) for its kitchen background and title screen. The foreground V3 sprites, collisions, fixed-step movement, chef and mobile controls remain intact. The classic full-room illustration is a proportion-preserving parallax backdrop; foreground furnishings still define collisions.


Move left from home. Tap Jump to land on the **mint stool**, even from directly underneath. Walk to the ladder and tap Jump again to climb to the tabletop. Use Action beside a small tasting portion to refill your energy. The three samples restore 24, 17 and 37 points respectively. At 100%, take the whole pastry on the other plate. Carry it back to the hole and use Action to stash it. Heavier pastries slow you down.

**New second shift — Chaos Round:** the third pastry delivery unlocks a stealth challenge with a roaming mop bot and three interactive kitchen devices. Jump the moving mop or use the green **MOP** breaker to shut it down for 15 seconds. The pink **PUFF** station blinds the chef for eight seconds, while the yellow **QUACK** decoy lures him away and refills 30 energy. Pocket all three cheeses (spoon, macaron table, far-left aisle), activate at least two different gadgets and escape home to win. Picking up cheese gives +18 energy but attracts the chef. The chef also patrols faster and sees farther during the bonus round. Replay resets both missions.

### New replayable Mischief Notebook and escape finale

Inspired by the environmental pranks and goals of *Untitled Goose Game*, the food-and-chase tension of *Pizza Possum*, and the varied repeatable activities of *Sneaky Sasquatch*, each new heist picks **three optional prank goals** from six: ring the spoon, taste every sample, hide as the chef investigates the teapot, use the QUACK duck decoy, leap over the moving mop, and squeak to bait the chef. Stamp them for score points; they are **not required** to win.

**Squeak:** Q on desktop or the new touch button lures the chef to the rat's current position. It costs 8 energy and has a 14-second cooldown. Squeak tactically, then hide or escape.

**Final escape:** collecting all three cheeses and sabotaging two devices starts a 50-second kitchen alarm. Run home before it expires. Success awards BRONZE / SILVER / GOLD based on task stamps, loot, time, energy and mop hits. The best score is saved locally in your browser (no account or server required). Restarting picks a new set of optional pranks.

The chef follows a patrol and needs a clear view to spot you. Hide under a table, inside the blue teapot or in the hole. If he watches you disappear, he can investigate that spot. Knocking the spoon brings him to its location. Boost briefly to cross a dangerous sightline, then eat to refill.

| Action | Keyboard | Touch |
| --- | --- | --- |
| Walk | A / D or left / right arrows | Left / right |
| Jump | Space, W or ↑. Hold for a higher jump. | Tap Jump, or hold for more height |
| Climb at a ladder | Hold W or up arrow | Tap Jump once |
| Taste, take, stash, hide or emerge | E | Contextual Action |
| Boost | Hold Shift while moving | Hold Boost while moving |
| Squeak (lure chef) | Q | Tap Squeak (14s cooldown) |
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

The browser tests play through the public controls. The opt-in `?debug` overlay reports frame interval and inputs. Its read-only observations let tests verify what happened. `?renderer=canvas` forces the software renderer; otherwise Phaser prefers WebGL and falls back to Canvas. The test report records the interval between game-loop frames, CPU time in the Phaser step and the renderer's CPU submission time.

See [the playtest report](docs/PLAYTEST-V3.md), [the approval artwork](docs/ART_DIRECTION_V1.md), and [issue #3](https://github.com/dtoska1/rat-game/issues/3). The V3 workflow runs browser tests and attaches artifacts to the check.

## Artwork and code

The original V3 plates are in `art-source/v3`. The classic kitchen and vintage cheese assets are preserved in `src/assets`. Run `node scripts/pack-art.mjs` to regenerate the transparent sprite atlas and illustrated wall. Texture frames use a bottom-centre anchor. The rat's physical half-width is 13 world units and its head clearance is 36. Props and actor poses are drawn independently of collision geometry.

`src/v3` separates the kitchen layout and occlusion, player motion, chef behavior, food interactions, sound, input and Phaser scene. `src/main.ts` owns the page HUD and dialogs. The timing-independent simulation advances at 120 fixed steps per second. Artwork in the older `src/assets` and concept folders is retained for reference.

## Smoother mobile camera panning (2026-11-18)

The game now positions Phaser's camera using world-space `centerOn` rather than subtracting half the physical Retina canvas width from world coordinates. This corrects a zoom-dependent camera offset on phones, keeps the illustrated kitchen aligned while moving, and predicts a tiny fraction of the 120 Hz physics step for steadier visual panning. A dedicated Playwright regression samples 130 consecutive rendered frames and checks camera centring and jump-free scrolling in iPhone Pro Max landscape, ordinary landscape and desktop. Full hardware FPS is still device-dependent; `?quality=low&debug` is available as a lightweight test on older phones.

## Smoother mobile rendering

V3 uses WebGL wherever supported (Canvas fallback), now targets approximately one million backing pixels on a large iPhone rather than native 3× Retina resolution, and matches the display's native animation cadence instead of forcing a 60 FPS cap on 120 Hz phones. Camera look-ahead eases through direction reversals, physics can catch up after more dropped frames without slowing the rat, and Safari viewport/toolbar resize events are debounced rather than constantly rebuilding WebGL buffers and snapping the camera. Landscape touch gameplay uses a stable small viewport height so browser chrome movement does not shift the thumb controls. The `?debug` overlay reports frame pacing; `?quality=low` enables a 1.2× mobile rendering fallback for older or slow phones, while `?renderer=canvas&debug` forces the software renderer for diagnosis. No desktop-browser emulation can certify FPS on a physical iPhone: on-device validation is still required.
