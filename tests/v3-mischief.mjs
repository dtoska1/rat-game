import assert from 'node:assert/strict';
import { openGame } from './v3-driver.mjs';

const g = await openGame('landscape');
try {
  await g.start();
  const initial = await g.read();
  assert.equal(initial.notebook.length, 3);
  assert.equal(new Set(initial.notebook.map((t) => t.id)).size, 3);
  assert.ok(initial.notebook.every((t) => !t.done));
  assert.equal(initial.escapeActive, false);
  assert.equal(initial.squeakCooldown, 0);
  assert.equal(await g.page.locator('#note-tasks li').count(), 3);
  assert.ok(await g.page.locator('#squeak').isDisabled(), 'no squeak while at home');

  // Emerge from the home hole before using the new noise-bait ability.
  await g.page.keyboard.down('ArrowLeft');
  await g.wait((s) => s.x < 2980 && !s.hidden, 'emerge from home');
  await g.page.keyboard.up('ArrowLeft');
  const before = await g.read();
  await g.tap('q');
  const bait = await g.wait((s) => s.squeakCooldown > 0, 'Q lure registered');
  assert.ok(bait.energy <= before.energy - 7);
  assert.equal(await g.page.locator('#squeak').isDisabled(), true);
  assert.match(await g.page.locator('#squeak').textContent(), /s$/);
  await g.tap('q');
  assert.equal((await g.read()).squeaks, undefined, 'squeaks are not public to the HUD');
  const again = await g.read();
  assert.ok(again.squeakCooldown > 0);
  assert.equal(again.notebook.length, 3);

  await g.reset();
  const replay = await g.read();
  assert.equal(replay.squeakCooldown, 0);
  assert.equal(replay.escapeActive, false);
  assert.ok(replay.notebook.every((t) => !t.done));
  g.verify();
  console.log('PASS notebook, squeak bait/cooldown and clean replay on mobile');
} finally {
  await g.browser.close();
}
