<script setup>
/** ScoreBoard — 雙方分數與進度 */
import { computed } from 'vue'
import { PhCrown, PhUser, PhRobot, PhGlobeHemisphereEast } from '@phosphor-icons/vue'

const props = defineProps({
  myLabel: { type: String, default: '你' },
  oppLabel: { type: String, default: '對手' },
  myScore: { type: Number, default: 0 },
  oppScore: { type: Number, default: 0 },
  round: { type: Number, default: 0 },
  totalRounds: { type: Number, default: 10 },
  oppType: { type: String, default: 'robot' } // robot | human
})

const leader = computed(() => {
  if (props.myScore > props.oppScore) return 'me'
  if (props.oppScore > props.myScore) return 'opp'
  return 'tie'
})
const OppIcon = computed(() => (props.oppType === 'human' ? PhGlobeHemisphereEast : PhRobot))
</script>

<template>
  <div class="scoreboard card-surface">
    <div class="side" :class="{ lead: leader === 'me' }">
      <div class="who">
        <PhUser :size="20" weight="fill" />
        <span>{{ myLabel }}</span>
        <PhCrown v-if="leader === 'me'" :size="18" weight="fill" class="crown" />
      </div>
      <div class="score me">{{ myScore }}</div>
    </div>

    <div class="center">
      <div class="round-pill">第 {{ Math.min(round + 1, totalRounds) }} / {{ totalRounds }} 輪</div>
      <div class="vs">VS</div>
    </div>

    <div class="side right" :class="{ lead: leader === 'opp' }">
      <div class="who">
        <PhCrown v-if="leader === 'opp'" :size="18" weight="fill" class="crown" />
        <span>{{ oppLabel }}</span>
        <component :is="OppIcon" :size="20" weight="fill" />
      </div>
      <div class="score opp">{{ oppScore }}</div>
    </div>
  </div>
</template>

<style scoped>
.scoreboard {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 14px 18px;
  gap: 10px;
}
.side {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.side.right {
  align-items: flex-end;
}
.who {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--muted);
  font-weight: 600;
}
.crown {
  color: var(--gold);
}
.score {
  font-size: 38px;
  font-weight: 900;
  line-height: 1;
}
.score.me {
  color: var(--accent-2);
}
.score.opp {
  color: var(--lose);
}
.side.lead .score {
  text-shadow: 0 0 18px currentColor;
}
.center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.round-pill {
  font-size: 12px;
  color: var(--muted);
  background: var(--panel-2);
  border: 1px solid var(--line);
  padding: 4px 10px;
  border-radius: 999px;
  white-space: nowrap;
}
.vs {
  font-weight: 900;
  color: var(--muted);
  letter-spacing: 2px;
}
</style>
