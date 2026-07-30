import english from "./data/english.json";
import { TEST_CONFIG } from "./config";
import { loadStoredNgramStats } from "./ngram-storage";
import { getActiveWordList } from "./word-list-storage";
import { pickBestTrigramWord } from "./word-picker";

/** Mirrors Monkeytype's default word selection from the language list. */
export function generateWords(count: number, alreadyUsed: readonly string[] = []): string[] {
  const wordList = getActiveWordList();
  const trigramStats = loadStoredNgramStats();
  const usedWords = new Set(alreadyUsed.map((word) => word.toLowerCase()));
  const words: string[] = [];
  let flatBefore = "";
  let previousWord = "";
  let previousWord2 = "";

  while (words.length < count) {
    const word = pickBestTrigramWord(
      flatBefore,
      wordList,
      trigramStats,
      previousWord,
      previousWord2,
      usedWords,
    );

    words.push(word);
    usedWords.add(word.toLowerCase());
    flatBefore += `${word} `;
    previousWord2 = previousWord;
    previousWord = word.toLowerCase();
  }

  return words;
}

export function generateInitialWordBuffer(): string[] {
  return generateWords(TEST_CONFIG.wordBufferSize);
}

export function generateWordAppendBatch(alreadyUsed: readonly string[]): string[] {
  return generateWords(TEST_CONFIG.wordAppendBatch, alreadyUsed);
}

export function getLanguageName(): string {
  return english.name;
}
