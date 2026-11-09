import { webkit } from 'playwright';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { openGame, out } from './v3-driver.mjs';

const g = await openGame('portrait', webkit);
try {
  await g.page.locator('#start').tap();
  const jump = g.page.locator('[data-control="jump"]');
  await jump.tap();
  await g.wait(s => !s.hidden && s.y < 448, 'touch jump out of the hole');
  await g.wait(s => s.y === 530 && s.vy === 0, 'return to the floor');
  await g.go(2641);
  await g.page.setViewportSize({ width: 844, height: 390 });
  const button = await jump.boundingBox();
  assert.ok(button && button.width >= 44 && button.height >= 44);
  assert.ok(button.y + button.height <= 390);
  await jump.tap();
  await g.wait(s => s.y < 448, 'landscape touch jump under the stool');
  await g.wait(s => s.y === 448 && s.vy === 0, 'land on stool');
  g.verify();
  await writeFile(out + '/webkit.json', JSON.stringify({
    browser: 'Playwright WebKit', portraitTouchJump: true,
    landscapeTouchLanding: true, browserErrors: g.errors
  }, null, 2));
  console.log('PASS WebKit portrait jump, rotation and landscape stool landing');
} finally {
  await g.browser.close();
}
