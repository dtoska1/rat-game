import assert from 'node:assert/strict';
import { openGame } from './v3-driver.mjs';
for (const view of ['portrait', 'landscape', 'promax']) {
  const g = await openGame(view);
  try {
    await g.start();
    const layout = await g.page.evaluate(() => {
      const thumbs = document.querySelector('#thumbs').getBoundingClientRect();
      return {
        controls: [...document.querySelectorAll('#thumbs [data-control]')]
          .map((node) => {
            const r = node.getBoundingClientRect();
            return { action: node.dataset.control, width: r.width, height: r.height };
          }),
        controlsBottom: thumbs.bottom,
        viewportHeight: innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: innerWidth,
      };
    });
    assert.ok(layout.controls.length === 6, 'all six touch controls exist');
    for (const c of layout.controls) {
      assert.ok(c.width >= 44 && c.height >= 44, view + ' touch target: ' + JSON.stringify(c));
    }
    assert.ok(layout.controlsBottom <= layout.viewportHeight + 1, view + ' control deck fits');
    assert.ok(layout.scrollWidth <= layout.viewportWidth + 1, view + ' does not scroll horizontally');
    if (view === 'promax') {
      // Players can swap thumb zones, and the choice survives a refresh.
      const swap = g.page.locator('#swap-hands');
      const before = await g.page.locator('.directions').boundingBox();
      await swap.click();
      const after = await g.page.locator('.directions').boundingBox();
      assert.equal(await swap.getAttribute('aria-pressed'), 'true');
      assert.ok(after.x > before.x + 80, 'movement controls moved to right thumb');
      await g.page.reload();
      assert.equal(await swap.getAttribute('aria-pressed'), 'true', 'hand preference persists');

      // One continuous thumb gesture may glide between the two arrows.
      await g.page.locator('#start:enabled').waitFor();
      await g.start();
      const left = await g.page.locator('[data-control="left"]').boundingBox();
      const right = await g.page.locator('[data-control="right"]').boundingBox();
      const touch = await g.context.newCDPSession(g.page);
      const point = (r) => ({ id: 1, x: r.x + r.width / 2, y: r.y + r.height / 2 });
      try {
        await touch.send('Input.dispatchTouchEvent', {
          type: 'touchStart', touchPoints: [point(left)],
        });
        await g.wait(s => s.held.includes('left'), 'hold left', 2000);
        await touch.send('Input.dispatchTouchEvent', {
          type: 'touchMove', touchPoints: [point(right)],
        });
        await g.wait(s => s.held.includes('right') && !s.held.includes('left'),
          'slide thumb to right without lifting', 2000);
      } finally {
        await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      }
      await g.wait(s => !s.held.includes('right'), 'release glide', 2000);
    }
    g.verify();
    console.log('PASS', view, 'six 44px+ touch targets and fit');
  } finally {
    await g.browser.close();
  }
}
