import assert from 'node:assert/strict';
import { openGame } from './v3-driver.mjs';

for (const viewport of ['desktop', 'promax']) {
  const g = await openGame(viewport);
  try {
    // The art is always accessible, even before the player starts.
    assert.equal(await g.page.locator('#gallery-open:visible').count(), 1);
    for (const selector of ['#show-featured img', '#show-sketch img']) {
      const image = await g.page.locator(selector).evaluate((img) => ({
        loaded: img.complete && img.naturalWidth > 0,
        url: img.currentSrc,
      }));
      assert.ok(image.loaded, viewport + ': image must load: ' + selector);
      assert.match(image.url, /\.svg(\?|$)/);
    }
    await g.page.locator('#gallery-open').click();
    assert.equal(await g.page.locator('#art-gallery').evaluate((el) => el.open), true);
    assert.match(await g.page.locator('#gallery-heading').textContent(), /Drawing 2/);
    assert.match(await g.page.locator('#gallery-source').textContent(), /drawing 2.pdf/);
    assert.ok(await g.page.locator('#gallery-image').evaluate((img) =>
      img.complete && img.naturalWidth > 0
    ));
    await g.shot('original-art-featured-' + viewport);
    await g.page.locator('#select-sketch').click();
    assert.match(await g.page.locator('#gallery-heading').textContent(), /kitchen sketch/i);
    assert.equal(await g.page.locator('#select-sketch').getAttribute('aria-pressed'), 'true');
    assert.ok(await g.page.locator('#gallery-image').evaluate(async (img) => {
      await img.decode();
      return img.naturalWidth > 0;
    }));
    await g.shot('original-art-secondary-' + viewport);
    await g.page.locator('#gallery-close').click();
    assert.equal(await g.page.locator('#art-gallery').evaluate((el) => el.open), false);

    await g.start();
    const started = await g.read();
    assert.equal(started.galleryFrames.length, 2, 'both actual drawings in the kitchen');
    assert.deepEqual(started.galleryFrames.map((f) => f.texture),
      ['original-drawing2', 'original-kitchen-sketch']);
    assert.ok(started.galleryFrames[0].visible && started.galleryFrames[1].visible);
    await g.page.locator('#gallery-in-game').click();
    const paused = await g.read();
    assert.equal(paused.mode, 'pause', 'gallery safely pauses the game');
    assert.equal(await g.page.locator('#art-gallery').evaluate((el) => el.open), true);
    await g.page.locator('#gallery-done').click();
    await g.wait((s) => s.mode === 'play', 'game resumes after gallery');
    g.verify();
    console.log('PASS ' + viewport + ': featured Drawing 2, secondary sketch, wall frames and pause-safe gallery');
  } finally {
    await g.browser.close();
  }
}
