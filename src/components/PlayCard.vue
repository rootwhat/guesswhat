<script setup>
/** PlayCard — 一張可點擊的手牌 */
import { computed } from 'vue'

const props = defineProps({
  value: { type: Number, required: true },
  disabled: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  used: { type: Boolean, default: false },
  faceDown: { type: Boolean, default: false }
})
defineEmits(['pick'])

// 依牌面大小調色：低=藍、中=紫、高=金
const tone = computed(() => {
  if (props.value <= 3) return 'low'
  if (props.value <= 7) return 'mid'
  return 'high'
})
</script>

<template>
  <button
    class="play-card"
    :class="[tone, { selected, used, faceDown, disabled }]"
    :disabled="disabled || used"
    @click="$emit('pick', value)"
  >
    <template v-if="!faceDown">
      <span class="corner tl">{{ value }}</span>
      <span class="pip">{{ value }}</span>
      <span class="corner br">{{ value }}</span>
    </template>
    <span v-else class="back">?</span>
  </button>
</template>

<style scoped>
.play-card {
  position: relative;
  width: 56px;
  height: 80px;
  border-radius: 12px;
  background: linear-gradient(180deg, #2a2f5e, #1c2046);
  border: 1px solid var(--line);
  color: var(--text);
  font-weight: 800;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
  transition: transform 0.12s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}
.play-card:hover:not(:disabled) {
  transform: translateY(-8px);
  border-color: var(--accent);
  box-shadow: 0 14px 26px rgba(124, 92, 255, 0.35);
}
.play-card.low {
  background: linear-gradient(180deg, #1f3a63, #15294a);
}
.play-card.mid {
  background: linear-gradient(180deg, #34275f, #221a45);
}
.play-card.high {
  background: linear-gradient(180deg, #5a4413, #3a2f12);
}
.play-card.selected {
  border-color: var(--accent-2);
  box-shadow: 0 0 0 2px var(--accent-2), 0 12px 24px rgba(0, 212, 255, 0.35);
  transform: translateY(-8px);
}
.play-card.used {
  opacity: 0.28;
  filter: grayscale(0.6);
}
.pip {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 30px;
}
.high .pip {
  color: var(--gold);
}
.corner {
  position: absolute;
  font-size: 12px;
  opacity: 0.8;
}
.corner.tl {
  top: 6px;
  left: 7px;
}
.corner.br {
  bottom: 6px;
  right: 7px;
  transform: rotate(180deg);
}
.faceDown {
  background: repeating-linear-gradient(45deg, #2a2f5e, #2a2f5e 6px, #232850 6px, #232850 12px);
}
.back {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 28px;
  color: var(--muted);
}
</style>
