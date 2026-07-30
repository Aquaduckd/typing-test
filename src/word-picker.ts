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

export function scoreWordTrigramNovelty(
  flatBefore: string,
  word: string,
  stats: StoredNgramStats,
): number {
  const labels = collectWordTrigramLabels(flatBefore, word);
  if (labels.length === 0) return 0;

  let score = 0;

  for (const label of labels) {
    const count = stats.trigrams[label]?.count ?? 0;
    score += 1 / (count + 1);
  }

  return score / labels.length;
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

export function pickBestTrigramWord(
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

  let bestScore = -1;
  let bestCandidates: string[] = [];

  for (const word of pool) {
    const score = scoreWordTrigramNovelty(flatBefore, word, stats);
    if (score > bestScore) {
      bestScore = score;
      bestCandidates = [word];
    } else if (score === bestScore) {
      bestCandidates.push(word);
    }
  }

  const index = Math.floor(Math.random() * bestCandidates.length);
  return (
    bestCandidates[index] ??
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
  if (Math.random() < TEST_CONFIG.wordPickRandomRate) {
    return pickRandomWord(wordList, previousWord, previousWord2, usedWords);
  }

  return pickBestTrigramWord(
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
