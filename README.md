# 《候選人！》Candidate Game

瀏覽器上可直接玩的虛構政治競選策略桌遊原型。

目前版本：**Alpha 0.42**

## 目前能玩什麼

- 6 名虛構候選人
- 玩家 + 5 名 AI
- D6 擲骰移動
- 5 次主要路線分岔
- 空軍 / 陸軍 / 政策 / 攻擊四類競選策略
- 重大社會議題與「議題共鳴」
- 策略疲勞
- 資金、支持度、聲量、組織力、信任度、爭議值
- 負面攻擊與反噬
- 投票日結算

## 專案結構

```text
candidate-game/
├─ index.html
├─ css/
│  └─ style.css
├─ js/
│  ├─ data.js      # 候選人、議題、行動、路線文字
│  ├─ board.js     # 48 節點棋盤與連線
│  └─ game.js      # 規則、AI、狀態與 UI（下一階段再拆）
├─ legacy/
│  └─ alpha042-single-file.html
├─ docs/
│  ├─ GAME_DESIGN.md
│  ├─ CODEX_HANDOFF.md
│  └─ CODEX_FIRST_TASK.md
├─ tests/
│  └─ SMOKE_TEST.md
├─ AGENTS.md
├─ CHANGELOG.md
└─ README.md
```

## 本機執行

最簡單：直接開啟 `index.html`。

若瀏覽器對本機檔案有限制，可在專案根目錄執行：

```bash
python -m http.server 8000
```

然後開啟 `http://localhost:8000/`。

## GitHub Pages

這個版本沒有後端，可直接部署到 GitHub Pages。

1. 建立 GitHub repository。
2. 把整個資料夾 push 到 `main`。
3. Repository → Settings → Pages。
4. Source 選 `Deploy from a branch`。
5. Branch 選 `main`，資料夾選 `/ (root)`。
6. 儲存後等待 GitHub Pages 產生網站。

## 自動化測試

使用 Node.js 與 Playwright（僅開發測試依賴，遊戲仍可直接開啟 HTML）：

```bash
npm install
npx playwright install chromium
npm test
```

也可使用已安裝的 Edge，在 PowerShell 執行：

```powershell
$env:SMOKE_BROWSER_CHANNEL = 'msedge'
npm test
```

可用 `SMOKE_BROWSER_PATH` 指定瀏覽器執行檔。測試以真實無頭瀏覽器開啟本機 HTML，驗證載入與資料結構，並以固定種子逐步比對拆檔版和 legacy 的完整遊戲。下一個 PR 的拆分計畫見 `docs/REFACTOR_PLAN.md`。

## 下一階段工作

先不要大量增加規則。優先事項：

1. 確保拆檔後與 Alpha 0.42 行為一致。
2. 加入最基本的自動化 smoke tests。
3. 把 `game.js` 再拆成 state / rules / ai / ui。
4. 重新設計棋盤視覺。
5. 建立可重複執行的平衡模擬工具。
6. 才開始擴充事件牌與玩家回饋記錄。

詳細規則見 `docs/GAME_DESIGN.md`。
Codex 接手方式見 `docs/CODEX_HANDOFF.md`。
