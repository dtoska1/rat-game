import assert from 'node:assert/strict';
import { openGame } from './v3-driver.mjs';

for (const view of ['desktop', 'promax']) {
  const g = await openGame(view);
  try {
    const marker = await g.page.locator('.release-stamp').textContent();
    assert.match(marker, /V3\.4/);
    assert.equal(await g.page.locator('#start-chaos:enabled').count(), 1,
      'new Chaos launch is available on the title screen');
    await g.shot(view + '-chaos-title');
    await g.page.locator('#start-chaos').click();
    const started = await g.wait((s) => s.phase === 'cheese' && s.mode === 'play',
      'Chaos begins immediately');
    assert.equal(started.playStyle, 'chaos');
    assert.deepEqual(started.delivered, ['eclair', 'macaron', 'cake']);
    assert.equal(started.energy, 75);
    assert.deepEqual(started.cheese, []);
    assert.deepEqual(started.pranks, []);
    assert.equal(await g.page.locator('#bonus-hud').isVisible(), true);
    assert.match(await g.page.locator('#mode-ribbon').textContent(), /CHAOS CHALLENGE/);
    await g.page.keyboard.down('ArrowLeft');
    await g.wait((s) => s.x < 2910, 'Chaos rat enters kitchen');
    await g.page.keyboard.up('ArrowLeft');
    await g.shot(view + '-chaos-active');
    const moving = await g.wait((s) => s.mopX !== 2140, 'mop robot moves in immediate Chaos');
    assert.ok(moving.notebook.length === 3, 'random side objectives visible');
    await g.reset();
    assert.equal((await g.read()).playStyle, 'chaos', 'replay stays in the selected mode');
    await g.page.reload();
    await g.page.locator('#start:enabled').waitFor();
    await g.page.locator('#start').click();
    const classic = await g.wait((s) => s.mode === 'play', 'classic story begins');
    assert.equal(classic.playStyle, 'classic');
    assert.equal(classic.phase, 'pastries');
    assert.deepEqual(classic.delivered, []);
    g.verify();
    console.log('PASS ' + view + ': obvious V3.4, instant Chaos, robot, replay, original story');
  } finally {
    await g.browser.close();
  }
}
