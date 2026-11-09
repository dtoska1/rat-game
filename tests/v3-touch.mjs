import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { openGame, out } from './v3-driver.mjs';
const view = process.argv[2] || 'portrait';
const g = await openGame(view);
const session = await g.context.newCDPSession(g.page);
const events = [];
const stop = async () => {
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
};
const hold = async (...names) => {
  const points = await Promise.all(
    names.map(async (name, i) => {
      const b = await g.page
        .locator('[data-control="' + name + '"]')
        .boundingBox();
      assert.ok(
        b && b.width >= 44 && b.height >= 44,
        'reachable touch target ' + name
      );
      return { id: i + 1, x: b.x + b.width / 2, y: b.y + b.height / 2 };
    })
  );
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: points,
  });
};
const act = async () => {
  await hold('act');
  await g.page.waitForTimeout(85);
  await stop();
};
const record = async (name) => {
  const s = await g.read();
  events.push({ name, ...s });
  console.log(view, name, s.x, s.y, s.energy);
  return s;
};
async function walk(x, boost = false) {
  const r = await g.read(),
    dir = r.x > x ? -1 : 1;
  if (Math.abs(r.x - x) < 7) return;
  await hold(
    ...(boost
      ? [dir < 0 ? 'left' : 'right', 'boost']
      : [dir < 0 ? 'left' : 'right'])
  );
  try {
    await g.wait((s) => (s.x - x) * dir >= -5, 'touch walk to ' + x, 20000);
  } finally {
    await stop();
  }
  await g.wait((s) => Math.abs(s.vx) < 2, 'touch brake');
}
try {
  await g.shot(view + '-title');
  await g.start();
  if (view === 'promax') {
    await session.send('Emulation.setSafeAreaInsetsOverride', {
      insets: { left: 60, right: 60, bottom: 21 }
    });
  }
  const sizes = await g.page.evaluate(() => {
    const stage = document.querySelector('#stage').getBoundingClientRect(),
      thumbs = document.querySelector('#thumbs').getBoundingClientRect();
    const canvas = document.querySelector('#world canvas');
    const display = canvas.getBoundingClientRect();
    return {
      stageBottom: stage.bottom,
      controlsTop: thumbs.top,
      controlsBottom: thumbs.bottom,
      viewport: innerHeight,
      width: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
      canvas: [canvas.width, canvas.height],
      display: [display.width, display.height],
      dedicatedClimb: !!document.querySelector('[data-control="climb"]'),
      leftButton: document.querySelector('[data-control="left"]').getBoundingClientRect().left,
      jumpRight: document.querySelector('[data-control="jump"]').getBoundingClientRect().right,
      jumpBottom: document.querySelector('[data-control="jump"]').getBoundingClientRect().bottom
    };
  });
  assert.ok(
    sizes.stageBottom <= sizes.controlsTop &&
      sizes.controlsBottom <= sizes.viewport,
    'whole touch deck fits below game'
  );
  assert.ok(sizes.width <= sizes.viewportWidth, 'no horizontal scrolling');
  assert.equal(sizes.dedicatedClimb, false);
  assert.ok(
    Math.abs(
      sizes.canvas[0] / sizes.canvas[1] - sizes.display[0] / sizes.display[1]
    ) < 0.015,
    'uniform canvas scale'
  );
  if (view === 'promax') {
    assert.equal(sizes.viewportWidth, 956);
    assert.equal(sizes.viewport, 440);
    assert.ok(sizes.leftButton >= 60 && sizes.jumpRight <= 896 && sizes.jumpBottom <= 419, 'buttons clear simulated landscape safe areas');
    assert.ok(
      sizes.stageBottom >= 350 && sizes.canvas[0] / sizes.display[0] >= 2.9,
      'large Retina landscape playfield'
    );
  }
  await walk(2641);
  await hold('jump');
  await stop();
  await g.wait((s) => s.y < 448, 'a touch tap from below clears the stool');
  await g.wait(
    (s) => s.y === 448 && s.vy === 0,
    'touch tap lands on the stool'
  );
  await record('quick Jump tap from directly below');
  await g.reset();
  await walk(2792, true);
  const boosted = await record('boost drains energy');
  assert.ok(boosted.energy < 44 && boosted.energy > 0);
  assert.equal(boosted.y, 530);
  await hold('left', 'jump');
  await g.wait(
    (s) =>
      s.held.includes('left') &&
      s.held.includes('jump') &&
      s.vx < 0 &&
      s.y < 510,
    'simultaneous moving jump'
  );
  await g.wait((s) => s.x < 2652, 'jump onto stool');
  await stop();
  await g.wait((s) => s.y === 448 && s.vy === 0, 'touch landing');
  await walk(2585);
  await hold('jump');
  await stop();
  await g.wait(
    (s) => s.y === 371 && !s.held.includes('jump'),
    'one released Jump tap completes ladder climb'
  );
  await record('single Jump tap climbs after release');
  await g.shot(view + '-table');
  await walk(2458);
  for (let n = 0; n < 10 && (await g.read()).energy < 100; n++) {
    await act();
    await g.page.waitForTimeout(600);
  }
  assert.equal((await g.read()).energy, 100);
  await walk(2326);
  await act();
  await g.wait((s) => s.carried === 'eclair', 'touch take');
  await record('carrying untouched éclair');
  await g.shot(view + '-carry');
  await walk(3090);
  await act();
  await g.wait(
    (s) => s.delivered.length === 1 && s.hidden === 'Home',
    'touch stash'
  );
  await record('separate home delivery');
  await g.shot(view + '-stash');
  const timing = await g.page.evaluate(() => window.ratPlaytest.timing());
  await hold('left');
  await g.wait((s) => s.held.includes('left'), 'touch held before pause');
  await g.page.locator('#pause').click();
  await g.page.locator('#restart').click();
  await g.page.waitForTimeout(250);
  assert.deepEqual((await g.read()).held, []);
  assert.equal((await g.read()).x, 3100);
  await stop();
  await record('replay releases old touch');
  assert.ok(timing.movingFrames > 60);
  g.verify();
  await writeFile(
    out + '/' + view + '.json',
    JSON.stringify(
      {
        size: sizes,
        renderer: await g.page.evaluate(() => window.ratPlaytest.renderer()),
        events,
        timing,
        browserErrors: g.errors,
      },
      null,
      2
    )
  );
  console.log('PASS', view, timing);
} catch (e) {
  console.error('last', await g.read());
  await g.shot(view + '-failure');
  throw e;
} finally {
  await g.browser.close();
}
