import { TEST_CONFIG } from "./config";

export type TestMode = typeof TEST_CONFIG.mode;

export type KeystrokeEvent = {
  testMs: number;
  correct: boolean;
  isExtra: boolean;
};

export type CompletedWord = {
  typed: string;
  target: string;
};

export type TestState = {
  mode: TestMode;
  timeLimitSeconds: number;
  words: string[];
  activeWordIndex: number;
  startedAt: number | null;
  finished: boolean;
  correctChars: number;
  incorrectChars: number;
  keystrokes: KeystrokeEvent[];
  completedWords: CompletedWord[];
};

export function createInitialState(words: string[]): TestState {
  return {
    mode: TEST_CONFIG.mode,
    timeLimitSeconds: TEST_CONFIG.timeLimitSeconds,
    words,
    activeWordIndex: 0,
    startedAt: null,
    finished: false,
    correctChars: 0,
    incorrectChars: 0,
    keystrokes: [],
    completedWords: [],
  };
}

export function getCurrentWord(state: TestState): string {
  return state.words[state.activeWordIndex] ?? "";
}

/** Monkeytype compares input against textWithCommit (word + trailing space). */
export function getTargetWithCommit(state: TestState, wordIndex?: number): string {
  const index = wordIndex ?? state.activeWordIndex;
  const word = state.words[index] ?? "";

  if (state.mode === "time") {
    return `${word} `;
  }

  if (index >= state.words.length - 1) {
    return word;
  }
  return `${word} `;
}

export function isTimedMode(state: TestState): boolean {
  return state.mode === "time";
}

export function appendWords(state: TestState, words: string[]): void {
  state.words.push(...words);
}

export function shouldAppendWords(state: TestState): boolean {
  return (
    state.mode === "time" &&
    state.activeWordIndex + TEST_CONFIG.wordAppendThreshold >= state.words.length
  );
}

export function isLastWord(state: TestState): boolean {
  return state.activeWordIndex >= state.words.length - 1;
}
