<template>
  <div class="field">
    <div
      v-for="i in LANES - 1"
      :key="'sep' + i"
      class="separator"
      :style="{ left: i * (100 / LANES) + '%' }"
    />
    <div class="line" />
    <button
      v-for="n in notes"
      :key="n.id"
      class="note"
      :style="{ left: n.lane * (100 / LANES) + '%', width: 100 / LANES + '%' }"
      @pointerdown="hit(n.id)"
      @animationend="remove(n.id)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";

const LANES = 6;
const KEYS = ["a", "s", "d", "j", "k", "l"];
const notes = ref<{ id: number; lane: number }[]>([]);
let count = 0;
let nextId = 0;
let timer = 0;

onMounted(() => {
  timer = window.setInterval(() => {
    notes.value.push({ id: nextId++, lane: Math.floor(Math.random() * LANES) });
  }, 600);
  window.addEventListener("keydown", onKey);
});
onBeforeUnmount(() => {
  clearInterval(timer);
  window.removeEventListener("keydown", onKey);
});

function onKey(e: KeyboardEvent) {
  if (e.repeat) return;
  const lane = KEYS.indexOf(e.key.toLowerCase());
  if (lane < 0) return;
  const note = notes.value.find((n) => n.lane === lane);
  if (note) hit(note.id);
}

function hit(id: number) {
  count++;
  console.log("hits:", count);
  remove(id);
}
function remove(id: number) {
  notes.value = notes.value.filter((n) => n.id !== id);
}
</script>

<style scoped>
.field {
  position: relative;
  width: min(100%, 480px);
  height: 100dvh;
  margin: 0 auto;
  overflow: hidden;
  background: #16162b;
  touch-action: none;
}
.separator {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(255, 255, 255, 0.12);
}
.line {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 20%;
  height: 4px;
  background: white;
  z-index: 1;
}
.note {
  position: absolute;
  top: 0;
  height: 48px;
  border: 0;
  border-radius: 8px;
  background: #6bd6ff;
  animation: fall 2s linear forwards;
}
@keyframes fall {
  from { transform: translateY(-60px); }
  to   { transform: translateY(100vh); }
}
</style>