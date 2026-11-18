import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { openGame, out, url } from './v3-driver.mjs';

// Measures *relative* camera movement, not a universal phone FPS claim.
// Software-rendered CI cannot predict actual Safari GPU performance.
for (const view of ['promax', 'landscape']) {
  const g = await openGame(view);
  try {
    await g.start();
    const start = await g.read();
    assert.ok(start.renderWidth > 0 && start.renderHeight > 0);
    const initialSize = await g.page.evaluate(() => {
      const c = document.querySelector('#world canvas');
      const box = c.getBoundingClientRect();
      return { ratio: c.width / box.width, pixels: c.width * c.height };
    });
    assert.ok(initialSize.ratio <= 1.8, 'phone canvas avoids native 3x Retina');
    assert.ok(initialSize.pixels <= 1200000, 'bounded mobile GPU framebuffer');

    await g.page.keyboard.down('ArrowLeft');
    await g.wait((s) => s.x < 2490, 'walk far enough for camera scrolling', 11000);
    const frames = await g.page.evaluate(() => new Promise((resolve) => {
      const rows = [];
      let prev = 0, began = 0;
      const step = (t) => {
        if (!began) began = t;
        const s = window.ratPlaytest.read();
        if (prev) rows.push({ dt: t - prev, camera: s.cameraX, x: s.x });
        prev = t;
        // Give the software-emulated GitHub GPU longer to collect samples.
        // This checks camera continuity, not an arbitrary FPS benchmark.
        if (t - began < 1300) requestAnimationFrame(step);
        else resolve(rows);
      };
      requestAnimationFrame(step);
    }));
    await g.page.keyboard.up('ArrowLeft');
    assert.ok(frames.length >= 5, 'record some real animation frames');
    const spikes = frames.slice(1).filter((f, i) =>
      Math.abs(f.camera - frames[i].camera) > (0.85 * f.dt + 18)
    );
    assert.equal(spikes.length, 0, 'camera does not teleport when crossing room');
    const intervals = frames.map((f) => f.dt).sort((a, b) => a - b);
    const timing = {
      frames: frames.length,
      medianMs: intervals[Math.floor(intervals.length / 2)],
      p95Ms: intervals[Math.floor(intervals.length * .95)],
    };

    const old = await g.read();
    await g.page.keyboard.down('ArrowRight');
    await g.page.waitForTimeout(45);
    const newState = await g.read();
    await g.page.keyboard.up('ArrowRight');
    assert.ok(newState.cameraLead - old.cameraLead < 130,
      'turning must ease camera anticipation instead of a 210px jump');

    if (view === 'promax') {
      await g.page.keyboard.down('ArrowLeft');
      await g.page.setViewportSize({ width: 956, height: 428 });
      const before = await g.read();
      await g.page.waitForTimeout(55);
      const during = await g.read();
      // Resize debounce lets the browser toolbar settle first.
      assert.equal(during.renderHeight, before.renderHeight,
        'minor viewport adjustment does not instantly reallocate GPU canvas');
      await g.page.waitForTimeout(230);
      const after = await g.read();
      assert.ok(after.renderHeight > 0 && after.cameraX <= 3280,
        'game still updates after viewport settles');
      await g.page.keyboard.up('ArrowLeft');
      await g.page.setViewportSize({ width: 440, height: 956 });
      await g.page.waitForTimeout(280);
      assert.equal((await g.read()).mode, 'play', 'rotation preserves play state');
      const control = await g.page.locator('[data-control="jump"]').boundingBox();
      assert.ok(control && control.width >= 44 && control.height >= 44,
        'rotation keeps usable mobile controls');
    }
    g.verify();
    await writeFile(out + '/fluid-' + view + '.json',
      JSON.stringify({ view, initialSize, timing, errors: g.errors }, null, 2));
    console.log('PASS mobile fluid camera + browser resize', view, timing);
  } finally {
    await g.browser.close();
  }
}

// A lower-bandwidth fallback exists for slower/older devices without changing gameplay.
const g = await openGame('promax');
try {
  await g.page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&quality=low');
  await g.page.locator('#start:enabled').waitFor();
  const low = await g.page.evaluate(() => {
    const c = document.querySelector('#world canvas');
    const r = c.getBoundingClientRect();
    return { density: c.width / r.width, pixels: c.width * c.height };
  });
  assert.ok(low.density <= 1.25 && low.density >= 1.1);
  assert.ok(low.pixels < 650000);
  await g.start();
  assert.equal((await g.read()).mode, 'play');
  g.verify();
  console.log('PASS low-quality GPU-friendly fallback', low);
} finally {
  await g.browser.close();
}
