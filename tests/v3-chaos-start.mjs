import assert from 'node:assert/strict';
import { openGame } from './v3-driver.mjs';

for (const view of ['desktop', 'promax']) {
  const g = await openGame(view);
  try {
    const marker = await g.page.locator('.release-stamp').textContent();
    assert.match(marker, /V3\.5/);
    assert.equal(await g.page.locator('#start-chaos:enabled').count(), 1,
      'new Chaos launch is available on the title screen');
    await g.shot(view + '-chaos-title');
    await g.page.locator('#start-chaos').click();
    const started = await g.wait((s) => s.phase === 'cheese' && s.mode === 'play',
      'Chaos begins immediately');
    assert.equal(started.playStyle, 'chaos');
    assert.deepEqual(started.delivered, ['eclair', 'macaron', 'cake']);
    assert.equal(started.energy, 65);
    assert.equal(started.vents.length, 2, 'two new timed steam vents');
    assert.ok(started.chefHeat >= 1.1, 'Hard Chaos starts with aggressive chef');
    assert.equal(started.steamHits, 0, 'no unfair instant steam damage');
    assert.equal(await g.page.locator('#stash-count').textContent(),
      'Pastry missions skipped · Hard Chaos');
    assert.equal((await g.page.locator('.loot-list .stored').count()), 0,
      'skipped pastries are not marked as earned');
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
    const obstacles = await g.wait((s) => s.guardMopX !== 820,
      'second faster mop patrols');
    assert.equal(obstacles.vents.length, 2);
    const warned = await g.wait((s) => s.vents.some((v) => v.state === 'warning'),
      'steam vents telegraph danger', 13000);
    assert.ok(warned.vents.every((v) => ['clear','warning','hot'].includes(v.state)));
    await g.wait((s) => s.vents.some((v) => v.state === 'hot'),
      'steam vent actually fires', 13000);
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
    console.log('PASS ' + view + ': visible V3.5, TWO robots, timed vents, instant Hard Chaos and original story');
  } finally {
    await g.browser.close();
  }
}
