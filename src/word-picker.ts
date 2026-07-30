import { TEST_CONFIG } from "./config";
import { formatNgramLabel } from "./ngrams";
import type { StoredNgramStats } from "./ngram-storage";

function isAllowedWord(
  word: string,
  previousWord: string,
  previousWord2: string,
): boolean {
  const normalized = word.toLowerCase();
  return (
    normalized !== previousWord &&
    normalized !== previousWord2 &&
    word !== "I"
  );
}

function prefersUnusedWords(
  wordList: string[],
  usedWords: ReadonlySet<string>,
): boolean {
  return usedWords.size < wordList.length;
}

export function collectWordTrigramLabels(flatBefore: string, word: string): string[] {
  const prefix = flatBefore.slice(-2);
  const flat = prefix + word + " ";
  const wordRegionStart = prefix.length;
  const wordRegionEnd = flat.length;
  const labels: string[] = [];

  for (let i = 0; i <= flat.length - 3; i += 1) {
    if (i + 2 < wordRegionStart || i >= wordRegionEnd) continue;

    labels.push(
      formatNgramLabel([flat[i]!, flat[i + 1]!, flat[i + 2]!]),
    );
  }

  return labels;
}

/** Minimize the hottest trigram on the word; tie-break on lower average count. */
export function scoreWordCapHead(
  flatBefore: string,
  word: string,
  stats: StoredNgramStats,
): number {
  const labels = collectWordTrigramLabels(flatBefore, word);
  if (labels.length === 0) return 0;

  let maxCount = 0;
  let sumCount = 0;

  for (const label of labels) {
    const count = stats.trigrams[label]?.count ?? 0;
    maxCount = Math.max(maxCount, count);
    sumCount += count;
  }

  const avgCount = sumCount / labels.length;
  return 1 / (maxCount + 1) * 1000 + 1 / (avgCount + 1);
}

export function pickRandomWordCandidates(
  wordList: string[],
  previousWord: string,
  previousWord2: string,
  usedWords: ReadonlySet<string>,
  count = TEST_CONFIG.wordPickCandidateCount,
  allowUsedWords = false,
): string[] {
  if (wordList.length === 0) return [];

  const candidates: string[] = [];
  const seen = new Set<string>();
  const maxAttempts = Math.max(count * 20, count);
  const skipUsed =
    !allowUsedWords && prefersUnusedWords(wordList, usedWords);

  for (let attempt = 0; attempt < maxAttempts && candidates.length < count; attempt += 1) {
    const word = wordList[Math.floor(Math.random() * wordList.length)] ?? "";
    if (!word || !isAllowedWord(word, previousWord, previousWord2)) continue;

    const normalized = word.toLowerCase();
    if (seen.has(normalized)) continue;
    if (skipUsed && usedWords.has(normalized)) continue;

    seen.add(normalized);
    candidates.push(word);
  }

  if (candidates.length === 0 && skipUsed) {
    return pickRandomWordCandidates(
      wordList,
      previousWord,
      previousWord2,
      usedWords,
      count,
      true,
    );
  }

  return candidates;
}

export function pickCapHeadWord(
  flatBefore: string,
  wordList: string[],
  stats: StoredNgramStats,
  previousWord: string,
  previousWord2: string,
  usedWords: ReadonlySet<string>,
): string {
  const candidates = pickRandomWordCandidates(
    wordList,
    previousWord,
    previousWord2,
    usedWords,
  );

  if (candidates.length === 0) {
    return pickRandomWord(wordList, previousWord, previousWord2, usedWords);
  }

  const scoreCandidates = prefersUnusedWords(wordList, usedWords)
    ? candidates.filter((word) => !usedWords.has(word.toLowerCase()))
    : candidates;
  const pool = scoreCandidates.length > 0 ? scoreCandidates : candidates;

  if (pool.length === 1) return pool[0]!;

  const scored = pool.map((word) => ({
    word,
    score: scoreWordCapHead(flatBefore, word, stats),
  }));

  const minScore = Math.min(...scored.map((s) => s.score));
  const exponent = Math.max(TEST_CONFIG.wordPickWeightExponent, 0);
  const weights = scored.map((s) =>
    Math.pow(s.score - minScore + 1e-6, exponent),
  );
  const total = weights.reduce((sum, w) => sum + w, 0);

  let roll = Math.random() * total;
  for (let i = 0; i < scored.length; i++) {
    roll -= weights[i]!;
    if (roll <= 0) return scored[i]!.word;
  }

  return (
    scored[scored.length - 1]?.word ??
    pickRandomWord(wordList, previousWord, previousWord2, usedWords)
  );
}

export function pickNextWord(
  flatBefore: string,
  wordList: string[],
  stats: StoredNgramStats,
  previousWord: string,
  previousWord2: string,
  usedWords: ReadonlySet<string>,
): string {
  return pickCapHeadWord(
    flatBefore,
    wordList,
    stats,
    previousWord,
    previousWord2,
    usedWords,
  );
}

function pickRandomWord(
  wordList: string[],
  previousWord: string,
  previousWord2: string,
  usedWords: ReadonlySet<string>,
): string {
  if (wordList.length === 0) return "the";

  const skipUsed = prefersUnusedWords(wordList, usedWords);

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const word = wordList[Math.floor(Math.random() * wordList.length)] ?? "the";
    if (!isAllowedWord(word, previousWord, previousWord2)) continue;
    if (skipUsed && usedWords.has(word.toLowerCase())) continue;
    return word;
  }

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const word = wordList[Math.floor(Math.random() * wordList.length)] ?? "the";
    if (isAllowedWord(word, previousWord, previousWord2)) return word;
  }

  return wordList[Math.floor(Math.random() * wordList.length)] ?? "the";
}
