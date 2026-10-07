// Actual browser checks; no test hooks or rule changes in production code.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

// Compare every top-level declaration with the immutable baseline, allowing
// only extraction comments, blank lines and declaration order to differ.
function declarations(source) {
  source = source.replace(/\/\*\*[\s\S]*?\*\//g, '');
  const starts = [...source.matchAll(/^(?:const|let|function)\s+(\w+)/gm)];
  return Object.fromEntries(starts.map((m, i) => [m[1],
    source.slice(m.index, starts[i + 1]?.index ?? source.indexOf('\ndocument.getElementById("startBtn")', m.index))
      .split(/\r?\n/).filter(line => line.trim()).join('\n').trim()]));
}

async function main() {
  const legacy = read('legacy/alpha042-single-file.html');
  const index = read('index.html');
  const legacyScript = legacy.match(/<script>([\s\S]*?)<\/script>/)[1];
  const splitScript = ['js/data.js', 'js/board.js', 'js/game.js'].map(read).join('\n');
  // Presentation is intentionally redesigned; keep every other declaration
  // byte-equivalent (apart from blank lines) to the immutable Alpha baseline.
  const presentation = new Set(['showRouteModal','renderCandidates','showCandidate','renderPlayerCard','renderIssuePanel','renderActions','renderRanking','tokensAt','nodeHtml','renderBoard','renderTurn','render','addLog']);
  const rulesOnly = source => Object.fromEntries(Object.entries(declarations(source)).filter(([name]) => !presentation.has(name)));
  assert.deepEqual(rulesOnly(splitScript), rulesOnly(legacyScript), 'All data, rules, AI and turn-flow declarations match legacy');
  assert.equal(splitScript.slice(splitScript.indexOf('document.getElementById("startBtn")')).trim(),
    legacyScript.slice(legacyScript.indexOf('document.getElementById("startBtn")')).trim(), 'Initialization matches legacy');
  const scripts = [...index.matchAll(/<script src="([^"]+)"/g)].map(m => m[1].split('?')[0]);
  assert.deepEqual(scripts, ['js/data.js', 'js/board.js', 'js/visuals.js', 'js/ui.js', 'js/game.js']);
  assert(!/<script[^>]*(?:async|defer|type=)/.test(index), 'Classic synchronous scripts preserve shared lexical scope');
  console.log('PASS: unchanged legacy data, rules, AI, turn flow, initialization and load order');

  const browser = await chromium.launch(process.env.SMOKE_BROWSER_PATH
    ? { executablePath: process.env.SMOKE_BROWSER_PATH }
    : process.env.SMOKE_BROWSER_CHANNEL ? { channel: process.env.SMOKE_BROWSER_CHANNEL } : {});
  let games = 0;
  try {
    async function load(file, seed, viewport) {
      const page = await browser.newPage({ viewport });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('requestfailed', r => errors.push(`${r.url()}: ${r.failure()?.errorText}`));
      await page.addInitScript(seed => {
        let state = seed >>> 0;
        Math.random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
      }, seed);
      await page.goto(pathToFileURL(path.join(root, file)).href);
      assert.deepEqual(errors, [], `${file}: page loads without JS or resource errors`);
      assert.deepEqual(await page.evaluate(() => [candidateTemplates.length, Object.keys(nodes).length,
        Object.keys(gateAt).length, Object.keys(routeMeta).length, actionDefs.length]), [6, 48, 5, 5, 12]);
      assert.equal(await page.locator('.candidate-btn').count(), 6);
      assert.equal(await page.locator('.common-node, .route-node').count(), 48);
      assert.equal(await page.locator('.action-btn').count(), 12);
      await page.evaluate(() => {
        for (const [node, gate] of Object.entries(gateAt)) {
          if (nodes[node].next.join() !== routeMeta[gate].options.map(o => o.id).join()) throw Error(`Invalid gate: ${gate}`);
        }
        for (const node of Object.values(nodes)) for (const next of node.next) {
          if (!nodes[next]) throw Error(`Missing node: ${next}`);
        }
      });
      return { page, errors };
    }
    for (let candidate = 0; candidate < 6; candidate++) {
      for (let branch = 0; branch < 2; branch++) {
        const traces = [];
        for (const file of ['index.html', 'legacy/alpha042-single-file.html']) {
          const { page, errors } = await load(file, 4200 + candidate * 2 + branch,
            branch ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
          await page.locator('.candidate-btn').nth(candidate).click();
          await page.locator('#startBtn').click();
          const trace = await page.evaluate(({ candidate, branch }) => {
            if (game.human.id !== candidateTemplates[candidate].id || game.players.filter(p => !p.isHuman).length !== 5) throw Error('Invalid players');
            const snapshots = [];
            const snapshot = () => snapshots.push(JSON.stringify({ game, logs: [...document.getElementById('log').children].map(row => row.textContent),
              issue: document.getElementById('issueEffects').textContent, actions: [...document.getElementById('actions').children].map(b => ({name:b.querySelector('b').textContent,notes:[...b.querySelectorAll('.action-bonus,.action-risk')].map(n=>n.textContent)})),
              result: document.getElementById('finalResults').innerHTML }));
            const gates = new Set();
            snapshot();
            for (let turn = 0; turn < 100 && document.getElementById('resultModal').style.display !== 'flex'; turn++) {
              document.getElementById('rollBtn').click();
              let guard = 10;
              while (game.waitingRoute && guard-- > 0) {
                gates.add(gateAt[game.human.node]);
                document.getElementById('routeChoices').children[branch].click();
              }
              if (game.waitingRoute) throw Error('Route selection stalled');
              snapshot();
              for (let action = 0; action < 8 && game.human.ap > 0; action++) {
                const p = game.human;
                const affordable = actionDefs.filter(a => {
                  const cost = p.id === 'gao' && a.cost > 0 && p.paidBoost ? Math.max(0, a.cost - 1) : a.cost;
                  return a.ap <= p.ap && cost <= p.res.funds;
                });
                if (!affordable.length || p.finished) break;
                const chosen = affordable[(turn + action) % affordable.length];
                document.getElementById('actions').children[actionDefs.indexOf(chosen)].click();
                snapshot();
              }
              document.getElementById('endTurnBtn').click();
              snapshot();
            }
            if (!game.finishing || document.getElementById('resultModal').style.display !== 'flex') throw Error('Game did not finish');
            if (!game.flags.issue1 || !game.flags.issue2) throw Error('Major issues did not occur');
            if (document.querySelectorAll('#finalResults .rank-row').length !== 6) throw Error('Missing final ranks');
            return { snapshots, gates: [...gates] };
          }, { candidate, branch });
          assert.deepEqual(errors, []);
          traces.push(trace);
          await page.close();
          games++;
        }
        assert.deepEqual(traces[0], traces[1], `Candidate ${candidate}, branch ${branch}: every state, log, issue/action semantics and result matches legacy`);
      }
    }
    // Force each gate individually; normal games can finish before the human
    // reaches all five, so full-game coverage alone is insufficient.
    const { page, errors } = await load('index.html', 42, { width: 390, height: 844 });
    await page.locator('#startBtn').click();
    for (const node of ['c2', 'c4', 'c6', 'c8', 'c9']) {
      for (let option = 0; option < 2; option++) {
        await page.evaluate(node => {
          game.human.node = node; game.human.routeChoices = {}; game.human.finished = false;
          game.pendingSteps = 1; continueHumanMove();
        }, node);
        const choice = page.locator('.route-choice').nth(option);
        await choice.click();
        assert.equal(await page.evaluate(() => game.waitingRoute), false);
        assert.equal(await page.evaluate(() => game.human.node), await page.evaluate(({ node, option }) => nodes[node].next[option], { node, option }));
      }
    }
    for (const selector of ['#rollBtn', '#endTurnBtn', '.action-btn']) {
      const control = page.locator(selector).first();
      await control.scrollIntoViewIfNeeded();
      const box = await control.boundingBox();
      assert(box && box.x >= 0 && box.x + box.width <= 391, `${selector} fits mobile viewport`);
    }
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`PASS: page load, 6 candidates, 48 nodes, 5 gates, 12 actions; ${games} seeded full games (12 legacy comparisons); both choices at every gate; desktop/mobile controls`);
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
