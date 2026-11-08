<template>
  <div class="field">
    <BackgroundView :lanes="LANES" />

    <div class="lanes">
      <div
        v-for="(key, lane) in KEYS"
        :key="key"
        class="lane"
        @pointerdown.prevent="emit('press', lane)"
        @pointerup.prevent="emit('release', lane)"
        @pointercancel="emit('release', lane)"
      >
        <div
          v-for="note in visibleNotes(lane)"
          :key="note.id"
          class="note"
          :class="{
            hold: note.type === 'hold',
            holding: note.holding,
          }"
          :style="notePosition(note)"
        ></div>

        <span class="keycap">{{ key.toUpperCase() }}</span>
      </div>
    </div>

    <div class="hitline"></div>

    <img
      v-for="(j, lane) in jumps"
      :key="`${lane}-${j}`"
      class="bird"
      :class="{ jump: j > 0 }"
      :style="{
        left: `${(lane * 100) / LANES}%`,
        width: `${100 / LANES}%`,
      }"
      src="/rhythm_bg/flying.png"
      alt=""
    />

    <div
      v-if="message"
      :key="messageKey"
      class="judge"
      :class="{ good: message === 'GOOD!' }"
    >
      {{ message }}
    </div>

    <slot />
  </div>
</template>

<script setup lang="ts">
import BackgroundView from "./BackgroundView.vue";
import type { Note } from "../utils/chartUtils";

const props = defineProps<{
  notes: Note[];
  songTime: number;
  jumps: number[];
  message: string;
  messageKey: number;
}>();

const emit = defineEmits<{
  press: [lane: number];
  release: [lane: number];
}>();

const LANES = 6;
const KEYS = ["a", "s", "d", "j", "k", "l"];
const travelTime = 2;
const hitWindow = 0.25;

function visibleNotes(lane: number) {
  return props.notes.filter(
    (note) =>
      note.lane === lane &&
      !note.done &&
      (note.holding ||
        (note.time >= props.songTime - hitWindow &&
          note.time <= props.songTime + travelTime)),
  );
}

function notePosition(note: Note) {
  const remaining = note.time - props.songTime;

  const style: Record<string, string> = {
    top: `${80 - (remaining / travelTime) * 75}%`,
  };

  if (note.type === "hold") {
    const durationHeight = (note.duration / travelTime) * 75;

    style.height = `${Math.max(12, durationHeight)}%`;
    style.transform = "translateY(-100%)";
  }

  return style;
}
</script>

<style scoped>
.field {
  position: relative;
  width: min(100%, 480px);
  height: 100dvh;
  margin: 0 auto;
  overflow: hidden;
  background: #000 url("/rhythm_bg/sky.png") center / cover no-repeat;
  touch-action: none;
}

.lanes {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  z-index: 1;
}

.lane {
  position: relative;
  border-right: 1px solid #ffffff50;
  touch-action: none;
}

.note {
  position: absolute;
  left: 0;
  width: 100%;
  height: 100px;
  border: 0;
  border-radius: 8px;
  background: #6bd6ff;
  pointer-events: none;
  transform: translateY(-50%);
}

.note.hold {
  background: #ffe48c;
  border: 2px solid #ffffff;
  box-sizing: border-box;
}

.note.holding {
  background: #ffbb54;
  border: 3px solid #ffffff;
  box-sizing: border-box;
}

.hitline {
  position: absolute;
  top: 80%;
  left: 0;
  right: 0;
  height: 4px;
  background: white;
  z-index: 2;
  pointer-events: none;
}

.keycap {
  position: absolute;
  top: 85%;
  left: 50%;
  transform: translateX(-50%);
  font-size: 1.4rem;
  z-index: 4;
  pointer-events: none;
}

.bird {
  position: absolute;
  bottom: 20%;
  margin-bottom: -40px;
  height: auto;
  z-index: 3;
  pointer-events: none;
}

.bird.jump {
  animation: hop 0.25s ease-out;
}

@keyframes hop {
  0% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-24px);
  }
  100% {
    transform: translateY(0);
  }
}

.judge {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 7%;
  text-align: center;
  font-size: 2rem;
  color: #ffe286;
  z-index: 4;
  pointer-events: none;
  animation: pop 0.25s ease-out;
}

.judge.good {
  color: #6bd6ff;
}

@keyframes pop {
  from {
    opacity: 0;
    transform: scale(0.7);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
