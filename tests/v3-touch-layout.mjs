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
    g.verify();
    console.log('PASS', view, 'six 44px+ touch targets and fit');
  } finally {
    await g.browser.close();
  }
}
