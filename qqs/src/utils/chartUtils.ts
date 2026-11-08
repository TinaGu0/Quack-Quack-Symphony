export type ChartNote = {
  time: number;
  lane: number;
  type: "tap" | "hold";
  duration: number;
};

export type Note = ChartNote & {
  id: number;
  done: boolean;
  holding: boolean;
};

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

export function simplifyChart(
  chartNotes: ChartNote[],
  level: number,
): ChartNote[] {
  const limit = noteLimits[level] ?? chartNotes.length;

  if (chartNotes.length <= limit) return chartNotes;

  const result: ChartNote[] = [];

  for (let i = 0; i < limit; i++) {
    const index = Math.floor((i * chartNotes.length) / limit);
    result.push(chartNotes[index]);
  }

  return result;
}
