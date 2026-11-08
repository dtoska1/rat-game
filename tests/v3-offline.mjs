import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({
    offline: true,
    viewport: { width: 1100, height: 760 },
  });
  const p = await ctx.newPage(),
    requests = [],
    errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('request', (r) => {
    if (/^https?:/.test(r.url())) requests.push(r.url());
  });
  p.on('requestfailed', (r) => errors.push(r.url().slice(0, 80)));
  await p.goto(
    pathToFileURL(resolve('preview/Rat Game V3.html')).href + '?debug'
  );
  await p.locator('#start:enabled').click();
  await p.keyboard.down('ArrowLeft');
  await p.waitForFunction(() => window.ratPlaytest.read().x < 3000);
  await p.keyboard.up('ArrowLeft');
  await p.keyboard.down('Space');
  await p.waitForFunction(() => window.ratPlaytest.read().y < 505);
  await p.keyboard.up('Space');
  assert.deepEqual(requests, []);
  assert.deepEqual(errors, []);
  await mkdir('.playtest', { recursive: true });
  await writeFile(
    '.playtest/offline.json',
    JSON.stringify(
      {
        openedFromDisk: true,
        networkOffline: true,
        walked: true,
        jumped: true,
        externalRequests: requests,
        errors,
      },
      null,
      2
    )
  );
  console.log('PASS standalone HTML, walking and jumping offline');
} finally {
  await browser.close();
}
