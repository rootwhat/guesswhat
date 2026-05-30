# Guess What — 純策略競標卡牌對戰

一款以 **Vue 3 + Phosphor Icons** 打造的雙人競標卡牌遊戲。
其玩法是經典賽局理論問題 **Goofspiel / GOPS（Game of Pure Strategy）** 的變體。

![mode](https://img.shields.io/badge/Vue-3-42b883) ![icons](https://img.shields.io/badge/Phosphor-Icons-7c5cff)

## 🎮 遊戲規則

- 雙方各持有 **1～10 共 10 張手牌**，每張只能使用一次。
- 共 **10 輪**，每輪揭示一個 **競標分數**（1～10，全程不重複）。
- 雙方 **同時暗出一張手牌**，數字大者贏得該輪競標分數；平手則平分。
- 10 輪結束後，**總分高者獲勝**（競標分數總和恆為 55）。

## ✨ 兩大模式

| 模式 | 說明 |
| --- | --- |
| **AI 模式** | 與內建賽局 AI 對戰，提供「輕鬆／普通／困難／大師」四種難度。AI 在**看不到你本輪出牌**的前提下，逼近賽局理論上的最佳解。 |
| **對決模式** | 連線到對決伺服器，**自動配對**一位真人對手即時 1v1。伺服器為權威端，雙方都出牌後才公開對手選擇，杜絕偷看。 |

## 🚀 快速開始

```bash
npm install

# 1) 啟動前端（Vite 開發伺服器，預設 http://localhost:5173）
npm run dev

# 2) 若要玩「對決模式」，另開一個終端機啟動配對伺服器（WebSocket，預設埠 8787）
npm run server

# 或一行同時啟動前端 + 伺服器
npm start
```

> 開發環境下，Vite 會把前端的 `/ws` 代理到 `ws://localhost:8787`。
> 正式部署時，把網站與 WebSocket 伺服器放在同源（或調整 `useOnlineGame.js` 的連線位址）即可。

其他指令：

```bash
npm run build     # 打包正式版到 dist/
npm test          # 執行單元測試（引擎、賽局求解器、AI）
```

### 🌐 GitHub Pages 部署

專案已內建 `.github/workflows/deploy.yml`，推送後會自動建置並部署到 GitHub Pages。
**一次性設定**：到 repo 的 *Settings → Pages → Build and deployment → Source* 選擇 **GitHub Actions** 即可。
網址會是 `https://<owner>.github.io/guesswhat/`。

> ⚠️ GitHub Pages 為純靜態托管，**只有 AI 模式可完整遊玩**；
> 「對決模式」需要 WebSocket 後端（`npm run server`），請另行部署於支援長連線的服務（如 Render、Railway、Fly.io 等）並調整連線位址。

## 🧠 AI 演算法（重點）

需求是「在不知道對手出牌的情況下的最佳解，並包含大量進階判斷與預測」。
本遊戲每一輪是 **同時出牌的不完全資訊賽局**，整體又是一棵依「競標分數揭示順序」隨機展開的延展式賽局。
真正的最佳解需要對每個資訊集求 **Nash 均衡**——由於是零和，可化為求解矩陣賽局。

AI（`src/game/ai.js`）採用 **三層策略**，依剩餘回合數與難度切換，兼顧最佳性與即時運算：

1. **精確子賽局求解（殘局）**
   當剩餘回合數 ≤ `exactDepth` 時，以 **記憶化遞迴** 完整展開子賽局；
   每個節點都對「下一張被揭示的競標分數」取均勻期望，並解一個零和矩陣賽局，
   得到該局面的 **賽局值** 與 **均衡混合策略**。這在殘局是貨真價實的最佳解。

2. **深度受限的均衡近似（中盤）**
   手牌仍多時搜尋樹過大，改用 **一層前瞻**：
   `payoff[i][j] = 本輪立即收益 + 啟發式評估剩餘局面`，
   再對此矩陣求零和均衡，得到 **混合策略**（而非貪婪選擇），避免被對手讀死。
   啟發式評估將雙方剩餘手牌與剩餘分數由大到小對齊比較，估計未來期望分差。

3. **對手建模與安全剝削（預測）**
   觀察對手歷史「出牌相對於競標分數的積極程度」，以高斯模型預測其本輪出牌分布；
   對該預測做最佳反應後，與 Nash 策略做凸組合：
   `最終策略 = (1−λ)·Nash + λ·最佳反應`。
   λ 隨樣本數成長但設有上限——即使對手是高手，我方仍 **接近不可被剝削**；
   一旦對手出現可乘之機（例如總是高估或低估），便會被逐步看穿並利用。

此外加入 **分數情勢調整**：大幅領先時略為保守、落後時略為冒險以提高翻盤機率。

### 矩陣賽局求解器

`src/game/matrixGame.js` 以 **虛擬對局（Fictitious Play）** 逼近二人零和賽局的 Nash 均衡——
兩位玩家輪流對「對手歷史經驗分布」做最佳反應，其平均策略收斂到均衡。
選它而非線性規劃是因為：純 JS、無外部相依、且對本遊戲的小型矩陣（≤10×10）收斂快速。

### 效能與強度（實測）

- 單次決策耗時：4 張 ≈ 30ms、5 張 ≈ 200ms、6 張 ≈ 1.9s（精確求解上限鎖在 6 張以保證流暢）。
- 「困難」對上「出牌=競標分數」啟發式對手約 **61%** 勝率、對上隨機對手約 **79%** 勝率。
- 兩個近均衡 AI 互打時結果趨近賽局值（接近平手）——這正是零和賽局的理論預期；
  剝削層的優勢主要展現在面對「不完美 / 真人」對手時。

## 🗂️ 專案結構

```
src/
  game/
    engine.js       # 純函式遊戲規則與結算（含測試）
    matrixGame.js   # 二人零和賽局求解器（Fictitious Play）
    ai.js           # 進階競標 AI（三層策略 + 對手建模）
    game.test.js    # 單元測試
  composables/
    useOnlineGame.js # 對決模式 WebSocket 客戶端
  components/
    HomeMenu.vue PlayCard.vue ScoreBoard.vue PrizeDisplay.vue
    RoundLog.vue ResultModal.vue AIBoard.vue OnlineBoard.vue
  App.vue main.js style.css
server/
  index.js          # 對決模式權威伺服器（自動配對 + 回合中繼）
```

## 🛠️ 技術棧

Vue 3（`<script setup>`）、Vite、Phosphor Icons（`@phosphor-icons/vue`）、
Node + `ws`（對決伺服器）、Vitest（測試）。
