<template>
  <main class="map-page">
    <header class="topbar">
      <button @click="router.push('/home')">← Back</button>

      <div>
        <h1>Choose Your Path</h1>
        <p>Complete levels to unlock new paths.</p>
      </div>

      <button @click="router.push('/tutorial')">Tutorial</button>
    </header>

    <div class="map-panel">
      <svg
        class="paths"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line
          v-for="[from, to] in EDGES"
          :key="`${from}-${to}`"
          :x1="POSITIONS[from]!.x"
          :y1="POSITIONS[from]!.y"
          :x2="POSITIONS[to]!.x"
          :y2="POSITIONS[to]!.y"
          :class="{ lit: completed.includes(from) }"
        />
      </svg>

      <button
        v-for="level in LEVELS"
        :key="level"
        class="level-node"
        :class="{
          locked: !unlocked(level),
          complete: completed.includes(level),
          final: level === 9,
        }"
        :style="{
          left: POSITIONS[level]!.x + '%',
          top: POSITIONS[level]!.y + '%',
        }"
        :disabled="!unlocked(level)"
        @click="playLevel(level)"
      >
        <span>
          {{
            !unlocked(level) ? "🔒" : completed.includes(level) ? "✓" : level
          }}
        </span>
        <small>Lv {{ level }}</small>
      </button>
    </div>

    <p class="help">✓ Completed · 🔒 Locked · Choose any unlocked level</p>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted, onActivated } from "vue";
import { useRouter } from "vue-router";

import { getCompletedLevels, isLevelUnlocked } from "../utils/levelProgress";

const router = useRouter();

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const POSITIONS: Record<number, { x: number; y: number }> = {
  1: { x: 50, y: 9 },

  2: { x: 27, y: 27 },
  3: { x: 73, y: 27 },

  4: { x: 12, y: 48 },
  5: { x: 37, y: 48 },
  6: { x: 63, y: 48 },
  7: { x: 88, y: 48 },

  8: { x: 50, y: 73 },
  9: { x: 50, y: 92 },
};

const EDGES: [number, number][] = [
  [1, 2],
  [1, 3],
  [2, 4],
  [2, 5],
  [3, 6],
  [3, 7],
  [4, 8],
  [5, 8],
  [6, 8],
  [7, 8],
  [8, 9],
];

const completed = ref<number[]>([]);

function refresh() {
  completed.value = getCompletedLevels();
}

function unlocked(level: number) {
  return isLevelUnlocked(level, completed.value);
}

function playLevel(level: number) {
  if (!unlocked(level)) return;

  router.push({
    path: "/play",
    query: { level: String(level) },
  });
}

onMounted(refresh);
onActivated(refresh);
</script>

<style scoped>
.map-page {
  position: fixed;
  inset: 0;
  overflow-y: auto;
  padding: 16px;
  box-sizing: border-box;
  color: #36566a;
  background: linear-gradient(#a6daed, #e2efd5);
  font-family: monospace;
}

.topbar {
  max-width: 780px;
  margin: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  text-align: center;
}

.topbar h1 {
  margin: 0;
  font-size: clamp(1.3rem, 4vw, 2rem);
}

.topbar p {
  margin: 5px 0;
  font-size: 0.85rem;
}

.topbar button {
  padding: 10px 12px;
  border: 0;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.92);
  color: #487491;
  cursor: pointer;
}

.map-panel {
  position: relative;
  width: min(100%, 680px);
  height: min(75dvh, 640px);
  min-height: 410px;
  margin: 20px auto 0;
  border: 4px solid #548b99;
  border-radius: 10px;
  background: linear-gradient(#87c5e6, #d7efcf);
  box-sizing: border-box;
}

.paths {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.paths line {
  stroke: #548b99;
  opacity: 0.45;
  stroke-width: 1.2;
  stroke-dasharray: 2.2 1.7;
}

.paths line.lit {
  stroke: #fff8e8;
  opacity: 1;
  stroke-width: 1.6;
}

.level-node {
  position: absolute;
  transform: translate(-50%, -50%);
  width: clamp(42px, 10vw, 64px);
  height: clamp(42px, 10vw, 64px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px solid #548b99;
  border-radius: 50%;
  background: #fff8e8;
  color: #36566a;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  z-index: 1;
}

.level-node small {
  font-size: 0.65rem;
}

.level-node.complete {
  background: #9ae1b5;
}

.level-node.final {
  border-width: 4px;
}

.level-node.locked {
  background: #bacdd1;
  opacity: 0.85;
  cursor: not-allowed;
}

.help {
  text-align: center;
  font-size: 0.85rem;
}
</style>
