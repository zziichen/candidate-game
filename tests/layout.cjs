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
      page.on('requestfailed',r=>errors.push(`${r.url()}: ${r.failure()?.errorText}`));
      await page.goto(process.env.SMOKE_SITE_URL || pathToFileURL(path.join(root,'index.html')).href);
      assert.equal(await page.locator('.map-node').count(),48);
      assert.equal(await page.locator('.road').count(),52);
      assert.equal(await page.locator('#candidateGrid .candidate-portrait').count(),6);
      await page.evaluate(async () => {
        await Promise.all(candidateTemplates.map(c => new Promise((resolve,reject) => {
          const image = new Image();
          image.onload = () => image.naturalWidth === 1152 && image.naturalHeight === 384 ? resolve() : reject(Error(`Invalid portrait sheet: ${c.id}`));
          image.onerror = () => reject(Error(`Missing portrait: ${c.id}`));
          image.src = `assets/candidate-${c.id}.webp`;
        })));
      });
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
      if (width === 1440) {
        await page.evaluate(() => {
          const seen = new Map(game.players.map(p => [p.id,new Set()]));
          for (let rotation = 0; rotation < 6; rotation++) {
            game.players.forEach((p,i) => p.res.support = 60 - ((i+rotation)%6)*10);
            const before = JSON.stringify(game);
            renderRanking(); renderPlayerCard();
            if (JSON.stringify(game) !== before) throw Error('Portrait rendering changed game state');
            const rows = [...document.querySelectorAll('#ranking .rank-row')];
            if (rows.map(row => Number(row.querySelector('.rank-score').textContent)).join() !== '60,50,40,30,20,10') throw Error('Ranking did not update');
            rows.forEach((row,i) => {
              const expected = i < 2 ? 'happy' : i < 4 ? 'neutral' : 'nervous';
              if (row.dataset.mood !== expected) throw Error('Expression did not follow changed standing');
              const face = row.querySelector('[role="img"]');
              const position = getComputedStyle(face).backgroundPositionX;
              if (position !== (expected === 'happy' ? '0%' : expected === 'neutral' ? '50%' : '100%')) throw Error('Wrong sprite cell');
              if (!face.getAttribute('aria-label').includes(row.querySelector('.rank-mood').textContent)) throw Error('Missing accessible expression');
              seen.get(row.dataset.candidate).add(expected);
            });
            if (document.querySelector('#playerCard .candidate-portrait').dataset.mood !== document.querySelector('#ranking .me').dataset.mood) throw Error('Player portrait disagrees with ranking');
          }
          if ([...seen.values()].some(moods => moods.size !== 3)) throw Error('Not all eighteen faces exercised');
          game.players.forEach((p,i) => p.res.support = [50,50,40,40,30,30][i]);
          renderRanking();
          const tied = [...document.querySelectorAll('#ranking .rank-row')];
          if (tied.map(row=>row.querySelector('.rank-number').textContent).join() !== '01,01,03,03,05,05') throw Error('Tied rank mismatch');
          if (tied.map(row=>row.dataset.mood).join() !== 'happy,happy,neutral,neutral,nervous,nervous') throw Error('Tied mood mismatch');
          game.players.forEach(p => p.res.support = 30); renderRanking();
          if ([...document.querySelectorAll('#ranking .rank-row')].some(row=>row.dataset.mood !== 'neutral')) throw Error('All tied must remain neutral');
        });
        console.log('PASS: all 18 expressions, rank reversal, support ties, player consistency, unchanged state and accessible labels');
      }
      await page.close();
      console.log(`PASS: ${width}px layout, map topology, navigation, help, keyboard route choice, action, fixed dock`);
    }
  } finally { await browser.close(); }
}
main().catch(e=>{console.error(e);process.exitCode=1});
