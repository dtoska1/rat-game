import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { openGame, out } from './v3-driver.mjs';
const g = await openGame();
const events = [];
const log = async (name) => {
  const s = await g.read();
  console.log(name, s.t, s.x, s.y, s.energy, s.chef, s.chefX);
  events.push({ name, ...s });
  return s;
};
const tables = [
  { kind: 'eclair', x: 2410, w: 350, y: 371 },
  { kind: 'macaron', x: 1430, w: 380, y: 332 },
  { kind: 'cake', x: 520, w: 400, y: 300 },
];
// Cross the patrol lane in a burst. Spend energy only when the chef is close.
async function cross(goal, ringSpoon = false) {
  let s = await g.read();
  const dir = s.x > goal ? -1 : 1,
    key = dir < 0 ? 'ArrowLeft' : 'ArrowRight';
  await g.page.keyboard.down(key);
  let sprint = false;
  try {
    const until = Date.now() + 35000;
    while ((s.x - goal) * dir < -4) {
      if (s.mode !== 'play' || Date.now() > until)
        throw Error('patrol crossing ' + JSON.stringify(s));
      if (ringSpoon && s.action === 'clang') {
        await g.tap('e');
        ringSpoon = false;
      }
      const danger = Math.abs(s.chefX - s.x) < 340 || s.chef === 'chase';
      if (danger !== sprint) {
        if (danger) await g.page.keyboard.down('Shift');
        else await g.page.keyboard.up('Shift');
        sprint = danger;
      }
      const ahead = (s.chefX - s.x) * dir;
      if (s.chef === 'chase' && s.y === 530 && ahead > 0 && ahead < 145) {
        await g.tap('Space');
      }
      await g.page.waitForTimeout(40);
      s = await g.read();
    }
  } finally {
    await g.page.keyboard.up(key);
    await g.page.keyboard.up('Shift');
  }
  await g.wait((s) => Math.abs(s.vx) < 2, 'brake after crossing');
}
async function climb(s) {
  const rack = s.x + s.w / 2 - 10,
    stool = rack + 66;
  await cross(stool + 141);
  await g.page.keyboard.down('Space');
  await g.page.keyboard.down('ArrowLeft');
  try {
    await g.wait((r) => r.x < stool + 16, 'approach stool');
  } finally {
    await g.page.keyboard.up('ArrowLeft');
    await g.page.keyboard.up('Space');
  }
  await g.wait((r) => r.y === 448 && !r.vy, 'land on stool');
  await g.go(rack + 8);
  await g.page.keyboard.down('ArrowUp');
  try {
    await g.wait((r) => r.y === s.y, 'manual climb');
  } finally {
    await g.page.keyboard.up('ArrowUp');
  }
  await log('climbed ' + s.kind);
}
async function watchFromCover(x, name) {
  await cross(x);
  await g.tap('e');
  assert.equal((await g.read()).hidden, name);
  // If he saw us duck in, leave through the far side as he starts searching.
  await g.wait(
    (s) =>
      (s.chef === 'search' && Math.abs(s.chefX - x) < 75) ||
      (s.chef === 'patrol' &&
        (s.chefX < x - 90 || (s.facing === 1 && s.chefX > x + 185))),
    'wait for the patrol to pass ' + name,
    65000
  );
  await log('waited in ' + name);
  await g.tap('e');
}
try {
  await g.shot('desktop-title');
  await g.start();
  assert.equal((await g.read()).hidden, 'Home');
  for (const [index, s] of tables.entries()) {
    if (index > 0) {
      await cross(1830, true);
      assert.equal((await g.read()).last, 'clang');
      await log('distracted chef');
      await g.tap('e');
      assert.equal((await g.read()).hidden, 'Teapot');
      await g.tap('e');
    }
    await climb(s);
    if (!index) {
      await g.go(s.x - 84);
      await g.tap('e');
      assert.equal((await g.read()).carried, null);
      assert.equal((await g.read()).energy, 44);
    }
    await g.go(s.x + 48);
    for (let n = 0; n < 12 && (await g.read()).energy < 100; n++) {
      await g.tap('e');
      await g.page.waitForTimeout(620);
    }
    assert.equal((await g.read()).energy, 100);
    await g.go(s.x - 84);
    await g.tap('e');
    const carried = await g.wait(
      (r) => r.carried === s.kind,
      'pick up untouched ' + s.kind
    );
    assert.equal(carried.delivered.length, index);
    await log('carrying ' + s.kind);
    if (!index) await g.shot('desktop-carry');
    if (index === 2) await watchFromCover(1040, 'Flour sack');
    if (index > 0) await watchFromCover(1830, 'Teapot');
    await cross(3090, index > 0);
    await g.tap('e');
    const delivered = await g.wait(
      (r) => r.delivered.length === index + 1,
      'deposit ' + s.kind
    );
    assert.deepEqual(
      delivered.delivered,
      tables.slice(0, index + 1).map((v) => v.kind)
    );
    await log('delivered ' + s.kind);
  }
  assert.equal((await g.read()).mode, 'won');
  await g.shot('desktop-win');
  const timing = await g.page.evaluate(() => window.ratPlaytest.timing());
  assert.ok(timing.movingFrames > 60);
  g.verify();
  await writeFile(
    out + '/route.json',
    JSON.stringify(
      {
        viewport: '1360x830',
        renderer: await g.page.evaluate(() => window.ratPlaytest.renderer()),
        events,
        timing,
        browserErrors: g.errors,
      },
      null,
      2
    )
  );
  console.log('PASS all three deliveries', timing);
} catch (e) {
  console.error('Last observation', await g.read());
  await g.shot('route-failure');
  throw e;
} finally {
  await g.browser.close();
}
