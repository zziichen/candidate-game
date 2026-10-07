# 第一個 Codex 任務

請先完整閱讀 repository，尤其是：

- `AGENTS.md`
- `docs/GAME_DESIGN.md`
- `CHANGELOG.md`
- `legacy/alpha042-single-file.html`
- `index.html`
- `js/data.js`
- `js/board.js`
- `js/game.js`

## 任務

在**不改變 Alpha 0.42 遊戲規則、角色數值、路線收益與 UI 文案語意**的前提下：

1. 檢查拆檔版 `index.html` 是否與 legacy 單檔版行為一致。
2. 修正任何因拆檔造成的 JavaScript scope / load-order 問題。
3. 建立最小 smoke test，至少涵蓋：
   - 頁面成功載入
   - 六名候選人資料存在
   - 48 個棋盤節點存在
   - 五個主要 gate 存在
   - 12 種競選行動存在
4. 提出下一步把 `game.js` 拆成 state / rules / ai / ui 的計畫。
5. 第一個 PR **只做結構與測試，不調整平衡數值**。

完成後請回報：

- 修改的檔案
- 發現的 bug
- 測試結果
- 建議的第二個 PR 範圍
