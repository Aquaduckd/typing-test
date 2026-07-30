export const TEST_CONFIG = {
  mode: "time" as const,
  timeLimitSeconds: 15,
  /** Initial word buffer — Monkeytype generates ~100 for timed tests. */
  wordBufferSize: 100,
  /** Append more words when the cursor gets this close to the end. */
  wordAppendThreshold: 5,
  wordAppendBatch: 20,
  /** Random shortlist size when picking the next word from trigram novelty scores. */
  wordPickCandidateCount: 50,
  /** Fraction of word picks that use pure random selection instead of trigram scoring. */
  wordPickRandomRate: 0.1,
};

export const CHART_CONFIG = {
  /** When false, the WPM axis min follows the data instead of starting at zero. */
  startGraphsAtZero: false,
};
