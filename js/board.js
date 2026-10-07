/**
 * 《候選人！》Alpha 0.42 — board topology
 * 棋盤節點與連線。避免在這裡放 UI 或 AI 決策邏輯。
 */
const nodes = {};
function N(id,label,type="common",effect=null){nodes[id]={id,label,type,effect,next:[]};}
function link(a,b){nodes[a].next.push(b)}
["c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","c10","c11","c12"].forEach((id,i)=>N(id,[
 "宣布參選","組成競選團隊","首輪募款","首輪民調","社會議題浮現","選戰升溫","中期民調","查核風暴","重大議題改變","突發新聞","封關民調","選前之夜","投票日"][i]));

[
 ["A1","社群首發"],["A2","媒體專訪"],["A3","話題曝光"],
 ["G1","市場掃街"],["G2","社區座談"],["G3","志工招募"],["G4","地方活動"],
 ["P1","議題研究"],["P2","發表政見"],["P3","專家背書"],["P4","政策記者會"],
 ["F1","募款活動"],["F2","支持團體"],["F3","競選資源擴張"],
 ["POS1","政策回應"],["POS2","事實查核"],["POS3","公開說明"],["POS4","跨群體對話"],
 ["NEG1","攻擊廣告"],["NEG2","匿名爆料"],["NEG3","網路攻防"],
 ["D1","辯論準備"],["D2","電視辯論"],["D3","媒體回響"],
 ["L1","家戶拜訪"],["L2","地方座談"],["L3","組織擴張"],["L4","地方議題承諾"],
 ["B1","大型廣告"],["B2","直播總攻"],["B3","催票短片"],
 ["V1","志工集結"],["V2","支持者聯絡"],["V3","家戶催票"],["V4","投票動員"]
].forEach(([id,label])=>N(id,label,"route"));

link("c0","c1"); link("c1","c2"); // gate1 at c2
link("c2","A1"); link("c2","G1");
link("A1","A2"); link("A2","A3"); link("A3","c3");
link("G1","G2"); link("G2","G3"); link("G3","G4"); link("G4","c3");
link("c3","c4"); // gate2 at c4
link("c4","P1"); link("c4","F1");
link("P1","P2"); link("P2","P3"); link("P3","P4"); link("P4","c5");
link("F1","F2"); link("F2","F3"); link("F3","c5");
link("c5","c6"); // gate3 at c6
link("c6","POS1"); link("c6","NEG1");
link("POS1","POS2"); link("POS2","POS3"); link("POS3","POS4"); link("POS4","c7");
link("NEG1","NEG2"); link("NEG2","NEG3"); link("NEG3","c7");
link("c7","c8"); // gate4 at c8
link("c8","D1"); link("c8","L1");
link("D1","D2"); link("D2","D3"); link("D3","c9");
link("L1","L2"); link("L2","L3"); link("L3","L4"); link("L4","c9");
// gate5 at c9
link("c9","B1"); link("c9","V1");
link("B1","B2"); link("B2","B3"); link("B3","c10");
link("V1","V2"); link("V2","V3"); link("V3","V4"); link("V4","c10");
link("c10","c11"); link("c11","c12");

const gateAt = {c2:"gate1",c4:"gate2",c6:"gate3",c8:"gate4",c9:"gate5"};

