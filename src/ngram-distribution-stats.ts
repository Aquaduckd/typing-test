import type { StoredNgramAggregate } from "./ngram-storage";

export type NgramSummaryStats = {
  unique: number;
  totalReps: number;
  avgCount: number;
  avgMs: number;
};

export function computeNgramSummaryStats(
  store: Record<string, StoredNgramAggregate>,
): NgramSummaryStats | null {
  const aggregates = Object.values(store);
  if (aggregates.length === 0) return null;

  let totalReps = 0;
  let totalMs = 0;

  for (const aggregate of aggregates) {
    totalReps += aggregate.count;
    totalMs += aggregate.totalMs;
  }

  return {
    unique: aggregates.length,
    totalReps,
    avgCount: totalReps / aggregates.length,
    avgMs: totalReps === 0 ? 0 : totalMs / totalReps,
  };
}

export function formatCount(value: number): string {
  return Math.round(value).toLocaleString();
}

export function formatDecimal(value: number, digits = 1): string {
  return value.toFixed(digits);
}
