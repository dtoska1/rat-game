import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const url = process.env.TARGET_URL || 'http://127.0.0.1:5173/';
await fs.mkdir('test-results/v2', { recursive: true });
const browser = await chromium.launch({
  headless: true, args: ['--disable-dev-shm-usage', '--enable-unsafe-swiftshader'],
});
const report = [];

async function runMobile(label, width, height) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  const item = { label, width, height, checks: [], errors };
  const check = (condition, description) => {
    if (!condition) throw new Error(description);
    item.checks.push(description);
  };
  const state = async () => page.evaluate(() => {
    const s = window.__ratGame?.scene.getScene('KitchenScene');
    return s ? { x: s.rat?.x, energy: s.energy, delivered: s.delivered,
      room: s.room, started: s.isStarted, hidden: s.hiddenAt,
      carrying: s.carrying, finished: s.isFinished, score: s.score } : null;
  });
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    check(response?.status() === 200, 'HTTP 200');
    await page.waitForFunction(() => {
      const s = window.__ratGame?.scene.getScene('KitchenScene');
      return Boolean(s?.rat?.active && document.querySelector('#game canvas'));
    }, { timeout: 20000 });
    check(await page.locator('#game canvas').count() === 1, 'Canvas is present');
    check(await page.locator('#room-label').innerText() === 'The Kitchen', 'Kitchen loads');
    await page.locator('#action-button').click();
    check((await state()).started, 'Start button enables gameplay');
    await page.waitForTimeout(160);
    const controls = ['[data-hold=left]', '[data-hold=right]', '[data-tap=jump]', '[data-tap=interact]', '[data-hold=boost]'];
    for (const selector of controls) {
      const rect = await page.locator(selector).boundingBox();
      check(Boolean(rect && rect.width >= 45 && rect.height >= 45), 'Large hit area ' + selector);
    }

    // Actual button holds use the same Pointer Events as mobile touch.
    const before = (await state()).x;
    await page.locator('[data-hold=left]').evaluate(btn =>
      btn.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 41, bubbles: true })));
    await page.waitForTimeout(550);
    await page.locator('[data-hold=left]').evaluate(btn =>
      btn.dispatchEvent(new PointerEvent('pointerup', { pointerId: 41, bubbles: true })));
    check((await state()).x < before - 30, 'Touch movement changes rat position');

    // The same contextual action handles climbing, stealing, doors and hiding.
    await page.evaluate(() => {
      const s = window.__ratGame.scene.getScene('KitchenScene');
      s.rat.setPosition(1370, 552);
      s.energy = 100;
      s.virtualInteract();
    });
    check((await state()).carrying === 'macaron', '100% energy allows picking up food');
    await page.evaluate(() => {
      const s = window.__ratGame.scene.getScene('KitchenScene');
      s.rat.setPosition(1510, 545);
      s.virtualInteract();
    });
    const deposited = await state();
    check(deposited.delivered === 1 && deposited.score > 0, 'Home delivery gives points');

    await page.evaluate(() => {
      const s = window.__ratGame.scene.getScene('KitchenScene');
      s.rat.setPosition(74, 545);
      s.virtualInteract();
    });
    check((await state()).room === 'pantry', 'Kitchen door opens pantry');
    await page.evaluate(() => {
      const s = window.__ratGame.scene.getScene('KitchenScene');
      s.rat.setPosition(1530, 545);
      s.virtualInteract();
    });
    check((await state()).room === 'kitchen', 'Pantry door returns to kitchen');

    await page.locator('#pause-mobile-btn').click();
    check(await page.locator('#dialog').isVisible(), 'Pause dialog displays');
    await page.locator('#restart-dialog-btn').click();
    await page.waitForFunction(() =>
      Boolean(window.__ratGame?.scene.getScene('KitchenScene')?.isStarted));
    const restart = await state();
    check(restart.delivered === 0 && restart.room === 'kitchen', 'Restart resets progress and controls');

    // Confirm game over correctly restarts; avoids the old frozen-controls bug.
    await page.evaluate(() => {
      const s = window.__ratGame.scene.getScene('KitchenScene');
      s.suspicion = 100;
      s.chefMood = 'chase';
      s.rat.setPosition(s.chef.x + 4, 530);
    });
    await page.waitForTimeout(1250);
    check(await page.locator('#dialog-title').innerText() === 'YOU ARE NOW RAT CAKE.', 'Rat cake ending appears');
    await page.locator('#action-button').click();
    await page.waitForFunction(() =>
      Boolean(window.__ratGame?.scene.getScene('KitchenScene')?.isStarted &&
      !window.__ratGame.scene.getScene('KitchenScene').isFinished));
    check((await state()).started, 'Replay starts a fresh playable scene');

    item.fps = await page.evaluate(async () => {
      const gaps = [];
      await new Promise(done => {
        let last = performance.now();
        const t0 = last;
        function tick(now) {
          gaps.push(now - last);
          last = now;
          if (now - t0 < 1100) requestAnimationFrame(tick); else done();
        }
        requestAnimationFrame(tick);
      });
      const mean = gaps.reduce((a,b) => a+b, 0) / Math.max(1,gaps.length);
      const sorted = gaps.slice().sort((a,b)=>a-b);
      return { approxRafFps: Math.round(1000/mean),
        p95FrameMs: Math.round(sorted[Math.floor(sorted.length*.95)] || 0),
        samples: gaps.length };
    });
    await page.screenshot({ path: 'test-results/v2/' + label + '.png' });
    check(errors.length === 0, 'No browser JS errors');
  } catch (error) {
    item.failure = String(error.stack || error);
    await page.screenshot({ path: 'test-results/v2/' + label + '-failure.png' }).catch(() => {});
  } finally {
    report.push(item);
    await context.close();
  }
}

await runMobile('portrait', 390, 844);
await runMobile('landscape', 844, 390);
await browser.close();
await fs.writeFile('test-results/v2/report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.some(x => x.failure)) process.exitCode = 1;
