import type { KeystrokeEvent, TestMode } from "./state";
import {
  getFlatTextOffsetBeforeWord,
  getTargetWithCommitForWord,
} from "./state";

export type TargetPositionAttempt = {
  testMs: number;
  correct: boolean;
};

function isWordCommit(
  key: string,
  inputBefore: string,
  targetWithCommit: string,
): boolean {
  return (
    key === " " &&
    inputBefore.length > 0 &&
    targetWithCommit.endsWith(" ")
  );
}

function buildFlatTargetText(
  words: string[],
  maxWordIndex: number,
  mode: TestMode,
): string {
  let flat = "";

  for (let i = 0; i <= maxWordIndex && i < words.length; i += 1) {
    flat += getTargetWithCommitForWord(words, i, mode);
  }

  return flat;
}

export function replayTargetPositionAttempts(
  words: string[],
  mode: TestMode,
  keystrokes: KeystrokeEvent[],
): {
  attempts: Map<number, TargetPositionAttempt>;
  maxWordIndex: number;
} {
  const attempts = new Map<number, TargetPositionAttempt>();
  let wordIndex = 0;
  let input = "";
  let maxWordIndex = 0;

  for (const keystroke of keystrokes) {
    const targetWithCommit = getTargetWithCommitForWord(words, wordIndex, mode);
    maxWordIndex = Math.max(maxWordIndex, wordIndex);

    if (isWordCommit(keystroke.key, input, targetWithCommit)) {
      const charIndex = input.length;
      const flatIndex = getFlatTextOffsetBeforeWord(wordIndex, words) + charIndex;
      attempts.set(flatIndex, {
        testMs: keystroke.testMs,
        correct: keystroke.correct && !keystroke.isExtra,
      });
      input = "";
      wordIndex += 1;
      continue;
    }

    const charIndex = input.length;
    if (charIndex < targetWithCommit.length) {
      const flatIndex = getFlatTextOffsetBeforeWord(wordIndex, words) + charIndex;
      attempts.set(flatIndex, {
        testMs: keystroke.testMs,
        correct: keystroke.correct && !keystroke.isExtra,
      });
    }

    input += keystroke.key;
  }

  return { attempts, maxWordIndex };
}

export function getTargetTrigramDurationMs(
  flatStart: number,
  attempts: Map<number, TargetPositionAttempt>,
): number | null {
  const first = attempts.get(flatStart);
  const middle = attempts.get(flatStart + 1);
  const last = attempts.get(flatStart + 2);

  if (!first || !middle || !last) return null;

  if (!first.correct || !middle.correct || !last.correct) {
    return MAX_NGRAM_DURATION_MS;
  }

  return capNgramDurationMs(last.testMs - first.testMs);
}

export function collectTargetTrigramDurations(
  words: string[],
  mode: TestMode,
  keystrokes: KeystrokeEvent[],
): Map<string, number[]> {
  const { attempts, maxWordIndex } = replayTargetPositionAttempts(
    words,
    mode,
    keystrokes,
  );
  const flat = buildFlatTargetText(words, maxWordIndex, mode);
  const durations = new Map<string, number[]>();

  for (let start = 0; start <= flat.length - 3; start += 1) {
    const duration = getTargetTrigramDurationMs(start, attempts);
    if (duration === null) continue;

    const label = formatNgramLabel([
      flat[start]!,
      flat[start + 1]!,
      flat[start + 2]!,
    ]);
    const existing = durations.get(label) ?? [];
    existing.push(duration);
    durations.set(label, existing);
  }

  return durations;
}

export type NgramStat = {
  ngram: string;
  meanMs: number;
  count: number;
  globalMeanMs?: number | null;
  /** Change in lifetime avg ms from before to after the latest test. */
  globalMeanDelta?: number | null;
};

export type NgramSortKey =
  | "ngram"
  | "meanMs"
  | "globalMeanMs"
  | "globalMeanDelta"
  | "count";

export const MAX_NGRAM_DURATION_MS = 1000;

export function capNgramDurationMs(duration: number): number {
  if (duration < 0) return duration;
  return Math.min(duration, MAX_NGRAM_DURATION_MS);
}

function formatKey(key: string): string {
  if (key === " ") return "_";
  return key;
}

export function formatNgramLabel(keys: string[]): string {
  return keys.map(formatKey).join("");
}

function aggregateNgramStats(durations: Map<string, number[]>): NgramStat[] {
  return [...durations.entries()].map(([ngram, times]) => ({
    ngram,
    meanMs: Math.round(times.reduce((sum, time) => sum + time, 0) / times.length),
    count: times.length,
  }));
}

export function collectBigramDurations(
  keystrokes: KeystrokeEvent[],
): Map<string, number[]> {
  const durations = new Map<string, number[]>();

  for (let i = 0; i < keystrokes.length - 1; i += 1) {
    const first = keystrokes[i]!;
    const second = keystrokes[i + 1]!;
    const label = formatNgramLabel([first.key, second.key]);
    const duration = second.testMs - first.testMs;

    if (duration < 0) continue;

    const existing = durations.get(label) ?? [];
    existing.push(capNgramDurationMs(duration));
    durations.set(label, existing);
  }

  return durations;
}

export function collectTrigramDurations(
  keystrokes: KeystrokeEvent[],
): Map<string, number[]> {
  const durations = new Map<string, number[]>();

  for (let i = 0; i < keystrokes.length - 2; i += 1) {
    const first = keystrokes[i]!;
    const second = keystrokes[i + 1]!;
    const third = keystrokes[i + 2]!;
    const label = formatNgramLabel([first.key, second.key, third.key]);
    const duration = third.testMs - first.testMs;

    if (duration < 0) continue;

    const existing = durations.get(label) ?? [];
    existing.push(capNgramDurationMs(duration));
    durations.set(label, existing);
  }

  return durations;
}

export function sortNgrams(
  ngrams: NgramStat[],
  key: NgramSortKey,
  ascending: boolean,
): NgramStat[] {
  const direction = ascending ? 1 : -1;

  return [...ngrams].sort((a, b) => {
    switch (key) {
      case "ngram":
        return direction * a.ngram.localeCompare(b.ngram);
      case "meanMs":
        return direction * (a.meanMs - b.meanMs) || a.ngram.localeCompare(b.ngram);
      case "globalMeanMs": {
        const aMs = a.globalMeanMs ?? (ascending ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
        const bMs = b.globalMeanMs ?? (ascending ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
        return direction * (aMs - bMs) || a.ngram.localeCompare(b.ngram);
      }
      case "globalMeanDelta": {
        const aDelta =
          a.globalMeanDelta ??
          (ascending ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
        const bDelta =
          b.globalMeanDelta ??
          (ascending ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
        return direction * (aDelta - bDelta) || a.ngram.localeCompare(b.ngram);
      }
      case "count":
        return direction * (a.count - b.count) || a.ngram.localeCompare(b.ngram);
    }
  });
}

export function getBigramStats(keystrokes: KeystrokeEvent[]): NgramStat[] {
  return aggregateNgramStats(collectBigramDurations(keystrokes));
}

export function getTrigramStats(
  words: string[],
  mode: TestMode,
  keystrokes: KeystrokeEvent[],
): NgramStat[] {
  return aggregateNgramStats(collectTargetTrigramDurations(words, mode, keystrokes));
}
