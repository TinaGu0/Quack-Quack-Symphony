<template>
  <main class="game">
    <h1>Quack Quack Symphony</h1>
    <button v-if="!started" @click="startLevel(1)">Start Battle</button>

    <section>
      <div class="stats">
        <span>Level {{ currentLevel }}</span>
        <span>Score: {{ score }}</span>
        <span>Combo: {{ combo }}</span>
        <span>{{ "❤️".repeat(hearts) }}{{ "🖤".repeat(3 - hearts) }}</span>
      </div>

      <div class="sky">
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
        <h2>{{ hearts === 0 ? "Game Over 💔" : "Battle Complete!" }}</h2>
        <p>Score: {{ score }}</p>
        <p>Accuracy: {{ accuracy }}%</p>
        <button @click="stopGame">Continue</button>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";

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

const currentLevel = ref(1);

const notes = ref<Note[]>([]);
const songTime = ref(0);
const score = ref(0);
const combo = ref(0);
const hearts = ref(3);
const hits = ref(0);
const misses = ref(0);
const message = ref("");
const finished = ref(false);
const started = ref(false);
const startTime = ref(0);
const levelDuration = ref(30);

let audio: HTMLAudioElement | null = null;
let animationId = 0;

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
  hearts.value = 3;
  hits.value = 0;
  misses.value = 0;
  songTime.value = 0;
  finished.value = false;
  message.value = "";

  try {
    const response = await fetch(`/charts/level-${level}.json`);

    if (!response.ok) throw new Error("Chart not found");

    const chart = await response.json();
    startTime.value = chart.startTime ?? 0;
    levelDuration.value = chart.duration ?? 30;

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
    audio.currentTime = startTime.value;
    await audio.play();
    started.value = true;

    animationId = requestAnimationFrame(update);
  } catch (error) {
    console.error(error);
    alert("Could not load the song or chart.");
    stopAudio();
  }
}

//Miss notes, subtract heart
function missNote() {
  misses.value++;
  combo.value = 0;
  hearts.value--;
  message.value = "MISS";

  if (hearts.value <= 0) {
    finished.value = true;
    audio?.pause();
    message.value = "GAME OVER";
  }
}

// Update note timing
function update() {
  if (!audio || finished.value) return;

  songTime.value = audio.currentTime - startTime.value;

  for (const note of notes.value) {
    if (note.done) continue;

    if (note.holding) {
      if (songTime.value >= note.time + note.duration) {
        hitNote(note);
      }
    } else if (songTime.value > note.time + hitWindow) {
      note.done = true;
      missNote();

      if (finished.value) return;
    }
  }

  if (songTime.value >= levelDuration.value) {
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
  if (finished.value || !audio) return;

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
    message.value = "HOLD";
  } else {
    hitNote(note);
  }
}

// Player releases a key
function releaseLane(lane: number) {
  if (!audio || finished.value) return;
  const note = notes.value.find(
    (note) => note.lane === lane && note.holding && !note.done,
  );

  if (!note) return;

  if (songTime.value >= note.time + note.duration - 0.1) {
    hitNote(note);
  } else {
    note.done = true;
    note.holding = false;
    missNote();
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
}

// Complete level
function finishLevel() {
  finished.value = true;
  audio?.pause();
}

function stopAudio() {
  cancelAnimationFrame(animationId);
  audio?.pause();
  audio = null;
  started.value = false;
}

const router = useRouter();

function stopGame() {
  stopAudio();
  started.value = false;
  router.push("/home");
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
