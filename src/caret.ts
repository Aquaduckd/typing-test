import { animate, type JSAnimation } from "animejs";
import { requestDebouncedAnimationFrame } from "./utils/debounced-animation-frame";
import {
  getCaretElement,
  getWordsContainer,
  getWordsViewport,
  setInlineStylePx,
  getOffsetWithinAncestor,
} from "./words-dom";

const caretEl = getCaretElement();
const wordsViewportEl = getWordsViewport();

const SMOOTH_DURATION_MS = 100;
let posAnimation: JSAnimation | null = null;
let marginTopAnimation: JSAnimation | null = null;
let readyToResetMarginTop = false;

export function stopBlinking(): void {
  setInlineStylePx(caretEl, { animationName: "none", opacity: "1" });
}

export function startBlinking(): void {
  updateBlinkingAnimation();
}

function updateBlinkingAnimation(): void {
  if (caretEl.style.animationName === "none") return;
  setInlineStylePx(caretEl, { animationName: "caretFlashSmooth" });
}

export function showCaret(): void {
  setInlineStylePx(caretEl, { display: "" });
}

export function hideCaret(): void {
  setInlineStylePx(caretEl, { display: "none" });
}

export function resetCaretPosition(): void {
  posAnimation?.cancel();
  posAnimation = null;
  marginTopAnimation?.cancel();
  marginTopAnimation = null;
  readyToResetMarginTop = false;
  setInlineStylePx(caretEl, {
    left: "0px",
    top: "0px",
    marginTop: "",
    marginLeft: "",
    transform: "",
  });
}

/** Reset caret offset after a line jump completes. */
export function finalizeCaretAfterLineJump(): void {
  marginTopAnimation?.cancel();
  marginTopAnimation = null;
  readyToResetMarginTop = false;
  setInlineStylePx(caretEl, { marginTop: "0px" });
}

/** Sync caret with #words marginTop during line jumps. */
export function handleCaretLineJump(options: {
  newMarginTop: number;
  duration: number;
}): void {
  if (readyToResetMarginTop) {
    setInlineStylePx(caretEl, { marginTop: "0px" });
  }

  readyToResetMarginTop = false;
  marginTopAnimation?.cancel();

  if (options.duration <= 0) {
    setInlineStylePx(caretEl, { marginTop: `${options.newMarginTop}px` });
    readyToResetMarginTop = true;
    return;
  }

  marginTopAnimation = animate(caretEl, {
    marginTop: options.newMarginTop,
    duration: options.duration,
    ease: "inOut(1.25)",
    onComplete: () => {
      readyToResetMarginTop = true;
      marginTopAnimation = null;
    },
  });
}

function getCaretWidth(): number {
  return caretEl.offsetWidth;
}

function getCaretHeight(): number {
  return caretEl.offsetHeight;
}

function getTargetPosition(options: {
  word: HTMLElement;
  letterIndex: number;
  side: "beforeLetter" | "afterLetter";
}): { left: number; top: number } {
  const letters = options.word.querySelectorAll<HTMLElement>("letter");
  if (letters.length === 0) {
    throw new Error("Caret: no letters found in word");
  }

  let letter = letters[options.letterIndex] ?? letters[letters.length - 1];
  if (!letter) {
    throw new Error(`Caret: letter not found for index ${options.letterIndex}`);
  }

  if (letter.offsetWidth === 0) {
    for (let i = options.letterIndex - 1; i >= 0; i--) {
      const candidate = letters[i];
      if (candidate && candidate.offsetWidth > 0) {
        letter = candidate;
        break;
      }
    }
  }

  const { left: letterLeft, top: letterTop } = getOffsetWithinAncestor(
    letter,
    wordsViewportEl,
  );

  let left = letterLeft;
  let top = letterTop;

  if (options.side === "afterLetter") {
    left += letter.offsetWidth;
  }

  top += (letter.offsetHeight - getCaretHeight()) / 2;
  left += (getCaretWidth() / 2) * -1;

  return { left, top };
}

function commitCurrentPosition(): void {
  posAnimation?.cancel();
  posAnimation = null;

  const { left, top } = getOffsetWithinAncestor(caretEl, wordsViewportEl);
  setInlineStylePx(caretEl, {
    left: `${left}px`,
    top: `${top}px`,
    transform: "",
  });
}

function setPosition(options: { left: number; top: number }): void {
  posAnimation?.cancel();
  posAnimation = null;
  setInlineStylePx(caretEl, {
    left: `${options.left}px`,
    top: `${options.top}px`,
    transform: "",
  });
}

function animatePosition(options: { left: number; top: number }): void {
  commitCurrentPosition();

  posAnimation = animate(caretEl, {
    left: options.left,
    top: options.top,
    duration: SMOOTH_DURATION_MS,
    ease: "inOut(1.25)",
    composition: "replace",
  });
}

export function updateCaretPosition(options: {
  wordIndex: number;
  letterIndex: number;
  wordLength: number;
  animate?: boolean;
}): void {
  requestDebouncedAnimationFrame("caret.caret.goTo", () => {
    const wordsEl = getWordsContainer();
    const word = wordsEl.querySelector<HTMLElement>(
      `.word[data-word-index="${options.wordIndex}"]`,
    );
    if (!word) return;

    let letterIndex = options.letterIndex;
    const wordLength = options.wordLength;

    let side: "beforeLetter" | "afterLetter" = "beforeLetter";
    if (letterIndex >= wordLength) {
      side = "afterLetter";
      letterIndex -= 1;
    }

    if (letterIndex < 0) {
      letterIndex = 0;
    }

    const { left, top } = getTargetPosition({
      word,
      letterIndex,
      side,
    });

    if (options.animate !== false) {
      animatePosition({ left, top });
    } else {
      setPosition({ left, top });
    }
  });
}

export function wireCaretFocusHandlers(getInputElement: () => HTMLTextAreaElement): void {
  const input = getInputElement();

  input.addEventListener("focus", () => {
    showCaret();
    stopBlinking();
  });

  input.addEventListener("blur", () => {
    hideCaret();
    startBlinking();
  });
}
