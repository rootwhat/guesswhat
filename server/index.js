/**
 * server/index.js — 對決模式的權威伺服器（自動配對 + 回合中繼）
 *
 * 採用 WebSocket。職責：
 *  - 自動配對：玩家進入等待佇列，湊滿兩人即開一局。
 *  - 權威結算：競標分數順序由伺服器決定並只在「雙方都出牌後」才公開對手出牌，
 *    避免任一端偷看對手的選擇（防作弊）。
 *  - 斷線處理：對手離線即判定對方獲勝/結束。
 *
 * 執行：npm run server  （預設埠 8787，可用 PORT 覆寫）
 *
 * 訊息協定（JSON）：
 *  Client → Server:
 *    { type:'find' }                 加入配對
 *    { type:'bid', card:Number }     提交本輪出牌
 *    { type:'cancel' }               取消等待
 *  Server → Client:
 *    { type:'waiting' }
 *    { type:'matched', youAre:'a'|'b', round, prize, hand:[...] }
 *    { type:'round', round, prize }                 新一輪開始
 *    { type:'result', round, yourBid, oppBid, youGain, oppGain, yourScore, oppScore }
 *    { type:'gameover', yourScore, oppScore, outcome:'win'|'lose'|'tie' }
 *    { type:'opponent_left' }
 *    { type:'error', message }
 */

import { WebSocketServer } from 'ws'
import { generatePrizeOrder, resolveRound, TOTAL_ROUNDS } from '../src/game/engine.js'

const PORT = process.env.PORT || 8787
const wss = new WebSocketServer({ port: PORT })

let waiting = null // 等待中的 socket
let nextMatchId = 1

function send(ws, obj) {
  if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj))
}

function startMatch(a, b) {
  const prizeOrder = generatePrizeOrder()
  const match = {
    id: nextMatchId++,
    prizeOrder,
    round: 0,
    players: {
      a: { ws: a, hand: new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), score: 0, bid: null },
      b: { ws: b, hand: new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), score: 0, bid: null }
    }
  }
  a.match = match
  a.role = 'a'
  b.match = match
  b.role = 'b'

  const prize = prizeOrder[0]
  send(a, { type: 'matched', youAre: 'a', round: 0, prize, hand: [...match.players.a.hand] })
  send(b, { type: 'matched', youAre: 'b', round: 0, prize, hand: [...match.players.b.hand] })
}

function handleBid(ws, card) {
  const match = ws.match
  if (!match) return send(ws, { type: 'error', message: '尚未配對' })
  const me = match.players[ws.role]
  if (me.bid != null) return send(ws, { type: 'error', message: '本輪已出牌' })
  if (!me.hand.has(card)) return send(ws, { type: 'error', message: '沒有這張手牌' })
  me.bid = card

  const a = match.players.a
  const b = match.players.b
  if (a.bid == null || b.bid == null) return // 等另一位

  // 雙方都出牌 → 結算
  const prize = match.prizeOrder[match.round]
  const { aGain, bGain } = resolveRound(a.bid, b.bid, prize)
  a.score += aGain
  b.score += bGain
  a.hand.delete(a.bid)
  b.hand.delete(b.bid)

  send(a.ws, {
    type: 'result',
    round: match.round,
    yourBid: a.bid,
    oppBid: b.bid,
    youGain: aGain,
    oppGain: bGain,
    yourScore: a.score,
    oppScore: b.score
  })
  send(b.ws, {
    type: 'result',
    round: match.round,
    yourBid: b.bid,
    oppBid: a.bid,
    youGain: bGain,
    oppGain: aGain,
    yourScore: b.score,
    oppScore: a.score
  })

  match.round++
  a.bid = null
  b.bid = null

  if (match.round >= TOTAL_ROUNDS) {
    const outcomeFor = (mine, theirs) =>
      mine > theirs ? 'win' : mine < theirs ? 'lose' : 'tie'
    send(a.ws, { type: 'gameover', yourScore: a.score, oppScore: b.score, outcome: outcomeFor(a.score, b.score) })
    send(b.ws, { type: 'gameover', yourScore: b.score, oppScore: a.score, outcome: outcomeFor(b.score, a.score) })
    a.ws.match = b.ws.match = null
  } else {
    const nextPrize = match.prizeOrder[match.round]
    send(a.ws, { type: 'round', round: match.round, prize: nextPrize })
    send(b.ws, { type: 'round', round: match.round, prize: nextPrize })
  }
}

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let msg
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      return send(ws, { type: 'error', message: '訊息格式錯誤' })
    }

    switch (msg.type) {
      case 'find':
        if (waiting && waiting !== ws && waiting.readyState === waiting.OPEN) {
          const opp = waiting
          waiting = null
          startMatch(opp, ws)
        } else {
          waiting = ws
          send(ws, { type: 'waiting' })
        }
        break
      case 'bid':
        handleBid(ws, Number(msg.card))
        break
      case 'cancel':
        if (waiting === ws) waiting = null
        break
      default:
        send(ws, { type: 'error', message: '未知訊息類型' })
    }
  })

  ws.on('close', () => {
    if (waiting === ws) waiting = null
    const match = ws.match
    if (match) {
      const otherRole = ws.role === 'a' ? 'b' : 'a'
      const other = match.players[otherRole]?.ws
      if (other) {
        send(other, { type: 'opponent_left' })
        other.match = null
      }
    }
  })
})

console.log(`[guesswhat] 對決伺服器已啟動於 ws://localhost:${PORT}`)
