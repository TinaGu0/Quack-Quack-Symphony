<template>
  <div class="field">
    <BackgroundView ref="bg" :lanes="LANES" />
    <button
      v-for="n in notes"
      :key="n.id"
      :data-id="n.id"
      class="note"
      :style="{ left: n.lane * (100 / LANES) + '%', width: 100 / LANES + '%' }"
      @pointerdown="tryHit(n.id)"
      @animationend="remove(n.id)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import BackgroundView from "./BackgroundView.vue";

const LANES = 6;
const KEYS = ["a", "s", "d", "j", "k", "l"];
const notes = ref<{ id: number; lane: number }[]>([]);
const bg = ref<InstanceType<typeof BackgroundView>>();
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

function onLine(id: number) {
  const el = document.querySelector<HTMLElement>(`[data-id="${id}"]`);
  const lineEl = bg.value?.line;
  if (!el || !lineEl) return false;
  const n = el.getBoundingClientRect();
  const l = lineEl.getBoundingClientRect();
  return n.bottom >= l.top && n.top <= l.bottom;
}

function onKey(e: KeyboardEvent) {
  if (e.repeat) return;
  const lane = KEYS.indexOf(e.key.toLowerCase());
  if (lane < 0) return;
  const note = notes.value.find((n) => n.lane === lane && onLine(n.id));
  if (note) tryHit(note.id);
}

function tryHit(id: number) {
  if (!onLine(id)) return;
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
.note {
  position: absolute;
  top: 0;
  height: 100px;
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