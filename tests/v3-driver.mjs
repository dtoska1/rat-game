import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
export const out = process.env.TEST_OUT || '.playtest';
export const url = process.env.TARGET_URL || 'http://127.0.0.1:4318/';
export async function openGame(view = 'desktop', engine = chromium) {
  await mkdir(out, { recursive: true });
  const browser = await engine.launch({
    headless: true,
    args: engine === chromium ? ['--enable-unsafe-swiftshader'] : [],
  });
  const size =
    view === 'portrait'
      ? [390, 844]
      : view === 'promax'
        ? [956, 440]
        : view === 'landscape'
          ? [844, 390]
          : [1360, 830];
  const context = await browser.newContext({
    viewport: { width: size[0], height: size[1] },
    hasTouch: view !== 'desktop',
    isMobile: view !== 'desktop',
    deviceScaleFactor: view === 'promax' ? 3 : 1,
  });
  const page = await context.newPage(),
    errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push(r.status() + ' ' + r.url());
  });
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug');
  await page.locator('#start:enabled').waitFor();
  const read = () => page.evaluate(() => window.ratPlaytest.read());
  const shot = async (name) => {
    await page
      .locator('#debug')
      .evaluate((el) => (el.style.visibility = 'hidden'));
    await page.screenshot({ path: out + '/' + name + '.png' });
    await page.locator('#debug').evaluate((el) => (el.style.visibility = ''));
  };
  const wait = async (fn, label, timeout = 10000) => {
    const until = Date.now() + timeout;
    for (;;) {
      const s = await read();
      if (fn(s)) return s;
      if (s.mode === 'lost' || s.mode === 'caught' || Date.now() > until)
        throw Error(label + ' ' + JSON.stringify(s));
      await page.waitForTimeout(24);
    }
  };
  const go = async (goal, opts = {}) => {
    const s = await read(),
      dir = s.x > goal ? -1 : 1;
    if (Math.abs(s.x - goal) < 6) return s;
    const key = dir < 0 ? 'ArrowLeft' : 'ArrowRight';
    if (opts.boost) await page.keyboard.down('Shift');
    await page.keyboard.down(key);
    try {
      await wait((s) => (s.x - goal) * dir >= -5, 'walk to ' + goal, 30000);
    } finally {
      await page.keyboard.up(key);
      if (opts.boost) await page.keyboard.up('Shift');
    }
    return wait((s) => Math.abs(s.vx) < 2, 'brake');
  };
  const tap = async (key) => {
    await page.keyboard.down(key);
    await page.waitForTimeout(75);
    await page.keyboard.up(key);
  };
  const start = async () => {
    await page.locator('#start').click();
    await wait((s) => s.mode === 'play', 'start');
  };
  const reset = async () => {
    const s = await read();
    if (s.mode === 'play') await tap('Escape');
    if ((await read()).mode === 'pause') await page.click('#restart');
    else await page.click('#end-action');
    await wait((s) => s.mode === 'play' && s.hidden === 'Home', 'reset');
  };
  return {
    browser,
    page,
    context,
    errors,
    read,
    wait,
    go,
    shot,
    tap,
    start,
    reset,
    verify: () => assert.deepEqual(errors, []),
  };
}
