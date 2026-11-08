export const LEVEL_PARENTS: Record<number, number[]> = {
  1: [],
  2: [1],
  3: [1],
  4: [2],
  5: [2],
  6: [3],
  7: [3],
  8: [4, 5, 6, 7],
  9: [8],
};

const STORAGE_KEY = "qqs-completed-levels-v1";

// get the levels the player has already beaten
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

// check whether the player can play a level
export function isLevelUnlocked(
  level: number,
  completed = getCompletedLevels(),
): boolean {
  if (!(level in LEVEL_PARENTS)) return false;

  if (level === 1) return true;

  return LEVEL_PARENTS[level].some((parent) => completed.includes(parent));
}

export function markLevelComplete(level: number): void {
  if (!Number.isInteger(level) || level < 1 || level > 9) {
    return;
  }

  const completed = new Set(getCompletedLevels());
  completed.add(level);

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([...completed].sort((a, b) => a - b)),
  );
}
