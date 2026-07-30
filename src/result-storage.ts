import type { TestResult } from "./result-stats";

const STORAGE_KEY = "typing-test-last-result";

function isTestResult(value: unknown): value is TestResult {
  if (!value || typeof value !== "object") return false;

  const result = value as Partial<TestResult>;
  return (
    typeof result.wpm === "number" &&
    typeof result.rawWpm === "number" &&
    typeof result.accuracy === "number" &&
    typeof result.consistency === "number" &&
    typeof result.durationMs === "number" &&
    (result.mode === undefined || result.mode === "time") &&
    (result.timeLimitSeconds === undefined ||
      typeof result.timeLimitSeconds === "number") &&
    (result.wordList === undefined || typeof result.wordList === "string") &&
    (result.completedAt === undefined || typeof result.completedAt === "number") &&
    Array.isArray(result.charStats) &&
    result.charStats.length === 4 &&
    !!result.chartData &&
    Array.isArray(result.chartData.labels) &&
    Array.isArray(result.chartData.wpm) &&
    Array.isArray(result.bigrams) &&
    Array.isArray(result.trigrams)
  );
}

export function loadStoredLastResult(): TestResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    return isTestResult(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveStoredLastResult(result: TestResult): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
}

export function clearStoredLastResult(): void {
  localStorage.removeItem(STORAGE_KEY);
}
