# Rat Game 0.2.1 — Replay controls fix

## Reproduction

On v0.2, get caught by the chef, press **ONE MORE RAT?** (or win and press **STEAL AGAIN**), then try to move the rat. The scene is visible but keyboard and touch movement no longer work.

## Root cause

Phaser reuses the `KitchenScene` object after `game.scene.stop()` + `game.scene.start()`. Class field initializers only execute once. After losing or winning, `finished` remained `true`, so `update()` returned immediately on every frame. `foods` also kept entries from previous rounds, including destroyed sprites. Several other per-run fields were stale.

## Fix

- `KitchenScene.resetRunState()` explicitly resets **all** round-specific state and food records at the beginning of `create()`.
- `restart()` waits for the restarted scene's `ratgame:ready` event before calling `startPlaying()`, instead of assuming the next game post-step means initialization has finished.
- Releases virtual controls and clears stale pressed-button visuals on replay.

## Manual verification

1. Start the game and walk with A/D or arrow keys. Test on-screen arrows too.
2. Get caught. Press **ONE MORE RAT?**. Verify 47% energy, 0/3 delivered, all food respawns, rat moves, chef patrols.
3. Win by delivering three foods. Press **STEAL AGAIN**. Verify movement and food again.
4. Press **RESTART** mid-game and while hidden. Verify reset and movement.
5. Repeat restarting multiple times, including when using touch controls.

This is a source-level bug fix. Test it in the running browser before considering it fully verified.
