import { animate, type JSAnimation } from "animejs";
import { finalizeCaretAfterLineJump } from "./caret";
import { getWordsContainer, getWordsViewport, getWordsWrapper } from "./words-dom";
import { measureWordLayout } from "./render";

const VISIBLE_LINES = 3;
const LINE_JUMP_DURATION_MS = 125;
const SMOOTH_LINE_SCROLL = true;

let currentTestLine = 0;
let currentLinesJumping = 0;
let activeWordIndex = 0;

export let activeWordTop = 0;
export let activeWordHeight = 0;

let marginTopAnimation: JSAnimation | null = null;
let caretLineJumpHandler: ((options: {
  newMarginTop: number;
  duration: number;
}) => void) | null = null;

export function registerCaretLineJumpHandler(
  handler: (options: { newMarginTop: number; duration: number }) => void,
): void {
  caretLineJumpHandler = handler;
}

function getWordElement(wordIndex: number): HTMLElement | null {
  return getWordsContainer().querySelector<HTMLElement>(
    `.word[data-word-index="${wordIndex}"]`,
  );
}

function getLineGap(): number {
  const style = window.getComputedStyle(getWordsContainer());
  return Number.parseFloat(style.rowGap) || 0;
}

function getScrollLineHeight(activeWordEl: HTMLElement, previousLineTop: number): number {
  return Math.max(activeWordEl.offsetTop - previousLineTop, activeWordEl.offsetHeight);
}

export function updateActiveWordMetrics(wordIndex: number): void {
  const wordEl = getWordElement(wordIndex);
  if (!wordEl) return;
  activeWordTop = wordEl.offsetTop;
  activeWordHeight = wordEl.offsetHeight;
}

function getWordTopInContainer(word: HTMLElement, wordsEl: HTMLElement): number {
  return word.getBoundingClientRect().top - wordsEl.getBoundingClientRect().top;
}

function getDistinctLineTops(
  wordElements: HTMLElement[],
  wordsEl: HTMLElement,
): number[] {
  const tops: number[] = [];
  for (const word of wordElements) {
    const top = Math.round(getWordTopInContainer(word, wordsEl));
    if (tops.length === 0 || top > tops[tops.length - 1]! + 2) {
      tops.push(top);
    }
  }
  return tops;
}

function getThirdLineBottom(
  wordElements: HTMLElement[],
  wordsEl: HTMLElement,
  thirdLineTop: number,
): number {
  let thirdLineBottom = thirdLineTop;
  for (const word of wordElements) {
    const top = Math.round(getWordTopInContainer(word, wordsEl));
    if (Math.abs(top - thirdLineTop) <= 2) {
      thirdLineBottom = Math.max(thirdLineBottom, top + word.offsetHeight);
    }
  }
  return thirdLineBottom;
}

function computeThreeLineContentHeight(
  wordElements: HTMLElement[],
  wordsEl: HTMLElement,
): number {
  const lineTops = getDistinctLineTops(wordElements, wordsEl);
  if (lineTops.length === 0) return 0;

  const firstLineTop = lineTops[0]!;

  if (lineTops.length >= VISIBLE_LINES) {
    const thirdLineTop = lineTops[VISIBLE_LINES - 1]!;
    return getThirdLineBottom(wordElements, wordsEl, thirdLineTop) - firstLineTop;
  }

  const linePitch =
    lineTops.length >= 2
      ? lineTops[1]! - lineTops[0]!
      : wordElements[0]!.offsetHeight + getLineGap();

  return linePitch * VISIBLE_LINES;
}

/** Limits the words viewport to three lines of text. */
export function updateWordsWrapperHeight(): void {
  const wordsEl = getWordsContainer();
  const viewport = getWordsViewport();
  const wrapper = getWordsWrapper();
  const wordElements = [...wordsEl.querySelectorAll<HTMLElement>(".word")];
  if (wordElements.length === 0) return;

  const contentHeight = computeThreeLineContentHeight(wordElements, wordsEl);

  let viewportHeight = contentHeight;
  if (viewportHeight <= 0) {
    const sample = wordElements[0]!;
    const linePitch = (sample.offsetHeight + getLineGap()) || 32;
    viewportHeight = linePitch * VISIBLE_LINES;
  }

  viewport.style.height = `${viewportHeight}px`;
  viewport.style.overflow = "hidden";
  wordsEl.style.height = "";
  wordsEl.style.overflow = "";
  wrapper.style.height = "";
  wrapper.style.overflow = "";
}

function removeWordsUpToIndex(lastElementIndexToRemove: number): void {
  const wordsEl = getWordsContainer();
  for (let i = lastElementIndexToRemove; i >= 0; i -= 1) {
    wordsEl.children[i]?.remove();
  }
}

function animateWordsMarginTop(
  wordsEl: HTMLElement,
  marginTop: number,
  duration: number,
): Promise<void> {
  marginTopAnimation?.cancel();
  marginTopAnimation = null;

  if (duration <= 0) {
    wordsEl.style.marginTop = `${marginTop}px`;
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const finish = () => {
      marginTopAnimation = null;
      resolve();
    };
    const timeoutId = window.setTimeout(finish, duration + 100);

    marginTopAnimation = animate(wordsEl, {
      marginTop: `${marginTop}px`,
      duration,
      ease: "inOut(1.25)",
      onComplete: () => {
        window.clearTimeout(timeoutId);
        finish();
      },
    });
  });
}

async function lineJump(currentTop: number, force = false): Promise<void> {
  const wordsEl = getWordsContainer();

  try {
    if (currentTestLine > 0 || force) {
      const activeWordEl = getWordElement(activeWordIndex);
      if (!activeWordEl) return;

      const children = [...wordsEl.children];
      const activeWordElementIndex = children.indexOf(activeWordEl);

      let lastElementIndexToRemove: number | undefined;
      for (let i = activeWordElementIndex - 1; i >= 0; i -= 1) {
        const child = children[i];
        if (!(child instanceof HTMLElement) || !child.classList.contains("word")) {
          continue;
        }
        if (Math.floor(child.offsetTop) < currentTop) {
          lastElementIndexToRemove = i;
          break;
        }
      }

      if (lastElementIndexToRemove === undefined) {
        return;
      }

      currentLinesJumping += 1;
      const lineHeight = getScrollLineHeight(activeWordEl, currentTop);
      const newMarginTop = -lineHeight * currentLinesJumping;
      const duration = SMOOTH_LINE_SCROLL ? LINE_JUMP_DURATION_MS : 0;

      caretLineJumpHandler?.({ newMarginTop, duration });

      if (SMOOTH_LINE_SCROLL && duration > 0) {
        await animateWordsMarginTop(wordsEl, newMarginTop, duration);
      }

      currentLinesJumping = 0;
      removeWordsUpToIndex(lastElementIndexToRemove);
      wordsEl.style.marginTop = "0";
      caretLineJumpHandler?.({ newMarginTop: 0, duration: 0 });
      finalizeCaretAfterLineJump();
    }
  } finally {
    currentTestLine += 1;
    updateWordsWrapperHeight();
    updateActiveWordMetrics(activeWordIndex);
  }
}

/**
 * Called after committing a word and moving to the next.
 * Scrolls when the new active word sits on a lower line than the previous one.
 */
export async function afterWordCommit(
  previousWordIndex: number,
  newWordIndex: number,
): Promise<void> {
  activeWordIndex = newWordIndex;
  updateActiveWordMetrics(newWordIndex);

  const previousWordEl = getWordElement(previousWordIndex);
  const newWordEl = getWordElement(newWordIndex);
  if (!previousWordEl || !newWordEl) {
    return;
  }

  const previousTop = previousWordEl.offsetTop;
  const newTop = newWordEl.offsetTop;

  if (newTop > previousTop) {
    await lineJump(previousTop);
  }
}

/** Re-measure the three-line viewport after layout is ready. */
export function refreshWordsViewport(wordIndex = activeWordIndex): void {
  updateWordsWrapperHeight();
  updateActiveWordMetrics(wordIndex);
}

export function resetLineScroll(wordIndex = 0): void {
  currentTestLine = 0;
  currentLinesJumping = 0;
  activeWordIndex = wordIndex;
  marginTopAnimation?.cancel();
  marginTopAnimation = null;
  finalizeCaretAfterLineJump();
  const wordsEl = getWordsContainer();
  const viewport = getWordsViewport();
  const wrapper = getWordsWrapper();
  wordsEl.style.marginTop = "0";
  wordsEl.style.height = "";
  wordsEl.style.overflow = "";
  viewport.style.height = "";
  viewport.style.overflow = "";
  wrapper.style.height = "";
  wrapper.style.overflow = "";
  updateActiveWordMetrics(wordIndex);
}

/** Blocks input that would wrap the active word mid-line (Monkeytype behavior). */
export function wouldCauseLineWrap(
  wordIndex: number,
  input: string,
  nextChar: string,
  targetWord: string,
  commitsWord: boolean,
): boolean {
  if (commitsWord || nextChar === " ") return false;
  if (input.length < targetWord.length) return false;

  const pendingInput = input + nextChar;
  const { top, height } = measureWordLayout(wordIndex, pendingInput, targetWord);

  if (top > activeWordTop + 1) return true;
  if (height > activeWordHeight + 1) return true;
  return false;
}
