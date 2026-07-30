import {
  collectBigramDurations,
  collectTargetTrigramDurations,
} from "./ngrams";
import type { KeystrokeEvent, TestMode } from "./state";

export type StoredNgramAggregate = {
  totalMs: number;
  count: number;
};

export type StoredNgramStats = {
  bigrams: Record<string, StoredNgramAggregate>;
  trigrams: Record<string, StoredNgramAggregate>;
};

const STORAGE_KEY = "typing-test-ngram-stats";

function emptyStats(): StoredNgramStats {
  return { bigrams: {}, trigrams: {} };
}

function loadRawStats(): StoredNgramStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStats();

    const parsed = JSON.parse(raw) as Partial<StoredNgramStats>;
    return {
      bigrams: parsed.bigrams ?? {},
      trigrams: parsed.trigrams ?? {},
    };
  } catch {
    return emptyStats();
  }
}

function saveRawStats(stats: StoredNgramStats): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

export function mergeDurationMap(
  store: Record<string, StoredNgramAggregate>,
  durations: Map<string, number[]>,
): void {
  for (const [ngram, times] of durations) {
    const addedMs = times.reduce((sum, time) => sum + time, 0);
    const existing = store[ngram];

    if (existing) {
      existing.totalMs += addedMs;
      existing.count += times.length;
    } else {
      store[ngram] = { totalMs: addedMs, count: times.length };
    }
  }
}

export function recordKeystrokeNgrams(
  words: string[],
  mode: TestMode,
  keystrokes: KeystrokeEvent[],
): void {
  if (keystrokes.length < 2) return;

  const stats = loadRawStats();
  mergeDurationMap(stats.bigrams, collectBigramDurations(keystrokes));
  mergeDurationMap(stats.trigrams, collectTargetTrigramDurations(words, mode, keystrokes));
  saveRawStats(stats);
}

export function loadStoredNgramStats(): StoredNgramStats {
  return loadRawStats();
}

export function hasStoredNgramStats(): boolean {
  const stats = loadRawStats();
  return (
    Object.keys(stats.bigrams).length > 0 || Object.keys(stats.trigrams).length > 0
  );
}

export function clearStoredNgramStats(): void {
  localStorage.removeItem(STORAGE_KEY);
}
