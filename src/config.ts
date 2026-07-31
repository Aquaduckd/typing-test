export const TEST_CONFIG = {
  mode: "time" as const,
  timeLimitSeconds: 15,
  /** Initial word buffer — Monkeytype generates ~100 for timed tests. */
  wordBufferSize: 100,
  /** Append more words when the cursor gets this close to the end. */
  wordAppendThreshold: 5,
  wordAppendBatch: 20,
  /** Cap-head shortlist: ⌊word list size / 4⌋, capped at this maximum. */
  wordPickCandidateMax: 200,
  /** Uniform random pick among the K highest cap-head scores in the shortlist. */
  wordPickTopK: 50,
};

export const CHART_CONFIG = {
  /** When false, the WPM axis min follows the data instead of starting at zero. */
  startGraphsAtZero: false,
};
