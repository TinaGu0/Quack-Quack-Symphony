<template>
  <div class="play">
    <div class="field">
      <BackgroundView ref="bg" :lanes="LANES" />
      <img
        v-for="(j, lane) in jumps"
        :key="lane + '-' + j"
        class="bird"
        :class="{ jump: j > 0 }"
        :style="{ left: lane * (100 / LANES) + '%', width: 100 / LANES + '%' }"
        src="/rhythm_bg/flying.png"
        alt=""
      />
      <div
        v-for="(k, lane) in KEYS"
        :key="'key-' + k"
        class="keycap"
        :style="{ left: lane * (100 / LANES) + '%', width: 100 / LANES + '%' }"
      >
        {{ k.toUpperCase() }}
      </div>
      <div v-if="judge" :key="judge.n" class="judge" :class="judge.text">
        {{ judge.text }}
      </div>
      <button
        v-for="n in notes"
        :key="n.id"
        :data-id="n.id"
        class="note"
        :style="{ left: n.lane * (100 / LANES) + '%', width: 100 / LANES + '%' }"
        @pointerdown="tryHit(n.id)"
        @animationend="missed(n.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import BackgroundView from "../components/BackgroundView.vue";

const LANES = 6;
const KEYS = ["a", "s", "d", "j", "k", "l"];

type Judgment = "perfect" | "good" | "miss";

const notes = ref<{ id: number; lane: number }[]>([]);
const jumps = ref<number[]>(Array(LANES).fill(0));
const judge = ref<{ text: Judgment; n: number } | null>(null);
const bg = ref<InstanceType<typeof BackgroundView>>();
let count = 0;
let nextId = 0;
let judgeCount = 0;
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

function show(text: Judgment) {
  judge.value = { text, n: ++judgeCount };
}

function grade(id: number): Judgment | null {
  const el = document.querySelector<HTMLElement>(`[data-id="${id}"]`);
  const lineEl = bg.value?.line;
  if (!el || !lineEl) return null;
  const n = el.getBoundingClientRect();
  const l = lineEl.getBoundingClientRect();
  if (n.bottom < l.top || n.top > l.bottom) return null;
  const p = ((l.top + l.bottom) / 2 - n.top) / n.height;
  return p >= 0.25 && p <= 0.75 ? "perfect" : "good";
}

function onKey(e: KeyboardEvent) {
  if (e.repeat) return;
  const lane = KEYS.indexOf(e.key.toLowerCase());
  if (lane < 0) return;
  const note = notes.value.find((n) => n.lane === lane && grade(n.id));
  if (note) tryHit(note.id);
}

function tryHit(id: number) {
  const g = grade(id);
  if (!g) return;
  show(g);
  const note = notes.value.find((n) => n.id === id);
  if (note) jumps.value[note.lane]++;
  count++;
  console.log("hits:", count);
  remove(id);
}

function missed(id: number) {
  show("miss");
  remove(id);
}

function remove(id: number) {
  notes.value = notes.value.filter((n) => n.id !== id);
}
</script>

<style scoped>
.play {
  position: fixed;
  inset: 0;
  background: #000;
}
.field {
  position: relative;
  width: min(100%, 480px);
  height: 100dvh;
  margin: 0 auto;
  overflow: hidden;
  background: #000 url("/rhythm_bg/sky.png") center / cover no-repeat;
  touch-action: none;
}
.bird {
  position: absolute;
  bottom: 20%;
  margin-bottom: -40px;
  height: auto;
  z-index: 2;
  pointer-events: none;
}
.bird.jump {
  animation: hop 0.25s ease-out;
}
@keyframes hop {
  0%   { transform: translateY(0); }
  40%  { transform: translateY(-24px); }
  100% { transform: translateY(0); }
}
.keycap {
  position: absolute;
  bottom: 12%;
  text-align: center;
  font-size: 1.6rem;
  color: #fff;
  z-index: 2;
  pointer-events: none;
}
.judge {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 6%;
  text-align: center;
  font-size: 2.2rem;
  text-transform: uppercase;
  z-index: 3;
  pointer-events: none;
  animation: pop 0.25s ease-out;
}
.judge.perfect { color: #ffd66b; }
.judge.good { color: #6bd6ff; }
.judge.miss { color: #ff6b6b; }
@keyframes pop {
  from { transform: scale(0.7); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
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