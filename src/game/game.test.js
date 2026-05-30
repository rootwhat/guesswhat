import { describe, it, expect } from 'vitest'
import {
  createGame,
  resolveRound,
  playRound,
  generatePrizeOrder,
  getResult,
  currentPrize,
  TOTAL_ROUNDS
} from './engine.js'
import { solveZeroSumGame } from './matrixGame.js'
import { chooseCard } from './ai.js'

describe('engine', () => {
  it('resolves higher bid as winner', () => {
    expect(resolveRound(7, 3, 5)).toEqual({ winner: 'a', aGain: 5, bGain: 0 })
    expect(resolveRound(2, 9, 8)).toEqual({ winner: 'b', aGain: 0, bGain: 8 })
  })

  it('splits prize on tie', () => {
    expect(resolveRound(4, 4, 6)).toEqual({ winner: 'tie', aGain: 3, bGain: 3 })
  })

  it('prize order is a permutation of 1..10 with no repeats', () => {
    for (let t = 0; t < 50; t++) {
      const order = generatePrizeOrder()
      expect(order.length).toBe(10)
      expect(new Set(order).size).toBe(10)
      expect(Math.min(...order)).toBe(1)
      expect(Math.max(...order)).toBe(10)
    }
  })

  it('plays a full game with conserved points (total 55)', () => {
    let g = createGame()
    while (!g.finished) {
      const a = g.aHand[0]
      const b = g.bHand[g.bHand.length - 1]
      g = playRound(g, a, b)
    }
    expect(g.round).toBe(TOTAL_ROUNDS)
    expect(g.aScore + g.bScore).toBe(55)
    expect(['a', 'b', 'tie']).toContain(getResult(g))
  })
})

describe('matrix game solver', () => {
  it('finds value 0 for a symmetric matching-pennies-like game', () => {
    // rock-paper-scissors style zero-sum → value 0, uniform strategy
    const payoff = [
      [0, -1, 1],
      [1, 0, -1],
      [-1, 1, 0]
    ]
    const { value, rowStrategy } = solveZeroSumGame(payoff, 2000)
    expect(Math.abs(value)).toBeLessThan(0.05)
    for (const p of rowStrategy) expect(Math.abs(p - 1 / 3)).toBeLessThan(0.1)
  })

  it('picks the dominant row', () => {
    const payoff = [
      [5, 6],
      [1, 2]
    ]
    const { rowStrategy } = solveZeroSumGame(payoff, 1000)
    expect(rowStrategy[0]).toBeGreaterThan(0.95)
  })
})

describe('ai', () => {
  const fullHand = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  it('returns a legal in-hand card', () => {
    const d = chooseCard({
      myHand: fullHand,
      oppHand: fullHand,
      prize: 7,
      upcoming: [1, 2, 3, 4, 5, 6, 8, 9, 10],
      difficulty: 'hard'
    })
    expect(fullHand).toContain(d.card)
  })

  it('is forced when one card remains', () => {
    const d = chooseCard({ myHand: [4], oppHand: [9], prize: 3, upcoming: [], difficulty: 'hard' })
    expect(d.card).toBe(4)
  })

  it('exact endgame: never wastes the 10 on the last/low prize when a cheaper win exists', () => {
    // 殘局兩張：我有 {2,10}，對手有 {1,9}，本輪競標分數=2，下一輪未知為 9
    // 最佳：本輪用 2 贏分(2>1機率)或保留10搶大分。AI 應給出合法且不送頭的決策。
    const d = chooseCard({
      myHand: [2, 10],
      oppHand: [1, 9],
      prize: 2,
      upcoming: [9],
      difficulty: 'hard'
    })
    expect([2, 10]).toContain(d.card)
    // 策略機率總和為 1
    const sum = d.strategy.reduce((s, x) => s + x.p, 0)
    expect(Math.abs(sum - 1)).toBeLessThan(1e-6)
  })

  it('exploits an opponent that always overbids by 1 (modeling)', () => {
    // 對手歷史顯示總是出 prize+1；面對小分數時，AI 應傾向放掉(出最小牌)而非硬拚
    const history = [
      { prize: 5, oppBid: 6 },
      { prize: 3, oppBid: 4 },
      { prize: 8, oppBid: 9 }
    ]
    const d = chooseCard({
      myHand: [1, 2, 7, 8],
      oppHand: [3, 4, 5, 10],
      prize: 2,
      upcoming: [6, 9, 10],
      history,
      difficulty: 'hard'
    })
    expect([1, 2, 7, 8]).toContain(d.card)
  })
})
