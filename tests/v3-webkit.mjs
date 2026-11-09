import { webkit } from 'playwright';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { openGame, out } from './v3-driver.mjs';

const g = await openGame('portrait', webkit);
try {
  await g.page.locator('#start').tap();
  const zoomGuard = await g.page.evaluate(() => {
    const viewport = document.querySelector('meta[name="viewport"]')?.content || '';
    const gesture = new Event('gesturestart', { bubbles: true, cancelable: true });
    document.dispatchEvent(gesture);
    return {
      viewport,
      stageTouchAction: getComputedStyle(document.querySelector('#stage')).touchAction,
      jumpTouchAction: getComputedStyle(document.querySelector('[data-control="jump"]')).touchAction,
      gesturePrevented: gesture.defaultPrevented,
    };
  });
  assert.match(zoomGuard.viewport, /maximum-scale=1/);
  assert.match(zoomGuard.viewport, /user-scalable=no/);
  assert.equal(zoomGuard.stageTouchAction, 'none');
  assert.equal(zoomGuard.jumpTouchAction, 'none');
  assert.equal(zoomGuard.gesturePrevented, true);
  const jump = g.page.locator('[data-control="jump"]');
  await jump.tap();
  await g.wait((s) => !s.hidden && s.y < 448, 'touch jump out of the hole');
  await g.wait((s) => s.y === 530 && s.vy === 0, 'return to the floor');
  await g.go(2641);
  await g.page.setViewportSize({ width: 956, height: 440 });
  const button = await jump.boundingBox();
  assert.ok(button && button.width >= 44 && button.height >= 44);
  assert.ok(button.y + button.height <= 440);
  await jump.tap();
  await g.wait((s) => s.y < 448, 'landscape touch jump under the stool');
  await g.wait((s) => s.y === 448 && s.vy === 0, 'land on stool');
  await g.go(2585);
  await g.page.setViewportSize({ width: 956, height: 354 });
  await jump.tap();
  await g.wait(
    (s) => s.y === 371 && !s.held.includes('jump'),
    'tap Jump to finish climbing with toolbar visible'
  );
  const fits = await g.page.evaluate(() => {
    const c = document.querySelector('canvas'),
      box = c.getBoundingClientRect(),
      button = document
        .querySelector('[data-control="jump"]')
        .getBoundingClientRect();
    return (
      Math.abs(c.width / c.height - box.width / box.height) < 0.015 &&
      button.bottom <= innerHeight &&
      button.right <= innerWidth
    );
  });
  assert.ok(fits, 'canvas and controls fit reduced Safari viewport');
  g.verify();
  await writeFile(
    out + '/webkit.json',
    JSON.stringify(
      {
        browser: 'Playwright WebKit',
        portraitTouchJump: true,
        landscapeTouchLanding: true,
        singleTapAscent: true,
        reducedViewportFits: true,
        browserErrors: g.errors,
      },
      null,
      2
    )
  );
  console.log(
    'PASS WebKit portrait jump, rotation and landscape stool landing'
  );
} finally {
  await g.browser.close();
}
