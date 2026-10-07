/** Display-only coordinates and colors. Never used by movement or scoring. */
const visualCategories = {
  air: { label: '空軍', color: '#487da1', symbol: '↗' },
  ground: { label: '陸軍', color: '#437f69', symbol: '⌂' },
  policy: { label: '政策', color: '#9b7b30', symbol: '▤' },
  attack: { label: '攻擊', color: '#ba5546', symbol: '⚡' },
  funds: { label: '募款', color: '#9b7b30', symbol: '$' },
  common: { label: '時間軸', color: '#69777b', symbol: '◆' }
};
const visualStages = [
  { name: '建立聲勢', gate: 'c2', end: 'c3', y: 270, left: ['A1','A2','A3'], right: ['G1','G2','G3','G4'] },
  { name: '提出主張', gate: 'c4', end: 'c5', y: 650, left: ['P1','P2','P3','P4'], right: ['F1','F2','F3'] },
  { name: '正面交鋒', gate: 'c6', end: 'c7', y: 1030, left: ['POS1','POS2','POS3','POS4'], right: ['NEG1','NEG2','NEG3'] },
  { name: '深入街區', gate: 'c8', end: 'c9', y: 1410, left: ['D1','D2','D3'], right: ['L1','L2','L3','L4'] },
  { name: '最後衝刺', gate: 'c9', end: 'c10', y: 1710, left: ['B1','B2','B3'], right: ['V1','V2','V3','V4'] }
];
const mapCoordinates = Object.fromEntries([
  ['c0',320,72], ['c1',320,145], ['c2',320,222],
  ['c3',320,530], ['c4',320,602], ['c5',320,910], ['c6',320,982],
  ['c7',320,1290], ['c8',320,1362], ['c9',320,1662],
  ['c10',320,1970], ['c11',320,2043], ['c12',320,2120]
].map(([id,x,y]) => [id,{x,y}]));
visualStages.forEach(stage => {
  for (const [ids, x] of [[stage.left,172],[stage.right,468]]) {
    ids.forEach((id,i) => { mapCoordinates[id] = { x, y: stage.y + 48 + i * (stage.gate === 'c8' ? 50 : 52) }; });
  }
});
