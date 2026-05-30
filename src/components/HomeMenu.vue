<script setup>
/** HomeMenu — 主選單：選擇模式與 AI 難度 */
import { ref } from 'vue'
import {
  PhSword,
  PhRobot,
  PhGlobeHemisphereEast,
  PhCaretRight,
  PhSpade,
  PhInfo
} from '@phosphor-icons/vue'
import { DIFFICULTY } from '../game/ai.js'

const emit = defineEmits(['start'])
const difficulty = ref('hard')
const levels = Object.entries(DIFFICULTY).map(([key, v]) => ({ key, label: v.label }))
const showRules = ref(false)
</script>

<template>
  <div class="home">
    <header class="hero">
      <div class="logo">
        <PhSpade :size="40" weight="fill" />
        <h1>Guess&nbsp;What</h1>
      </div>
      <p class="tagline">十張手牌、十輪競標 — 看穿對手、贏下分數的純策略對決</p>
    </header>

    <div class="modes">
      <button class="mode card-surface ai" @click="emit('start', { mode: 'ai', difficulty })">
        <div class="mode-icon"><PhRobot :size="34" weight="fill" /></div>
        <div class="mode-body">
          <h3>AI 模式 <PhCaretRight :size="16" weight="bold" /></h3>
          <p class="muted">挑戰內建賽局 AI — 在看不到你出牌的情況下逼近最佳解。</p>
          <div class="levels" @click.stop>
            <button
              v-for="lv in levels"
              :key="lv.key"
              class="level"
              :class="{ active: difficulty === lv.key }"
              @click="difficulty = lv.key"
            >
              {{ lv.label }}
            </button>
          </div>
        </div>
      </button>

      <button class="mode card-surface duel" @click="emit('start', { mode: 'duel' })">
        <div class="mode-icon"><PhGlobeHemisphereEast :size="34" weight="fill" /></div>
        <div class="mode-body">
          <h3>對決模式 <PhCaretRight :size="16" weight="bold" /></h3>
          <p class="muted">自動配對真人對手，即時連線一較高下。</p>
          <div class="hint"><PhSword :size="15" weight="fill" /> 線上 1v1 自動配對</div>
        </div>
      </button>
    </div>

    <button class="rules-toggle btn btn-ghost" @click="showRules = !showRules">
      <PhInfo :size="16" weight="fill" /> 遊戲規則
    </button>
    <transition name="fade">
      <div v-if="showRules" class="rules card-surface">
        <ul>
          <li>雙方各持 <b>1~10</b> 共 10 張手牌，每張只能用一次。</li>
          <li>共 <b>10 輪</b>，每輪揭示一個競標分數（1~10，全程不重複）。</li>
          <li>雙方同時暗出一張，<b>數字大者</b>贏得該輪競標分數；平手則平分。</li>
          <li>10 輪結束，<b>總分高者獲勝</b>。</li>
        </ul>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.home {
  padding-top: 18px;
}
.hero {
  text-align: center;
  margin: 20px 0 30px;
}
.logo {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: var(--accent);
}
.logo h1 {
  margin: 0;
  font-size: 44px;
  letter-spacing: 1px;
  background: linear-gradient(120deg, var(--accent-2), var(--accent), var(--gold));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.tagline {
  color: var(--muted);
  margin-top: 10px;
}
.modes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
@media (max-width: 720px) {
  .modes {
    grid-template-columns: 1fr;
  }
}
.mode {
  display: flex;
  gap: 16px;
  padding: 20px;
  text-align: left;
  background: linear-gradient(180deg, var(--panel), var(--bg-2));
  transition: transform 0.12s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}
.mode:hover {
  transform: translateY(-4px);
  border-color: var(--accent);
}
.mode.duel:hover {
  border-color: var(--accent-2);
}
.mode-icon {
  width: 58px;
  height: 58px;
  flex: 0 0 58px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: var(--panel-2);
  color: var(--accent);
}
.mode.duel .mode-icon {
  color: var(--accent-2);
}
.mode-body h3 {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 2px 0 8px;
  font-size: 20px;
}
.levels {
  display: flex;
  gap: 6px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.level {
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--panel-2);
  border: 1px solid var(--line);
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
}
.level.active {
  background: linear-gradient(135deg, var(--accent), #9a7bff);
  color: #fff;
  border-color: transparent;
}
.hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  font-size: 13px;
  color: var(--accent-2);
}
.rules-toggle {
  margin: 22px auto 0;
  display: flex;
}
.rules {
  margin-top: 12px;
  padding: 16px 22px;
}
.rules ul {
  margin: 0;
  padding-left: 18px;
  line-height: 1.9;
  color: var(--muted);
}
.rules b {
  color: var(--text);
}
</style>
