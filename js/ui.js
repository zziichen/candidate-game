/** Street edition presentation. No game data, RNG, movement or scoring here. */
let lastMapNode = null;
const uiCategory = id => visualCategories[id.startsWith('F') ? 'funds' : routeCategory(id) || 'common'];
const resourceLabels = { support:'支持', funds:'資金', media:'聲量', org:'組織', trust:'信任', controversy:'爭議' };

function candidateBadge(c, extra = '') {
  return `<span class="candidate-badge ${extra}" style="--candidate-color:${c.tint}" aria-hidden="true">${c.name[0]}<i>✦</i></span>`;
}
function renderCandidates() {
  const grid = document.getElementById('candidateGrid');
  grid.innerHTML = '';
  candidateTemplates.forEach((c, i) => {
    const button = document.createElement('button');
    button.className = 'candidate-btn' + (i === 0 ? ' selected' : '');
    button.dataset.id = c.id;
    button.setAttribute('aria-pressed', String(i === 0));
    button.innerHTML = `${candidateBadge(c)}<span><b>${c.name}</b><small>${c.title}</small></span>`;
    button.onclick = () => {
      if (game.started) return;
      grid.querySelectorAll('button').forEach(b => { b.classList.remove('selected'); b.setAttribute('aria-pressed','false'); });
      button.classList.add('selected'); button.setAttribute('aria-pressed','true');
      showCandidate(c);
    };
    grid.appendChild(button);
  });
  showCandidate(candidateTemplates[0]);
}
function resourceHtml(resources) {
  return `<div class="stats">${Object.entries(resourceLabels).map(([key,label]) => `<div class="stat ${key}"><span>${label}</span><b>${resources[key]}</b></div>`).join('')}</div>`;
}
function skillsHtml(p) {
  return `<div class="skills">${['air','ground','policy','attack'].map(cat => `<div class="skill" style="--category-color:${visualCategories[cat].color}"><span>${visualCategories[cat].label}</span><b>${skillValue(p,cat)}</b></div>`).join('')}</div>`;
}
function showCandidate(c) {
  document.getElementById('playerCard').innerHTML = `<div class="candidate-profile">${candidateBadge(c,'large')}<div><span class="eyebrow">你的競選代表</span><h3>${c.name}<small>${c.title}</small></h3></div></div><p class="candidate-quote">「${c.quote}」</p>${resourceHtml(c.start)}<p class="eyebrow skill-heading">競選能力</p>${skillsHtml({...c,tempSkillCat:null})}`;
}
function renderPlayerCard() {
  if (!game.started) return;
  const p = game.human;
  document.body.classList.add('playing');
  document.getElementById('candidateHeading').textContent = '你的競選總部';
  document.getElementById('playerCard').innerHTML = `<div class="candidate-profile">${candidateBadge(p,'large')}<div><span class="eyebrow">你的競選代表</span><h3>${p.name}<small>${p.title}</small></h3></div></div><div class="position-line">◎ ${nodes[p.node].label}</div>${resourceHtml(p.res)}<p class="eyebrow skill-heading">競選能力</p>${skillsHtml(p)}<div class="strategy-state">動員標記 <b>${p.mobilize}</b><br>連續策略 <b>${p.lastCategory ? visualCategories[p.lastCategory].label : '無'} × ${p.streak}</b>${p.tempSkillCat ? `<br>本回合臨時加成：${visualCategories[p.tempSkillCat].label} +1` : ''}</div>`;
}
function renderActions() {
  const box = document.getElementById('actions'); box.innerHTML = '';
  actionDefs.forEach(a => {
    const b = document.createElement('button'); b.className = 'action-btn'; b.dataset.action = a.id;
    b.style.setProperty('--category-color',visualCategories[a.cat].color);
    const m = game.started ? issueStrategyMultiplier(game.human,a.cat) : 1;
    const risk = a.cat === 'attack' && game.currentIssue ? issueAttackRisk() : 1;
    let note = '';
    if (game.currentIssue && m >= 1.15) { b.classList.add('issue-hot'); note = `<span class="action-bonus">🔥 ${game.currentIssue.name} 共鳴 ×${m.toFixed(2)}</span>`; }
    else if (game.currentIssue && m < .98) { b.classList.add('issue-risk'); note = `<span class="action-risk">⚠️ 議題錯位：效果 ×${m.toFixed(2)}</span>`; }
    if (a.cat === 'attack' && game.currentIssue && risk > 1.15) { b.classList.add('issue-risk'); note += `<span class="action-risk">⚠️ 反噬爭議 ×${risk.toFixed(2)}</span>`; }
    b.innerHTML = `<span class="category">${visualCategories[a.cat].label}<i aria-hidden="true">${visualCategories[a.cat].symbol}</i></span><b>${a.name}</b><span class="action-cost">${a.ap}AP｜${a.cost ? `資金${a.cost}｜` : ''}難度${a.diff}</span><span class="action-desc">${a.desc}</span>${note}`;
    // Preserve availability and action dispatch from the Alpha 0.42 UI.
    if (!game.started || game.current !== 0 || game.human.ap <= 0 || game.human.finished) b.disabled = true;
    b.onclick = () => { doAction(game.human,a); render(); };
    box.appendChild(b);
  });
}
function renderRanking() {
  const box = document.getElementById('ranking');
  if (!game.started) return;
  const arr = [...game.players].sort((a,b) => b.res.support-a.res.support);
  box.innerHTML = arr.map((p,i) => `<div class="rank-row ${p.isHuman ? 'me' : ''}"><span class="rank-number">${String(i+1).padStart(2,'0')}</span>${candidateBadge(p)}<span class="rank-person"><b>${p.name}${p.isHuman ? '<small>你</small>' : ''}</b><small>${nodes[p.node].label}</small></span><b class="rank-score">${p.res.support}</b></div>`).join('');
}
function tokensAt(id) {
  if (!game.started) return '';
  return game.players.filter(p => p.node === id).map(p => `<span class="token ${p.isHuman ? 'player' : ''}" title="${p.name}${p.isHuman ? '（你）' : ''}" aria-label="${p.name}${p.isHuman ? '（你）' : ''}" style="background:${p.tint}">${p.name[0]}</span>`).join('');
}
function nodeHtml(id) {
  const node = nodes[id], point = mapCoordinates[id], category = uiCategory(id);
  const me = game.started && game.human.node === id;
  let next = [];
  if (game.started) {
    const human = game.human, gate = gateAt[human.node];
    next = gate && human.routeChoices[gate] ? [human.routeChoices[gate]] : nodes[human.node].next;
  }
  const event = ['c4','c5','c8','c12'].includes(id);
  return `<div id="map-${id}" data-node="${id}" class="map-node ${node.type === 'common' ? 'common-node' : 'route-node'} ${me ? 'here' : ''} ${next.includes(id) ? 'next-node' : ''} ${event ? 'major-event' : ''} ${gateAt[id] ? 'gate-node' : ''} ${id === 'c12' ? 'finish-node' : ''}" style="left:${point.x/640*100}%;top:${point.y}px;--route-color:${category.color}" ${me ? 'aria-current="location"' : ''}><span class="node-symbol" aria-hidden="true">${id === 'c12' ? '⚑' : gateAt[id] ? '⑂' : category.symbol}</span><b>${node.label}</b><div class="tokens">${tokensAt(id)}</div>${me ? '<span class="you-marker">你在這裡</span>' : ''}</div>`;
}
function mapRoads() {
  return Object.values(nodes).flatMap(n => n.next.map(next => {
    const a = mapCoordinates[n.id], b = mapCoordinates[next];
    const color = uiCategory(nodes[next].type === 'route' ? next : n.id).color;
    const selected = game.started && gateAt[n.id] && game.human.routeChoices[gateAt[n.id]] === next;
    const d = `M${a.x},${a.y} C${a.x},${(a.y+b.y)/2} ${b.x},${(a.y+b.y)/2} ${b.x},${b.y}`;
    return `<path class="road-bed" d="${d}"/><path class="road ${selected ? 'chosen-road' : ''}" data-from="${n.id}" data-to="${next}" d="${d}" stroke="${color}"/><path class="road-center" d="${d}"/><path class="road-arrow" d="M${b.x-4},${b.y-31} l4,5 4,-5"/>`;
  })).join('');
}
function townIllustration(stage,i) {
  const y = stage.y+100;
  return `<g class="town-building" transform="translate(285 ${y})"><path d="M0 24 35 5 70 24v70H0z" fill="${i%2 ? '#c4d2be' : '#e5c9a4'}"/><path d="M-5 24 35 0 75 24" fill="none" stroke="#b29c7b" stroke-width="4"/><rect x="6" y="40" width="58" height="15" rx="2" fill="#faf3e3"/><path d="M6 59h58l-4 10H10z" fill="#b87666"/><path d="M10 59v10m10-10v10m10-10v10m10-10v10m10-10v10m10-10v10" stroke="#f8e8d4" stroke-width="5"/><rect x="15" y="74" width="14" height="20" fill="#91a29b"/><rect x="39" y="74" width="17" height="12" fill="#91a29b"/><text x="35" y="51" text-anchor="middle" fill="#81745c" font-size="9">${['街角商店','市民書屋','小城廣播','地方會館','投票服務'][i]}</text><ellipse cx="35" cy="115" rx="28" ry="6" fill="#b8c5a3"/><path d="M35 106v-14" stroke="#899472" stroke-width="3"/><circle cx="35" cy="88" r="14" fill="#a8bc8d"/></g>`;
}
function renderBoard() {
  const board = document.getElementById('board');
  const point = game.started ? game.human.node : 'c0';
  const changed = point !== lastMapNode;
  if (board.childElementCount === 0) {
  board.innerHTML = `<div class="map-canvas"><svg class="map-art" viewBox="0 0 640 2200" preserveAspectRatio="none" aria-hidden="true"><defs><pattern id="paper-grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#cbbfa5" stroke-width=".5" opacity=".3"/></pattern></defs><rect width="640" height="2200" fill="url(#paper-grid)"/><path d="M30 0Q100 160 40 380T50 750T35 1150T50 1500T40 1950V2200H0V0z" fill="#d9e5d2" opacity=".6"/><path d="M610 0Q560 160 610 380T590 750T610 1150T600 1500T610 1950V2200H640V0z" fill="#d4e2d9" opacity=".6"/>${visualStages.map(townIllustration).join('')}${mapRoads()}<text x="320" y="24" text-anchor="middle" class="map-plaza-label">競 選 起 點</text></svg>${visualStages.map((s,i) => `<div class="district-sign" style="top:${s.y-17}px"><span>0${i+1}</span>${s.name}</div><span class="route-sign" style="left:26.875%;top:${s.y+14}px;color:${uiCategory(s.left[0]).color}">${routeMeta[gateAt[s.gate]].options[0].label}</span><span class="route-sign" style="left:73.125%;top:${s.y+14}px;color:${uiCategory(s.right[0]).color}">${routeMeta[gateAt[s.gate]].options[1].label}</span>`).join('')}${Object.keys(nodes).map(nodeHtml).join('')}<div class="finish-caption">把每一份支持，帶到投票日。</div></div>`;
  } else {
    // Keep the paper map mounted; an AI action updates tokens, not 52 roads.
    const gate = game.started ? gateAt[point] : null;
    const next = game.started ? (gate && game.human.routeChoices[gate] ? [game.human.routeChoices[gate]] : nodes[point].next) : [];
    for (const id of Object.keys(nodes)) {
      const node = document.getElementById(`map-${id}`), me = game.started && id === point;
      node.classList.toggle('here',me); node.classList.toggle('next-node',next.includes(id));
      if (me) node.setAttribute('aria-current','location'); else node.removeAttribute('aria-current');
      const tokens = node.querySelector('.tokens'), html = tokensAt(id);
      if (tokens.innerHTML !== html) tokens.innerHTML = html;
      const marker = node.querySelector('.you-marker');
      if (me && !marker) node.insertAdjacentHTML('beforeend','<span class="you-marker">你在這裡</span>');
      else if (!me && marker) marker.remove();
    }
    board.querySelectorAll('.road').forEach(road => {
      road.classList.toggle('chosen-road',!!(game.started && gateAt[road.dataset.from] && game.human.routeChoices[gateAt[road.dataset.from]] === road.dataset.to));
    });
  }
  document.getElementById('mapLocation').textContent = game.started ? `◎ ${game.human.name} · ${nodes[point].label}` : '準備出發 · 宣布參選';
  const stage = visualStages.findIndex(s => point === s.gate || s.left.includes(point) || s.right.includes(point));
  document.querySelectorAll('.stage-nav button').forEach((b,i) => { b.classList.toggle('active',i === stage); b.setAttribute('aria-current',i === stage ? 'step' : 'false'); });
  if (changed) { focusMapNode(point, false); lastMapNode = point; }
}
function focusMapNode(id, smooth = true) {
  const board = document.getElementById('board');
  board.scrollTo({ top: Math.max(0,mapCoordinates[id].y-board.clientHeight*.35), behavior: smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'instant' });
}
function renderTurn() {
  const phase = document.getElementById('phaseLabel');
  if (!game.started) return;
  const p = game.human;
  phase.textContent = game.finishing ? '最後一輪' : game.waitingRoute ? '選擇下一段路線' : p.finished ? '等待開票' : !document.getElementById('rollBtn').disabled ? '第一步 / 擲骰前進' : p.ap > 0 ? '第二步 / 競選行動' : '第三步 / 結束回合';
  document.getElementById('turnInfo').innerHTML = `第 <b>${game.round}</b> 輪 <span class="turn-divider">/</span> 行動點 <b>${p.ap} AP</b>`;
  document.getElementById('actionAp').textContent = `可用 ${p.ap} AP`;
}
function render() { renderPlayerCard(); renderIssuePanel(); renderActions(); renderRanking(); renderBoard(); renderTurn(); }
function addLog(msg, cls = '') {
  const log = document.getElementById('log'), row = document.createElement('div');
  row.className = cls; row.textContent = msg; log.appendChild(row); log.scrollTop = log.scrollHeight;
}
function showRouteModal(p,gate,meta) {
  document.getElementById('routeTitle').textContent = meta.title;
  document.getElementById('routePrompt').textContent = `${p.name} 必須決定下一段競選路線。`;
  const box = document.getElementById('routeChoices'); box.innerHTML = '';
  meta.options.forEach(o => {
    const b = document.createElement('button'); b.className = 'route-choice';
    const cat = routeCategory(o.id), m = cat ? issueStrategyMultiplier(p,cat) : 1;
    let hint = '';
    if (game.currentIssue && cat) {
      if (m >= 1.15) hint = `<br><span class="route-bonus">🔥 當前議題加成 ×${m.toFixed(2)}</span>`;
      else if (m < .98) hint = `<br><span class="route-risk">⚠️ 當前議題不利 ×${m.toFixed(2)}</span>`;
    }
    b.style.setProperty('--route-color',uiCategory(o.id).color);
    b.innerHTML = `<span class="route-icon" aria-hidden="true">${uiCategory(o.id).symbol}</span><b>${o.label}</b><span>${o.desc}${hint}</span><span class="choose-route">走這條路 →</span>`;
    b.onclick = () => { p.routeChoices[gate] = o.id; document.getElementById('routeModal').style.display = 'none'; game.waitingRoute = false; continueHumanMove(); if (!game.waitingRoute) document.getElementById('endTurnBtn').focus({preventScroll:true}); };
    box.appendChild(b);
  });
  document.getElementById('routeModal').style.display = 'flex';
  renderBoard(); renderTurn();
  box.firstElementChild.focus({preventScroll:true});
}

// Navigation and accessibility affect presentation only.
document.getElementById('stageNav').innerHTML = visualStages.map((s,i) => `<button data-stage="${i}" aria-label="瀏覽第${i+1}階段：${s.name}"><span>0${i+1}</span>${s.name}</button>`).join('');
document.querySelectorAll('.stage-nav button').forEach((b,i) => { b.onclick = () => focusMapNode(visualStages[i].gate); });
document.getElementById('focusBtn').onclick = () => focusMapNode(game.started ? game.human.node : 'c0');
document.getElementById('actionsJump').onclick = () => document.getElementById('actionPanel').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block:'start' });
const helpDialog = document.getElementById('helpDialog');
document.getElementById('helpBtn').onclick = () => helpDialog.showModal();
document.getElementById('closeHelp').onclick = document.getElementById('helpDone').onclick = () => helpDialog.close();
document.addEventListener('keydown', event => {
  const modal = [...document.querySelectorAll('.modal-backdrop')].find(m => m.style.display === 'flex');
  if (!modal || event.key !== 'Tab') return;
  const buttons = [...modal.querySelectorAll('button:not(:disabled)')];
  if (!buttons.length) return;
  const index = buttons.indexOf(document.activeElement);
  if (event.shiftKey && index <= 0) { event.preventDefault(); buttons.at(-1).focus(); }
  else if (!event.shiftKey && (index === -1 || index === buttons.length-1)) { event.preventDefault(); buttons[0].focus(); }
});
new MutationObserver(() => {
  if (document.getElementById('resultModal').style.display === 'flex') document.querySelector('#resultModal button').focus({preventScroll:true});
}).observe(document.getElementById('resultModal'),{attributes:true,attributeFilter:['style']});

function renderIssuePanel(){
  const text=document.getElementById("issueText"), heat=document.getElementById("issueHeat"), desc=document.getElementById("issueDesc"), effects=document.getElementById("issueEffects");
  if(!game.currentIssue){
    text.textContent="尚未形成焦點";heat.textContent="";desc.textContent="棋盤中段會抽出公共議題，改變策略與停留格收益；單一議題共鳴最高 ×1.50。";
    effects.innerHTML='<span class="issue-chip">目前尚無策略加成</span>';return;
  }
  const i=game.currentIssue;
  text.textContent=`${i.icon||"📰"} ${i.name}`;
  heat.textContent="🔥".repeat(i.heat||3);
  desc.textContent=i.desc;
  const labels={air:"空軍",ground:"陸軍",policy:"政策",attack:"攻擊"};
  const dummy=game.human||game.players?.[0];
  effects.innerHTML=Object.keys(labels).map(cat=>{
    const m=dummy?issueStrategyMultiplier(dummy,cat):(i.mult[cat]||1);
    const cls=m>=1.15?"good":m<.98?"bad":"";
    return `<span class="issue-chip ${cls}">${labels[cat]} ×${m.toFixed(2)}</span>`;
  }).join("")+`<span class="issue-chip ${issueAttackRisk()>1.25?"bad":""}">攻擊反噬 ×${issueAttackRisk().toFixed(2)}</span>`;
}
