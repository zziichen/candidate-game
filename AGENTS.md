# AGENTS.md

## Project

《候選人！》是一款瀏覽器單機策略桌遊原型。預設介面語言為繁體中文（zh-Hant）。

## Highest-priority rules

1. **先保持可玩，再重構。**
2. 不得在未說明的情況下修改遊戲平衡數值。
3. 每次改動平衡數值，更新 `CHANGELOG.md`。
4. 不得刪除或覆寫 `legacy/alpha042-single-file.html`。
5. 預設只使用虛構候選人、虛構政治背景；不要自行加入真實政治人物、政黨、選舉結果或宣傳內容。
6. 將資料、規則、AI、UI 逐步分離，不要重新塞回單一巨型檔案。
7. UI 文字維持臺灣繁體中文。
8. 手機與桌面版都必須可操作。

## Current architecture

- `js/data.js`: 候選人、議題、競選行動、路線描述等資料。
- `js/board.js`: 棋盤拓樸。
- `js/game.js`: 目前仍包含 state、rules、AI、UI；下一階段應逐步拆分。
- `legacy/`: 不動的安全版本。

## Before changing game rules

先閱讀：

- `docs/GAME_DESIGN.md`
- `CHANGELOG.md`

若需求只涉及視覺或程式結構，不要順便調整角色勝率或行動倍率。

## Required smoke checks after meaningful changes

至少確認：

1. 頁面載入沒有 JavaScript error。
2. 可以選擇六名候選人之一並開始遊戲。
3. 玩家可以擲骰移動。
4. 五個分岔都能正常選擇。
5. 重大議題能出現，議題共鳴提示能更新。
6. AP 行動可執行，資源會正確改變。
7. 五名 AI 能完成回合。
8. 第一位抵達投票日後能進入最後一輪。
9. 最終結果畫面能正常顯示。
10. 手機寬度下沒有主要操作被遮住。

## Coding preferences

- 優先小而可回滾的 commit。
- 新增數值時集中在資料/config 層。
- 避免魔術數字散落於 UI 函式中。
- AI 評分權重應集中管理並可被模擬工具讀取。
- 不要加入框架，除非有明確理由；目前 vanilla HTML/CSS/JS 足夠。

## First refactor target

在不改變 Alpha 0.42 遊戲行為的前提下，將 `js/game.js` 再拆為：

- `state.js`
- `rules.js`
- `ai.js`
- `ui.js`

並加入可重複執行的 smoke test / simulation harness。
