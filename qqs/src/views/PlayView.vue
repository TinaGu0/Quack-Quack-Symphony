<template>
  <main class="play">
    <header class="hud">
      <button @click="goMap">← Map</button>
      <span>Level {{ currentLevel }}</span>
      <span>Score: {{ score }}</span>
      <span>Combo: {{ combo }}</span>
    </header>

    <div class="field">
      <BackgroundView :lanes="LANES" />

      <div class="lanes">
        <div
          v-for="(key, lane) in KEYS"
          :key="key"
          class="lane"
          @pointerdown.prevent="pressLane(lane)"
          @pointerup.prevent="releaseLane(lane)"
          @pointercancel="releaseLane(lane)"
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

      <div v-if="!started && !finished" class="overlay">
        <h1>Level {{ currentLevel }}</h1>
        <p>Use A S D J K L to tap or hold notes.</p>
        <button @click="startLevel(currentLevel)">Start Battle</button>
      </div>

      <div v-if="finished" class="overlay">
        <h1>Battle Complete!</h1>

        <h2>{{ accuracy }}% Accuracy</h2>
        <p>{{ accuracyRating }}</p>

        <p>Score: {{ score }}</p>
        <p>Perfect: {{ hits }} | Missed: {{ misses }}</p>

        <button @click="goMap">Level Map</button>
        <button @click="startLevel(currentLevel)">Retry</button>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import BackgroundView from "../components/BackgroundView.vue";
import { isLevelUnlocked, markLevelComplete } from "../utils/levelProgress";

const router = useRouter();
const route = useRoute();

type Note = {
  id: number;
  time: number;
  lane: number;
  type: "tap" | "hold";
  duration: number;
  done: boolean;
  holding: boolean;
};

const LANES = 6;
const KEYS = ["a", "s", "d", "j", "k", "l"];

const requested = Number(route.query.level ?? 1);

const currentLevel = ref(
  Number.isInteger(requested) && requested >= 1 && requested <= 9
    ? requested
    : 1,
);

const notes = ref<Note[]>([]);
const songTime = ref(0);
const score = ref(0);
const combo = ref(0);
const hits = ref(0);
const misses = ref(0);

const started = ref(false);
const finished = ref(false);

const message = ref("");
const messageKey = ref(0);

const jumps = ref<number[]>(Array(LANES).fill(0));

const startTime = ref(0);
const levelDuration = ref(30);

const perfectWindow = 0.1;
const goodWindow = 0.25;
const hitWindow = goodWindow;
const travelTime = 2;

const noteLimits: Record<number, number> = {
  1: 35,
  2: 45,
  3: 50,
  4: 60,
  5: 55,
  6: 60,
  7: 65,
  8: 70,
  9: 75,
};

function simplifyChart(chartNotes: any[], level: number) {
  const limit = noteLimits[level] ?? chartNotes.length;

  if (chartNotes.length <= limit) return chartNotes;

  const result = [];

  for (let i = 0; i < limit; i++) {
    const index = Math.floor((i * chartNotes.length) / limit);

    result.push(chartNotes[index]);
  }

  return result;
}

let audio: HTMLAudioElement | null = null;
let animationId = 0;

const accuracy = computed(() => {
  const total = hits.value + misses.value;

  return total ? Math.round((hits.value / total) * 100) : 0;
});

function showMessage(text: string) {
  message.value = text;
  messageKey.value++;
}

function stopAudio() {
  cancelAnimationFrame(animationId);
  audio?.pause();
  audio = null;
  started.value = false;
}

function goMap() {
  stopAudio();
  router.push("/levels");
}

async function startLevel(level: number) {
  if (!isLevelUnlocked(level)) {
    router.push("/levels");
    return;
  }

  stopAudio();

  currentLevel.value = level;
  score.value = 0;
  combo.value = 0;
  hits.value = 0;
  misses.value = 0;
  songTime.value = 0;
  finished.value = false;
  message.value = "";
  jumps.value = Array(LANES).fill(0);

  try {
    const response = await fetch(`/charts/level-${level}.json`);

    if (!response.ok) {
      throw new Error(`Missing chart for level ${level}`);
    }

    const chart = await response.json();

    startTime.value = chart.startTime ?? 0;
    levelDuration.value = chart.duration ?? 30;

    notes.value = simplifyChart(chart.notes, level).map(
      (note: Omit<Note, "id" | "done" | "holding">, id: number) => ({
        ...note,
        id,
        done: false,
        holding: false,
      }),
    );

    if (!notes.value.length) {
      throw new Error("No notes in chart");
    }

    const player = new Audio(`/music/level-${level}.mp3`);
    audio = player;

    if (player.readyState < 1) {
      await new Promise<void>((resolve, reject) => {
        player.addEventListener("loadedmetadata", () => resolve(), {
          once: true,
        });

        player.addEventListener(
          "error",
          () => reject(new Error("Could not load MP3")),
          { once: true },
        );
      });
    }

    player.currentTime = startTime.value;

    if (player.seeking) {
      await new Promise<void>((resolve) => {
        player.addEventListener("seeked", () => resolve(), {
          once: true,
        });
      });
    }

    if (audio !== player) return;

    await player.play();

    started.value = true;
    animationId = requestAnimationFrame(update);
  } catch (error) {
    console.error(error);
    stopAudio();
    alert("Could not load the song or chart.");
  }
}

function missNote() {
  misses.value++;
  combo.value = 0;
  showMessage("MISS");
}

const accuracyRating = computed(() => {
  if (accuracy.value === 100) return "PERFECT!";
  if (accuracy.value >= 90) return "AMAZING!";
  if (accuracy.value >= 75) return "GREAT!";
  if (accuracy.value >= 50) return "GOOD!";
  return "KEEP PRACTICING!";
});

function hitNote(note: Note, judgment: "PERFECT!" | "GOOD!") {
  if (note.done) return;

  note.done = true;
  note.holding = false;

  hits.value++;
  combo.value++;

  score.value += judgment === "PERFECT!" ? 100 : 50;

  jumps.value[note.lane]++;

  showMessage(judgment);
}

function update() {
  if (!audio || finished.value || !started.value) return;

  songTime.value = audio.currentTime - startTime.value;

  for (const note of notes.value) {
    if (note.done) continue;

    if (note.holding) {
      if (songTime.value >= note.time + note.duration) {
        hitNote(note, "PERFECT!");
      }
    } else if (songTime.value > note.time + hitWindow) {
      note.done = true;
      missNote();

      if (finished.value) return;
    }
  }

  if (songTime.value >= levelDuration.value) {
    finished.value = true;
    audio.pause();

    markLevelComplete(currentLevel.value);
    return;
  }

  animationId = requestAnimationFrame(update);
}

function visibleNotes(lane: number) {
  return notes.value.filter(
    (note) =>
      note.lane === lane &&
      !note.done &&
      (note.holding ||
        (note.time >= songTime.value - hitWindow &&
          note.time <= songTime.value + travelTime)),
  );
}

function notePosition(note: Note) {
  const remaining = note.time - songTime.value;

  return {
    top: `${80 - (remaining / travelTime) * 75}%`,
  };
}

function pressLane(lane: number) {
  if (!started.value || finished.value || !audio) return;

  songTime.value = audio.currentTime - startTime.value;

  const note = notes.value.find(
    (note) =>
      note.lane === lane &&
      !note.done &&
      !note.holding &&
      Math.abs(note.time - songTime.value) <= goodWindow,
  );

  if (!note) return;

  const difference = Math.abs(note.time - songTime.value);

  if (note.type === "hold") {
    note.holding = true;
    showMessage("HOLD");
  } else {
    hitNote(note, difference <= perfectWindow ? "PERFECT!" : "GOOD!");
  }
}

function releaseLane(lane: number) {
  if (!audio || finished.value) return;

  songTime.value = audio.currentTime - startTime.value;

  const note = notes.value.find(
    (note) => note.lane === lane && note.holding && !note.done,
  );

  if (!note) return;

  if (songTime.value >= note.time + note.duration - 0.1) {
    hitNote(note, "PERFECT!");
  } else {
    note.done = true;
    note.holding = false;
    missNote();
  }
}

function keyDown(event: KeyboardEvent) {
  if (event.repeat) return;

  const lane = KEYS.indexOf(event.key.toLowerCase());

  if (lane !== -1) {
    console.log("Key pressed:", event.key);
    pressLane(lane);
  }
}

function keyUp(event: KeyboardEvent) {
  const lane = KEYS.indexOf(event.key.toLowerCase());

  if (lane !== -1) releaseLane(lane);
}

onMounted(() => {
  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);

  const selectedLevel = Number(route.query.level || 1);
  currentLevel.value = selectedLevel;
});

onUnmounted(() => {
  window.removeEventListener("keydown", keyDown);
  window.removeEventListener("keyup", keyUp);
  stopAudio();
});
</script>

<style scoped>
.play {
  position: fixed;
  inset: 0;
  background: #000;
  color: white;
}

.hud {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 8px;
  background: #203e47dd;
  font-size: 12px;
}

.hud button,
.overlay button {
  padding: 9px 14px;
  border: 0;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.92);
  color: #487491;
  cursor: pointer;
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
  height: 150px;
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
  text-transform: uppercase;
  color: #ffe286;
  z-index: 4;
  pointer-events: none;
  animation: pop 0.25s ease-out;
}

.judge {
  color: #ffe286;
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

.overlay {
  position: absolute;
  inset: 0;
  background: #183c4dd9;
  z-index: 6;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;
  padding: 25px;
}
</style>
