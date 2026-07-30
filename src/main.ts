import "./style.css";

import { queryRequired } from "./dom";
import {
  clearInputValue,
  focusInput,
  getInputElement,
  getInputValue,
} from "./input-element";
import {
  emulateInsertText,
  finishTimedTest,
  handleDelete,
  type DeleteInputType,
  snapCaret,
} from "./input-handler";
import {
  handleCaretLineJump,
  hideCaret,
  resetCaretPosition,
  showCaret,
  startBlinking,
  stopBlinking,
  updateCaretPosition,
  wireCaretFocusHandlers,
} from "./caret";
import {
  registerCaretLineJumpHandler,
  refreshWordsViewport,
  resetLineScroll,
} from "./line-scroll";
import { renderWords, setActiveWordHighlight } from "./render";
import { recordKeystrokeNgrams } from "./ngram-storage";
import { buildTestResult, getResultKeystrokes } from "./result-stats";
import { loadStoredLastResult } from "./result-storage";
import { refreshResultsView, setLastResult } from "./result";
import { onSiteTabChange, setSiteTab, getSiteTab } from "./site-nav";
import { refreshNgramsView } from "./ngrams-page";
import { refreshStatsView } from "./stats-page";
import { recordTestCompleted, recordTestStarted } from "./test-stats-storage";
import { refreshWordsView } from "./words-page";
import { loadWordListSelection } from "./word-list-storage";
import type { WordListSelection } from "./word-list-presets";
import { createInitialState, getTypedTargetFlatLength, type TestState } from "./state";
import {
  completeTestProgress,
  resetTestProgress,
  startTestProgress,
} from "./test-progress";
import { startTestTimer, stopTestTimer } from "./test-timer";
import {
  setSlowTrigramKeystrokesProvider,
  setSlowTrigramTypedFlatLengthProvider,
  setSlowTrigramWordsProvider,
} from "./slow-trigram-lines";
import { generateInitialWordBuffer } from "./words-generator";

const statusEl = queryRequired<HTMLElement>("#status");
const resultRestartBtn = queryRequired<HTMLButtonElement>("#result-restart");
const wordsWrapper = queryRequired<HTMLElement>("#words-wrapper");

let state: TestState = createInitialState(generateInitialWordBuffer());
let activeTestWordList: WordListSelection = "e200";
let testStartRecorded = false;

registerCaretLineJumpHandler(handleCaretLineJump);

function setStatus(text: string): void {
  statusEl.textContent = text;
}

function completeTest(): void {
  if (state.finished) return;

  finishTimedTest(state);
  stopTestTimer();
  completeTestProgress();

  const resultData = buildTestResult(state);
  recordKeystrokeNgrams(
    state.words,
    state.mode,
    getResultKeystrokes(state),
  );
  recordTestCompleted(
    activeTestWordList,
    resultData.wpm,
    resultData.accuracy,
  );
  setLastResult(resultData);
  setStatus("");
  stopBlinking();
  getInputElement().blur();
  setSiteTab("results");
}

function scheduleViewportLayout(): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      refreshWordsViewport(0);
      updateCaretPosition({
        wordIndex: 0,
        letterIndex: 0,
        wordLength: state.words[0]?.length ?? 0,
        animate: false,
      });
      showCaret();
    });
  });
}

function isMidTest(): boolean {
  return state.startedAt !== null && !state.finished;
}

function initTest(options?: { keepWords?: boolean }): void {
  stopTestTimer();

  const keepWords = options?.keepWords ?? false;
  const words = keepWords ? [...state.words] : generateInitialWordBuffer();
  const preserveStartCount = keepWords && isMidTest();

  state = createInitialState(words);

  if (!keepWords) {
    activeTestWordList = loadWordListSelection() ?? "e200";
    testStartRecorded = false;
  } else if (preserveStartCount) {
    // Retry on the same text should not count as another started test.
  } else {
    testStartRecorded = false;
  }

  clearInputValue();
  renderWords(state.words);
  resetLineScroll(0);
  setActiveWordHighlight(0);
  resetCaretPosition();
  hideCaret();
  startBlinking();
  resetTestProgress();
  setStatus("Press any key to start");

  scheduleViewportLayout();
}

function handleInsertResult(result: ReturnType<typeof emulateInsertText>): void {
  if (result.started && !testStartRecorded) {
    recordTestStarted();
    testStartRecorded = true;
  }

  if (result.started) {
    setStatus("Keep going…");
    startTestProgress(state.timeLimitSeconds);
    startTestTimer({
      onFinish: () => {
        completeTest();
      },
    });
  }

  if (result.finished) {
    completeTest();
  }
}

function wireInput(): void {
  const input = getInputElement();

  input.addEventListener("beforeinput", (event) => {
    if (!(event instanceof InputEvent)) return;

    const now = performance.now();
    const { inputType } = event;

    if (inputType === "insertText" && event.data !== null) {
      event.preventDefault();
      handleInsertResult(emulateInsertText(state, event.data, now));
      return;
    }

    if (inputType === "deleteContentBackward" || inputType === "deleteWordBackward") {
      event.preventDefault();
      handleDelete(state, inputType as DeleteInputType);
      return;
    }

    if (inputType !== "insertCompositionText" && inputType !== "insertFromComposition") {
      event.preventDefault();
    }
  });

  input.addEventListener("input", (event) => {
    if (!(event instanceof InputEvent)) return;
    if (event.defaultPrevented) return;

    const now = performance.now();
    const { inputType } = event;

    if (inputType === "insertText" && event.data !== null) {
      handleInsertResult(emulateInsertText(state, event.data, now));
      return;
    }

    if (inputType === "deleteContentBackward" || inputType === "deleteWordBackward") {
      handleDelete(state, inputType as DeleteInputType);
    }
  });
}

function restartTest(): void {
  if (getSiteTab() === "test") {
    initTest({ keepWords: isMidTest() });
    focusInput();
    return;
  }

  setSiteTab("test");
}

resultRestartBtn.addEventListener("click", restartTest);

wordsWrapper.addEventListener("click", () => {
  if (state.finished) return;
  focusInput();
  stopBlinking();
  snapCaret(state);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    restartTest();
    return;
  }

  if (state.finished) return;
  if (document.activeElement === getInputElement()) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key.length !== 1 && event.key !== "Backspace") return;

  focusInput();
  stopBlinking();
  snapCaret(state);
});

wireCaretFocusHandlers(getInputElement);
wireInput();
setSlowTrigramWordsProvider(() => state.words);
setSlowTrigramKeystrokesProvider(() => state.keystrokes);
setSlowTrigramTypedFlatLengthProvider(() =>
  getTypedTargetFlatLength(state, getInputValue()),
);

onSiteTabChange((tab) => {
  if (tab === "test") {
    initTest();
    focusInput();
    return;
  }
  if (tab === "results") {
    refreshResultsView();
  }
  if (tab === "stats") {
    refreshStatsView();
  }
  if (tab === "ngrams") {
    refreshNgramsView();
  }
  if (tab === "words") {
    refreshWordsView();
  }
});

initTest();

const storedResult = loadStoredLastResult();
if (storedResult) {
  setLastResult(storedResult);
}

window.addEventListener("load", () => {
  if (getSiteTab() === "test") {
    focusInput();
  }
});
