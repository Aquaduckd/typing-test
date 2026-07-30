import "./style.css";

import { queryRequired } from "./dom";
import {
  clearInputValue,
  focusInput,
  getInputElement,
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
import { buildTestResult } from "./result-stats";
import { hideResult, showResult } from "./result";
import { calculateStats } from "./stats";
import { createInitialState, type TestState } from "./state";
import {
  getCountdownSeconds,
  startTestTimer,
  stopTestTimer,
} from "./test-timer";
import { generateInitialWordBuffer } from "./words-generator";

const wpmEl = queryRequired<HTMLElement>("#wpm");
const accuracyEl = queryRequired<HTMLElement>("#accuracy");
const timerEl = queryRequired<HTMLElement>("#timer");
const statusEl = queryRequired<HTMLElement>("#status");
const restartBtn = queryRequired<HTMLButtonElement>("#restart");
const resultRestartBtn = queryRequired<HTMLButtonElement>("#result-restart");
const wordsWrapper = queryRequired<HTMLElement>("#words-wrapper");

let state: TestState = createInitialState(generateInitialWordBuffer());

registerCaretLineJumpHandler(handleCaretLineJump);

function getElapsedMs(): number {
  if (state.startedAt === null) return 0;
  const elapsed = performance.now() - state.startedAt;
  if (state.mode === "time") {
    return Math.min(elapsed, state.timeLimitSeconds * 1000);
  }
  return elapsed;
}

function updateTimerDisplay(elapsedSeconds = 0): void {
  timerEl.textContent = String(getCountdownSeconds(elapsedSeconds));
}

function updateLiveStats(): void {
  if (state.startedAt === null) {
    wpmEl.textContent = "0";
    accuracyEl.textContent = "100";
    return;
  }

  const stats = calculateStats(
    state.correctChars,
    state.keystrokes,
    getElapsedMs(),
  );
  wpmEl.textContent = String(stats.wpm);
  accuracyEl.textContent = String(stats.accuracy);
}

function setStatus(text: string): void {
  statusEl.textContent = text;
}

function completeTest(): void {
  if (state.finished) return;

  finishTimedTest(state);
  stopTestTimer();

  const resultData = buildTestResult(state);
  setStatus("");
  stopBlinking();
  getInputElement().blur();
  showResult(resultData);
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

function initTest(): void {
  hideResult(true);
  stopTestTimer();
  state = createInitialState(generateInitialWordBuffer());

  clearInputValue();
  renderWords(state.words);
  resetLineScroll(0);
  setActiveWordHighlight(0);
  resetCaretPosition();
  hideCaret();
  startBlinking();

  wpmEl.textContent = "0";
  accuracyEl.textContent = "100";
  updateTimerDisplay(0);
  setStatus("Press any key to start");

  scheduleViewportLayout();
}

function handleInsertResult(result: ReturnType<typeof emulateInsertText>): void {
  if (result.started) {
    setStatus("Keep going…");
    startTestTimer({
      onTick: (elapsedSeconds) => {
        updateTimerDisplay(elapsedSeconds);
        updateLiveStats();
      },
      onFinish: () => {
        completeTest();
      },
    });
  }

  if (result.finished) {
    completeTest();
    return;
  }

  updateLiveStats();
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
      updateLiveStats();
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
      updateLiveStats();
    }
  });
}

function restartTest(): void {
  initTest();
  focusInput();
}

restartBtn.addEventListener("click", restartTest);
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
initTest();

window.addEventListener("load", () => {
  focusInput();
});
