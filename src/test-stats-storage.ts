import type { WordListSelection } from "./word-list-presets";

export type PersonalBest = {
  wpm: number;
  accuracy: number;
  completedAt: number;
};

export type TestLifetimeStats = {
  testsStarted: number;
  testsCompleted: number;
  personalBests: Partial<Record<WordListSelection, PersonalBest>>;
};

const STORAGE_KEY = "typing-test-lifetime-stats";

function emptyStats(): TestLifetimeStats {
  return {
    testsStarted: 0,
    testsCompleted: 0,
    personalBests: {},
  };
}

function saveStats(stats: TestLifetimeStats): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

export function loadTestLifetimeStats(): TestLifetimeStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStats();

    const parsed = JSON.parse(raw) as Partial<TestLifetimeStats>;
    return {
      testsStarted: parsed.testsStarted ?? 0,
      testsCompleted: parsed.testsCompleted ?? 0,
      personalBests: parsed.personalBests ?? {},
    };
  } catch {
    return emptyStats();
  }
}

export function recordTestStarted(): void {
  const stats = loadTestLifetimeStats();
  stats.testsStarted += 1;
  saveStats(stats);
}

export function recordTestCompleted(
  wordList: WordListSelection,
  wpm: number,
  accuracy: number,
): void {
  const stats = loadTestLifetimeStats();
  stats.testsCompleted += 1;

  const existing = stats.personalBests[wordList];
  if (!existing || wpm > existing.wpm) {
    stats.personalBests[wordList] = {
      wpm,
      accuracy,
      completedAt: Date.now(),
    };
  }

  saveStats(stats);
}
