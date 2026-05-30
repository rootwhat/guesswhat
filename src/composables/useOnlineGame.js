/**
 * useOnlineGame.js — 對決模式 WebSocket 客戶端封裝
 *
 * 對外提供反應式狀態與動作，元件只需呼叫 find()/bid()/leave()。
 * 連線位址：開發環境走 Vite 代理 /ws → ws://localhost:8787。
 */
import { reactive, readonly } from 'vue'

function resolveWsUrl() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  // 透過 Vite 代理 (/ws) 或同源部署
  return `${proto}://${location.host}/ws`
}

export function useOnlineGame() {
  const state = reactive({
    status: 'idle', // idle | connecting | waiting | playing | over | error
    youAre: null,
    round: 0,
    prize: null,
    hand: [],
    myScore: 0,
    oppScore: 0,
    lastResult: null, // { yourBid, oppBid, youGain, oppGain }
    history: [],
    outcome: null, // win | lose | tie
    waitingForOpp: false,
    error: null
  })

  let ws = null

  function connectAndFind() {
    state.status = 'connecting'
    state.error = null
    try {
      ws = new WebSocket(resolveWsUrl())
    } catch (e) {
      state.status = 'error'
      state.error = '無法建立連線'
      return
    }
    ws.onopen = () => ws.send(JSON.stringify({ type: 'find' }))
    ws.onerror = () => {
      state.status = 'error'
      state.error = '連線失敗，請確認對決伺服器是否啟動 (npm run server)'
    }
    ws.onclose = () => {
      if (state.status !== 'over' && state.status !== 'error') {
        state.status = 'error'
        state.error = '連線已中斷'
      }
    }
    ws.onmessage = (ev) => handle(JSON.parse(ev.data))
  }

  function handle(msg) {
    switch (msg.type) {
      case 'waiting':
        state.status = 'waiting'
        break
      case 'matched':
        Object.assign(state, {
          status: 'playing',
          youAre: msg.youAre,
          round: msg.round,
          prize: msg.prize,
          hand: msg.hand,
          myScore: 0,
          oppScore: 0,
          history: [],
          lastResult: null,
          waitingForOpp: false
        })
        break
      case 'round':
        state.round = msg.round
        state.prize = msg.prize
        state.waitingForOpp = false
        state.lastResult = null
        break
      case 'result':
        state.hand = state.hand.filter((c) => c !== msg.yourBid)
        state.myScore = msg.yourScore
        state.oppScore = msg.oppScore
        state.lastResult = {
          yourBid: msg.yourBid,
          oppBid: msg.oppBid,
          youGain: msg.youGain,
          oppGain: msg.oppGain
        }
        state.history.push({
          round: msg.round,
          prize: state.prize,
          yourBid: msg.yourBid,
          oppBid: msg.oppBid,
          youGain: msg.youGain,
          oppGain: msg.oppGain
        })
        state.waitingForOpp = false
        break
      case 'gameover':
        state.status = 'over'
        state.outcome = msg.outcome
        state.myScore = msg.yourScore
        state.oppScore = msg.oppScore
        break
      case 'opponent_left':
        state.status = 'over'
        state.outcome = 'win'
        state.error = '對手已離線，你獲勝！'
        break
      case 'error':
        state.error = msg.message
        break
    }
  }

  function bid(card) {
    if (state.status !== 'playing' || state.waitingForOpp) return
    state.waitingForOpp = true
    ws?.send(JSON.stringify({ type: 'bid', card }))
  }

  function leave() {
    try {
      ws?.send(JSON.stringify({ type: 'cancel' }))
      ws?.close()
    } catch {}
    ws = null
    state.status = 'idle'
  }

  return { state: readonly(state), connectAndFind, bid, leave }
}
