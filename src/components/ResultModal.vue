<script setup>
/** ResultModal — 對局結束結算畫面 */
import { computed } from 'vue'
import { PhTrophy, PhSkull, PhScales, PhArrowsClockwise, PhHouse } from '@phosphor-icons/vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  outcome: { type: String, default: 'tie' }, // win | lose | tie
  myScore: { type: Number, default: 0 },
  oppScore: { type: Number, default: 0 }
})
defineEmits(['again', 'home'])

const title = computed(
  () => ({ win: '勝利！', lose: '惜敗', tie: '平手' })[props.outcome]
)
const Icon = computed(
  () => ({ win: PhTrophy, lose: PhSkull, tie: PhScales })[props.outcome]
)
</script>

<template>
  <transition name="fade">
    <div v-if="show" class="overlay">
      <div class="modal card-surface pop-enter-active" :class="outcome">
        <component :is="Icon" :size="64" weight="fill" class="icon" />
        <h2>{{ title }}</h2>
        <div class="final">
          <div class="col">
            <span class="lbl">你</span>
            <span class="val me">{{ myScore }}</span>
          </div>
          <span class="dash">—</span>
          <div class="col">
            <span class="lbl">對手</span>
            <span class="val opp">{{ oppScore }}</span>
          </div>
        </div>
        <div class="actions">
          <button class="btn btn-primary" @click="$emit('again')">
            <PhArrowsClockwise :size="18" weight="bold" /> 再來一局
          </button>
          <button class="btn btn-ghost" @click="$emit('home')">
            <PhHouse :size="18" weight="bold" /> 回主選單
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(6, 7, 18, 0.72);
  backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  z-index: 50;
  padding: 20px;
}
.modal {
  width: min(420px, 92vw);
  padding: 30px 26px;
  text-align: center;
}
.icon {
  margin-bottom: 6px;
}
.modal.win .icon {
  color: var(--gold);
}
.modal.lose .icon {
  color: var(--lose);
}
.modal.tie .icon {
  color: var(--tie);
}
h2 {
  margin: 6px 0 18px;
  font-size: 30px;
}
.final {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 22px;
  margin-bottom: 24px;
}
.col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.lbl {
  font-size: 13px;
  color: var(--muted);
}
.val {
  font-size: 44px;
  font-weight: 900;
  line-height: 1;
}
.val.me {
  color: var(--accent-2);
}
.val.opp {
  color: var(--lose);
}
.dash {
  color: var(--muted);
  font-size: 28px;
}
.actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}
</style>
