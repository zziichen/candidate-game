/**
 * 《候選人！》Alpha 0.42 — game data
 * 純資料優先放在這裡：候選人、重大議題、路線描述、競選行動。
 * 平衡數值修改請同步記錄到 CHANGELOG.md。
 */
const issues = [
  {name:"居住與生活成本", keys:["econ"], icon:"🏠", desc:"住房、租屋與生活負擔成為焦點。", mult:{air:1.20,ground:1.10,policy:1.50,attack:.90}, attackRisk:1.35},
  {name:"薪資與就業", keys:["econ"], icon:"💼", desc:"工作機會、薪資與產業政策升溫。", mult:{air:1.30,ground:1.05,policy:1.45,attack:1.00}, attackRisk:1.20},
  {name:"少子化與托育", keys:["education","welfare"], icon:"👶", desc:"托育、教育負擔與青年家庭受到關注。", mult:{air:1.20,ground:1.40,policy:1.50,attack:.85}, attackRisk:1.50},
  {name:"高齡與長照", keys:["welfare"], icon:"👴", desc:"照顧、人力與高齡社會成為焦點。", mult:{air:1.05,ground:1.50,policy:1.40,attack:.90}, attackRisk:1.40},
  {name:"交通安全", keys:["safety"], icon:"🚦", desc:"道路、行人與公共運輸受到檢視。", mult:{air:1.10,ground:1.35,policy:1.45,attack:.95}, attackRisk:1.30},
  {name:"詐騙與數位安全", keys:["safety"], icon:"🛡️", desc:"詐騙、假訊息與資安議題升高。", mult:{air:1.25,ground:1.05,policy:1.45,attack:1.10}, attackRisk:1.35},
  {name:"能源與環境", keys:["environment","econ"], icon:"🌱", desc:"能源供給、環境與開發政策受到關注。", mult:{air:1.20,ground:1.10,policy:1.50,attack:.95}, attackRisk:1.25}
];


const candidateTemplates = [
  {id:"lin",name:"林阿城",title:"地方老將",quote:"每一條巷子，我都走過。",
   skills:{air:1,ground:4,policy:2,attack:3}, expertise:{econ:2,education:2,welfare:4,safety:3,environment:1},
   start:{support:32,funds:8,media:3,org:9,trust:6,controversy:2}, tint:"#84cc16"},
  {id:"xu",name:"許文哲",title:"政策學者",quote:"這題我有一份四十七頁的簡報。",
   skills:{air:2,ground:2,policy:4,attack:2}, expertise:{econ:3,education:4,welfare:2,safety:1,environment:2},
   start:{support:27,funds:7,media:4,org:4,trust:9,controversy:0}, tint:"#60a5fa"},
  {id:"xia",name:"夏薇",title:"媒體明星",quote:"先不要管內容，這支影片三百萬觀看了。",
   skills:{air:4,ground:1,policy:2,attack:3}, expertise:{econ:2,education:3,welfare:2,safety:2,environment:3},
   start:{support:28,funds:8,media:10,org:2,trust:5,controversy:3}, tint:"#f472b6"},
  {id:"jiang",name:"江一新",title:"改革素人",quote:"因為受夠了，所以我自己來。",
   skills:{air:3,ground:2,policy:3,attack:2}, expertise:{econ:2,education:3,welfare:2,safety:2,environment:3},
   start:{support:30,funds:5,media:6,org:3,trust:10,controversy:0}, tint:"#a78bfa"},
  {id:"gao",name:"高富民",title:"企業經理人",quote:"問題不是沒有錢，而是投資報酬率不夠好。",
   skills:{air:3,ground:1,policy:3,attack:3}, expertise:{econ:4,education:2,welfare:1,safety:3,environment:2},
   start:{support:25,funds:14,media:6,org:3,trust:5,controversy:2}, tint:"#f59e0b"},
  {id:"su",name:"蘇暖暖",title:"草根倡議者",quote:"先坐下來，我想聽你真正需要什麼。",
   skills:{air:2,ground:4,policy:3,attack:1}, expertise:{econ:1,education:3,welfare:4,safety:1,environment:3},
   start:{support:29,funds:5,media:3,org:7,trust:9,controversy:0}, tint:"#34d399"}
];


const routeMeta = {
  gate1:{title:"第一階段：先讓誰認識你？",
    options:[
      {id:"A1",label:"🔵 空軍線",desc:"較短。快速累積聲量，但較容易出現爭議。"},
      {id:"G1",label:"🟢 陸軍線",desc:"較長。累積組織、信任與地方支持。"}]},
  gate2:{title:"第二階段：政策，還是銀彈？",
    options:[
      {id:"P1",label:"🟡 政策線",desc:"較長。累積信任與議題優勢。"},
      {id:"F1",label:"💰 募款線",desc:"較短。取得競選資金，但直接得票較少。"}]},
  gate3:{title:"第三階段：要不要開戰？",
    options:[
      {id:"POS1",label:"⚪ 正面競選",desc:"較長、穩定，增加信任並降低爭議。"},
      {id:"NEG1",label:"🔴 負面攻擊",desc:"較短、高波動，可傷害領先對手但可能反噬。"}]},
  gate4:{title:"第四階段：全國曝光或地方深耕？",
    options:[
      {id:"D1",label:"🟣 辯論媒體",desc:"較短，高曝光、高變異。"},
      {id:"L1",label:"🟢 地方深耕",desc:"較長，組織與信任穩定成長。"}]},
  gate5:{title:"最後階段：空戰總攻或投票動員？",
    options:[
      {id:"B1",label:"🔵 最後空戰",desc:"較短、燒錢，將聲量換成支持。"},
      {id:"V1",label:"🟢 投票動員",desc:"較長，將組織力轉為投票日加成。"}]}
};


const actionDefs = [
 {id:"short",cat:"air",name:"社群短影音",ap:1,diff:6,cost:0,desc:"聲量＋3，成功時少量支持"},
 {id:"interview",cat:"air",name:"媒體專訪",ap:1,diff:7,cost:0,desc:"聲量＋2、信任＋2"},
 {id:"ads",cat:"air",name:"大型廣告",ap:1,diff:7,cost:3,desc:"聲量＋5、支持＋2"},
 {id:"canvass",cat:"ground",name:"市場掃街",ap:1,diff:6,cost:0,desc:"組織＋2、支持＋1"},
 {id:"community",cat:"ground",name:"社區座談",ap:1,diff:7,cost:0,desc:"信任＋2、組織＋2"},
 {id:"rally",cat:"ground",name:"大型造勢",ap:2,diff:8,cost:2,desc:"支持＋3、聲量＋3"},
 {id:"platform",cat:"policy",name:"發表政見",ap:1,diff:6,cost:0,desc:"信任＋1；命中熱門議題再加支持"},
 {id:"press",cat:"policy",name:"政策記者會",ap:1,diff:7,cost:1,desc:"信任＋2、聲量＋2"},
 {id:"debate",cat:"policy",name:"公開辯論",ap:2,diff:8,cost:0,desc:"高風險：支持＋3、信任＋3"},
 {id:"critique",cat:"attack",name:"政策質疑",ap:1,diff:6,cost:0,desc:"領先對手支持－2"},
 {id:"negative",cat:"attack",name:"負面攻勢",ap:1,diff:8,cost:2,desc:"領先對手支持－4，自己累積爭議"},
 {id:"leak",cat:"attack",name:"匿名爆料",ap:2,diff:9,cost:2,desc:"極高風險、高報酬"}
];

