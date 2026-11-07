# Rat Game — Vertical Slice (playtest 01)

This is an experimental **single-kitchen rebuild**, isolated on branch `vertical-slice`.
The original `main` and the existing V2 website are unchanged.

## Goals
- Deliberately hand-drawn colored pastel environment and character assets, layered and separate.
- Round gray rat; **human** French chef enemy.
- Immediate movement, short coyote time and buffered jump; automatic climb when running into a table leg.
- Eat different foods to fill energy. At 100% energy pick up one snack; deliver three snacks to HOME.
- Toggle hiding at hole, under table or behind cupboard; chef patrols, suspects, chases and searches.
- Boost with Shift; double-tap direction on touch to activate boost.
- Four large mobile controls: LEFT, RIGHT, ACTION, JUMP. Restart must work after capture.
- Simple original synthesized sound effects with a mute control.

## Local preview
Run `npm install && npm run dev` and open the Vite URL.
On a phone, use the local Network URL on the same Wi-Fi.
Adding `?debug` enables a simple FPS display.

## Verification
The vertical-slice workflow tests both mobile orientations, runs a production build, and saves browser screenshots.
This is a beta experience: input responsiveness and visual consistency still need physical phone testing. Do not call it the final V2 yet.
