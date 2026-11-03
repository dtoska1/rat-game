# RAT GAME — Game Design Document

**Version:** 1.0 (design baseline)  
**Date:** 2 November 2026  
**Status:** Pre-production; no gameplay code or art direction is considered final until tested  
**Format:** Single-player 2D browser game; first room now, connected rooms later

> **Creative pitch:** A suspiciously round rat sneaks out of its hole to steal pastries from an outrageously dramatic French chef. Eat to charge up, climb ridiculous furniture, carry stolen food home, hide from the chef, and avoid ending up as a rat cake.

## 1. Game identity

**Genre:** 2D side-view stealth/comedy platformer with food collection and simple risk/reward decisions.  
**Mood:** Dumb-cute + chaotic + meme-like + slightly cursed, all at once.  
**Visual direction (ranked):** (1) *Deliberately terrible-looking colored drawings*, (2) *simple but stupidly funny*, (3) *absurd hand-drawn cartoon*.  
**Quality goal:** Art appears intentionally silly; controls, readability, collision, and animation are polished.

### Player fantasy

The player is a little round menace: too small to reach the food normally, too greedy to stay safe, and far too optimistic about escaping a furious chef.

## 2. Confirmed game pillars

1. **Leave home, get food, return safely.** The rat begins in a hole and can retreat into it to hide.
2. **Vertical food access.** Most food is above floor level. Climb table legs, chairs, and furniture to reach it.
3. **Eat for energy.** Different foods restore different amounts of the energy/boost bar.
4. **Boost has a cost.** The rat can run faster using energy; the bar depletes while boosting.
5. **Full-energy theft.** The rat can pick up food to carry home only when the energy meter reaches **100%**.
6. **Hide and evade.** The rat can hide in its own hole and in suitable objects or appliances.
7. **A theatrical enemy.** The French-style chef/homeowner spots, investigates, and chases the rat.
8. **Comedic failure.** Being caught results in a short, absurd *rat cake* game-over sequence.
9. **Expandable home.** Start with one room; eventually introduce multiple connected rooms.

## 3. Core gameplay loop

1. **Leave hole** → scout where the chef is and where the food sits.
2. **Climb/explore** → reach the food, using furniture and avoiding sightlines.
3. **Eat** → fill the energy meter; more valuable food fills it faster.
4. **At 100%** → choose a food item to pick up and carry, one item at a time in v1.
5. **Escape** → move more slowly while carrying, optionally burn energy for a burst of speed, and avoid detection.
6. **Deposit** → enter the rat hole with food and automatically store it for points.
7. **Repeat or win** → risk another trip until the room's food target is met.

**Win condition for first prototype (proposal):** Deposit **three items**. Show a silly victory card and offer replay. Final target will be playtested.

## 4. Rat mechanics

| Action | Proposed v1 behavior | Input, desktop-first |
| --- | --- | --- |
| Move | Accelerate left/right; turn with an exaggerated wobble | A / D or arrow keys |
| Jump | Short, readable jump with a forgiving landing | Space |
| Climb | Climb marked furniture legs/edges; transition onto tabletops | W / up when near climbable surface |
| Eat | Eat a reachable food item and gain energy | E near food |
| Pick up | Only at exactly 100% energy; one food item carried | F near food |
| Boost | Faster movement while held; drains energy; stops at zero | Shift |
| Hide / enter home | E near valid hiding spot; home is a completely safe zone | E |
| Drop carried food | Leave item on the ground for possible recovery | Q |

### Energy and food — initial *test values*, not locked balancing

| Food | Energy gained by eating | Delivery score | Carry penalty |
| --- | ---: | ---: | --- |
| Crumbs | +5 | 5 | Minimal |
| Éclair | +20 | 20 | Light |
| Cake slice | +35 | 35 | Medium |
| Large dessert | +50 | 50 | Heavy |

- Energy is capped at **100** and starts below full (proposed: **30**).
- Holding boost depletes energy continuously (proposed: **20 per second**); walking and climbing don't drain energy in v1.
- **A full bar is required only at the moment of pickup.** The rat may continue carrying while energy falls below 100, including from boosting.
- **Open balancing question:** A pickup may need an energy cost (e.g. −30) to prevent one full charge from enabling infinite thefts. That cost is **not yet approved**.
- Food is consumed when eaten, or removed from the room when successfully deposited; the player must choose when to eat versus carry.
- A carried item slows movement based on its size. The rat visibly struggles with oversized food.
- If caught, the run ends. The drop/recovery mechanic is tentative for accidents and near-misses, **not** a way to survive a confirmed catch.

## 5. Hiding and stealth

**Rat hole:** The rat's guaranteed safe zone and deposit point. The chef cannot enter. Returning home gives the player a chance to assess the next run.

**Other hiding places:** Under furniture, in a cupboard, and inside a suitably silly appliance. Each must have a clear interaction cue. The rat is not automatically invisible in the open; hiding blocks detection while the spot remains valid.

**Noise:** Running fast, dropping utensils, and knocking food can draw attention. For the first prototype, a simple noise radius is sufficient. Advanced distractions and trap placement can come after the core loop works.

**Fairness rule:** The chef cannot see through solid objects. A player gets a visual/audio warning before detection turns into a full chase whenever possible.

## 6. Chef AI (finite-state machine)

| State | Behavior | Transition |
| --- | --- | --- |
| **Idle / Patrol** | Walks between routine kitchen positions, mutters, checks food | Sees rat or hears noise |
| **Suspicious** | Stops, turns toward stimulus, displays question mark | Investigates or returns to patrol |
| **Investigate** | Goes to last sound/last known position | Sees rat → chase; finds nothing → search |
| **Chase** | Runs after visible rat with dramatic animations | Touches rat → caught; loses sight → search |
| **Search** | Checks last known area briefly | Reacquires rat → chase; timeout → patrol |
| **Caught** | Locks gameplay and plays rat-cake sequence | Game-over menu |

**Personality:** The chef is expressive, arrogant, theatrical, and funny rather than terrifying. A failed chase should be as entertaining as a successful one.

## 7. Level 01 — The dining/kitchen room

Keep the original sketch's composition while making the layout navigable:

- **Background:** Three large arched windows with curtains.
- **Left:** Elevated table with cake, a dessert and a tray of three éclairs.
- **Left floor area:** Chef's initial patrol area near the table.
- **Center, at floor level:** Rat hole/home, the spawn/safe area, close to the food table but not directly on it.
- **Right:** Main entrance/door. This is decorative in v1 and can later connect to another room.
- **Right floor:** Scattered forks, spoon and knife as environmental props and optional noise interactions.
- **New functional additions, consistent with the sketch:** One climbable chair and one clearly marked alternate hiding place (cupboard or appliance). Only add what the level needs for readable traversal.

**Camera:** Side-on 2D. Design around a 16:9 viewport; allow short horizontal camera movement if the room is wider than the screen. Do not force tiny sprites just to fit everything into one static view.

**Level logic:** Food should be reachable by a beginner after learning jump + climb, but stealing from the table should expose the rat to at least one chef sightline. Hide/escape routes should remain legible.

## 8. Art direction and character sheet

### Rat

- **Silhouette:** Round/potato body, tiny legs, big ears, beady uneven eyes, funny snout, curved skinny tail.
- **Animations:** Idle wobble, run, cartoon-fast boost legs, jump, climbing struggle, chewing, carrying large food, hiding/peeking, panic, being caught.
- **Personality:** An overly confident idiot who looks physically unqualified for the job.

### Chef

- **Silhouette:** Tall hat, oversized nose or mustache, apron, theatrical arms, strong contrast against the round rat.
- **Animations:** Proud idle, inspecting food, suspicion, offended gasp, furious chase, confused search, and grand rat-cake victory.
- **Personality:** Dramatic French-style home cook; exaggerated and ridiculous, not realistic or frightening.

### Visual rules

- Intentionally imperfect outlines and lopsided shapes, **but** consistent stroke weight and recognizable silhouettes.
- Soft pastel fills, with stronger accents reserved for danger, boost, important food, and UI feedback.
- Suggested palette to test: cream `#F8EBD9`, peach `#F6B9A9`, mint `#BEE4D0`, lilac `#D7C3E8`, butter yellow `#FFE49B`, dusty blue `#A9D5EA`, outline `#4B4051`.
- No realistic proportions, no photorealistic assets, no mixed asset packs with clashing styles.
- Layered original PNG/WebP sprites with transparent backgrounds and separately authored animation frames; simple backgrounds can use layered parallax art.

### Humor in motion

Small, readable jokes: rat's face squishes against furniture, oversized pastry hides its body, chef's mustache jumps on a gasp, and boost makes the rat's legs into a ridiculous blur. Keep joke animations short so input stays responsive.

## 9. UI, audio, accessibility

**In-game HUD:** Energy/boost bar, carrying indicator, delivered food count, chef alert/suspicion indicator, optional control hint near interactive objects.

**Screens:** Start, pause, caught/rat-cake, victory, simple instructions. Restart from game-over with one action.

**Audio:** Silly foot taps, chewing, exaggerated pickup sound, chef muttering/exclamation, alert sting, slapstick impact; sound/music volumes adjustable, mute available.

**Accessibility baseline:** Rebindable keys later; for v1, high contrast between sprites and backgrounds, readable HUD text, non-color-only detection cues, and reduced camera shake option if camera shake is added.

## 10. Technical implementation

| Layer | Tool / approach | Responsibility |
| --- | --- | --- |
| Game runtime | **Phaser** | 2D scene, rendering, physics, input, animation, camera |
| Source code | **TypeScript** | Maintainable state, types, systems, chef AI |
| Dev/build | **Vite** | Local development and production bundle |
| Level authoring | **Tiled** or Phaser-authored level data | Solid platforms, climbable areas, hide/interact zones |
| Art | **Krita** (optionally Inkscape) | Original intentionally bad-looking colored art |
| Repository | **GitHub** | Version control, issues, project tasks |
| Publishing | **GitHub Actions + GitHub Pages** | Static web hosting and automated deployment |

**Architecture:** `PlayerController`, `EnergySystem`, `FoodSystem`, `CarrySystem`, `HidingSystem`, `ChefAI`, `RoomScene`, `HUD`, `GameState`. Keep physical collision objects separate from decorative art. Use reusable room configuration so later rooms can be added without rewriting mechanics.

**No backend required in v1.** Save settings or local high scores using browser storage only if useful. Online accounts, leaderboards, and multiplayer are out of scope.

## 11. Implementation milestones

1. **Design foundation:** This document, finalized room blockout, sprite proportions, style sheet.
2. **Movement prototype:** Rat spawn, floor, table collision, climbing, jumping, rat hole return.
3. **Food prototype:** Eating, differing energy gains, boost depletion, 100%-only pickup, carrying penalty, deposit/score.
4. **Stealth prototype:** Chef patrol, sight/noise detection, pursuit, hiding, losing the chef, capture.
5. **Comedy and polish:** Colored hand-drawn assets, expressive animation, sound, HUD, cake game-over scene.
6. **Web launch:** Keyboard/control testing, responsive canvas, performance check, GitHub Pages deployment.

## 12. Definition of playable v1

A release is playable when all of the following work from start to finish:

- [ ] Rat can exit its hole, move, jump and climb to the table.
- [ ] Food is reachable and eating updates the visible energy bar with different amounts.
- [ ] Boost increases speed and reliably consumes energy until empty.
- [ ] Food cannot be picked up below 100% energy and can be picked up at 100%.
- [ ] Carrying visibly changes the rat and affects speed; the rat can return to its hole to deposit an item.
- [ ] Home is safe; at least one other hiding place works.
- [ ] Chef patrols, investigates, detects and chases without seeing through solid objects.
- [ ] Catching the rat triggers the rat-cake game-over animation; retry works.
- [ ] A win condition can be completed and restarted.
- [ ] The game works from a public GitHub Pages URL in current desktop browsers.
- [ ] Original colored art has a consistent intentionally-stupid style rather than placeholder shapes.

## 13. Later updates / parking lot

**Likely next:** Traps that appear as the chef grows suspicious; utensils as noise/distraction tools; additional hiding appliances; richer cooking/baking jokes; food collection display inside home; upgrades bought with stored food; connected pantry/hallway/kitchen rooms; secret passages; more chef routines.

**Not in v1:** Multiplayer, online profiles, complex inventory, procedural levels, mobile touch controls as a requirement, large campaign, advanced physics puzzles.

## 14. Decisions still open

1. Does picking up food **spend** some energy, or is 100% just an unlock condition?
2. Should the first-room win target be **three delivered food items**, points, or a time-based challenge?
3. Does the chef patrol from the beginning, or initially enter the room after the rat first steals food?
4. Which additional appliance/cupboard hiding place fits the first room visually?
5. Should the first launch target desktop browsers only, with mobile controls later?

**Working rule:** Keep the core rat / food / boost / chef mechanics stable, but playtest numbers and optional complexity before declaring them final.
