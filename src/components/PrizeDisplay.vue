<script setup>
/** PrizeDisplay — 本輪競標分數 + 尚未出現/已出現的分數軌跡 */
import { PhCoins, PhTrophy } from '@phosphor-icons/vue'

defineProps({
  prize: { type: Number, default: null },
  remaining: { type: Array, default: () => [] }, // 尚未揭示（不含本輪）
  used: { type: Array, default: () => [] } // 已用掉的競標分數
})
</script>

<template>
  <div class="prize card-surface">
    <div class="headline">
      <PhTrophy :size="22" weight="fill" class="t" />
      <span>本輪競標分數</span>
    </div>
    <transition name="pop" mode="out-in">
      <div class="big" :key="prize">
        <PhCoins :size="30" weight="fill" />
        <span class="num">{{ prize ?? '—' }}</span>
      </div>
    </transition>
    <div class="track">
      <span class="track-label">尚未出現</span>
      <div class="chips">
        <span v-for="p in remaining" :key="'r' + p" class="chip">{{ p }}</span>
        <span v-if="!remaining.length" class="chip empty">（已是最後一輪）</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.prize {
  padding: 16px 18px;
  text-align: center;
}
.headline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-weight: 600;
}
.headline .t {
  color: var(--gold);
}
.big {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 8px 0 12px;
  color: var(--gold);
}
.big .num {
  font-size: 64px;
  font-weight: 900;
  line-height: 1;
  text-shadow: 0 0 28px rgba(255, 207, 92, 0.5);
}
.track {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}
.track-label {
  font-size: 12px;
  color: var(--muted);
}
.chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}
.chip {
  min-width: 26px;
  padding: 3px 8px;
  border-radius: 8px;
  background: var(--panel-2);
  border: 1px solid var(--line);
  font-size: 13px;
  font-weight: 700;
}
.chip.empty {
  color: var(--muted);
  font-weight: 500;
}
</style>
