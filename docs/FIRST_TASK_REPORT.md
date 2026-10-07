# 第一個任務完成報告

## 修改的檔案

- `index.html`：補上 classic script 共用 lexical scope 與載入順序註解；執行行為不變。
- `package.json`：新增 `npm test` 與 Playwright 測試依賴，不加入遊戲框架。
- `tests/smoke.cjs`：新增可重複執行的來源一致性、瀏覽器 smoke 與固定種子完整遊戲回歸測試。
- `tests/SMOKE_TEST.md`：說明自動化涵蓋範圍與手動視覺檢查界線。
- `README.md`：補上安裝與執行測試方式。
- `docs/REFACTOR_PLAN.md`：第二個 PR 的 state / rules / ai / ui 拆分計畫。
- `docs/FIRST_TASK_REPORT.md`：本報告。

## 發現與處理

未發現拆檔引入的 JavaScript scope 或 load-order bug。三個檔案以依序執行的 classic script 共用全域 lexical scope；頂層 const 不必掛在 window 上就能被後續 script 讀取。沒有改用 module、async 或 defer。

所有頂層資料、函式宣告及初始化程式與 legacy 一致；僅宣告順序、拆檔註解與空白不同。CSS 內容一致。原交接版的右上角建置文字與 legacy 不同（Alpha 0.42／Codex handoff build），是原有版本標記差異，本次未修改。

本次沒有修改 `js/data.js`、`js/board.js`、`js/game.js`、`css/style.css` 或 `legacy/alpha042-single-file.html`，所有遊戲規則及平衡數值保留。

## 測試結果

2026-10-05 使用 Node.js、Playwright 1.62.1 與無頭 Microsoft Edge 執行 `node tests/smoke.cjs`，退出碼 0。

- PASS：來源宣告、初始化、CSS 與載入順序比對。
- PASS：真實瀏覽器開啟頁面，沒有 JavaScript error 或資源載入失敗。
- PASS：6 名候選人、48 節點、5 個 gate／路線定義、12 種行動；gate 選項與棋盤連線一致。
- PASS：6 名角色 × 2 組選路方式 × 拆檔／legacy = 24 場完整遊戲（12 組對照）。以相同種子與操作逐步比對每次擲骰移動、AP 行動、AI 回合後的狀態、事件紀錄、議題／行動 UI 與最終結果。
- PASS：重大議題更新、進入最後一輪、六人最終排名。
- PASS：另外實際操作 5 個 gate × 2 選項。完整遊戲可能在玩家走完所有分岔前結束，因此分岔另行覆蓋。
- PASS：1440px 桌面、390px 手機；手機實際點擊路線選項，擲骰、結束回合與行動按鈕可捲動至畫面且寬度在 viewport 內。

測試不是勝率／平衡分析，也未窮舉所有亂數與操作。手機自動化檢查不取代所有裝置的人工視覺 QA。

## 建議第二個 PR

只拆分 state、rules、ai、ui，保留 game.js 作流程與啟動入口；逐步提交、每步跑 legacy 固定種子回歸。保持公式、AI 權重、亂數消耗順序與 UI 文案。規則層以 RNG／事件回呼作為未來無 DOM 模擬入口。具體移動範圍及依賴順序見 `REFACTOR_PLAN.md`。

原始交接僅提供 ZIP，沒有 Git remote；本次交付完成的本機專案供審閱與建立 PR，未建立遠端 PR。
