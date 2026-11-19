import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { openGame } from './v3-driver.mjs';

// Real phone viewport behavior: landscape is blocked; either portrait
// orientation is acceptable, since we only check viewport shape.
const phone = await openGame('portrait', chromium, { enforcePortrait: true });
try {
  const gate = phone.page.locator('#portrait-gate');
  assert.equal(await gate.isVisible(), false, 'upright portrait is playable');
  await phone.start();
  await phone.page.keyboard.down('ArrowLeft');
  await phone.wait(s => s.x < 3070, 'portrait movement', 5000);
  await phone.page.keyboard.up('ArrowLeft');
  await phone.page.setViewportSize({ width: 956, height: 440 });
  await gate.waitFor({ state: 'visible' });
  await phone.wait(s => s.mode === 'pause', 'auto pause on sideways phone');
  assert.equal(await phone.page.locator('#stage').getAttribute('data-mode'), 'pause');
  const paused = await phone.read();
  assert.deepEqual(paused.held, [], 'turning the phone releases held controls');
  await phone.page.waitForTimeout(180);
  assert.equal((await phone.read()).t, paused.t, 'the run does not advance sideways');
  await phone.page.setViewportSize({ width: 390, height: 844 });
  await gate.waitFor({ state: 'hidden' });
  await phone.wait(s => s.mode === 'play', 'resume when portrait returns');
  assert.ok((await phone.read()).x < 3100, 'progress was retained after rotating');

  // A pause the user chose must stay paused when rotating back.
  await phone.page.locator('#pause').click();
  await phone.wait(s => s.mode === 'pause', 'manual pause');
  await phone.page.setViewportSize({ width: 956, height: 440 });
  await gate.waitFor({ state: 'visible' });
  await phone.page.setViewportSize({ width: 390, height: 844 });
  await gate.waitFor({ state: 'hidden' });
  assert.equal((await phone.read()).mode, 'pause', 'manual pause is preserved');
  phone.verify();
} finally {
  await phone.browser.close();
}

const sideways = await openGame('promax', chromium, { enforcePortrait: true });
try {
  const gate = sideways.page.locator('#portrait-gate');
  await gate.waitFor({ state: 'visible' });
  await sideways.page.evaluate(() => document.querySelector('#start-chaos').click());
  assert.equal((await sideways.read()).mode, 'title',
    'no Chaos start while the phone is horizontal');
  await sideways.page.setViewportSize({ width: 390, height: 844 });
  await gate.waitFor({ state: 'hidden' });
  await sideways.page.evaluate(() => window.dispatchEvent(new Event('orientationchange')));
  assert.equal(await gate.isVisible(), false,
    'portrait is allowed after an orientation event, including a 180-degree turn');
  await sideways.page.locator('#start-chaos').tap();
  await sideways.wait(s => s.mode === 'play' && s.playStyle === 'chaos',
    'Chaos works in portrait');
  sideways.verify();
} finally {
  await sideways.browser.close();
}

const desktop = await openGame('desktop', chromium, { enforcePortrait: true });
try {
  assert.equal(await desktop.page.locator('#portrait-gate').isVisible(), false,
    'desktop keyboard play remains available in landscape');
  await desktop.start();
  desktop.verify();
} finally {
  await desktop.browser.close();
}
console.log('PASS portrait-only mobile orientation gate, safe pause and resume');
