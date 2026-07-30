import { formatNgramLabel } from "./ngrams";
import { loadStoredNgramStats } from "./ngram-storage";

const SLOW_FRACTION = 0.1;

export function getStoredTrigramMeanMs(trigram: string): number | null {
  const { trigrams } = loadStoredNgramStats();
  const entry = trigrams[trigram];
  if (!entry || entry.count === 0) return null;
  return entry.totalMs / entry.count;
}

export function getSlowTrigramSet(): Set<string> {
  const { trigrams } = loadStoredNgramStats();
  const ranked = Object.entries(trigrams).map(([ngram, { totalMs, count }]) => ({
    ngram,
    meanMs: totalMs / count,
  }));

  if (ranked.length === 0) return new Set();

  ranked.sort((a, b) => b.meanMs - a.meanMs);
  const slowCount = Math.max(1, Math.ceil(ranked.length * SLOW_FRACTION));

  return new Set(ranked.slice(0, slowCount).map((entry) => entry.ngram));
}

export function getSlowTrigramStarts(
  flatText: string,
  slowTrigrams: Set<string>,
): number[] {
  const starts: number[] = [];

  for (let start = 0; start <= flatText.length - 3; start += 1) {
    const trigram = formatNgramLabel([
      flatText[start]!,
      flatText[start + 1]!,
      flatText[start + 2]!,
    ]);

    if (slowTrigrams.has(trigram)) {
      starts.push(start);
    }
  }

  return starts;
}
