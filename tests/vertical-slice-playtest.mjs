import { chromium } from 'playwright';
import fs from 'node:fs/promises';
await fs.mkdir('test-results/vertical-slice', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-dev-shm-usage','--enable-unsafe-swiftshader'] });
const results = [];
for (const [name,width,height] of [['portrait',390,844],['landscape',844,390]]) {
  const context = await browser.newContext({ viewport: {width,height}, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror',err=>errors.push(err.message));
  const record = { name,viewport:width+'x'+height,checks:[],errors };
  const assert=(yes,label)=>{if(!yes)throw Error(label);record.checks.push(label)};
  const evalScene=(fn)=>page.evaluate(fn);
  try {
    const response=await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded',timeout:30000});
    assert(response?.status()===200,'HTTP 200');
    await page.waitForFunction(()=>Boolean(window.__ratGame?.scene.getScene('KitchenScene')?.rat?.active),null,{timeout:25000});
    assert((await page.locator('#game canvas').count())===1,'Game canvas visible');
    assert(await page.locator('#overlay').isVisible(),'Start screen visible');
    await page.screenshot({path:'test-results/vertical-slice/'+name+'-intro.png'});
    await page.locator('#play').click();
    assert(!(await page.locator('#overlay').isVisible()),'Start enters the game');
    const left=page.locator('[data-hold=right]');
    const rect=await left.boundingBox();
    assert(rect&&rect.width>=60&&rect.height>=60,'Touch movement is thumb sized');
    const x0=await evalScene(()=>window.__ratGame.scene.getScene('KitchenScene').rat.x);
    await left.evaluate(el=>el.dispatchEvent(new PointerEvent('pointerdown',{pointerId:8,bubbles:true})));
    await page.waitForTimeout(480);
    await left.evaluate(el=>el.dispatchEvent(new PointerEvent('pointerup',{pointerId:8,bubbles:true})));
    const x1=await evalScene(()=>window.__ratGame.scene.getScene('KitchenScene').rat.x);
    assert(x1>x0+35,'Holding right moves the rat');
    await page.locator('[data-tap=jump]').evaluate(el=>el.dispatchEvent(new PointerEvent('pointerdown',{pointerId:4,bubbles:true})));
    await page.waitForTimeout(90);
    const vy=await evalScene(()=>window.__ratGame.scene.getScene('KitchenScene').rat.body.velocity.y);
    assert(vy<0,'Jump button propels rat up');
    await evalScene(()=>{
      const s=window.__ratGame.scene.getScene('KitchenScene');
      s.rat.setPosition(424,290);s.rat.setVelocity(0,0);s.energy=100;
      s.virtualInteract();
    });
    assert((await evalScene(()=>window.__ratGame.scene.getScene('KitchenScene').foodHeld))==='eclair','At 100% energy rat steals snack');
    await evalScene(()=>{
      const s=window.__ratGame.scene.getScene('KitchenScene');
      s.rat.setPosition(135,563);s.rat.setVelocity(0,0);s.virtualInteract();
    });
    assert((await evalScene(()=>window.__ratGame.scene.getScene('KitchenScene').collected))===1,'Returning HOME deposits snack');
    await page.screenshot({path:'test-results/vertical-slice/'+name+'-playing.png'});
    await evalScene(()=>{
      const s=window.__ratGame.scene.getScene('KitchenScene');
      s.rat.setPosition(s.chef.x,563);s.rat.setVelocity(0,0);
      s.chefState='chase';s.chefAlert=100;s.chefLastSeen=s.rat.x;
    });
    await page.waitForTimeout(1300);
    assert(await page.locator('#overlay').isVisible(),'Chef capture triggers game over');
    assert((await page.locator('#overlay-title').innerText()).includes('RAT CAKE'),'Rat-cake ending');
    await page.locator('#play').click();
    await page.waitForFunction(()=>Boolean(window.__ratGame?.scene.getScene('KitchenScene')?.playing));
    assert((await evalScene(()=>window.__ratGame.scene.getScene('KitchenScene').collected))===0,'Replay resets progress');
    assert(errors.length===0,'No browser JavaScript errors');
    await page.screenshot({path:'test-results/vertical-slice/'+name+'-replayed.png'});
  } catch(error) {
    record.failure=String(error.stack||error);
    await page.screenshot({path:'test-results/vertical-slice/'+name+'-failure.png'}).catch(()=>{});
  } finally {results.push(record);await context.close();}
}
await browser.close();
await fs.writeFile('test-results/vertical-slice/report.json',JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));
if(results.some(r=>r.failure))process.exitCode=1;
