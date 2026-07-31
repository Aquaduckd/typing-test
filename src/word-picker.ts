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

/** Shortlist size: ⌊word list length / 4⌋, at least 1, capped at wordPickCandidateMax. */
export function wordPickCandidateCount(wordListLength: number): number {
  if (wordListLength <= 0) return 1;
  return Math.max(
    1,
    Math.min(
      Math.floor(wordListLength / 4),
      TEST_CONFIG.wordPickCandidateMax,
    ),
  );
}

function shuffleInPlace<T>(items: T[]): void {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
}

/** Scan the full list once, shuffle eligible words, take the first count. */
function pickCandidatesByFilterShuffle(
  wordList: string[],
  previousWord: string,
  previousWord2: string,
  usedWords: ReadonlySet<string>,
  count: number,
  skipUsed: boolean,
): string[] {
  const eligible: string[] = [];
  const seen = new Set<string>();
  for (const word of wordList) {
    if (!word || !isAllowedWord(word, previousWord, previousWord2)) continue;

    const normalized = word.toLowerCase();
    if (seen.has(normalized)) continue;
    if (skipUsed && usedWords.has(normalized)) continue;

    seen.add(normalized);
    eligible.push(word);
  }

  shuffleInPlace(eligible);
  return eligible.slice(0, Math.min(count, eligible.length));
}

/** Random index sampling until count unique eligible words or attempt cap. */
function pickCandidatesByRandomSample(
  wordList: string[],
  previousWord: string,
  previousWord2: string,
  usedWords: ReadonlySet<string>,
  count: number,
  skipUsed: boolean,
): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();
  const maxAttempts = Math.max(count * 25, 400);

  for (
    let attempt = 0;
    attempt < maxAttempts && candidates.length < count;
    attempt += 1
  ) {
    const word =
      wordList[Math.floor(Math.random() * wordList.length)] ?? "";
    if (!word || !isAllowedWord(word, previousWord, previousWord2)) continue;

    const normalized = word.toLowerCase();
    if (seen.has(normalized)) continue;
    if (skipUsed && usedWords.has(normalized)) continue;

    seen.add(normalized);
    candidates.push(word);
  }

  return candidates;
}

/** Small lists and tight unused pools: scan all. Large sparse pools: random sample. */
function shouldScanAllWords(
  wordListLength: number,
  usedWordsSize: number,
  count: number,
  skipUsed: boolean,
): boolean {
  if (wordListLength <= count * 2) return true;
  if (!skipUsed) return false;
  return wordListLength - usedWordsSize <= count * 10;
}

export function pickRandomWordCandidates(
  wordList: string[],
  previousWord: string,
  previousWord2: string,
  usedWords: ReadonlySet<string>,
  count: number,
  allowUsedWords = false,
): string[] {
  if (wordList.length === 0) return [];

  const skipUsed =
    !allowUsedWords && prefersUnusedWords(wordList, usedWords);

  const pick = shouldScanAllWords(
    wordList.length,
    usedWords.size,
    count,
    skipUsed,
  )
    ? pickCandidatesByFilterShuffle
    : pickCandidatesByRandomSample;

  const candidates = pick(
    wordList,
    previousWord,
    previousWord2,
    usedWords,
    count,
    skipUsed,
  );

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

  if (
    candidates.length < count &&
    !shouldScanAllWords(wordList.length, usedWords.size, count, skipUsed)
  ) {
    const filled = pickCandidatesByFilterShuffle(
      wordList,
      previousWord,
      previousWord2,
      usedWords,
      count,
      skipUsed,
    );
    if (filled.length > candidates.length) {
      return filled.slice(0, Math.min(count, filled.length));
    }
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
    wordPickCandidateCount(wordList.length),
  );

  if (candidates.length === 0) {
    return pickRandomWord(wordList, previousWord, previousWord2, usedWords);
  }

  const scoreCandidates = prefersUnusedWords(wordList, usedWords)
    ? candidates.filter((word) => !usedWords.has(word.toLowerCase()))
    : candidates;
  const pool = scoreCandidates.length > 0 ? scoreCandidates : candidates;

  if (pool.length === 1) return pool[0]!;

  const scored = pool
    .map((word) => ({
      word,
      score: scoreWordCapHead(flatBefore, word, stats),
    }))
    .sort((a, b) => b.score - a.score);

  const k = Math.max(
    1,
    Math.min(TEST_CONFIG.wordPickTopK, scored.length),
  );
  const top = scored.slice(0, k);
  const index = Math.floor(Math.random() * top.length);
  return (
    top[index]?.word ??
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
