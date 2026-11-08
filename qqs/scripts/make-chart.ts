import { BeatParser } from "beat-parser-core/dist/index.esm.js";
import decode from "audio-decode";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { loadEnvFile } from "node:process";

loadEnvFile(".env");

const apiKey = process.env.GEMINI_API_KEY;
const level = Number(process.argv[2]);

if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY");
}

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

const songPath = `public/music/level-${level}.mp3`;
const audio = await decode(await readFile(songPath));

const parser = new BeatParser({
  sampleRate: audio.sampleRate,
});

console.log("Starting beat detection...");

const samples = audio.getChannelData(0);

// Analyze only the first 10 seconds
const shortSamples = samples.slice(0, audio.sampleRate * 10);

const analysis = await parser.parseBuffer(shortSamples);

console.log("Analysis result:", {
  tempo: analysis.tempo,
  beats: analysis.beats?.slice(0, 10),
  totalBeats: analysis.beats?.length,
});

console.log("Beat detection finished!");

await parser.cleanup();

console.log("Cleanup finished");

const bpm = analysis.tempo?.bpm ?? 120;

const beats = analysis.beats
  .map((beat) => Number(beat.timestamp.toFixed(3)))
  .filter((time) => Number.isFinite(time) && time >= 2)
  .sort((a, b) => a - b);

if (beats.length === 0) {
  throw new Error("No usuable beats detected");
}

console.log("BPM:", bpm);
console.log("Beats detected:", beats.length);

const step = Math.max(1, Math.ceil(beats.length / 300));

const allowedTimes = beats.filter(
  (_: number, index: number) => index % step === 0,
);

const prompt = `Generate a six-lane rhythm game chart for difficulty ${level}/9.

BPM: ${bpm}
Beat timestamps (seconds): ${JSON.stringify(allowedTimes)}

Rules:
- Use only the provided timestamps.
- Lanes: 0-5.
- Notes: tap or hold.
- Tap notes have no endTime.
- Hold notes have an endTime from the timestamp list,
  later than their start time.
- Double taps are two taps at the same time
  in different lanes.
- No overlapping notes in the same lane.
- Maximum 180 notes.
- Levels 1-2: taps only.
- Levels 3-4: introduce holds.
- Levels 5-9: add double taps and harder patterns.
- Increase note density with difficulty.

Return only JSON:
{"notes":[{"time":2.5,"lane":2,"type":"tap"}]}
`;

console.log("Generating notes...");

const response = await fetch(
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
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

if (!answer) {
  throw new Error("Gemini returned no notes");
}

const generated = JSON.parse(answer) as {
  notes: GeneratedNote[];
};

const notes: Note[] = [];

for (const note of generated.notes ?? []) {
  if (note.type !== "tap" && note.type !== "hold") continue;
  if (!Number.isInteger(note.lane)) continue;
  if (note.lane < 0 || note.lane > 5) continue;

  const time = allowedTimes.find((t: number) => Math.abs(t - note.time) < 0.01);

  if (time === undefined) continue;

  let duration = 0;

  if (note.type === "hold") {
    const endTime = allowedTimes.find(
      (t: number) => t > time && Math.abs(t - Number(note.endTime)) < 0.01,
    );
    if (endTime === undefined) continue;
    duration = Number((endTime - time).toFixed(3));
  }

  notes.push({
    time,
    lane: note.lane,
    type: note.type,
    duration,
  });
}

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

if (cleanNotes.length === 0) {
  throw new Error("No valid notes generated");
}

await mkdir("public/charts", { recursive: true });

await writeFile(
  `public/charts/level-${level}.json`,
  JSON.stringify(
    {
      level,
      bpm,
      notes: cleanNotes,
    },
    null,
    2,
  ),
);

console.log(`Level ${level} chart created!`);
console.log(`Total notes: ${cleanNotes.length}`);
