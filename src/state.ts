import { TEST_CONFIG } from "./config";

export type TestMode = typeof TEST_CONFIG.mode;

export type KeystrokeEvent = {
  key: string;
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

/** Keystroke index where the active word's input begins (after prior commit spaces). */
export function getKeystrokeIndexAtStartOfActiveWord(state: TestState): number {
  let index = 0;

  for (const completed of state.completedWords) {
    index += completed.typed.length + 1;
  }

  return index;
}

/** Target-text flat length typed so far (committed words + spaces + current input). */
export function getTypedTargetFlatLength(state: TestState, input: string): number {
  let length = 0;

  for (const completed of state.completedWords) {
    length += completed.typed.length + 1;
  }

  return length + input.length;
}

/** Flat-text index where `words[wordIndex]` begins (each prior word adds length + 1 space). */
export function getFlatTextOffsetBeforeWord(
  wordIndex: number,
  words: string[],
): number {
  let offset = 0;

  for (let i = 0; i < wordIndex; i++) {
    offset += words[i]!.length + 1;
  }

  return offset;
}
