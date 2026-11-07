# Rat Game V2 — Playable beta

Branch: `v2-development`
Status: gameplay rebuild for testing; production stays on `main`.

## Creative direction (confirmed)
- Deliberately terrible but **colored** hand-drawn artwork.
- Secondary: simple and stupidly funny; tertiary: absurd hand-drawn cartoon.
- Playable character: adorable round, gray, big-eared rat.
- Enemy: theatrical **human** French-style chef/homeowner.
- Pastel palette, goofy animation, chaos and absurdly cursed rat cake.
- The first approved detailed concept sheet is the visual source of truth.
- Never use the flat concept sheet as a game collision/background layer.

## V2 systems built
1. Data-driven **Kitchen** and **Pantry** room specifications, connected via doors.
2. One persistent run across both rooms: consumed food does not respawn on room transitions.
3. Food with different energy and score values. At 100% energy, food can be carried back to the kitchen hole.
4. Carrying slows the rat; boost increases speed and drains energy.
5. Rat hole is a safe hiding place; other hiding places include cupboards and under furniture.
6. Chef has patrol, investigate, chase and search states, including suspicion and loss of sight when hidden.
7. Climbing is triggered by nearby furniture/ladder action, including one-tap mobile ACTION.
8. Five-button mobile controls: left/right, JUMP, ACTION, BOOST. Automatic delivery at HOME on phones.
9. A comical rat-to-cake transformation on capture and a victory screen on three deliveries.
10. Best score is stored locally in the browser.

## Not finished
- Final game-ready transparent character animation sheets and consistently painted room layers.
- Proper line-of-sight occlusion, object-specific chef search behavior, and sound design.
- Device-specific mobile performance verification, touch latency measurements, full regression tests.
- Accounts/leaderboards, more rooms, pickups, chef traps, distractions, upgrades.

## Technical recommendation
- Phaser 3 + TypeScript + Vite for fast browser game iteration.
- Native GitHub repository, feature branches, pull requests and CI for safe development.
- Cloudflare Workers static assets as production, with deployment via Wrangler.
- Preview/staging build before replacing the production Worker.
- Develop and debug in VS Code; Copilot Student can assist with boilerplate but does not replace measured mobile playtests.

## Smoke tests
- Start/restart three times. Movement, touch, jumping and food still work.
- Both desktop and a narrow mobile portrait + landscape viewport.
- Hold direction + tap JUMP or BOOST with different fingers.
- Eat until 100%, carry one item to HOME, auto-deliver on mobile.
- Travel kitchen → pantry → kitchen, ensuring food taken stays taken.
- Hide while chef chases and come out after the search.
- Get caught and verify rat-cake sequence and replay.
- Win after three delivered snacks.
- Measure FPS and frame times on a physical phone. Only publish as a polished V2 once it is comfortable to play.
