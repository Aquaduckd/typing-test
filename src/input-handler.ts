import {
  appendInputValue,
  clearInputValue,
  getInputValue,
  replaceLastInputChar,
  setInputValue,
} from "./input-element";
import {
  appendWordsToDom,
  markWordComplete,
  setActiveWordHighlight,
  unmarkWordComplete,
  updateActiveWord,
} from "./render";
import {
  appendWords,
  getCurrentWord,
  getTargetWithCommit,
  isLastWord,
  isTimedMode,
  shouldAppendWords,
  type TestState,
} from "./state";
import { generateWordAppendBatch } from "./words-generator";
import {
  afterWordCommit,
  updateActiveWordMetrics,
  wouldCauseLineWrap,
} from "./line-scroll";
import { getPendingInput } from "./render";
import { finalizeCaretAfterLineJump, stopBlinking, updateCaretPosition } from "./caret";

function isWordCommit(
  data: string,
  inputBefore: string,
  targetWithCommit: string,
): boolean {
  return (
    data === " " &&
    inputBefore.length > 0 &&
    targetWithCommit.endsWith(" ")
  );
}

export type InputResult = {
  started: boolean;
  finished: boolean;
  correct: boolean;
  committedWord: boolean;
};

function ensureWordBuffer(state: TestState): void {
  if (!shouldAppendWords(state)) return;

  const startIndex = state.words.length;
  const newWords = generateWordAppendBatch();
  appendWords(state, newWords);
  appendWordsToDom(newWords, startIndex);
}

export function handleInsertText(
  state: TestState,
  data: string,
  now: number,
): InputResult {
  const result: InputResult = {
    started: false,
    finished: false,
    correct: false,
    committedWord: false,
  };

  if (state.finished) {
    return result;
  }

  if (state.startedAt === null) {
    state.startedAt = now;
    result.started = true;
  }

  const displayWord = getCurrentWord(state);
  const targetWithCommit = getTargetWithCommit(state);
  const inputAfter = getInputValue();
  const inputBefore = inputAfter.slice(0, -data.length);
  const charIndex = inputBefore.length;
  const expected = targetWithCommit[charIndex];
  const correct = data === expected;

  result.correct = correct;

  const commitsWord = isWordCommit(data, inputBefore, targetWithCommit);
  const isExtra = charIndex >= targetWithCommit.length;

  if (state.startedAt !== null) {
    state.keystrokes.push({
      testMs: now - state.startedAt,
      correct,
      isExtra,
    });
  }

  if (!isExtra) {
    if (correct) {
      state.correctChars += 1;
    } else {
      state.incorrectChars += 1;
    }
  }

  if (commitsWord) {
    result.committedWord = true;
    const wordCorrect = inputBefore === displayWord;
    const previousWordIndex = state.activeWordIndex;
    markWordComplete(state.activeWordIndex, inputBefore, displayWord, wordCorrect);
    state.completedWords.push({ typed: inputBefore, target: displayWord });
    clearInputValue();

    if (!isTimedMode(state) && isLastWord(state)) {
      state.finished = true;
      result.finished = true;
      afterAnyInput(state, "");
      return result;
    }

    state.activeWordIndex += 1;
    ensureWordBuffer(state);
    setActiveWordHighlight(state.activeWordIndex);
    updateActiveWordMetrics(state.activeWordIndex);
    void afterWordCommit(previousWordIndex, state.activeWordIndex).then(() => {
      finalizeCaretAfterLineJump();
      afterAnyInput(state, "");
    });
    return result;
  }

  updateActiveWord(state.activeWordIndex, inputAfter, displayWord);
  updateActiveWordMetrics(state.activeWordIndex);

  const finishedLastCharacter =
    !isTimedMode(state) && isLastWord(state) && inputAfter === targetWithCommit;

  if (finishedLastCharacter) {
    markWordComplete(
      state.activeWordIndex,
      inputAfter,
      displayWord,
      inputAfter === displayWord,
    );
    state.completedWords.push({ typed: inputAfter, target: displayWord });
    state.finished = true;
    result.finished = true;
    afterAnyInput(state, inputAfter);
    return result;
  }

  afterAnyInput(state, inputAfter);
  return result;
}

export type DeleteInputType = "deleteContentBackward" | "deleteWordBackward";

function revertLastWpmCharCount(state: TestState): void {
  const keystroke = state.keystrokes.at(-1);
  if (!keystroke || keystroke.isExtra) return;

  if (keystroke.correct) {
    state.correctChars = Math.max(0, state.correctChars - 1);
  } else {
    state.incorrectChars = Math.max(0, state.incorrectChars - 1);
  }
}

function deleteOneCharacter(state: TestState): void {
  const input = getInputValue();
  if (input.length === 0) return;

  revertLastWpmCharCount(state);

  replaceLastInputChar("");
  const nextInput = getInputValue();
  updateActiveWord(state.activeWordIndex, nextInput, getCurrentWord(state));
  updateActiveWordMetrics(state.activeWordIndex);
  afterAnyInput(state, nextInput);
}

function clearCurrentWordInput(state: TestState): void {
  const input = getInputValue();
  if (input.length === 0) return;

  let reverted = 0;
  for (
    let i = state.keystrokes.length - 1;
    i >= 0 && reverted < input.length;
    i -= 1
  ) {
    const keystroke = state.keystrokes[i]!;
    if (keystroke.isExtra) continue;

    if (keystroke.correct) {
      state.correctChars = Math.max(0, state.correctChars - 1);
    } else {
      state.incorrectChars = Math.max(0, state.incorrectChars - 1);
    }
    reverted += 1;
  }

  clearInputValue();
  updateActiveWord(state.activeWordIndex, "", getCurrentWord(state));
  updateActiveWordMetrics(state.activeWordIndex);
  afterAnyInput(state, "");
}

function goToPreviousWord(state: TestState, inputType: DeleteInputType): void {
  if (state.activeWordIndex === 0) return;

  const previousCompleted = state.completedWords.pop();
  if (!previousCompleted) return;

  state.activeWordIndex -= 1;
  revertLastWpmCharCount(state);

  const restoredInput =
    inputType === "deleteContentBackward" ? previousCompleted.typed : "";

  setInputValue(restoredInput);
  unmarkWordComplete(
    state.activeWordIndex,
    restoredInput,
    previousCompleted.target,
  );
  setActiveWordHighlight(state.activeWordIndex);
  updateActiveWordMetrics(state.activeWordIndex);
  afterAnyInput(state, restoredInput);
}

export function handleDelete(
  state: TestState,
  inputType: DeleteInputType = "deleteContentBackward",
): void {
  if (state.finished || state.startedAt === null) return;

  const input = getInputValue();

  if (input.length === 0) {
    goToPreviousWord(state, inputType);
    return;
  }

  if (inputType === "deleteWordBackward") {
    clearCurrentWordInput(state);
    return;
  }

  deleteOneCharacter(state);
}

export function emulateInsertText(state: TestState, data: string, now: number): InputResult {
  if (onBeforeInsert(state, data)) {
    return {
      started: false,
      finished: false,
      correct: false,
      committedWord: false,
    };
  }

  appendInputValue(data);
  return handleInsertText(state, data, now);
}

function onBeforeInsert(state: TestState, data: string): boolean {
  if (state.finished) return true;

  const input = getInputValue();
  const targetWithCommit = getTargetWithCommit(state);
  const displayWord = getCurrentWord(state);

  if (data === " " && input === "") return true;

  const inputLimit = targetWithCommit.length + 20;
  const commitsWord = isWordCommit(data, input, targetWithCommit);
  if (input.length >= inputLimit && !commitsWord) return true;

  const pendingInput = getPendingInput(state.activeWordIndex) ?? input;
  if (
    wouldCauseLineWrap(
      state.activeWordIndex,
      pendingInput,
      data,
      displayWord,
      commitsWord,
    )
  ) {
    return true;
  }

  return false;
}

/** Mirrors Monkeytype afterAnyTestInput caret timing. */
function afterAnyInput(state: TestState, input: string): void {
  stopBlinking();
  updateCaretPosition({
    wordIndex: state.activeWordIndex,
    letterIndex: input.length,
    wordLength: getCurrentWord(state).length,
    animate: true,
  });
}

export function snapCaret(state: TestState): void {
  afterAnyInput(state, getInputValue());
}

export function finishTimedTest(state: TestState): void {
  if (state.finished) return;

  const input = getInputValue();
  const displayWord = getCurrentWord(state);

  if (input.length > 0) {
    state.completedWords.push({ typed: input, target: displayWord });
  }

  state.finished = true;
}
