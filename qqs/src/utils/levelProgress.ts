export const LEVEL_PARENTS: Record<number, number[]> = {
  1: [],
  2: [],
  3: [1],
  4: [1],
  5: [2],
  6: [2],
  7: [3, 4],
  8: [5, 6],
  9: [7, 8],
};

const STORAGE_KEY = "qqs-completed-levels-v1";

export function getCompletedLevels(): number[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved)
      ? saved.filter(
          (n): n is number => Number.isInteger(n) && n >= 1 && n <= 9,
        )
      : [];
  } catch {
    return [];
  }
}

export function isLevelUnlocked(
  level: number,
  completed = getCompletedLevels(),
): boolean {
  if (!(level in LEVEL_PARENTS)) return false;

  if (level === 1 || level === 2) return true;

  return LEVEL_PARENTS[level].some((parent) => completed.includes(parent));
}

export function markLevelComplete(level: number): void {
  if (!Number.isInteger(level) || level < 1 || level > 9) return;

  const completed = new Set(getCompletedLevels());
  completed.add(level);

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([...completed].sort((a, b) => a - b)),
  );
}
