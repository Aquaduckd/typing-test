import type { KeystrokeEvent } from "./state";

export type NgramStat = {
  ngram: string;
  meanMs: number;
  count: number;
};

export type NgramSortKey = "ngram" | "meanMs" | "count";

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
      case "count":
        return direction * (a.count - b.count) || a.ngram.localeCompare(b.ngram);
    }
  });
}

export function getBigramStats(keystrokes: KeystrokeEvent[]): NgramStat[] {
  return aggregateNgramStats(collectBigramDurations(keystrokes));
}

export function getTrigramStats(keystrokes: KeystrokeEvent[]): NgramStat[] {
  return aggregateNgramStats(collectTrigramDurations(keystrokes));
}
