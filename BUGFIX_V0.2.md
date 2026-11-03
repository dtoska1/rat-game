# Rat Game v0.2 — blank stage fix

**Symptoms**: Header/HUD and controls render; room, food, chef and rat do not.

**Changes**:
1. Sprite and room assets are now PNG textures pre-rasterized from the SVG source.
2. Phaser rendering is forced to `Phaser.CANVAS` for compatibility.
3. A visible initialization error message appears if the Scene cannot start.
4. Original SVGs remain in `src/assets/` for editing.

**Install**: replace v0.1 project files with these files, preserve any `.git` folder,
then restart Vite (`Ctrl+C`; `npm run dev`) and hard-refresh (`Cmd+Shift+R`).

**If still blank**: inspect the first red error under Chrome DevTools → Console.
Do not assume this archive has been runtime-tested on your computer.
