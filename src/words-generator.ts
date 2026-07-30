import english from "./data/english.json";
import { TEST_CONFIG } from "./config";

const wordList = english.words;

function pickRandomWord(): string {
  const index = Math.floor(Math.random() * wordList.length);
  return wordList[index] ?? "the";
}

/** Mirrors Monkeytype's default word selection from the language list. */
export function generateWords(count: number): string[] {
  const words: string[] = [];
  let previousWord = "";
  let previousWord2 = "";

  while (words.length < count) {
    let word = pickRandomWord();
    let attempts = 0;

    while (attempts < 100) {
      const normalized = word.toLowerCase();
      if (
        normalized !== previousWord &&
        normalized !== previousWord2 &&
        word !== "I"
      ) {
        break;
      }
      word = pickRandomWord();
      attempts += 1;
    }

    words.push(word);
    previousWord2 = previousWord;
    previousWord = word.toLowerCase();
  }

  return words;
}

export function generateInitialWordBuffer(): string[] {
  return generateWords(TEST_CONFIG.wordBufferSize);
}

export function generateWordAppendBatch(): string[] {
  return generateWords(TEST_CONFIG.wordAppendBatch);
}

export function getLanguageName(): string {
  return english.name;
}
