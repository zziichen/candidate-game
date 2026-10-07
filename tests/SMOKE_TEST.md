# Smoke Test Checklist

每次重大改動至少走一次。

自動化：先依 README 安裝測試依賴，執行 `npm test`（`tests/smoke.cjs`）。
涵蓋真實頁面載入、資料數量與連線、六名角色開始遊戲、骰子移動、AP 行動、五名 AI、重大議題、最後一輪與結果。
固定種子的 12 組完整遊戲逐步比對 legacy；另測五個 gate 的兩個選項及桌面／390px 手機操作。
街頭選戰介面新增 `tests/layout.cjs`，涵蓋 1440／1024／768／390／320px。來源比對保留非 UI 的資料、規則、AI 與回合流程；完整遊戲比較狀態與提示語意，呈現 HTML/CSS 允許不同。
手機檢查包含路線按鈕實際點擊及主要控制項寬度；完整視覺 QA 仍可依以下清單手動執行。

## 靜態
- [ ] `index.html` 可以開啟。
- [ ] console 沒有 JavaScript error。
- [ ] `candidateTemplates.length === 6`
- [ ] `Object.keys(nodes).length === 48`
- [ ] `Object.keys(routeMeta).length === 5`
- [ ] `actionDefs.length === 12`

## 玩家流程
- [ ] 任選候選人後可開始。
- [ ] D6 可擲骰。
- [ ] 棋子可以移動。
- [ ] 五次分岔均可操作。
- [ ] 重大議題會出現。
- [ ] 議題共鳴倍率會反映在行動按鈕。
- [ ] 行動會消耗 AP / 資金。
- [ ] 策略疲勞會降低連續同類行動收益。
- [ ] 攻擊可能成功，也可能反噬。
- [ ] AI 能完整完成回合。
- [ ] 能抵達投票日。
- [ ] 第一位抵達後會進最後一輪。
- [ ] 最終排名可顯示。

## 回歸
- [ ] `legacy/alpha042-single-file.html` 不受影響。
