<script setup>
/** RoundLog — 逐輪對戰紀錄 */
import { PhScroll, PhCaretUp, PhCaretDown, PhEquals } from '@phosphor-icons/vue'

defineProps({
  // [{ round, prize, myBid, oppBid, outcome:'win'|'lose'|'tie' }]
  rows: { type: Array, default: () => [] }
})
</script>

<template>
  <div class="log card-surface">
    <div class="title">
      <PhScroll :size="18" weight="fill" />
      <span>對戰紀錄</span>
    </div>
    <div v-if="!rows.length" class="empty muted">尚未有出牌紀錄</div>
    <div v-else class="rows">
      <div class="row head">
        <span>輪</span><span>分數</span><span>你</span><span>對手</span><span>結果</span>
      </div>
      <transition-group name="fade">
        <div v-for="r in rows" :key="r.round" class="row" :class="r.outcome">
          <span>{{ r.round + 1 }}</span>
          <span class="prize">{{ r.prize }}</span>
          <span class="bid mine">{{ r.myBid }}</span>
          <span class="bid opp">{{ r.oppBid }}</span>
          <span class="res">
            <PhCaretUp v-if="r.outcome === 'win'" :size="16" weight="bold" />
            <PhCaretDown v-else-if="r.outcome === 'lose'" :size="16" weight="bold" />
            <PhEquals v-else :size="16" weight="bold" />
          </span>
        </div>
      </transition-group>
    </div>
  </div>
</template>

<style scoped>
.log {
  padding: 14px 16px;
}
.title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  margin-bottom: 10px;
  color: var(--muted);
}
.empty {
  padding: 14px 0;
  text-align: center;
  font-size: 14px;
}
.rows {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 260px;
  overflow-y: auto;
}
.row {
  display: grid;
  grid-template-columns: 28px 48px 1fr 1fr 28px;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 8px;
  font-size: 14px;
}
.row.head {
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
}
.row.win {
  background: rgba(46, 230, 166, 0.12);
}
.row.lose {
  background: rgba(255, 93, 115, 0.12);
}
.row.tie {
  background: rgba(140, 147, 201, 0.12);
}
.prize {
  color: var(--gold);
  font-weight: 800;
}
.bid {
  font-weight: 700;
}
.bid.mine {
  color: var(--accent-2);
}
.bid.opp {
  color: var(--lose);
}
.res {
  display: grid;
  place-items: center;
}
.win .res {
  color: var(--win);
}
.lose .res {
  color: var(--lose);
}
.tie .res {
  color: var(--tie);
}
</style>
