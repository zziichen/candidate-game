const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const {pathToFileURL} = require('node:url');
const path = require('node:path');
const fs = require('node:fs');
const root = path.resolve(__dirname,'..');
async function main() {
  const browser = await chromium.launch(process.env.SMOKE_BROWSER_PATH ? {executablePath:process.env.SMOKE_BROWSER_PATH} : process.env.SMOKE_BROWSER_CHANNEL ? {channel:process.env.SMOKE_BROWSER_CHANNEL} : {});
  try {
    for (const width of [1440,1024,768,390,320]) {
      const page = await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
      const errors = [];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(process.env.SMOKE_SITE_URL || pathToFileURL(path.join(root,'index.html')).href);
      assert.equal(await page.locator('.map-node').count(),48);
      assert.equal(await page.locator('.road').count(),52);
      await page.evaluate(() => {
        if (Object.keys(mapCoordinates).sort().join() !== Object.keys(nodes).sort().join()) throw Error('Incomplete visual coordinates');
      });
      const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(await overflow(),false,`${width}: no horizontal page overflow`);
      await page.locator('#helpBtn').click();
      assert.equal(await page.locator('#helpDialog').evaluate(d=>d.open),true);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#helpDialog').evaluate(d=>d.open),false);
      if (process.env.SMOKE_SCREENSHOT_DIR && [1440,390].includes(width)) {
        fs.mkdirSync(process.env.SMOKE_SCREENSHOT_DIR,{recursive:true});
        await page.screenshot({path:path.join(process.env.SMOKE_SCREENSHOT_DIR,`street-${width}-selection.png`),fullPage:true});
      }
      await page.locator('.candidate-btn').nth(3).click();
      await page.locator('#startBtn').click();
      assert.equal(await page.locator('[aria-current="location"]').getAttribute('data-node'),'c0');
      await page.locator('.stage-nav button').nth(4).click();
      await page.waitForFunction(()=>document.getElementById('board').scrollTop > 1400);
      await page.locator('#focusBtn').click();
      await page.waitForFunction(()=>document.getElementById('board').scrollTop === 0);
      await page.evaluate(()=>{ game.human.node='c4';game.pendingSteps=1;continueHumanMove(); });
      assert.equal(await page.locator('.route-choice').count(),2);
      assert.equal(await page.locator('.route-choice').first().evaluate(b=>b===document.activeElement),true);
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.locator('.route-choice').last().evaluate(b=>b===document.activeElement),true);
      await page.locator('.route-choice').first().click();
      assert.equal(await page.evaluate(()=>game.human.node),'P1');
      await page.locator('#actionsJump').click();
      await page.locator('[data-action="platform"]').click();
      assert.equal(await page.evaluate(()=>game.human.ap),2);
      assert.equal(await overflow(),false,`${width}: no overflow during play`);
      // Dock must not cover the scrollable action cards.
      const action = page.locator('[data-action="leak"]');
      await action.scrollIntoViewIfNeeded();
      const cardBox = await action.boundingBox(), dockBox = await page.locator('#turnPanel').boundingBox();
      assert(cardBox.y+cardBox.height <= dockBox.y,`${width}: action remains above dock after scroll`);
      if (process.env.SMOKE_SCREENSHOT_DIR && [1440,390].includes(width)) {
        await page.locator('#campaignMap').scrollIntoViewIfNeeded();
        await page.screenshot({path:path.join(process.env.SMOKE_SCREENSHOT_DIR,`street-${width}-playing.png`),fullPage:true});
      }
      assert.deepEqual(errors,[]);
      await page.close();
      console.log(`PASS: ${width}px layout, map topology, navigation, help, keyboard route choice, action, fixed dock`);
    }
  } finally { await browser.close(); }
}
main().catch(e=>{console.error(e);process.exitCode=1});
