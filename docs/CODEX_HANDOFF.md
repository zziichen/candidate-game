# CODEX HANDOFF

## 你接手的是什麼

目前已有一個可玩的 Alpha 0.42 單機網頁遊戲。

`legacy/alpha042-single-file.html` 是交接時確認可玩的安全版本。
根目錄 `index.html` 則已把 CSS 與 JavaScript 第一階段拆檔，方便後續維護。

## 不要一開始做的事

- 不要立刻新增多人連線。
- 不要立刻換 React / Vue / Next.js。
- 不要一次加入幾十張事件卡。
- 不要自行重新設計六名候選人的數值。
- 不要加入真實政治人物或政黨。

## 第一階段目標

1. 比對 `index.html` 與 legacy 版本，確保遊戲行為一致。
2. 建立基本 smoke test。
3. 再把 `game.js` 依職責拆開。
4. 建立 simulation harness，讓平衡測試與瀏覽器遊戲共用同一份資料與規則。
5. 才開始棋盤視覺重做。

## 建議未來結構

```text
js/
├─ data/
│  ├─ candidates.js
│  ├─ issues.js
│  ├─ actions.js
│  └─ board-data.js
├─ state.js
├─ rules.js
├─ ai.js
├─ board.js
├─ ui.js
├─ game.js
└─ simulation.js
```

不必一次完成。每次小步重構並跑 smoke checks。
