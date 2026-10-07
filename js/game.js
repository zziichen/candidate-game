/**
 * 《候選人！》Alpha 0.42 — runtime / rules / AI / UI
 * 目前仍是單檔原型邏輯拆出的第一階段版本。
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

function showRouteModal(p,gate,meta){
  document.getElementById("routeTitle").textContent=meta.title;
  document.getElementById("routePrompt").textContent=`${p.name} 必須決定下一段競選路線。`;
  const box=document.getElementById("routeChoices");box.innerHTML="";
  meta.options.forEach(o=>{
    const b=document.createElement("button");b.className="route-choice";
    const cat=routeCategory(o.id);
    const m=cat?issueStrategyMultiplier(p,cat):1;
    let hint="";
    if(game.currentIssue && cat){
      if(m>=1.15)hint=`<br><span style="color:#86efac;font-weight:800">🔥 當前議題加成 ×${m.toFixed(2)}</span>`;
      else if(m<.98)hint=`<br><span style="color:#fca5a5;font-weight:800">⚠️ 當前議題不利 ×${m.toFixed(2)}</span>`;
    }
    b.innerHTML=`<b>${o.label}</b><span>${o.desc}${hint}</span>`;
    b.onclick=()=>{p.routeChoices[gate]=o.id;document.getElementById("routeModal").style.display="none";game.waitingRoute=false;continueHumanMove();};
    box.appendChild(b);
  });
  document.getElementById("routeModal").style.display="flex";
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

function renderCandidates(){
  const g=document.getElementById("candidateGrid");g.innerHTML="";
  candidateTemplates.forEach((c,i)=>{
    const b=document.createElement("button");b.className="candidate-btn"+(i===0?" selected":"");
    b.dataset.id=c.id;b.innerHTML=`<b>${c.name}</b><span>${c.title}<br>空${c.skills.air} 陸${c.skills.ground} 政${c.skills.policy} 攻${c.skills.attack}</span>`;
    b.onclick=()=>{if(game.started)return;document.querySelectorAll(".candidate-btn").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");showCandidate(c);};
    g.appendChild(b);
  });
  showCandidate(candidateTemplates[0]);
}
function showCandidate(c){
  const s=c.start;
  document.getElementById("playerCard").innerHTML=`
    <div style="margin-top:10px;padding:10px;border:1px solid #475569;border-radius:12px">
      <b>${c.name}・${c.title}</b><div class="small">「${c.quote}」</div>
      <div class="stats">
        <div class="stat">支持 <b>${s.support}</b></div><div class="stat">資金 <b>${s.funds}</b></div>
        <div class="stat">聲量 <b>${s.media}</b></div><div class="stat">組織 <b>${s.org}</b></div>
        <div class="stat">信任 <b>${s.trust}</b></div><div class="stat">爭議 <b>${s.controversy}</b></div>
      </div>
    </div>`;
}
function renderPlayerCard(){
  if(!game.started)return;
  const p=game.human,r=p.res;
  document.getElementById("playerCard").innerHTML=`
  <div style="margin-top:10px;padding:10px;border:1px solid #475569;border-radius:12px">
    <b>${p.name}・${p.title}</b><div class="small">位置：${nodes[p.node].label}</div>
    <div class="stats">
      <div class="stat">支持 <b>${r.support}</b></div><div class="stat">資金 <b>${r.funds}</b></div>
      <div class="stat">聲量 <b>${r.media}</b></div><div class="stat">組織 <b>${r.org}</b></div>
      <div class="stat">信任 <b>${r.trust}</b></div><div class="stat">爭議 <b>${r.controversy}</b></div>
    </div>
    <div class="skills">
      <div class="skill">空軍<br><b>${skillValue(p,"air")}</b></div><div class="skill">陸軍<br><b>${skillValue(p,"ground")}</b></div>
      <div class="skill">政策<br><b>${skillValue(p,"policy")}</b></div><div class="skill">攻擊<br><b>${skillValue(p,"attack")}</b></div>
    </div>
    <div class="small" style="margin-top:7px">動員標記：${p.mobilize}｜連續策略：${p.lastCategory||"無"} × ${p.streak}${p.tempSkillCat?`｜本回合臨時加成：${({air:"空軍",ground:"陸軍",policy:"政策",attack:"攻擊"})[p.tempSkillCat]} +1`:""}</div>
  </div>`;
}
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
function renderActions(){
  const box=document.getElementById("actions");box.innerHTML="";
  actionDefs.forEach(a=>{
    const b=document.createElement("button");b.className="action-btn";
    const names={air:"空軍",ground:"陸軍",policy:"政策",attack:"攻擊"};
    const m=game.started?issueStrategyMultiplier(game.human,a.cat):1;
    const risk=a.cat==="attack"&&game.currentIssue?issueAttackRisk():1;
    let note="";
    if(game.currentIssue && m>=1.15){b.classList.add("issue-hot");note=`<span class="action-bonus">🔥 ${game.currentIssue.name} 共鳴 ×${m.toFixed(2)}</span>`;}
    else if(game.currentIssue && m<.98){b.classList.add("issue-risk");note=`<span class="action-risk">⚠️ 議題錯位：效果 ×${m.toFixed(2)}</span>`;}
    if(a.cat==="attack"&&game.currentIssue&&risk>1.15){b.classList.add("issue-risk");note+=`<span class="action-risk">⚠️ 反噬爭議 ×${risk.toFixed(2)}</span>`;}
    b.innerHTML=`<span class="category">${names[a.cat]}</span><b>${a.name}</b><span>${a.ap}AP｜${a.cost?`資金${a.cost}｜`:""}難度${a.diff}<br>${a.desc}</span>${note}`;
    if(!game.started||game.current!==0||game.human.ap<=0||game.human.finished)b.disabled=true;
    b.onclick=()=>{doAction(game.human,a);render();};
    box.appendChild(b);
  });
}
function renderRanking(){
  const box=document.getElementById("ranking");
  const arr=[...game.players].sort((a,b)=>b.res.support-a.res.support);
  box.innerHTML=arr.map((p,i)=>`<div class="rank-row ${p.isHuman?"me":""}">
    <span class="token" style="background:${p.tint}">${i+1}</span>
    <span>${p.name}<br><span class="small">${nodes[p.node].label}</span></span>
    <b>${p.res.support}</b>
  </div>`).join("");
}
function tokensAt(id){
  if(!game.started)return "";
  return game.players.filter(p=>p.node===id).map(p=>`<span class="token ${p.isHuman?"player":""}" title="${p.name}" style="background:${p.tint}">${p.name[0]}</span>`).join("");
}
function nodeHtml(id){
  return `<div class="${nodes[id].type==="common"?"common-node":"route-node"}"><b>${nodes[id].label}</b><div class="tokens">${tokensAt(id)}</div></div>`;
}
function renderBoard(){
  const b=document.getElementById("board");
  b.innerHTML=`
    <div class="stage">${nodeHtml("c0")}${nodeHtml("c1")}${nodeHtml("c2")}</div>
    <div class="stage"><div class="route-grid">
      <div class="route"><h4>🔵 空軍線</h4>${["A1","A2","A3"].map(nodeHtml).join("")}</div>
      <div class="route"><h4>🟢 陸軍線</h4>${["G1","G2","G3","G4"].map(nodeHtml).join("")}</div>
    </div>${nodeHtml("c3")}${nodeHtml("c4")}</div>
    <div class="stage"><div class="route-grid">
      <div class="route"><h4>🟡 政策線</h4>${["P1","P2","P3","P4"].map(nodeHtml).join("")}</div>
      <div class="route"><h4>💰 募款線</h4>${["F1","F2","F3"].map(nodeHtml).join("")}</div>
    </div>${nodeHtml("c5")}${nodeHtml("c6")}</div>
    <div class="stage"><div class="route-grid">
      <div class="route"><h4>⚪ 正面競選</h4>${["POS1","POS2","POS3","POS4"].map(nodeHtml).join("")}</div>
      <div class="route"><h4>🔴 負面攻擊</h4>${["NEG1","NEG2","NEG3"].map(nodeHtml).join("")}</div>
    </div>${nodeHtml("c7")}${nodeHtml("c8")}</div>
    <div class="stage"><div class="route-grid">
      <div class="route"><h4>🟣 辯論媒體</h4>${["D1","D2","D3"].map(nodeHtml).join("")}</div>
      <div class="route"><h4>🟢 地方深耕</h4>${["L1","L2","L3","L4"].map(nodeHtml).join("")}</div>
    </div>${nodeHtml("c9")}</div>
    <div class="stage"><div class="route-grid">
      <div class="route"><h4>🔵 最後空戰</h4>${["B1","B2","B3"].map(nodeHtml).join("")}</div>
      <div class="route"><h4>🟢 投票動員</h4>${["V1","V2","V3","V4"].map(nodeHtml).join("")}</div>
    </div>${nodeHtml("c10")}${nodeHtml("c11")}${nodeHtml("c12")}</div>`;
}
function renderTurn(){
  if(!game.started){document.getElementById("turnInfo").textContent="尚未開始";return;}
  document.getElementById("turnInfo").innerHTML=`第 <b>${game.round}</b> 輪｜行動點 <b>${game.human.ap}</b>｜${game.finishing?"最後一輪":"選戰進行中"}`;
}
function render(){renderPlayerCard();renderIssuePanel();renderActions();renderRanking();renderBoard();renderTurn();}
function addLog(msg,cls=""){
  const l=document.getElementById("log"),d=document.createElement("div");d.className=cls;d.textContent=msg;l.appendChild(d);l.scrollTop=l.scrollHeight;
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
