# RAT GAME — Visual Direction v1.1

**Status:** Original concept sheet approved by creator; image references are NOT separated game assets.

## Approved visual anchor

`../assets/concept/APPROVED_art_style_main.png` is the PRIMARY reference for the game. All future environment paintings, player sprites, animations, props and UI should match its intentionally imperfect, coloured hand-drawn cartoon look.

The uploaded `../assets/concept/rat_cuteness_reference.png` is a SECONDARY **cuteness/proportions reference**: round gray mouse, enormous pink ears, dot eyes, goofy expression and tiny legs. It is not a sprite to trace or copy directly.

Other `exploration_*.png` sheets are EXPERIMENTS, **not approved final designs**. They incidentally show a mouse as the chef, whereas the agreed opponent is the **human dramatic French-style chef**. Do not accidentally switch the chef's species when creating assets.

## Main character: Rat

- Body: almost circular, comically fat, small paws, long curved pink tail.
- Head: not a separate human-size head; round face flows into the torso.
- Ears: over-large, pink interiors; eyes: uneven goofy dots with meaningful expressions.
- Core silhouette should read at about 80–110 px tall on a 1280×720 game canvas.
- No chef outfit in the canonical default player. The new photo can influence facial appeal and possibly future costumes, subject to user approval.
- Movement: idle breathing, run/scramble, panic run, jump, climb, eat, pick up, carry, boost, hide/peek, spotted, caught.
- Draw all animation frames oriented right; left uses runtime flip. Keep feet on the same ground baseline.

## Opponent: Human Chef

- Human silhouette, very tall white toque, black curled mustache, apron, red neckerchief.
- Much taller than rat. Theatrical gestures and overt outrage.
- States: patrol/idle, suspicious, investigate, chase, search, failed search, catch, cake ending.
- Maintain consistent proportions and outlines across poses.

## Kitchen level — first playable room

- Side-on view with **three arched windows and curtains** from the original sketch.
- Food table left, cake/dessert/éclairs on top; chef in left side patrol region.
- Rat hole at floor level (currently planned around center; exact position to be play-tested).
- Main entrance at right for future room connections.
- Furniture and appliances are distinct foreground objects so the rat can climb, hide behind, or enter appropriate objects.
- Layer order: far wall > windows + curtains > shelves / decorative props > midground furniture > gameplay actors > foreground furniture details > UI.
- **Do not** use the entire concept illustration as a single interactive background; make independent art layers and separate invisible collision / climb / hiding regions.

## Color and line language

- Pastel cream `#F8EBD9`; peach `#F6B9A9`; mint `#BEE4D0`; lilac `#D7C3E8`; yellow `#FFE49B`; blue `#A9D5EA`; dark muted outline `#4B4051`.
- Slightly wobbly outlines, visible imperfect handmade charm; no razor-perfect vector style.
- Readability takes precedence: keep actors high-contrast against décor.
- Food and danger prompts can use slightly more saturated accents.
- Every object must have a recognizable silhouette at game size.

## Technical art export requirements

- Every gameplay sprite must be exported as transparent-background PNG or WebP, **separately from the painted scene**.
- Do not upscale a crop from the concept board and call it production art: those crops retain labels / surrounding background and aren't game sprites.
- Use a consistent frame size / anchor point within each animation sequence. Frame dimensions can vary by action if each action has its own atlas; preserve a foot baseline.
- For Phaser, include an atlas JSON or fixed-frame sprite-sheet metadata, animation FPS, anchor and collision-body recommendations.
- Keep original editable Krita files in an art-source location once authored, but do not require them for web deployment.

## Humor guideline

The *art* looks hilariously dumb by choice; the *controls* must be smooth and precise. Expressive squashing, shocked eyes, chaotic chef overreaction, giant pastries, and an absurd rat-cake game-over cutscene are central to its identity.

## Artwork status

The images and extracted crops in this package are moodboards / design references, not licensed finished production sprites. No animation frames, collision masks or playable level have been finalized in this package.
