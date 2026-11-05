import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const target = process.env.TARGET_URL || 'https://rat-game.dion-tosk.workers.dev/';
await fs.mkdir('test-results', { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage'] });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
let report = { target, viewport: '390x844 mobile touch', events: [], errors };
const event = async (name) => {
  const snap = await page.evaluate(() => ({
    status: document.querySelector('#status-label')?.textContent?.trim(),
    energy: document.querySelector('#energy-label')?.textContent?.trim(),
    canvas: !!document.querySelector('#game canvas'),
    activeDialog: !document.querySelector('#dialog')?.classList.contains('is-hidden'),
    stage: (() => { const r = document.querySelector('#game-stage')?.getBoundingClientRect(); return r ? { width: Math.round(r.width), height: Math.round(r.height) } : null; })()
  }));
  report.events.push({ name, ...snap });
};
try {
  const response = await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 30000 });
  report.http = response?.status();
  await page.waitForSelector('#game canvas', { timeout: 25000 });
  await page.waitForTimeout(1800);
  report.renderer = await page.evaluate(() => {
    const canvas = document.querySelector('#game canvas');
    if (!canvas) return 'missing';
    try { return canvas.getContext('2d') ? 'Canvas2D' : 'WebGL'; }
    catch { return 'unavailable'; }
  });
  await event('loaded');
  await page.screenshot({ path: 'test-results/mobile-before-start.png', fullPage: false });
  await page.locator('#action-button').click({ timeout: 10000 });
  await page.waitForTimeout(350);
  await event('started');

  // Actual multi-touch sequence using Chrome's DevTools Protocol.
  const session = await context.newCDPSession(page);
  const center = async (selector) => {
    const r = await page.locator(selector).boundingBox();
    if (!r) throw new Error('Button not visible: ' + selector);
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  };
  const left = await center('[data-hold="left"]');
  const jump = await center('[data-tap="jump"]');
  const climb = await center('[data-tap="climb"]');

  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...left, id: 1 }] });
  await page.waitForTimeout(1100);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...left, id: 1 }, { ...jump, id: 2 }] });
  await page.waitForTimeout(110);
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ ...left, id: 1 }] });
  await page.waitForTimeout(700);
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await event('held left and jumped');
  await page.screenshot({ path: 'test-results/mobile-after-movement.png', fullPage: false });

  await page.touchscreen.tap(climb.x, climb.y);
  await page.waitForTimeout(350);
  await event('tapped climb');

  const timings = await page.evaluate(async () => {
    const samples = [];
    await new Promise(resolve => {
      const start = performance.now();
      let prior = start;
      const tick = now => {
        if (prior !== start) samples.push(now - prior);
        prior = now;
        if (now - start < 2500) requestAnimationFrame(tick); else resolve();
      };
      requestAnimationFrame(tick);
    });
    const sorted = samples.slice().sort((a,b)=>a-b);
    const p95 = sorted[Math.min(sorted.length-1, Math.floor(sorted.length*.95))] || 0;
    return { frames: samples.length, meanMs: Number((samples.reduce((a,b)=>a+b,0)/Math.max(1,samples.length)).toFixed(1)), p95Ms: Number(p95.toFixed(1)), approxFps: Math.round(1000/(samples.reduce((a,b)=>a+b,0)/Math.max(1,samples.length))), slowFramesOver33ms: samples.filter(x=>x>33).length };
  });
  report.animationTiming = timings;
  await page.screenshot({ path: 'test-results/mobile-final.png', fullPage: false });
  if (errors.length) throw Error('Browser errors: '+errors.join(' | '));
  if (report.events[1].activeDialog) throw Error('Game dialog did not close after Start');
} catch (e) {
  report.failure = String(e.stack || e);
  await page.screenshot({ path: 'test-results/mobile-failure.png', fullPage: false }).catch(()=>{});
} finally {
  await fs.writeFile('test-results/mobile-report.json', JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  await browser.close();
}
if (report.failure) process.exit(1);
