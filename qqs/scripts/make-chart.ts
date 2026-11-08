import decode from "audio-decode";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { loadEnvFile } from "node:process";
import { createRequire } from "node:module";

loadEnvFile(".env");

const require = createRequire(import.meta.url);
const { Essentia, EssentiaWASM } = require("essentia.js");

const apiKey = process.env.GEMINI_API_KEY;
const level = Number(process.argv[2]);

if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

if (!Number.isInteger(level) || level < 1 || level > 9) {
  throw new Error("Level must be between 1 and 9");
}

type Note = {
  time: number;
  lane: number;
  type: "tap" | "hold";
  duration: number;
};

type GeneratedNote = {
  time: number;
  lane: number;
  type: "tap" | "hold";
  endTime?: number;
};

// each level has different difficulty
const targetNotes = [30, 40, 50, 60, 70, 80, 90, 100, 110];
const target = targetNotes[level - 1];

// load the MP3
const songPath = `public/music/level-${level}.mp3`;
const audio = await decode(await readFile(songPath));

const startTimes = [50, 40, 32, 50, 25, 48, 0, 30, 30];

const start = startTimes[level - 1];
const duration = Math.min(30, audio.duration - start);
const sampleRate = audio.sampleRate;

console.log("Analyzing song with Essentia.js...");

// get the first 30 seconds
const samples = audio
  .getChannelData(0)
  .slice(
    Math.floor(start * sampleRate),
    Math.floor((start + duration) * sampleRate),
  );

// resample if the MP3 has a different sample rate than expected rate
let signalSamples = samples;

if (sampleRate !== 44100) {
  const newLength = Math.floor((samples.length * 44100) / sampleRate);
  signalSamples = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const position = (i * sampleRate) / 44100;
    const index = Math.floor(position);
    const fraction = position - index;

    const a = samples[index] ?? 0;
    const b = samples[Math.min(index + 1, samples.length - 1)] ?? a;

    signalSamples[i] = a + (b - a) * fraction;
  }
}

// detect BPM and actual beats
const essentia = new Essentia(EssentiaWASM);
const signal = essentia.arrayToVector(signalSamples);

const analysis = essentia.RhythmExtractor2013(signal);

const bpm = Number(analysis.bpm.toFixed(2));

const beats: number[] = Array.from(
  essentia.vectorToArray(analysis.ticks) as Float32Array,
  (time) => Number(time.toFixed(3)),
).filter((time) => Number.isFinite(time) && time >= 2 && time < duration);

signal.delete();
analysis.ticks.delete();

console.log("Detected BPM:", bpm);
console.log("Detected beats:", beats.length);

if (!Number.isFinite(bpm) || bpm <= 0 || beats.length < 10) {
  throw new Error("Could not detect a reliable beat grid");
}

// use actual beats and half-beats for more note positions
const allowedTimes: number[] = [];

for (let i = 0; i < beats.length; i++) {
  allowedTimes.push(beats[i]);

  if (i + 1 < beats.length) {
    const halfway = (beats[i] + beats[i + 1]) / 2;
    allowedTimes.push(Number(halfway.toFixed(3)));
  }
}

console.log("Possible note positions:", allowedTimes.length);

// gemini to design the chart
const prompt = `Create a rhythm-game chart for difficulty ${level}/9.

Detected BPM: ${bpm}
Allowed note timestamps in seconds:
${JSON.stringify(allowedTimes)}

Rules:
- Use ONLY the provided timestamps.
- Six lanes numbered 0 to 5.
- Use tap and hold notes.
- Tap notes have no endTime.
- Hold notes have an endTime from the timestamp list.
- No overlapping notes in the same lane.
- Aim for approximately ${target} notes.
- Notes should follow a consistent musical rhythm.
- Do not leave long empty gaps.
- Spread notes throughout the full ${duration} seconds.
- Don't have repetitive notes.

Difficulty:
- Levels 1-2: simple taps, mostly single notes.
- Levels 3-4: add holds and faster taps.
- Levels 5-6: add simultaneous double taps.
- Levels 7-9: faster combinations and more complex patterns.
- Higher levels should have more notes and harder patterns.
- Keep patterns playable with A S D J K L.

Return ONLY JSON:
{"notes":[{"time":2.5,"lane":2,"type":"tap"}]}
`;

console.log("Generating notes with Gemini...");

const response = await fetch(
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent",
  {
    method: "POST",
    signal: AbortSignal.timeout(30000),
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    }),
  },
);

const result = await response.json();

if (!response.ok) {
  throw new Error(JSON.stringify(result));
}

const answer = result.candidates?.[0]?.content?.parts
  ?.map((part: { text?: string }) => part.text ?? "")
  .join("");

if (!answer) throw new Error("Gemini returned no notes");

await writeFile("gemini-debug.json", answer);

const generated = JSON.parse(answer);

if (!generated || !Array.isArray(generated.notes)) {
  throw new Error("Gemini did not return a valid notes array");
}

console.log("Gemini generated:", generated.notes.length);

const notes: Note[] = [];

for (const note of generated.notes ?? []) {
  if (note.type !== "tap" && note.type !== "hold") continue;
  if (!Number.isInteger(note.lane) || note.lane < 0 || note.lane > 5) continue;

  const time = allowedTimes.find((t) => Math.abs(t - note.time) < 0.01);

  if (time === undefined) continue;

  let duration = 0;

  if (note.type === "hold") {
    const end = allowedTimes.find(
      (t) => t > time && Math.abs(t - Number(note.endTime)) < 0.01,
    );

    if (end === undefined) continue;

    duration = Number((end - time).toFixed(3));
  }

  notes.push({
    time,
    lane: note.lane,
    type: note.type,
    duration,
  });
}

// Fill in missing notes if Gemini generated too few.
if (notes.length < target) {
  console.log("Adding notes to fill large gaps...");

  const step = Math.max(1, Math.floor(allowedTimes.length / target));

  for (let i = 0; i < allowedTimes.length && notes.length < target; i += step) {
    const time = allowedTimes[i];

    // don't put new note right next to an existing one
    if (notes.some((note) => Math.abs(note.time - time) < 0.2)) {
      continue;
    }

    notes.push({
      time,
      lane: i % 6,
      type: "tap",
      duration: 0,
    });
  }
}

// sort and remove overlapping notes
notes.sort((a, b) => a.time - b.time);

const cleanNotes: Note[] = [];
const laneEnds = Array<number>(6).fill(-1);

for (const note of notes) {
  if (note.time < laneEnds[note.lane] + 0.05) {
    continue;
  }

  cleanNotes.push(note);
  laneEnds[note.lane] = note.time + note.duration;
}

if (!cleanNotes.length) {
  throw new Error("No valid notes generated");
}

await mkdir("public/charts", { recursive: true });

await writeFile(
  `public/charts/level-${level}.json`,
  JSON.stringify(
    {
      level,
      bpm,
      startTime: start,
      duration,
      notes: cleanNotes,
    },
    null,
    2,
  ),
);

console.log(`Level ${level} chart created!`);
console.log(`Total notes: ${cleanNotes.length}`);
