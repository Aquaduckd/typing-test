import { getBigramStats, getTrigramStats, type NgramStat } from "./ngrams";
import {
  calculateAccuracy,
  calculateWpm,
  roundTo2,
} from "./stats";
import type { KeystrokeEvent, TestState } from "./state";

export type { NgramStat };

function getTestDurationMs(state: TestState): number {
  if (state.mode === "time") {
    return state.timeLimitSeconds * 1000;
  }

  return (
    state.keystrokes.at(-1)?.testMs ??
    (state.startedAt !== null ? performance.now() - state.startedAt : 0)
  );
}

export type TestResult = {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  durationMs: number;
  completedAt?: number;
  charStats: [number, number, number, number];
  chartData: {
    labels: string[];
    wpm: number[];
    raw: number[];
    burst: number[];
    errors: number[];
  };
  bigrams: NgramStat[];
  trigrams: NgramStat[];
};

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = mean(values);
  return Math.sqrt(
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length,
  );
}

/** Monkeytype's consistency mapping from coefficient of variation. */
function kogasa(cov: number): number {
  return 100 * (1 - Math.tanh(cov + cov ** 3 / 3 + cov ** 5 / 5));
}

function getKeystrokesForResult(state: TestState, durationMs: number): KeystrokeEvent[] {
  return state.keystrokes.filter((keystroke) => keystroke.testMs <= durationMs);
}

export function getResultKeystrokes(state: TestState): KeystrokeEvent[] {
  return getKeystrokesForResult(state, getTestDurationMs(state));
}

function getCharCounts(state: TestState, durationMs: number): {
  correct: number;
  incorrect: number;
  extra: number;
  missed: number;
} {
  let correct = 0;
  let incorrect = 0;
  let extra = 0;

  for (const keystroke of getKeystrokesForResult(state, durationMs)) {
    if (keystroke.isExtra) {
      extra += 1;
      continue;
    }
    if (keystroke.correct) {
      correct += 1;
    } else {
      incorrect += 1;
    }
  }

  let missed = 0;
  for (const word of state.completedWords) {
    for (let i = 0; i < word.target.length; i += 1) {
      if (word.typed[i] !== word.target[i]) {
        missed += 1;
      }
    }
  }

  return { correct, incorrect, extra, missed };
}

function getTimerBoundaries(durationMs: number): number[] {
  if (durationMs <= 0) return [];

  const boundaries: number[] = [];
  for (let ms = 1000; ms < durationMs; ms += 1000) {
    boundaries.push(ms);
  }
  boundaries.push(durationMs);
  return boundaries;
}

function formatBoundaryLabel(boundaryMs: number, index: number, total: number): string {
  const isLast = index === total - 1;
  const onGrid = Math.abs(boundaryMs - (index + 1) * 1000) <= 100;
  if (isLast && !onGrid) {
    return roundTo2(boundaryMs / 1000).toFixed(2);
  }
  return String(index + 1);
}

function countKeystrokesUpTo(
  keystrokes: KeystrokeEvent[],
  boundaryMs: number,
): {
  correct: number;
  raw: number;
  errors: number;
} {
  let correct = 0;
  let incorrect = 0;
  let extra = 0;
  let errors = 0;

  for (const keystroke of keystrokes) {
    if (keystroke.testMs > boundaryMs) break;

    if (keystroke.isExtra) {
      extra += 1;
    } else if (keystroke.correct) {
      correct += 1;
    } else {
      incorrect += 1;
      errors += 1;
    }
  }

  return {
    correct,
    raw: correct + incorrect + extra,
    errors,
  };
}

function getErrorHistory(
  keystrokes: KeystrokeEvent[],
  boundaries: number[],
): number[] {
  let prevBoundary = 0;

  return boundaries.map((boundary) => {
    let errors = 0;
    for (const keystroke of keystrokes) {
      if (keystroke.testMs <= prevBoundary || keystroke.testMs > boundary) continue;
      if (!keystroke.correct) {
        errors += 1;
      }
    }

    prevBoundary = boundary;
    return errors;
  });
}

function getBurstHistory(
  keystrokes: KeystrokeEvent[],
  boundaries: number[],
): number[] {
  let prevBoundary = 0;

  return boundaries.map((boundary) => {
    let keypresses = 0;
    for (const keystroke of keystrokes) {
      if (keystroke.testMs <= prevBoundary || keystroke.testMs > boundary) continue;
      if (!keystroke.isExtra) {
        keypresses += 1;
      }
    }

    const intervalSeconds = (boundary - prevBoundary) / 1000;
    prevBoundary = boundary;
    return Math.round(calculateWpm(keypresses, intervalSeconds * 1000));
  });
}

export function buildTestResult(state: TestState): TestResult {
  const durationMs = getTestDurationMs(state);
  const charCounts = getCharCounts(state, durationMs);
  const resultKeystrokes = getKeystrokesForResult(state, durationMs);

  const wpm = roundTo2(calculateWpm(charCounts.correct, durationMs));
  const rawWpm = roundTo2(
    calculateWpm(
      charCounts.correct + charCounts.incorrect + charCounts.extra,
      durationMs,
    ),
  );

  const accuracy = roundTo2(calculateAccuracy(resultKeystrokes));

  const boundaries = getTimerBoundaries(durationMs);
  const burst = getBurstHistory(resultKeystrokes, boundaries);
  const burstStdDev = stdDev(burst);
  const burstMean = mean(burst);
  let consistency = roundTo2(kogasa(burstMean > 0 ? burstStdDev / burstMean : 0));
  if (!consistency || Number.isNaN(consistency)) {
    consistency = 0;
  }

  const wpmHistory: number[] = [];
  const rawHistory: number[] = [];

  for (const boundary of boundaries) {
    const counts = countKeystrokesUpTo(resultKeystrokes, boundary);
    wpmHistory.push(Math.round(calculateWpm(counts.correct, boundary)));
    rawHistory.push(Math.round(calculateWpm(counts.raw, boundary)));
  }

  const errorHistory = getErrorHistory(resultKeystrokes, boundaries);

  const labels = boundaries.map((boundary, index) =>
    formatBoundaryLabel(boundary, index, boundaries.length),
  );

  return {
    wpm,
    rawWpm,
    accuracy,
    consistency,
    durationMs,
    completedAt: Date.now(),
    charStats: [
      charCounts.correct,
      charCounts.incorrect,
      charCounts.extra,
      charCounts.missed,
    ],
    chartData: {
      labels,
      wpm: wpmHistory,
      raw: rawHistory,
      burst,
      errors: errorHistory,
    },
    bigrams: getBigramStats(resultKeystrokes),
    trigrams: getTrigramStats(resultKeystrokes),
  };
}

export function formatResultTime(ms: number): string {
  return `${roundTo2(ms / 1000)}s`;
}

export function formatResultDateTime(timestampMs: number): string {
  return new Date(timestampMs).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatTypingSpeed(value: number): string {
  return roundTo2(value).toFixed(2);
}

export function formatAccuracy(value: number): string {
  return value === 100 ? "100%" : `${roundTo2(value).toFixed(2)}%`;
}

export function formatPercentage(value: number): string {
  return `${roundTo2(value).toFixed(2)}%`;
}
