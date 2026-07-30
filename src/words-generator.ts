import english from "./data/english.json";
import { TEST_CONFIG } from "./config";
import { loadStoredNgramStats } from "./ngram-storage";
import { getActiveWordList } from "./word-list-storage";
import { pickNextWord, rollWordPickMode, type WordPickMode } from "./word-picker";

export type GeneratedWords = {
  words: string[];
  pickMode: WordPickMode;
};

/** Mirrors Monkeytype's default word selection from the language list. */
export function generateWords(
  count: number,
  pickMode: WordPickMode,
  alreadyUsed: readonly string[] = [],
): string[] {
  const wordList = getActiveWordList();
  const trigramStats = loadStoredNgramStats();
  const usedWords = new Set(alreadyUsed.map((word) => word.toLowerCase()));
  const words: string[] = [];
  let flatBefore = "";
  let previousWord = "";
  let previousWord2 = "";

  while (words.length < count) {
    const word = pickNextWord(
      flatBefore,
      wordList,
      trigramStats,
      previousWord,
      previousWord2,
      usedWords,
      pickMode,
    );

    words.push(word);
    usedWords.add(word.toLowerCase());
    flatBefore += `${word} `;
    previousWord2 = previousWord;
    previousWord = word.toLowerCase();
  }

  return words;
}

export function generateInitialWordBuffer(): GeneratedWords {
  const pickMode = rollWordPickMode();
  return {
    words: generateWords(TEST_CONFIG.wordBufferSize, pickMode),
    pickMode,
  };
}

export function generateWordAppendBatch(
  alreadyUsed: readonly string[],
  pickMode: WordPickMode,
): string[] {
  return generateWords(TEST_CONFIG.wordAppendBatch, pickMode, alreadyUsed);
}

export function getLanguageName(): string {
  return english.name;
}
