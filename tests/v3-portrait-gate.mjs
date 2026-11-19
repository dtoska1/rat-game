import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { openGame } from './v3-driver.mjs';

// iPhone upright: the game is blocked until the device is sideways.
const phone = await openGame('portrait', chromium, { enforceOrientation: true });
try {
  const gate = phone.page.locator('#landscape-gate');
  await gate.waitFor({ state: 'visible' });
  assert.match(await gate.textContent(), /sideways/);
  await phone.page.evaluate(() => document.querySelector('#start-chaos').click());
  assert.equal((await phone.read()).mode, 'title', 'cannot start in portrait');

  // Rotating either way to landscape reveals the game and controls.
  await phone.page.setViewportSize({ width: 956, height: 440 });
  await gate.waitFor({ state: 'hidden' });
  await phone.start();
  assert.equal(await phone.page.locator('#thumbs').isVisible(), true);
  await phone.page.keyboard.down('ArrowLeft');
  await phone.wait(s => s.x < 3070, 'landscape movement', 5000);
  await phone.page.keyboard.up('ArrowLeft');

  // A mid-run change back to portrait must freeze time without a reset.
  await phone.page.setViewportSize({ width: 390, height: 844 });
  await gate.waitFor({ state: 'visible' });
  await phone.wait(s => s.mode === 'pause', 'auto pause in portrait');
  const paused = await phone.read();
  assert.deepEqual(paused.held, [], 'rotating releases controls');
  await phone.page.waitForTimeout(180);
  assert.equal((await phone.read()).t, paused.t, 'timer stops in portrait');

  await phone.page.setViewportSize({ width: 956, height: 440 });
  await gate.waitFor({ state: 'hidden' });
  await phone.wait(s => s.mode === 'play', 'resume in landscape');
  assert.ok((await phone.read()).x < 3100, 'run position is retained');

  // Both left/right landscape rotations are allowed. Browser viewport size
  // is the same for primary and secondary, so dispatch a rotation event.
  await phone.page.setViewportSize({ width: 844, height: 390 });
  await phone.page.evaluate(() => window.dispatchEvent(new Event('orientationchange')));
  assert.equal(await gate.isVisible(), false, 'both sideways directions are valid');
  assert.equal((await phone.read()).mode, 'play');

  // A user-selected pause remains paused after rotating away and back.
  await phone.page.locator('#pause').click();
  await phone.wait(s => s.mode === 'pause', 'manual pause');
  await phone.page.setViewportSize({ width: 390, height: 844 });
  await gate.waitFor({ state: 'visible' });
  await phone.page.setViewportSize({ width: 956, height: 440 });
  await gate.waitFor({ state: 'hidden' });
  assert.equal((await phone.read()).mode, 'pause', 'manual pause preserved');
  phone.verify();
} finally {
  await phone.browser.close();
}

const sideways = await openGame('promax', chromium, { enforceOrientation: true });
try {
  const gate = sideways.page.locator('#landscape-gate');
  assert.equal(await gate.isVisible(), false);
  await sideways.page.locator('#start-chaos').tap();
  await sideways.wait(s => s.mode === 'play' && s.playStyle === 'chaos',
    'Chaos starts directly in landscape');
  sideways.verify();
} finally {
  await sideways.browser.close();
}

const desktop = await openGame('desktop', chromium, { enforceOrientation: true });
try {
  assert.equal(await desktop.page.locator('#landscape-gate').isVisible(), false,
    'desktop layout remains unrestricted');
  await desktop.start();
  desktop.verify();
} finally {
  await desktop.browser.close();
}
console.log('PASS landscape-only phone play, both sides, pause/resume, desktop');