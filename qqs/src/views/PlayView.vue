<template>
  <main class="play">
    <header class="hud">
      <button @click="goMap">← Map</button>
      <span>Level {{ currentLevel }}</span>
      <span>Score: {{ score }}</span>
      <span>Combo: {{ combo }}</span>
    </header>

    <RhythmField
      :notes="notes"
      :song-time="songTime"
      :jumps="jumps"
      :message="message"
      :message-key="messageKey"
      @press="pressLane"
      @release="releaseLane"
    >
      <div v-if="!started && !finished" class="overlay">
        <h1>Level {{ currentLevel }}</h1>
        <p>Use A S D J K L to tap or hold notes.</p>
        <button @click="startLevel(currentLevel)">Start Battle</button>
      </div>

      <Results
        v-if="finished"
        :level="currentLevel"
        :accuracy="accuracy"
        :rating="accuracyRating"
        :score="score"
        :hits="hits"
        :misses="misses"
        @map="goMap"
        @retry="startLevel(currentLevel)"
      />
    </RhythmField>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import RhythmField from "../components/RhythmField.vue";
import Results from "../components/Results.vue";
import { simplifyChart } from "../utils/chartUtils";
import type { Note, ChartNote } from "../utils/chartUtils";
import { isLevelUnlocked, markLevelComplete } from "../utils/levelProgress";

const router = useRouter();
const route = useRoute();

const KEYS = ["a", "s", "d", "j", "k", "l"];
const LANES = 6;

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

let audio: HTMLAudioElement | null = null;
let animationId = 0;

// Score and accuracy
const accuracy = computed(() => {
  const total = hits.value + misses.value;
  return total ? Math.round((hits.value / total) * 100) : 0;
});

const accuracyRating = computed(() => {
  if (accuracy.value === 100) return "PERFECT!";
  if (accuracy.value >= 90) return "AMAZING!";
  if (accuracy.value >= 75) return "GREAT!";
  if (accuracy.value >= 50) return "GOOD!";
  return "KEEP PRACTICING!";
});

function showMessage(text: string) {
  message.value = text;
  messageKey.value++;
}

// Music controls
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

    const chart: {
      startTime?: number;
      duration?: number;
      notes: ChartNote[];
    } = await response.json();

    startTime.value = chart.startTime ?? 0;
    levelDuration.value = chart.duration ?? 30;

    notes.value = simplifyChart(chart.notes, level).map(
      (note: ChartNote, id: number) => ({
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

    if (audio !== player) return;

    player.currentTime = startTime.value;

    if (player.seeking) {
      await new Promise<void>((resolve) => {
        player.addEventListener("seeked", () => resolve(), { once: true });
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

// Hit and miss logic
function missNote() {
  misses.value++;
  combo.value = 0;
  showMessage("MISS");
}

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

// Main game loop
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

// Keyboard and hold notes
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

  // Allow releasing up to 0.1 seconds early
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
    pressLane(lane);
  }
}

function keyUp(event: KeyboardEvent) {
  const lane = KEYS.indexOf(event.key.toLowerCase());

  if (lane !== -1) {
    releaseLane(lane);
  }
}

onMounted(() => {
  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);
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
  font-family: "Lilita One", system-ui, sans-serif;
  font-size: 1rem;
  cursor: pointer;
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
