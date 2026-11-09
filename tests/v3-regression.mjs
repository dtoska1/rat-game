import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { openGame, out } from './v3-driver.mjs';
const g = await openGame();
const checks = [];
try {
  await g.start();
  const start = await g.read();
  assert.equal(start.mode, 'play');
  assert.deepEqual(start.delivered, []);
  await g.page.keyboard.down('ArrowRight');
  for (let i = 0; i < 15; i++) await g.tap('e');
  await g.page.keyboard.up('ArrowRight');
  assert.equal((await g.read()).mode, 'play');
  assert.deepEqual((await g.read()).delivered, []);
  checks.push('No spawn win or right + action shortcut');
  await g.reset();
  await g.page.keyboard.down('ArrowLeft');
  await g.wait((s) => s.vx < -150, 'moving left');
  await g.page.keyboard.down('ArrowRight');
  await g.wait(
    (s) => s.vx > 0,
    'reverse before releasing the old direction',
    1000
  );
  await g.page.keyboard.up('ArrowRight');
  await g.wait((s) => s.vx < 0, 'resume the remaining held direction', 1000);
  await g.page.keyboard.up('ArrowLeft');
  checks.push(
    'Pressing the opposite direction reverses immediately while both keys overlap'
  );
  for (const key of ['Space', 'ArrowUp', 'w']) {
    await g.reset();
    await g.go(2641);
    assert.equal((await g.read()).y, 530);
    await g.page.keyboard.press(key, { delay: 20 });
    await g.wait((s) => s.y < 448, 'short ' + key + ' press clears the stool');
    await g.wait((s) => s.y === 448 && s.vy === 0, 'land on the stool');
    checks.push(
      'A short ' + key + ' press from directly underneath lands on the stool'
    );
  }
  await g.reset();
  await g.go(2326);
  const under = await g.read();
  assert.equal(under.y, 530);
  assert.equal(under.energy, 44);
  await g.tap('e');
  assert.equal((await g.read()).hidden, 'Tablecloth');
  assert.equal((await g.read()).carried, null);
  assert.equal((await g.read()).energy, 44);
  await g.tap('e');
  await g.go(2680);
  assert.equal((await g.read()).y, 530);
  checks.push(
    'Across the room on foot, the rat stays on the floor. Action under the pastry hides without eating or stealing.'
  );
  await g.tap('Escape');
  const atPause = await g.read();
  await g.page.waitForTimeout(400);
  assert.equal((await g.read()).t, atPause.t);
  await g.tap('Escape');
  checks.push('Pause freezes the simulation and resumes normally');
  await g.reset();
  await g.go(1830);
  const occluded = await g.wait(
    (s) => s.chefX < s.x && s.facing === 1 && s.x - s.chefX < 275,
    'chef approaches teapot',
    20000
  );
  assert.equal(occluded.hidden, '');
  assert.equal(occluded.seen, false);
  await g.tap('e');
  assert.equal((await g.read()).hidden, 'Teapot');
  await g.wait(
    (s) => s.chefX > s.x + 55,
    'chef walks past while hidden',
    15000
  );
  assert.equal((await g.read()).seen, false);
  checks.push(
    'Teapot blocks a facing chef’s sightline at patrol range. Hidden rat survives a close pass.'
  );
  await g.reset();
  await g.go(2410);
  const spotted = await g.wait((s) => s.seen, 'chef gets clear sight', 30000);
  const pursuing = await g.wait(
    (s) => s.chef === 'chase' && s.seen,
    'chef pursues on sight'
  );
  const reaction = Math.round((pursuing.t - spotted.t) * 1000);
  assert.ok(
    reaction <= 250,
    'sustained clear sight starts a chase within 250 ms'
  );
  checks.push('First clear sight to pursuit: ' + reaction + ' ms of play time');
  await g.wait(
    (s) => s.chef === 'chase' && s.seen && Math.abs(s.chefX - s.x) < 195,
    'chef sees the rat enter the tablecloth',
    30000
  );
  await g.tap('e');
  assert.equal((await g.read()).hidden, 'Tablecloth');
  await g.wait(
    (s) => s.chef === 'search' && s.hidden === 'Tablecloth',
    'search last seen cover'
  );
  await g.shot('desktop-search');
  await g.page.locator('#stage[data-mode="lost"]').waitFor();
  checks.push(
    'Chef investigates the exact hiding spot he saw the rat enter and catches it there'
  );
  for (let attempt = 1; attempt <= 3; attempt++) {
    await g.reset();
    // Meet the chef face to face on the floor, then keep a direction held across replay.
    await g.page.keyboard.down('ArrowLeft');
    await g.page.waitForFunction(
      () => ['lost', 'caught'].includes(window.ratPlaytest.read().mode),
      null,
      { timeout: 45000 }
    );
    await g.page.locator('#stage[data-mode="lost"]').waitFor();
    if (attempt === 1) await g.shot('desktop-cake');
    await g.page.click('#end-action');
    await g.page.waitForTimeout(450);
    const replay = await g.read();
    assert.equal(replay.x, start.x);
    assert.equal(replay.y, start.y);
    assert.equal(replay.hidden, 'Home');
    assert.deepEqual(replay.held, []);
    assert.deepEqual(replay.delivered, []);
    assert.equal(replay.energy, 44);
    assert.equal(replay.carried, null);
    await g.page.keyboard.up('ArrowLeft');
    await g.go(2970);
    assert.ok((await g.read()).x < 3000);
    checks.push(
      'Death and replay ' +
        attempt +
        ' resets controls, physics, energy and loot'
    );
  }
  g.verify();
  await writeFile(
    out + '/regression.json',
    JSON.stringify({ checks, errors: g.errors }, null, 2)
  );
  console.log('PASS', checks);
} catch (e) {
  console.error('last', await g.read());
  await g.shot('regression-failure');
  throw e;
} finally {
  await g.browser.close();
}
