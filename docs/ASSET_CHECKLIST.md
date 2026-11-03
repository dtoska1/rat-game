# RAT GAME — Art Asset Checklist

The checked creative identity is locked; exact export sizes and art passes below are **proposed implementation targets**, not finalized production art.

## First playable room

- [ ] `rooms/kitchen/wall_background.webp` — room shell, wall / floor with no interactive furniture (1280×720 concept target).
- [ ] `rooms/kitchen/three_windows.webp` — transparent window layer.
- [ ] `rooms/kitchen/curtains.webp` — transparent foreground curtains.
- [ ] `props/table.png` — transparent food table (requires solid top + climbable legs).
- [ ] `props/chair.png` — transparent climbable chair.
- [ ] `props/cupboard.png` — transparent cupboard / hiding place.
- [ ] `props/fridge.png` and/or `props/toaster.png` — hideable appliance.
- [ ] `props/rat_hole.png` — rat home and safe-zone portal.
- [ ] `props/door.png` — main entrance / future room link.
- [ ] `props/spoon.png`, `props/fork.png`, `props/knife.png` — floor props/noise triggers.
- [ ] `food/cake.png`, `food/dessert.png`, `food/eclair.png`, `food/crumbs.png` — edible / carryable pickup art.

## Character sprite passes

- [ ] Rat: idle (4–6 frames), run (6–8), jump (3–5), climb (6), eat (6), carry (6), boost (6), hide/peek (3), spotted (3), caught (4).
- [ ] Human French chef: idle (4), patrol (6), suspicious (4), investigate (5), chase (8), search (5), catch (5), bake/game-over (storyboard first).
- [ ] Transparent animation atlases or frame directories with consistent feet/origin anchor.

## UI / feedback

- [ ] Energy/boost bar artwork with separately filled portions.
- [ ] Carrying icon, delivered count icon, home-safe indicator, suspicion indicator.
- [ ] Start, pause, restart, caught, win screens.
- [ ] Interaction prompt, controls legend, alert/sound cues.

## Scene and collision pass

- [ ] Separate background painting from interactive props.
- [ ] Define coordinates for table solids, rat climb zones, food points, hide locations, chef patrol waypoints and rat-hole entry.
- [ ] Verify all food is reachable through intended climb routes.
- [ ] Test readability at 1280×720, at smaller browser sizes and in motion.

## Art production workflow

1. Approve exact rat and chef **single-character** model sheets (character, front/profile/back, expressions).
2. Draw standalone transparent key poses with consistent baseline and proportions.
3. Animate movement in Krita / another animation program and export sprite atlases.
4. Illustrate room backdrop and transparent interactive foreground props separately.
5. Import assets into Phaser, wire physics, collisions, animation state machine, and event-triggered facial expressions.
6. Iterate after playing, so funny visual details never obstruct movement or hiding interactions.
