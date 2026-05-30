/**
 * ai.js — 進階競標 AI（Goofspiel / GOPS 的近似最佳解）
 *
 * 設計目標：在「不知道對手本輪出牌」的前提下，做出賽局理論上接近最佳的決策。
 * 本遊戲每一輪是同時出牌的不完全資訊賽局，整體又是一棵隨機(揭示順序)的延展式賽局。
 * 真正的最佳解需要對每個資訊集求 Nash 均衡（零和 → 可用線性規劃/虛擬對局）。
 *
 * 我們用三層策略，依「剩餘回合數」與難度切換，兼顧最佳性與即時運算：
 *
 *  1) 精確子賽局求解 (Exact subgame solving)
 *     - 當剩餘回合數 ≤ exactDepth 時，以記憶化遞迴展開整棵子賽局，
 *       每個節點都解一個零和矩陣賽局，取得「該局的賽局值」與「均衡混合策略」。
 *     - 這在殘局是貨真價實的最佳解（含對手最佳反應、未來期望值）。
 *
 *  2) 深度受限的均衡近似 (Depth-limited equilibrium)
 *     - 殘局以外（手牌多、搜尋樹過大）改用一層前瞻：
 *       payoff[i][j] = 本輪立即收益 + 啟發式評估剩餘局面 (estimateFutureDiff)。
 *     - 再對這個矩陣解零和均衡，得到「混合策略」而非貪婪選擇，避免被對手讀死。
 *
 *  3) 對手建模與安全剝削 (Opponent modeling & safe exploitation)
 *     - 觀察對手歷史「出牌相對於競標分數的積極程度」，預測其本輪出牌分布。
 *     - 對該預測算最佳反應，再與 Nash 策略做凸組合：(1-λ)·Nash + λ·BestResponse。
 *     - λ 隨樣本數成長但設上限，確保「就算對手是高手，我方仍接近不可被剝削」。
 *
 *  另外加入「分數情勢調整」：大幅領先時略為保守、落後時略為冒險（提高翻盤機率）。
 */

import { solveZeroSumGame, sampleIndex } from './matrixGame.js'

// 難度預設參數
// exactDepth：剩餘回合數 ≤ 此值時做「精確子賽局求解」（成本隨深度急遽上升）。
// 實測單次決策耗時：4 張≈30ms、5 張≈200ms、6 張≈1.9s、7 張≈17s。
// 因此精確求解上限硬性鎖在 6（見 SAFE_MAX_EXACT），避免介面卡頓。
export const DIFFICULTY = {
  easy: { label: '輕鬆', exactDepth: 2, fpIters: 150, modeling: 0.0, noise: 0.55, scoreAware: 0 },
  normal: { label: '普通', exactDepth: 4, fpIters: 300, modeling: 0.25, noise: 0.12, scoreAware: 0.3 },
  hard: { label: '困難', exactDepth: 5, fpIters: 500, modeling: 0.45, noise: 0.0, scoreAware: 0.6 },
  insane: { label: '大師', exactDepth: 6, fpIters: 500, modeling: 0.6, noise: 0.0, scoreAware: 0.8 }
}

// 精確求解的硬性上限：保護介面不被超大搜尋樹卡死
const SAFE_MAX_EXACT = 6

// 位元遮罩工具：手牌/競標分數皆為 1~10，用 bit (value) 表示集合
const bit = (v) => 1 << v
const hasCard = (mask, v) => (mask & bit(v)) !== 0
function maskOf(values) {
  let m = 0
  for (const v of values) m |= bit(v)
  return m
}
function cardsOf(mask) {
  const out = []
  for (let v = 1; v <= 10; v++) if (hasCard(mask, v)) out.push(v)
  return out
}
function popcount(mask) {
  let c = 0
  while (mask) {
    mask &= mask - 1
    c++
  }
  return c
}

/**
 * 啟發式：估計從目前局面到結束，我方相對對手的期望分差。
 * 直覺：把雙方剩餘手牌與剩餘競標分數由大到小對齊，
 * 逐位比較「誰的牌較大」來推測誰較可能拿下該分數，再以 0.5 阻尼反映不確定性。
 * 當雙方手牌相同 → 估計為 0（對稱），符合理論。
 */
function estimateFutureDiff(myMask, oppMask, prizeMask) {
  const prizes = cardsOf(prizeMask).sort((a, b) => b - a)
  if (prizes.length === 0) return 0
  const mine = cardsOf(myMask).sort((a, b) => b - a)
  const opp = cardsOf(oppMask).sort((a, b) => b - a)
  let diff = 0
  for (let k = 0; k < prizes.length; k++) {
    const mc = mine[k] ?? 0
    const oc = opp[k] ?? 0
    diff += prizes[k] * 0.5 * Math.sign(mc - oc)
  }
  return diff
}

/**
 * 精確子賽局求解（記憶化）。回傳該局面下「我方視角」的賽局值與均衡策略。
 * 僅在剩餘回合數 ≤ exactDepth 時呼叫，否則搜尋樹過大。
 *
 * @returns {{ value:number, cards:number[], strategy:number[] }}
 */
function solveExact(myMask, oppMask, prizeMask, current, ctx) {
  const myCards = cardsOf(myMask)
  const oppCards = cardsOf(oppMask)
  const key = `${myMask}|${oppMask}|${prizeMask}|${current}`
  const cached = ctx.memo.get(key)
  if (cached) return cached

  const n = myCards.length
  const m = oppCards.length
  const payoff = Array.from({ length: n }, () => new Array(m).fill(0))

  const futurePrizes = cardsOf(prizeMask)

  for (let i = 0; i < n; i++) {
    const myCard = myCards[i]
    const childMy = myMask & ~bit(myCard)
    for (let j = 0; j < m; j++) {
      const oppCard = oppCards[j]
      const childOpp = oppMask & ~bit(oppCard)

      // 本輪立即收益（平手 → 0）
      let immediate = 0
      if (myCard > oppCard) immediate = current
      else if (myCard < oppCard) immediate = -current

      // 未來期望：對「下一張被揭示的競標分數」取均勻期望，遞迴求最佳對局值
      let future = 0
      if (futurePrizes.length > 0) {
        for (const nextPrize of futurePrizes) {
          const childPrizeMask = prizeMask & ~bit(nextPrize)
          future += solveExact(childMy, childOpp, childPrizeMask, nextPrize, ctx).value
        }
        future /= futurePrizes.length
      }
      payoff[i][j] = immediate + future
    }
  }

  const { value, rowStrategy } = solveZeroSumGame(payoff, ctx.fpIters)
  const result = { value, cards: myCards, strategy: rowStrategy }
  ctx.memo.set(key, result)
  return result
}

/**
 * 深度受限均衡：用啟發式評估葉節點，只在根節點解一次矩陣賽局。
 * 用於手牌仍多（殘局以外）的情形。
 */
function solveHeuristic(myMask, oppMask, prizeMask, current, ctx) {
  const myCards = cardsOf(myMask)
  const oppCards = cardsOf(oppMask)
  const n = myCards.length
  const m = oppCards.length
  const payoff = Array.from({ length: n }, () => new Array(m).fill(0))

  for (let i = 0; i < n; i++) {
    const myCard = myCards[i]
    const childMy = myMask & ~bit(myCard)
    for (let j = 0; j < m; j++) {
      const oppCard = oppCards[j]
      const childOpp = oppMask & ~bit(oppCard)
      let immediate = 0
      if (myCard > oppCard) immediate = current
      else if (myCard < oppCard) immediate = -current
      payoff[i][j] = immediate + estimateFutureDiff(childMy, childOpp, prizeMask)
    }
  }

  const { value, rowStrategy } = solveZeroSumGame(payoff, ctx.fpIters)
  return { value, cards: myCards, strategy: rowStrategy, payoff }
}

/**
 * 對手建模：依歷史推估對手本輪對各「可用手牌」的出牌機率分布。
 * 模型：對手傾向出 ≈ prize + drift 的牌；以高斯權重套在其剩餘手牌上。
 * drift = 對手歷史 (出牌 - 競標分數) 的平均；sigma 來自其變異數（含下限）。
 *
 * @param {number} prize 本輪競標分數
 * @param {number[]} oppCards 對手剩餘手牌
 * @param {Array} history 歷史紀錄 [{ prize, oppBid }]
 * @returns {number[]} 對 oppCards 對齊的機率分布
 */
function predictOpponent(prize, oppCards, history) {
  if (oppCards.length === 1) return [1]
  let drift = 0
  let variance = 4 // 預設 sigma=2
  if (history.length >= 1) {
    const diffs = history.map((h) => h.oppBid - h.prize)
    drift = diffs.reduce((a, b) => a + b, 0) / diffs.length
    if (history.length >= 2) {
      const mean = drift
      variance = diffs.reduce((a, d) => a + (d - mean) ** 2, 0) / diffs.length
    }
  }
  const sigma = Math.max(1.2, Math.sqrt(Math.max(variance, 0.5)))
  const target = prize + drift
  const weights = oppCards.map((c) => Math.exp(-((c - target) ** 2) / (2 * sigma * sigma)))
  const sum = weights.reduce((a, b) => a + b, 0) || 1
  return weights.map((w) => w / sum)
}

/**
 * 對外主介面：AI 在目前局面選一張牌。
 *
 * @param {object} args
 *   myHand    {number[]} 我方剩餘手牌
 *   oppHand   {number[]} 對手剩餘手牌
 *   prize     {number}   本輪競標分數
 *   upcoming  {number[]} 尚未揭示的競標分數（不含本輪）
 *   myScore   {number}
 *   oppScore  {number}
 *   history   {Array}    [{ prize, oppBid }] 對手歷史（供建模）
 *   difficulty{string}   'easy'|'normal'|'hard'|'insane'
 *   rng       {function} 亂數來源（可注入以利測試）
 * @returns {{ card:number, value:number, strategy:Array<{card:number,p:number}>, mode:string }}
 */
export function chooseCard(args) {
  const {
    myHand,
    oppHand,
    prize,
    upcoming,
    myScore = 0,
    oppScore = 0,
    history = [],
    difficulty = 'hard',
    rng = Math.random
  } = args

  const cfg = DIFFICULTY[difficulty] || DIFFICULTY.hard
  const myMask = maskOf(myHand)
  const oppMask = maskOf(oppHand)
  const prizeMask = maskOf(upcoming)
  const remainingRounds = myHand.length

  // 只剩一張：別無選擇
  if (remainingRounds === 1) {
    return { card: myHand[0], value: 0, strategy: [{ card: myHand[0], p: 1 }], mode: 'forced' }
  }

  const ctx = { memo: new Map(), fpIters: cfg.fpIters }

  // 選擇求解層級
  let solved
  let mode
  const exactDepth = Math.min(cfg.exactDepth, SAFE_MAX_EXACT)
  if (remainingRounds <= exactDepth) {
    solved = solveExact(myMask, oppMask, prizeMask, prize, ctx)
    mode = 'exact'
  } else {
    solved = solveHeuristic(myMask, oppMask, prizeMask, prize, ctx)
    mode = 'heuristic'
  }

  let { cards, strategy } = solved
  // 複製一份可調整的策略
  let probs = strategy.slice()

  // ---- 對手建模 + 安全剝削 ----
  if (cfg.modeling > 0 && history.length > 0) {
    const oppPred = predictOpponent(prize, oppHand, history)
    // 為了做最佳反應，需要一份 payoff（exact 模式沒回傳，這裡用啟發式近似即可）
    const payoff =
      solved.payoff ||
      buildImmediatePlusHeuristic(myMask, oppMask, prizeMask, prize)
    // 對預測分布的最佳反應（純策略 one-hot）
    const brValues = cards.map((_, i) =>
      oppHand.reduce((acc, _oc, j) => acc + oppPred[j] * payoff[i][j], 0)
    )
    let brIdx = 0
    for (let i = 1; i < brValues.length; i++) if (brValues[i] > brValues[brIdx]) brIdx = i
    // λ 隨樣本數成長，但受難度上限約束
    const lambda = Math.min(cfg.modeling, history.length * 0.09)
    probs = probs.map((p, i) => (1 - lambda) * p + lambda * (i === brIdx ? 1 : 0))
    mode += '+model'
  }

  // ---- 分數情勢調整 ----
  // 落後時略偏好「進攻」（出大牌搶高分），領先時略偏保守（用低牌換對手大牌）。
  if (cfg.scoreAware > 0) {
    const lead = myScore - oppScore
    const remainingPrizeSum = upcoming.reduce((s, v) => s + v, prize)
    if (remainingPrizeSum > 0 && Math.abs(lead) > 1) {
      // tilt > 0 代表想更積極；< 0 代表想更保守
      const tilt = (-lead / remainingPrizeSum) * cfg.scoreAware
      probs = probs.map((p, i) => {
        const card = cards[i]
        // 以「該牌相對中位數的高低」決定加成方向
        const aggressiveness = (card - 5.5) / 5.5 // -1..1
        const factor = Math.exp(tilt * aggressiveness)
        return p * factor
      })
    }
  }

  // ---- 難度雜訊（讓低難度有失誤、有變化）----
  if (cfg.noise > 0) {
    probs = probs.map((p) => p + cfg.noise / probs.length)
  }

  // 正規化並抽樣
  const total = probs.reduce((a, b) => a + b, 0) || 1
  probs = probs.map((p) => p / total)
  const idx = sampleIndex(probs, rng)

  return {
    card: cards[idx],
    value: solved.value,
    mode,
    strategy: cards.map((c, i) => ({ card: c, p: probs[i] }))
  }
}

// 對手建模在 exact 模式下需要的近似 payoff（立即收益 + 啟發式未來值）
function buildImmediatePlusHeuristic(myMask, oppMask, prizeMask, current) {
  const myCards = cardsOf(myMask)
  const oppCards = cardsOf(oppMask)
  return myCards.map((myCard) => {
    const childMy = myMask & ~bit(myCard)
    return oppCards.map((oppCard) => {
      const childOpp = oppMask & ~bit(oppCard)
      let immediate = 0
      if (myCard > oppCard) immediate = current
      else if (myCard < oppCard) immediate = -current
      return immediate + estimateFutureDiff(childMy, childOpp, prizeMask)
    })
  })
}
