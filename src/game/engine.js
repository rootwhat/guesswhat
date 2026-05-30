/**
 * engine.js — 遊戲核心規則 (Goofspiel / GOPS 變體)
 *
 * 規則：
 *  - 兩名玩家各持有 1~10 共 10 張手牌，每張僅能使用一次。
 *  - 共 10 輪，每輪揭示一個「競標分數」(prize)，數值為 1~10 且 10 輪間不重複。
 *  - 雙方同時暗出一張手牌，數字大者贏得該輪的競標分數。
 *  - 平手 (兩人出相同數字) 時，競標分數由雙方平分 (各得 prize/2)。
 *  - 10 輪後總分高者獲勝。
 *
 * 本檔僅含純函式，方便單元測試與 AI 重複利用。
 */

export const HAND = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
export const TOTAL_ROUNDS = 10

/** Fisher–Yates 洗牌（回傳新陣列，不變更輸入） */
export function shuffle(arr, rng = Math.random) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 產生 10 輪不重複的競標分數順序（1~10 的隨機排列） */
export function generatePrizeOrder(rng = Math.random) {
  return shuffle(HAND, rng)
}

/**
 * 結算單一回合。
 * @returns {{ winner: 'a'|'b'|'tie', aGain:number, bGain:number }}
 */
export function resolveRound(aBid, bBid, prize) {
  if (aBid > bBid) return { winner: 'a', aGain: prize, bGain: 0 }
  if (bBid > aBid) return { winner: 'b', aGain: 0, bGain: prize }
  // 平手：平分
  return { winner: 'tie', aGain: prize / 2, bGain: prize / 2 }
}

/** 建立一場全新對局的狀態物件 */
export function createGame({ prizeOrder } = {}) {
  return {
    round: 0,
    prizeOrder: prizeOrder || generatePrizeOrder(),
    aHand: [...HAND],
    bHand: [...HAND],
    aScore: 0,
    bScore: 0,
    history: [], // 每輪：{ round, prize, aBid, bBid, winner, aGain, bGain }
    finished: false
  }
}

/** 取得目前回合的競標分數（尚未開始或已結束則回傳 null） */
export function currentPrize(game) {
  if (game.finished || game.round >= TOTAL_ROUNDS) return null
  return game.prizeOrder[game.round]
}

/** 取得「尚未揭示」的競標分數陣列（不含目前這一輪） */
export function upcomingPrizes(game) {
  return game.prizeOrder.slice(game.round + 1)
}

/**
 * 套用一回合的出牌，回傳更新後的新狀態（不可變更新）。
 * 會驗證該牌仍在手上。
 */
export function playRound(game, aBid, bBid) {
  if (game.finished) throw new Error('遊戲已結束')
  const prize = currentPrize(game)
  if (prize == null) throw new Error('沒有可進行的回合')
  if (!game.aHand.includes(aBid)) throw new Error(`A 沒有手牌 ${aBid}`)
  if (!game.bHand.includes(bBid)) throw new Error(`B 沒有手牌 ${bBid}`)

  const { winner, aGain, bGain } = resolveRound(aBid, bBid, prize)
  const next = {
    ...game,
    round: game.round + 1,
    aHand: game.aHand.filter((c) => c !== aBid),
    bHand: game.bHand.filter((c) => c !== bBid),
    aScore: game.aScore + aGain,
    bScore: game.bScore + bGain,
    history: [
      ...game.history,
      { round: game.round, prize, aBid, bBid, winner, aGain, bGain }
    ]
  }
  next.finished = next.round >= TOTAL_ROUNDS
  return next
}

/** 取得最終結果：'a' | 'b' | 'tie' | null(未結束) */
export function getResult(game) {
  if (!game.finished) return null
  if (game.aScore > game.bScore) return 'a'
  if (game.bScore > game.aScore) return 'b'
  return 'tie'
}

/** 競標分數總和（恆為 1+2+...+10 = 55，供進度條使用） */
export const PRIZE_TOTAL = HAND.reduce((s, v) => s + v, 0)
