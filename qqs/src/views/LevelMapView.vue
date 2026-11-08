<template>
  <main class="map-page">
    <div class="map-wrap">
      <img class="map-image" src="/maps/map.png" alt="Map" />
      <button class="back-button" @click="router.push('/home')">← Back</button>
      <button class="node tutorial" @click="router.push('/tutorial')">
        Tutorial
      </button>

      <button
        v-for="level in LEVELS"
        :key="level.id"
        class="node level-node"
        :class="{
          locked: !unlocked(level.id),
          complete: completed.includes(level.id),
          final: level.id === 9,
        }"
        :style="{
          left: level.x + '%',
          top: level.y + '%',
        }"
        :disabled="!unlocked(level.id)"
        @click="playLevel(level.id)"
      >
        {{ level.id }}
      </button>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted, onActivated } from "vue";
import { useRouter } from "vue-router";
import { getCompletedLevels, isLevelUnlocked } from "../utils/levelProgress";

const router = useRouter();

const LEVELS = [
  { id: 1, x: 38, y: 73.5 },
  { id: 2, x: 66, y: 73.5 },
  { id: 3, x: 18, y: 61.5 },
  { id: 4, x: 38, y: 41.5 },
  { id: 5, x: 66, y: 41.5 },
  { id: 6, x: 82, y: 57.5 },
  { id: 7, x: 18, y: 22 },
  { id: 8, x: 82, y: 22 },
  { id: 9, x: 50, y: 8 },
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
  overflow: hidden;
  background: #a6ded2;
}

.map-wrap {
  position: relative;
  width: min(100vw, 100dvh);
  height: min(100vw, 100dvh);
  margin: 0 auto;
}

.map-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
  image-rendering: pixelated;
}

.topbar {
  max-width: 760px;
  margin: 14px auto 8px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.topbar button {
  padding: 10px 14px;
  border: 0;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.92);
  color: #487491;
  font-size: 1rem;
  cursor: pointer;
}

.back-button {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 5;
  padding: 9px 16px;
  border: 0;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9);
  color: #487491;
  font-family: monospace;
  cursor: pointer;
}

.title-wrap {
  flex: 1;
  text-align: center;
}

.title-wrap h1 {
  margin: 0;
  font-size: 1.5rem;
}

.title-wrap p {
  margin: 4px 0 0;
  font-size: 0.9rem;
  color: #dbe9ef;
}

.node {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  z-index: 2;
  border: 1px solid rgba(255, 255, 255, 0.9);
  font-family: monospace;
  font-weight: bold;
  cursor: pointer;
}

.node:disabled {
  cursor: not-allowed;
}

.tutorial {
  left: 50%;
  top: 92%;
  transform: translate(-50%, -50%);
  width: auto;
  height: auto;
  padding: 8px 16px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.94);
  color: #487491;
  white-space: nowrap;
  text-align: center;
}

.level-node {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: #3d6177;
  font-size: 0.9rem;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.18);
}
.level-node:hover:not(:disabled) {
  transform: translate(-50%, -50%) scale(1.08);
}

.level-node.complete {
  background: rgba(154, 225, 181, 0.82);
  color: #2f5c45;
}

.level-node.locked {
  background: rgba(255, 255, 255, 0.38);
  color: rgba(61, 97, 119, 0.55);
  cursor: not-allowed;
}

.level-node.final {
  border: 2px solid #fff7c2;
}
</style>
