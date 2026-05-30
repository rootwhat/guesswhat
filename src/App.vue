<script setup>
/** App — 簡易畫面切換（主選單 / AI 模式 / 對決模式） */
import { ref } from 'vue'
import HomeMenu from './components/HomeMenu.vue'
import AIBoard from './components/AIBoard.vue'
import OnlineBoard from './components/OnlineBoard.vue'

const screen = ref('home') // home | ai | duel
const difficulty = ref('hard')

function start({ mode, difficulty: diff }) {
  if (mode === 'ai') {
    difficulty.value = diff || 'hard'
    screen.value = 'ai'
  } else if (mode === 'duel') {
    screen.value = 'duel'
  }
}
function exit() {
  screen.value = 'home'
}
</script>

<template>
  <transition name="fade" mode="out-in">
    <HomeMenu v-if="screen === 'home'" key="home" @start="start" />
    <AIBoard v-else-if="screen === 'ai'" key="ai" :difficulty="difficulty" @exit="exit" />
    <OnlineBoard v-else key="duel" @exit="exit" />
  </transition>
  <footer class="app-footer muted">
    Guess What · 純策略競標卡牌 · Vue 3 + Phosphor Icons
  </footer>
</template>

<style scoped>
.app-footer {
  text-align: center;
  font-size: 12px;
  margin-top: 30px;
  opacity: 0.7;
}
</style>
