<script setup>
/** AIBoard — AI 模式對局畫面（本地對戰內建賽局 AI） */
import { ref, computed, reactive, onMounted } from 'vue'
import { PhArrowLeft, PhRobot, PhCpu, PhHandPointing } from '@phosphor-icons/vue'
import {
  createGame,
  currentPrize,
  upcomingPrizes,
  playRound,
  getResult,
  TOTAL_ROUNDS
} from '../game/engine.js'
import { chooseCard, DIFFICULTY } from '../game/ai.js'
import ScoreBoard from './ScoreBoard.vue'
import PrizeDisplay from './PrizeDisplay.vue'
import PlayCard from './PlayCard.vue'
import RoundLog from './RoundLog.vue'
import ResultModal from './ResultModal.vue'

const props = defineProps({
  difficulty: { type: String, default: 'hard' }
})
const emit = defineEmits(['exit'])

// 玩家=a，AI=b
let game = reactive(createGame())
const phase = ref('choose') // choose | reveal | done
const mySelected = ref(null)
const aiCard = ref(null)
const lastOutcome = ref(null)
const thinking = ref(false)

const prize = computed(() => currentPrize(game))
const upcoming = computed(() => upcomingPrizes(game))
const usedPrizes = computed(() => game.history.map((h) => h.prize))
const myHand = computed(() => game.aHand)
const finished = computed(() => game.finished)

const logRows = computed(() =>
  game.history.map((h) => ({
    round: h.round,
    prize: h.prize,
    myBid: h.aBid,
    oppBid: h.bBid,
    outcome: h.winner === 'a' ? 'win' : h.winner === 'b' ? 'lose' : 'tie'
  }))
)

const result = computed(() => {
  const r = getResult(game)
  if (!r) return null
  return r === 'a' ? 'win' : r === 'b' ? 'lose' : 'tie'
})

const diffLabel = computed(() => DIFFICULTY[props.difficulty]?.label || '困難')

async function pick(card) {
  if (phase.value !== 'choose' || finished.value) return
  mySelected.value = card
  phase.value = 'reveal'
  thinking.value = true

  // AI 在「看不到玩家本輪出牌」的情況下決策：只給它過往對手出牌歷史
  const oppHistory = game.history.map((h) => ({ prize: h.prize, oppBid: h.aBid }))
  // 模擬思考時間（同時讓運算在背景進行）
  await nextFrame()
  const decision = chooseCard({
    myHand: game.bHand,
    oppHand: game.aHand,
    prize: prize.value,
    upcoming: upcoming.value,
    myScore: game.bScore,
    oppScore: game.aScore,
    history: oppHistory,
    difficulty: props.difficulty
  })
  await sleep(520)
  thinking.value = false
  aiCard.value = decision.card

  // 揭示結果
  const pz = prize.value
  lastOutcome.value =
    card > decision.card ? 'win' : card < decision.card ? 'lose' : 'tie'
  await sleep(900)

  const updated = playRound(game, card, decision.card)
  Object.assign(game, updated)

  // 重置回合
  mySelected.value = null
  aiCard.value = null
  if (!game.finished) {
    phase.value = 'choose'
  } else {
    phase.value = 'done'
  }
}

function restart() {
  Object.assign(game, createGame())
  phase.value = 'choose'
  mySelected.value = null
  aiCard.value = null
  lastOutcome.value = null
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
</script>

<template>
  <div class="board">
    <div class="topbar">
      <button class="btn btn-ghost" @click="emit('exit')">
        <PhArrowLeft :size="18" weight="bold" /> 返回
      </button>
      <div class="mode-tag"><PhRobot :size="16" weight="fill" /> AI · {{ diffLabel }}</div>
    </div>

    <ScoreBoard
      my-label="你"
      :opp-label="`AI (${diffLabel})`"
      :my-score="game.aScore"
      :opp-score="game.bScore"
      :round="game.round"
      :total-rounds="TOTAL_ROUNDS"
      opp-type="robot"
    />

    <div class="arena">
      <PrizeDisplay :prize="prize" :remaining="upcoming" :used="usedPrizes" />

      <!-- 揭示區 -->
      <div class="reveal card-surface">
        <div class="slot opp">
          <span class="slot-label"><PhCpu :size="15" weight="fill" /> AI 出牌</span>
          <div class="slot-card">
            <PlayCard v-if="aiCard" :value="aiCard" disabled />
            <div v-else class="placeholder" :class="{ thinking }">
              <span v-if="thinking">思考中…</span>
              <span v-else>?</span>
            </div>
          </div>
        </div>

        <div class="verdict" :class="lastOutcome">
          <transition name="pop">
            <span v-if="aiCard" :key="lastOutcome">
              {{ lastOutcome === 'win' ? '你贏這輪' : lastOutcome === 'lose' ? 'AI 贏這輪' : '平手' }}
            </span>
          </transition>
        </div>

        <div class="slot mine">
          <span class="slot-label"><PhHandPointing :size="15" weight="fill" /> 你的出牌</span>
          <div class="slot-card">
            <PlayCard v-if="mySelected" :value="mySelected" selected disabled />
            <div v-else class="placeholder">?</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 手牌 -->
    <div class="hand-zone card-surface">
      <div class="hand-label muted">
        你的手牌 <span v-if="phase === 'choose' && !finished">— 點選一張出牌</span>
      </div>
      <div class="hand">
        <PlayCard
          v-for="c in 10"
          :key="c"
          :value="c"
          :used="!myHand.includes(c)"
          :disabled="phase !== 'choose' || finished"
          @pick="pick"
        />
      </div>
    </div>

    <RoundLog :rows="logRows" />

    <ResultModal
      :show="phase === 'done'"
      :outcome="result || 'tie'"
      :my-score="game.aScore"
      :opp-score="game.bScore"
      @again="restart"
      @home="emit('exit')"
    />
  </div>
</template>

<style scoped>
.board {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.mode-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--accent);
  background: var(--panel-2);
  border: 1px solid var(--line);
  padding: 6px 12px;
  border-radius: 999px;
}
.arena {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
@media (max-width: 720px) {
  .arena {
    grid-template-columns: 1fr;
  }
}
.reveal {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 16px;
  gap: 8px;
}
.slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.slot-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--muted);
}
.slot-card {
  min-height: 80px;
  display: grid;
  place-items: center;
}
.placeholder {
  width: 56px;
  height: 80px;
  border-radius: 12px;
  border: 2px dashed var(--line);
  display: grid;
  place-items: center;
  color: var(--muted);
  font-size: 22px;
}
.placeholder.thinking {
  font-size: 13px;
  animation: pulse 1s ease-in-out infinite;
  border-color: var(--accent);
  color: var(--accent);
}
@keyframes pulse {
  50% {
    opacity: 0.45;
  }
}
.verdict {
  min-width: 84px;
  text-align: center;
  font-weight: 800;
  font-size: 14px;
}
.verdict.win {
  color: var(--win);
}
.verdict.lose {
  color: var(--lose);
}
.verdict.tie {
  color: var(--tie);
}
.hand-zone {
  padding: 14px 16px;
}
.hand-label {
  font-size: 13px;
  margin-bottom: 10px;
}
.hand {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}
</style>
