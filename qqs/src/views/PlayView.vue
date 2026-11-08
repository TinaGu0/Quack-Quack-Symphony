<template>
  <main class="game">
    <h1>🪿 Quack Quack Symphony</h1>

    <section v-if="screen === 'levels'">
      <h2>Choose a Level</h2>

      <div class="levels">
        <button
          v-for="level in 9"
          :key="level"
          :disabled="level > unlocked"
          @click="startLevel(level)"
        >
          Level {{ level }}
          {{ level > unlocked ? "🔒" : "🪿" }}
        </button>
      </div>
    </section>

    <section v-else>
      <div class="stats">
        <span>Level {{ currentLevel }}</span>
        <span>Score: {{ score }}</span>
        <span>Combo: {{ combo }}</span>
      </div>

      <div class="sky">
        <div class="goose" :class="{ flap: flapping }">🪿</div>

        <div class="lanes">
          <div
            v-for="(key, lane) in keys"
            :key="key"
            class="lane"
            @pointerdown="pressLane(lane)"
            @pointerup="releaseLane(lane)"
          >
            <div
              v-for="note in visibleNotes(lane)"
              :key="note.id"
              class="note"
              :class="note.type"
              :style="notePosition(note)"
            >
              {{ note.type === "hold" ? "▬" : "♪" }}
            </div>

            <span class="key">{{ key.toUpperCase() }}</span>
          </div>
        </div>

        <div class="hitline"></div>
        <h2 class="judgment">{{ message }}</h2>
      </div>

      <p>Use A S D J K L to tap or hold notes!</p>
      <button @click="stopGame">Back</button>

      <div v-if="finished" class="results">
        <h2>Flight Complete! 🪿</h2>
        <p>Score: {{ score }}</p>
        <p>Accuracy: {{ accuracy }}%</p>
        <button @click="stopGame">Continue</button>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";

type Note = {
  id: number;
  time: number;
  lane: number;
  type: "tap" | "hold";
  duration: number;
  done: boolean;
  holding: boolean;
};

const keys = ["a", "s", "d", "j", "k", "l"];

const screen = ref<"levels" | "game">("levels");
const currentLevel = ref(1);
const unlocked = ref(Number(localStorage.getItem("unlocked") || 1));

const notes = ref<Note[]>([]);
const songTime = ref(0);
const score = ref(0);
const combo = ref(0);
const hits = ref(0);
const misses = ref(0);
const message = ref("");
const flapping = ref(false);
const finished = ref(false);

let audio: HTMLAudioElement | null = null;
let animationId = 0;
let flapTimer = 0;

const hitWindow = 0.2;
const travelTime = 2;

const accuracy = computed(() => {
  const total = hits.value + misses.value;
  return total ? Math.round((hits.value / total) * 100) : 0;
});

// Load the generated chart and start music
async function startLevel(level: number) {
  stopAudio();

  currentLevel.value = level;
  score.value = 0;
  combo.value = 0;
  hits.value = 0;
  misses.value = 0;
  songTime.value = 0;
  finished.value = false;
  message.value = "";

  try {
    const response = await fetch(`/charts/level-${level}.json`);

    if (!response.ok) throw new Error("Chart not found");

    const chart = await response.json();

    notes.value = chart.notes.map(
      (note: Omit<Note, "id" | "done" | "holding">, id: number) => ({
        ...note,
        id,
        done: false,
        holding: false,
      }),
    );

    if (!notes.value.length) throw new Error("No notes");

    audio = new Audio(`/music/level-${level}.mp3`);
    await audio.play();

    screen.value = "game";
    animationId = requestAnimationFrame(update);
  } catch (error) {
    console.error(error);
    alert("Could not load the song or chart.");
    stopAudio();
    screen.value = "levels";
  }
}

// Update note timing
function update() {
  if (!audio || finished.value) return;

  songTime.value = audio.currentTime;

  for (const note of notes.value) {
    if (note.done) continue;

    if (note.holding) {
      if (songTime.value >= note.time + note.duration) {
        hitNote(note);
      }
    } else if (songTime.value > note.time + hitWindow) {
      note.done = true;
      misses.value++;
      combo.value = 0;
      message.value = "MISS";
    }
  }

  if (notes.value.every((note) => note.done)) {
    finishLevel();
    return;
  }

  animationId = requestAnimationFrame(update);
}

// Get approaching notes
function visibleNotes(lane: number) {
  return notes.value.filter(
    (note) =>
      note.lane === lane &&
      !note.done &&
      note.time >= songTime.value - hitWindow &&
      note.time <= songTime.value + travelTime,
  );
}

// Move notes toward the hit line
function notePosition(note: Note) {
  const remaining = note.time - songTime.value;

  return {
    top: `${80 - (remaining / travelTime) * 75}%`,
  };
}

// Player presses a key
function pressLane(lane: number) {
  if (screen.value !== "game" || finished.value) return;

  const note = notes.value.find(
    (note) =>
      note.lane === lane &&
      !note.done &&
      !note.holding &&
      Math.abs(note.time - songTime.value) <= hitWindow,
  );

  if (!note) return;

  if (note.type === "hold") {
    note.holding = true;
    flapGoose();
    message.value = "HOLD";
  } else {
    hitNote(note);
  }
}

// Player releases a key
function releaseLane(lane: number) {
  const note = notes.value.find(
    (note) => note.lane === lane && note.holding && !note.done,
  );

  if (!note) return;

  if (songTime.value >= note.time + note.duration - 0.1) {
    hitNote(note);
  } else {
    note.done = true;
    note.holding = false;
    misses.value++;
    combo.value = 0;
    message.value = "MISS";
  }
}

// Successful hit
function hitNote(note: Note) {
  if (note.done) return;

  note.done = true;
  note.holding = false;
  hits.value++;
  combo.value++;

  score.value += 100 + combo.value * 5;
  message.value = "PERFECT!";

  flapGoose();
}

function flapGoose() {
  flapping.value = true;
  clearTimeout(flapTimer);

  flapTimer = window.setTimeout(() => {
    flapping.value = false;
  }, 180);
}

// Complete level
function finishLevel() {
  finished.value = true;
  audio?.pause();

  if (accuracy.value >= 60 && currentLevel.value < 9) {
    unlocked.value = Math.max(unlocked.value, currentLevel.value + 1);
    localStorage.setItem("unlocked", String(unlocked.value));
  }
}

function stopAudio() {
  cancelAnimationFrame(animationId);
  audio?.pause();
  audio = null;
}

function stopGame() {
  stopAudio();
  screen.value = "levels";
}

function keyDown(event: KeyboardEvent) {
  if (event.repeat) return;

  const lane = keys.indexOf(event.key.toLowerCase());
  if (lane !== -1) pressLane(lane);
}

function keyUp(event: KeyboardEvent) {
  const lane = keys.indexOf(event.key.toLowerCase());
  if (lane !== -1) releaseLane(lane);
}

onMounted(() => {
  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);
});

onUnmounted(() => {
  window.removeEventListener("keydown", keyDown);
  window.removeEventListener("keyup", keyUp);
  stopAudio();
  clearTimeout(flapTimer);
});
</script>

<style scoped>
.game {
  min-height: 100vh;
  padding: 25px;
  text-align: center;
  font-family: monospace;
  color: #36566a;
  background: linear-gradient(#a6daed, #e2efd5);
}

.levels {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  max-width: 600px;
  margin: 30px auto;
}

button {
  padding: 15px;
  border: 2px solid #548b99;
  border-radius: 10px;
  background: #fff8e8;
  cursor: pointer;
}

button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.stats {
  max-width: 480px;
  margin: auto;
  padding: 15px;
  display: flex;
  justify-content: space-around;
  background: #fff8e8;
}

.sky {
  position: relative;
  max-width: 480px;
  height: 540px;
  margin: auto;
  overflow: hidden;
  border: 4px solid #548b99;
  background: linear-gradient(#87c5e6, #d7efcf);
}

.goose {
  position: absolute;
  top: 50px;
  left: 45%;
  font-size: 65px;
  transition: transform 0.15s;
}

.goose.flap {
  transform: translateY(-25px) rotate(-15deg);
}

.lanes {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
}

.lane {
  position: relative;
  border-right: 1px solid #ffffff90;
}

.note {
  position: absolute;
  left: 10%;
  width: 80%;
  height: 30px;
  display: grid;
  place-items: center;
  border: 2px solid white;
  border-radius: 8px;
  background: #ffdc83;
  font-size: 20px;
}

.note.hold {
  height: 55px;
  background: #9ae1b5;
}

.hitline {
  position: absolute;
  top: 80%;
  width: 100%;
  height: 4px;
  background: white;
  pointer-events: none;
}

.key {
  position: absolute;
  top: 85%;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px;
  border-radius: 5px;
  color: white;
  background: #548b99;
}

.judgment {
  position: absolute;
  top: 40%;
  width: 100%;
  color: #fff4a3;
  text-shadow: 2px 2px #548b99;
  pointer-events: none;
}

.results {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
  background: #315c70ee;
}
</style>
