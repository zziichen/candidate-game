/**
 * 《候選人！》Alpha 0.42 — runtime / rules / AI
 * UI 已分離至 ui.js；遊戲規則與 AI 保留 Alpha 0.42 行為。
 * 後續建議由 Codex 再拆成 rules.js / ai.js / ui.js / state.js。
 */
const clamp=(v,min=0,max=99)=>Math.max(min,Math.min(max,v));
const d6=()=>1+Math.floor(Math.random()*6);
const rand=arr=>arr[Math.floor(Math.random()*arr.length)];


function newPlayer(t,isHuman=false){
  return {...t,isHuman,node:"c0",finished:false,finishOrder:null,
    res:{...t.start},routeChoices:{},ap:0,lastCategory:null,streak:0,
    policyReroll:true,paidBoost:true,groundSuccess:0,freeGround:false,mobilize:0,bonusAp:0,tempSkillCat:null,tempSkillBoost:0,xuPolicyBonusUsed:false,gaoPaidBonusUsed:false,jiangSwitchBonusUsed:false};
}
let game={started:false,players:[],human:null,current:0,round:1,currentIssue:null,flags:{},finishing:false,finalTurnsLeft:0,waitingRoute:false,pendingSteps:0};


function fatigueMultiplier(p,cat){
  if(p.lastCategory!==cat) return 1;
  const next=p.streak+1;
  return next<=2?1:next===3?.78:next===4?.60:next===5?.46:.34;
}
function applyGain(p,key,val,m=1){
  const diminishing = ["media","org","trust"].includes(key) ? Math.max(.45,1-(p.res[key]||0)/70) : 1;
  const v=Math.round(val*m*diminishing);
  p.res[key]=clamp((p.res[key]||0)+v,0,key==="funds"?50:99);
}
function currentExpertise(p){
  if(!game.currentIssue) return 2;
  const keys=game.currentIssue.keys||[];
  return Math.max(...keys.map(k=>p.expertise[k]||2),2);
}
function expertiseMod(p){
  const x=currentExpertise(p);
  return x>=4?1:x<=1?-1:0;
}
function issueStrategyMultiplier(p,cat){
  if(!game.currentIssue) return 1;
  const base=game.currentIssue.mult?.[cat] ?? 1;
  const heat=game.currentIssue.heat||3;
  let m=1+(base-1)*(heat/3);
  const exp=currentExpertise(p);
  if(cat!=="attack") m*=exp>=4?1.08:exp===3?1.04:exp===1?.96:1;
  return Math.max(.80,Math.min(1.50,m));
}
function issueAttackRisk(){
  if(!game.currentIssue) return 1;
  const heat=game.currentIssue.heat||3;
  const base=game.currentIssue.attackRisk||1;
  return Math.max(1,Math.min(1.50,1+(base-1)*(heat/3)));
}
function skillValue(p,cat){
  return p.skills[cat] + (p.tempSkillCat===cat ? (p.tempSkillBoost||0) : 0);
}
function routeCategory(routeId){
  if(/^A[1-3]$/.test(routeId)||/^B[1-3]$/.test(routeId))return "air";
  if(/^G[1-4]$/.test(routeId)||/^L[1-4]$/.test(routeId)||/^V[1-4]$/.test(routeId))return "ground";
  if(/^P[1-4]$/.test(routeId)||/^POS[1-4]$/.test(routeId)||/^D[1-3]$/.test(routeId))return "policy";
  if(/^NEG[1-3]$/.test(routeId))return "attack";
  return null;
}
function leader(except){
  return game.players.filter(x=>x!==except&&!x.finished).sort((a,b)=>b.res.support-a.res.support)[0] || game.players.find(x=>x!==except);
}
function doAction(p,a,ai=false){
  let apCost=a.ap, money=a.cost, diff=a.diff;
  if(a.cat==="ground" && p.freeGround){apCost=0;p.freeGround=false;}
  if(p.id==="gao" && a.cost>0 && p.paidBoost){ money=Math.max(0,money-1); diff-=1; p.paidBoost=false; }
  if(p.ap<apCost || p.res.funds<money) return false;
  p.ap-=apCost; p.res.funds-=money;
  const issueMult=issueStrategyMultiplier(p,a.cat);
  const switched=!!(p.lastCategory && p.lastCategory!==a.cat);
  const mult=fatigueMultiplier(p,a.cat) * (p.id==="jiang" && p.res.controversy<=3 && switched ? 1.10 : 1) * issueMult;
  const attackRisk=issueAttackRisk();
  if(p.lastCategory===a.cat) p.streak++; else {p.lastCategory=a.cat;p.streak=1;}
  let roll=d6(), total=roll+skillValue(p,a.cat)+(a.cat==="policy"?expertiseMod(p):0);
  let success=total>=diff;
  if(!success && p.id==="xu" && a.cat==="policy" && p.policyReroll){
    p.policyReroll=false; roll=d6(); total=roll+skillValue(p,"policy")+expertiseMod(p); success=total>=diff;
    addLog(`${p.name} 使用「政策專家」重骰。`, "info");
  }
  const tgt=leader(p);
  if(success){
    if(a.id==="short"){applyGain(p,"media",3,mult);applyGain(p,"support",1,mult);}
    if(a.id==="interview"){applyGain(p,"media",2,mult);applyGain(p,"trust",2,mult);}
    if(a.id==="ads"){applyGain(p,"media",5,mult);applyGain(p,"support",2*(p.id==="gao"?1.55:1),mult);}
    if(a.id==="canvass"){applyGain(p,"org",2,mult);applyGain(p,"support",1,mult);}
    if(a.id==="community"){applyGain(p,"trust",2,mult);applyGain(p,"org",2,mult);}
    if(a.id==="rally"){applyGain(p,"support",3,mult);applyGain(p,"media",3,mult);applyGain(p,"controversy",1,1);}
    if(a.id==="platform"){applyGain(p,"trust",1,mult); if(expertiseMod(p)>=0)applyGain(p,"support",expertiseMod(p)>0?2:1,mult);}
    if(a.id==="press"){applyGain(p,"trust",2,mult);applyGain(p,"media",2,mult);}
    if(a.id==="debate"){applyGain(p,"support",3,mult);applyGain(p,"trust",3,mult);}
    if(a.id==="critique" && tgt){tgt.res.support=clamp(tgt.res.support-Math.max(1,Math.round(2*mult)));applyGain(p,"media",1,mult);}
    if(a.id==="negative" && tgt){tgt.res.support=clamp(tgt.res.support-Math.max(1,Math.round(4*mult)));applyGain(p,"media",3,mult);applyGain(p,"controversy",2,attackRisk);}
    if(a.id==="leak" && tgt){tgt.res.support=clamp(tgt.res.support-Math.max(1,Math.round(6*mult)));applyGain(p,"media",4,mult);applyGain(p,"controversy",4,attackRisk);}
    if(p.id==="lin" && a.cat==="ground"){
      p.groundSuccess++;
      if(p.groundSuccess%3===0){
        if(p.res.org<10)applyGain(p,"org",1,1); else applyGain(p,"support",1,1);
      }
    }
    if(p.id==="xu" && a.cat==="policy" && !p.xuPolicyBonusUsed){
      p.xuPolicyBonusUsed=true;
      applyGain(p,"support",1,Math.min(1.15,issueMult));
    }
    if(p.id==="gao" && a.cost>0 && !p.gaoPaidBonusUsed){
      p.gaoPaidBonusUsed=true;
      applyGain(p,"support",3,1);
      applyGain(p,"media",1,1);
    }
    if(p.id==="jiang" && switched && p.res.controversy<=3 && !p.jiangSwitchBonusUsed){
      p.jiangSwitchBonusUsed=true;
      applyGain(p,"support",1,1);
    }
    if(p.id==="xia" && a.cat==="air"){applyGain(p,"media",2,1); if(p.res.media>=12)applyGain(p,"support",1,1);}
    if(p.id==="xia" && a.cat==="attack")applyGain(p,"controversy",1,attackRisk);
    if(p.id==="su" && a.cat==="ground"){
      p.groundSuccess++;
      if(p.groundSuccess%2===0)applyGain(p,"trust",1,1);
      if(p.groundSuccess%4===0)p.mobilize+=1;
    }
    const issueNote=game.currentIssue && Math.abs(issueMult-1)>.04 ? `｜議題效果 ×${issueMult.toFixed(2)}` : "";
    addLog(`${p.name}「${a.name}」成功（${roll}+${skillValue(p,a.cat)}）${issueNote}。`,"good");
  } else {
    if(a.id==="short")applyGain(p,"media",1,mult);
    if(a.id==="interview"){applyGain(p,"media",1,mult);p.res.trust=clamp(p.res.trust-1);}
    if(a.id==="ads")applyGain(p,"media",2,mult);
    if(a.id==="canvass"){}
    if(a.id==="community")applyGain(p,"trust",1,mult);
    if(a.id==="rally"){applyGain(p,"media",2,mult);applyGain(p,"controversy",1,1);}
    if(a.id==="debate"){p.res.trust=clamp(p.res.trust-2);applyGain(p,"media",2,mult);}
    if(a.id==="critique")p.res.trust=clamp(p.res.trust-1);
    if(a.id==="negative"){p.res.support=clamp(p.res.support-2);applyGain(p,"controversy",3,attackRisk);}
    if(a.id==="leak"){p.res.support=clamp(p.res.support-4);p.res.trust=clamp(p.res.trust-4);applyGain(p,"controversy",6,attackRisk);}
    addLog(`${p.name}「${a.name}」失敗（${roll}+${skillValue(p,a.cat)}）。`,"bad");
  }
  render();
  return true;
}

function nodeEffect(p,id,landing=false){
  // 共通節點是選戰時間軸：即使只是經過，也會觸發。
  if(id==="c1"){
    p.tempSkillCat=rand(["air","ground","policy","attack"]);
    p.tempSkillBoost=1;
    addLog(`${p.name} 組成競選團隊：本回合「${({air:"空軍",ground:"陸軍",policy:"政策",attack:"攻擊"})[p.tempSkillCat]}」能力 +1。`,"info");
  }
  if(id==="c2"){applyGain(p,"funds",2); addLog(`${p.name} 完成首輪募款，資金 +2。`,"good");}
  if(id==="c3"){if(p.res.media>=10)applyGain(p,"support",1); if(p.res.trust>=10)applyGain(p,"support",1);}
  if(id==="c4" && !game.flags.issue1){drawIssue();game.flags.issue1=true;}
  if(id==="c5"){
    p.bonusAp=(p.bonusAp||0)+1;
    addLog(`${p.name} 經過「選戰升溫」，本回合競選行動 +1 AP。`,"good");
  }
  if(id==="c6"){ if(p.res.support>=40)applyGain(p,"media",1); }
  if(id==="c7"){
    if(p.res.controversy>=5 && d6()<=Math.ceil(p.res.controversy/2)){
      p.res.trust=clamp(p.res.trust-3); addLog(`${p.name} 在查核風暴中遭到反噬，信任 -3。`,"bad");
    }
  }
  if(id==="c8" && !game.flags.issue2){drawIssue();game.flags.issue2=true;}
  if(id==="c9"){
    const r=d6();
    if(r<=2){applyGain(p,"media",2);addLog(`${p.name} 在突發新聞中意外獲得曝光。`,"good");}
    else if(r===6){p.res.controversy=clamp(p.res.controversy+2);addLog(`${p.name} 被突發新聞波及，爭議 +2。`,"bad");}
  }
  if(id==="c10"){addLog(`${p.name} 進入封關階段；後續資訊不再完全透明。`,"info");}
  if(id==="c11"){applyGain(p,"support",1);}

  // 一般路線格：只有「停下」才取得完整格子收益。
  if(!landing || nodes[id]?.type!=="route") return;

  const cat=routeCategory(id);
  const issueMult=cat ? issueStrategyMultiplier(p,cat) : 1;
  const attackRisk=issueAttackRisk();
  const simple={
    A1:{media:2}, A2:{media:2,trust:1}, A3:{media:3},
    G1:{support:1,org:1}, G2:{trust:1}, G3:{org:2}, G4:{support:1,org:1},
    P1:{trust:1}, P2:{trust:1,support:1}, P3:{trust:2}, P4:{trust:1,media:1},
    F1:{funds:3}, F2:{funds:4,controversy:1}, F3:{funds:2,media:1},
    POS1:{trust:1}, POS2:{trust:1,controversy:-1}, POS3:{trust:2}, POS4:{support:1,trust:1},
    L1:{support:1,org:1}, L2:{trust:1,org:1}, L3:{org:2}, L4:{trust:1,support:1},
    B2:{media:3}, B3:{media:2,support:1},
    V1:{org:1}, V2:{org:1}, V3:{org:1}, V4:{mobilize:2}
  };
  if(simple[id]){
    const e=simple[id];
    for(const [k,v] of Object.entries(e)){
      if(k==="mobilize")p.mobilize+=v;
      else if(v>=0){
        const m=(k==="funds"||k==="controversy")?1:issueMult;
        applyGain(p,k,v,m);
      }else p.res[k]=clamp(p.res[k]+v);
    }
    if(game.currentIssue && cat && Math.abs(issueMult-1)>.04){
      addLog(`${p.name} 停在「${nodes[id].label}」，取得議題共鳴 ×${issueMult.toFixed(2)}。`,"info");
    }
  }

  if(id==="NEG1"){
    const t=leader(p);
    if(t)t.res.support=clamp(t.res.support-Math.max(1,Math.round(2*issueMult)));
    applyGain(p,"media",2,issueMult);applyGain(p,"controversy",1,attackRisk);
  }
  if(id==="NEG2"){
    const t=leader(p),r=d6();
    if(r===1){
      p.res.support=clamp(p.res.support-3);p.res.trust=clamp(p.res.trust-3);
      applyGain(p,"controversy",3,attackRisk);
      addLog(`${p.name} 的匿名爆料被追查到來源！`,"bad");
    } else if(r>=4&&t){
      const loss=(r===6?5:3)*issueMult;
      t.res.support=clamp(t.res.support-Math.max(1,Math.round(loss)));
      if(r===6)applyGain(p,"media",3,issueMult);
    }
  }
  if(id==="NEG3"){
    const t=leader(p);if(t)t.res.media=clamp(t.res.media-Math.max(1,Math.round(2*issueMult)));
    applyGain(p,"media",2,issueMult);applyGain(p,"controversy",2,attackRisk);
  }
  if(id==="D1"){applyGain(p,"trust",1,issueMult);}
  if(id==="D2"){
    const r=d6()+skillValue(p,"policy")+expertiseMod(p);
    if(r>=7){
      applyGain(p,"support",3,issueMult);applyGain(p,"trust",2,issueMult);
      addLog(`${p.name} 在電視辯論表現亮眼。`,"good");
    } else {
      p.res.trust=clamp(p.res.trust-2);applyGain(p,"media",2,issueMult);
      addLog(`${p.name} 辯論失利，但聲量仍上升。`,"bad");
    }
  }
  if(id==="D3")applyGain(p,"media",2,issueMult);
  if(id==="B1"){
    if(p.res.funds>=2){
      p.res.funds-=2;applyGain(p,"media",4,issueMult);applyGain(p,"support",2,issueMult);
      addLog(`${p.name} 投入 2 資金進行選前大型廣告。`,"good");
    }else{
      applyGain(p,"media",1,issueMult);
      addLog(`${p.name} 想打大型廣告，但資金不足，只得到少量曝光。`,"bad");
    }
  }
  if(id==="V4")p.mobilize += Math.floor(p.res.org/8);
}
function drawIssue(){
  game.currentIssue={...rand(issues),heat:2+Math.floor(Math.random()*3)};
  renderIssuePanel();
  addLog(`📰 社會焦點轉為「${game.currentIssue.name}」，熱度 ${game.currentIssue.heat}/4。策略效果已改變。`,"info");
}

function chooseAiBranch(p,options){
  const ids=options.map(o=>o.id);
  const score=id=>{
    if(id==="A1")return skillValue(p,"air")*2+p.res.media/8;
    if(id==="G1")return skillValue(p,"ground")*2+p.res.org/8;
    if(id==="P1")return 2.0+skillValue(p,"policy")*1.00+(currentExpertise(p)-2)*.70;
    if(id==="F1")return 4.2+Math.max(0,10-p.res.funds)*.80+(p.id==="gao"?3.0:0);
    if(id==="POS1")return p.res.trust/8+(p.res.controversy>4?4:1)+(p.id==="su"?2:0);
    if(id==="NEG1")return skillValue(p,"attack")*2+(leader(p)?.res.support-p.res.support)/6;
    if(id==="D1")return skillValue(p,"policy")*2+p.res.media/12;
    if(id==="L1")return skillValue(p,"ground")*2+p.res.org/10;
    if(id==="B1")return skillValue(p,"air")*2+p.res.funds/4;
    if(id==="V1")return skillValue(p,"ground")*2+p.res.org/5;
    return 1;
  };
  const vals=ids.map(id=>{
    const cat=routeCategory(id);
    const issueBonus=cat?(issueStrategyMultiplier(p,cat)-1)*5:0;
    return Math.max(.5,score(id)+issueBonus+Math.random()*2);
  });
  return ids[vals.indexOf(Math.max(...vals))];
}

function nextNodeFor(p){
  const n=nodes[p.node];
  if(n.next.length<=1)return n.next[0]||null;
  const gate=gateAt[p.node], meta=routeMeta[gate];
  if(p.routeChoices[gate])return p.routeChoices[gate];
  if(!p.isHuman){
    const choice=chooseAiBranch(p,meta.options);p.routeChoices[gate]=choice;return choice;
  }
  game.waitingRoute=true;
  showRouteModal(p,gate,meta);
  return null;
}

function moveOneStep(p,landing=false){
  const nxt=nextNodeFor(p);
  if(!nxt)return false;
  p.node=nxt;
  nodeEffect(p,nxt,landing);
  if(nxt==="c12"&&!p.finished){
    p.finished=true;p.finishOrder=1+game.players.filter(x=>x.finished&&x!==p).length;
    addLog(`🏁 ${p.name} 抵達投票日（第 ${p.finishOrder} 位）。`,"info");
    if(!game.finishing){game.finishing=true;game.finalTurnsLeft=game.players.length;addLog("第一位候選人抵達終點：進入最後一輪！","info");}
  }
  return true;
}

function continueHumanMove(){
  const p=game.human;
  while(game.pendingSteps>0 && !p.finished){
    const landing=game.pendingSteps===1;
    const ok=moveOneStep(p,landing);
    if(!ok)return;
    game.pendingSteps--;
  }
  if(game.pendingSteps<=0||p.finished)afterHumanMove();
  render();
}

function humanRoll(){
  if(!game.started||game.current!==0||game.waitingRoute)return;
  const p=game.human,r=d6();game.pendingSteps=r;
  addLog(`🎲 ${p.name} 擲出 ${r}。`,"info");
  document.getElementById("rollBtn").disabled=true;
  continueHumanMove();
}
function afterHumanMove(){
  const p=game.human;p.ap=p.finished?0:(3+(p.bonusAp||0));p.bonusAp=0;p.policyReroll=true;p.paidBoost=true;p.xuPolicyBonusUsed=false;p.gaoPaidBonusUsed=false;p.jiangSwitchBonusUsed=false;
  if(!p.finished)addLog(`${p.name} 現在有 ${p.ap} 點競選行動。`,"info");
  document.getElementById("endTurnBtn").disabled=false;
  render();
}

function aiChooseAction(p){
  const affordable=actionDefs.filter(a=>{
    let c=a.cost,ap=a.ap;if(p.id==="gao"&&c>0&&p.paidBoost)c=Math.max(0,c-1);
    if(a.cat==="ground"&&p.freeGround)ap=0;
    return ap<=p.ap&&c<=p.res.funds;
  });
  if(!affordable.length)return null;
  const lead=leader(p), behind=lead?lead.res.support-p.res.support:0;
  const weight=a=>{
    let w=skillValue(p,a.cat)*2;
    if(a.cat==="policy"&&game.currentIssue)w+=currentExpertise(p);
    if(a.cat==="attack")w+=behind>5?4:-1;
    if(a.cat==="air"&&p.res.media<18)w+=2;
    if(a.cat==="ground"&&p.res.org<16)w+=2;
    if(a.cost>p.res.funds/2)w-=2;
    if(p.lastCategory===a.cat&&p.streak>=2)w-=3;
    if(p.id==="gao"&&a.cost>0)w+=2;
    if(p.id==="su"&&a.cat==="attack")w-=4;
    w+=(issueStrategyMultiplier(p,a.cat)-1)*8;
    if(a.cat==="attack"&&game.currentIssue)w-=(issueAttackRisk()-1)*4;
    return w+Math.random()*3;
  };
  return affordable.sort((a,b)=>weight(b)-weight(a))[0];
}

function aiTurn(p){
  if(!p.finished){
    const r=d6();addLog(`🎲 ${p.name} 擲出 ${r}。`);
    for(let i=0;i<r&&!p.finished;i++)moveOneStep(p,i===r-1);
    p.ap=3+(p.bonusAp||0);p.bonusAp=0;p.policyReroll=true;p.paidBoost=true;p.xuPolicyBonusUsed=false;p.gaoPaidBonusUsed=false;p.jiangSwitchBonusUsed=false;p.xuPolicyBonusUsed=false;p.gaoPaidBonusUsed=false;p.jiangSwitchBonusUsed=false;
    let safety=8;
    while(p.ap>0&&safety-->0){
      const a=aiChooseAction(p);if(!a)break;
      if(!doAction(p,a,true))break;
    }
    p.tempSkillCat=null;p.tempSkillBoost=0;
  }
}

function endHumanTurn(){
  document.getElementById("endTurnBtn").disabled=true;
  game.human.tempSkillCat=null;game.human.tempSkillBoost=0;
  game.current=1;
  for(let i=1;i<game.players.length;i++){
    aiTurn(game.players[i]);
    if(game.finishing)game.finalTurnsLeft--;
  }
  if(game.finishing)game.finalTurnsLeft--; // human turn
  if(game.finishing && game.finalTurnsLeft<=0){finishGame();return;}
  game.round++;
  game.current=0;
  if(!game.human.finished){
    game.human.ap=0;game.human.policyReroll=true;game.human.paidBoost=true;
    document.getElementById("rollBtn").disabled=false;
  }else{
    // if human already finished, let AIs continue as pseudo-round
    let guard=20;
    while(game.finishing&&game.finalTurnsLeft>0&&guard-->0){
      for(let i=1;i<game.players.length&&game.finalTurnsLeft>0;i++){aiTurn(game.players[i]);game.finalTurnsLeft--;}
    }
    finishGame();return;
  }
  render();
}

function finalScore(p){
  const media=Math.floor(Math.sqrt(p.res.media)*1.15);
  const org=Math.floor(Math.sqrt(p.res.org)*1.35);
  const trust=Math.floor(Math.sqrt(p.res.trust)*1.25);
  const cont=Math.floor(p.res.controversy/4);
  const issue=game.currentIssue ? Math.max(0,currentExpertise(p)-2) : 0;
  return p.res.support+media+org+trust+p.mobilize+issue-cont+d6();
}
function finishGame(){
  const results=game.players.map(p=>({p,score:finalScore(p)})).sort((a,b)=>b.score-a.score);
  const box=document.getElementById("finalResults");
  box.innerHTML=`<p class="winner">🏆 ${results[0].p.name} 當選！</p>`+results.map((r,i)=>
    `<div class="rank-row ${r.p.isHuman?"me":""}"><b>${i+1}</b><span>${r.p.name}・${r.p.title}</span><b>${r.score}</b></div>`).join("")+
    `<p class="small">最終分＝支持度＋聲量／組織／信任遞減加成＋動員＋議題優勢－爭議懲罰＋D6。</p>`;
  document.getElementById("resultModal").style.display="flex";
}

function startGame(){
  const sel=document.querySelector(".candidate-btn.selected")?.dataset.id || "lin";
  const chosen=candidateTemplates.find(c=>c.id===sel);
  const rest=candidateTemplates.filter(c=>c.id!==sel);
  game={started:true,players:[newPlayer(chosen,true),...rest.map(c=>newPlayer(c,false))],human:null,current:0,round:1,currentIssue:null,flags:{},finishing:false,finalTurnsLeft:0,waitingRoute:false,pendingSteps:0};
  game.human=game.players[0];
  document.getElementById("log").innerHTML="";
  document.getElementById("issueText").textContent="尚未形成焦點";
  document.getElementById("issueHeat").textContent="";
  document.getElementById("issueDesc").textContent="棋盤中段會抽出公共議題，改變策略與停留格收益；單一議題共鳴最高 ×1.50。";
  document.getElementById("issueEffects").innerHTML='<span class="issue-chip">目前尚無策略加成</span>';
  document.getElementById("rollBtn").disabled=false;
  document.getElementById("startBtn").disabled=true;
  document.querySelectorAll(".candidate-btn").forEach(b=>b.disabled=true);
  addLog(`🎙️ ${chosen.name} 宣布參選。其餘五名候選人由 AI 操作。`,"info");
  render();
}

document.getElementById("startBtn").onclick=startGame;
document.getElementById("resetBtn").onclick=()=>location.reload();
document.getElementById("rollBtn").onclick=humanRoll;
document.getElementById("endTurnBtn").onclick=endHumanTurn;

renderCandidates();
renderBoard();
renderIssuePanel();
renderActions();
