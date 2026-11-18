import assert from 'node:assert/strict';
import { openGame } from './v3-driver.mjs';

// Check the actual world coordinate in the centre of the visible canvas. This
// catches a canvas-pixel/world-unit mix-up that ordinary movement tests miss.
// A software SwiftShader browser is not a substitute for real iPhone FPS.
for (const viewport of ['promax', 'landscape', 'desktop']) {
  const g = await openGame(viewport);
  try {
    await g.page.locator('#start-chaos').click();
    await g.wait((s) => s.mode === 'play', 'Chaos start');
    await g.page.waitForTimeout(120);
    let initial = await g.read();
    assert.ok(Number.isFinite(initial.cameraViewportCenterX));
    assert.ok(Math.abs(initial.cameraViewportCenterX - initial.cameraX) < 6,
      viewport + ' initial camera view not centred: ' + JSON.stringify(initial));
    await g.page.keyboard.down('ArrowLeft');
    await g.wait((s) => s.x < 2760, 'leave house and pan left', 10000);
    const samples = await g.page.evaluate(() => new Promise((resolve) => {
      const readings = [];
      function sample() {
        const s = window.ratPlaytest.read();
        readings.push({ t: performance.now(), x: s.x, cameraX: s.cameraX,
          centerX: s.cameraViewportCenterX, centerY: s.cameraViewportCenterY });
        if (readings.length >= 130 || s.mode !== 'play') resolve(readings);
        else requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    }));
    await g.page.keyboard.up('ArrowLeft');
    assert.ok(samples.length >= 90, viewport + ' enough animation frames');
    const deltas = samples.slice(1).map((s, i) => ({
      camera: Math.abs(s.cameraX - samples[i].cameraX),
      elapsed: s.t - samples[i].t,
    }));
    const centered = samples.filter((s) => Math.abs(s.centerX - s.cameraX) < 6);
    assert.ok(centered.length > samples.length * 0.95,
      viewport + ' camera center must equal calculated world cameraX, not screen px: ' +
      JSON.stringify({centered: centered.length, total: samples.length, example: samples[40]}));
    const travelled = Math.abs(samples.at(-1).cameraX - samples[0].cameraX);
    assert.ok(travelled > 20, viewport + ' continuous camera panning');
    const jitter = deltas.filter((d) => d.elapsed <= 50 && d.camera > 30);
    assert.equal(jitter.length, 0,
      viewport + ' abrupt 30+ world-unit camera snaps during normal frames: ' + JSON.stringify(jitter.slice(0, 5)));
    assert.ok(samples.every((s) => Number.isFinite(s.centerX) && Number.isFinite(s.centerY)));
    g.verify();
    console.log('PASS ' + viewport + ' world-space camera centre, smooth pan, ' +
      samples.length + ' rendered frames, ' + Math.round(travelled) + ' world units');
  } finally { await g.browser.close(); }
}
