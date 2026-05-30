<script setup>
/** OnlineBoard — 對決模式（線上自動配對） */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  PhArrowLeft,
  PhGlobeHemisphereEast,
  PhSpinnerGap,
  PhWarning,
  PhHourglassMedium
} from '@phosphor-icons/vue'
import { useOnlineGame } from '../composables/useOnlineGame.js'
import { TOTAL_ROUNDS } from '../game/engine.js'
import ScoreBoard from './ScoreBoard.vue'
import PrizeDisplay from './PrizeDisplay.vue'
import PlayCard from './PlayCard.vue'
import RoundLog from './RoundLog.vue'
import ResultModal from './ResultModal.vue'

const emit = defineEmits(['exit'])
const { state, connectAndFind, bid, leave } = useOnlineGame()

onMounted(() => connectAndFind())
onUnmounted(() => leave())

const usedPrizes = computed(() => state.history.map((h) => h.prize))
const upcoming = computed(() => {
  // 線上模式由伺服器逐輪揭示，無法預知後續分數 → 顯示尚未出現過的分數集合
  const seen = new Set(state.history.map((h) => h.prize))
  if (state.prize != null) seen.add(state.prize)
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((p) => !seen.has(p))
})
const myHand = computed(() => state.hand)
const logRows = computed(() =>
  state.history.map((h) => ({
    round: h.round,
    prize: h.prize,
    myBid: h.yourBid,
    oppBid: h.oppBid,
    outcome: h.youGain > h.oppGain ? 'win' : h.youGain < h.oppGain ? 'lose' : 'tie'
  }))
)
const selected = ref(null)
watch(
  () => state.round,
  () => (selected.value = null)
)

function pick(card) {
  if (state.status !== 'playing' || state.waitingForOpp) return
  selected.value = card
  bid(card)
}

function retry() {
  leave()
  connectAndFind()
}

function resultClass(r) {
  return r.youGain > r.oppGain ? 'win' : r.youGain < r.oppGain ? 'lose' : 'tie'
}
function verdictText(r) {
  return r.youGain > r.oppGain ? '你贏這輪' : r.youGain < r.oppGain ? '對手贏這輪' : '平手'
}
</script>

<template>
  <div class="board">
    <div class="topbar">
      <button class="btn btn-ghost" @click="emit('exit')">
        <PhArrowLeft :size="18" weight="bold" /> 返回
      </button>
      <div class="mode-tag"><PhGlobeHemisphereEast :size="16" weight="fill" /> 對決 · 線上</div>
    </div>

    <!-- 連線 / 配對狀態 -->
    <div v-if="state.status === 'connecting' || state.status === 'waiting'" class="lobby card-surface">
      <PhSpinnerGap :size="40" weight="bold" class="spin" />
      <h3 v-if="state.status === 'connecting'">連線中…</h3>
      <h3 v-else>配對中，正在尋找對手…</h3>
      <p class="muted">系統會自動為你媒合一位真人對手</p>
      <button class="btn btn-ghost" @click="emit('exit')">取消</button>
    </div>

    <div v-else-if="state.status === 'error'" class="lobby card-surface">
      <PhWarning :size="40" weight="fill" class="warn" />
      <h3>無法連線</h3>
      <p class="muted">{{ state.error }}</p>
      <div class="row-actions">
        <button class="btn btn-primary" @click="retry">重試</button>
        <button class="btn btn-ghost" @click="emit('exit')">返回主選單</button>
      </div>
    </div>

    <!-- 對局進行中 -->
    <template v-else>
      <ScoreBoard
        my-label="你"
        opp-label="對手"
        :my-score="state.myScore"
        :opp-score="state.oppScore"
        :round="state.round"
        :total-rounds="TOTAL_ROUNDS"
        opp-type="human"
      />

      <div class="arena">
        <PrizeDisplay :prize="state.prize" :remaining="upcoming" :used="usedPrizes" />

        <div class="reveal card-surface">
          <div class="slot">
            <span class="slot-label">對手</span>
            <div class="slot-card">
              <PlayCard v-if="state.lastResult" :value="state.lastResult.oppBid" disabled />
              <div v-else class="placeholder">?</div>
            </div>
          </div>
          <div class="verdict">
            <PhHourglassMedium v-if="state.waitingForOpp" :size="22" class="spin" />
            <span v-else-if="state.lastResult" :class="resultClass(state.lastResult)">
              {{ verdictText(state.lastResult) }}
            </span>
          </div>
          <div class="slot">
            <span class="slot-label">你</span>
            <div class="slot-card">
              <PlayCard v-if="selected" :value="selected" selected disabled />
              <div v-else class="placeholder">?</div>
            </div>
          </div>
        </div>
      </div>

      <div class="hand-zone card-surface">
        <div class="hand-label muted">
          你的手牌
          <span v-if="state.waitingForOpp"> — 等待對手出牌…</span>
          <span v-else> — 點選一張出牌</span>
        </div>
        <div class="hand">
          <PlayCard
            v-for="c in 10"
            :key="c"
            :value="c"
            :used="!myHand.includes(c)"
            :disabled="state.waitingForOpp || state.status !== 'playing'"
            @pick="pick"
          />
        </div>
      </div>

      <RoundLog :rows="logRows" />
    </template>

    <ResultModal
      :show="state.status === 'over'"
      :outcome="state.outcome || 'tie'"
      :my-score="state.myScore"
      :opp-score="state.oppScore"
      @again="retry"
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
  color: var(--accent-2);
  background: var(--panel-2);
  border: 1px solid var(--line);
  padding: 6px 12px;
  border-radius: 999px;
}
.lobby {
  text-align: center;
  padding: 48px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.lobby h3 {
  margin: 6px 0 0;
}
.spin {
  animation: spin 1s linear infinite;
  color: var(--accent-2);
}
.warn {
  color: var(--gold);
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.row-actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
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
}
.slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.slot-label {
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
.verdict {
  min-width: 84px;
  text-align: center;
  font-weight: 800;
  font-size: 14px;
}
.verdict .win {
  color: var(--win);
}
.verdict .lose {
  color: var(--lose);
}
.verdict .tie {
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
