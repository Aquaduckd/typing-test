import {
  formatNgramLabel,
  getTargetTrigramDurationMs,
  replayTargetPositionAttempts,
  type TargetPositionAttempt,
} from "./ngrams";
import { TEST_CONFIG } from "./config";
import {
  getSlowTrigramSet,
  getSlowTrigramStarts,
  getStoredTrigramMeanMs,
} from "./slow-trigrams";
import { getFlatTextOffsetBeforeWord, type KeystrokeEvent } from "./state";
import { getOffsetWithinAncestor, getWordsContainer } from "./words-dom";

const LINE_OFFSET_PX = 4;
const LINE_HEIGHT_PX = 2;
const SAME_LINE_TOP_THRESHOLD_PX = 4;
const LINES_LAYER_CLASS = "pointer-events-none absolute inset-0 z-[5]";
const LINE_CLASS =
  "pointer-events-none absolute rounded-full transition-colors duration-150";
const LINE_COLOR_PENDING = "bg-amber-400/90";
const LINE_COLOR_FASTER = "bg-emerald-400/90";
const LINE_COLOR_SLOWER = "bg-red-400/90";

type CharSpan = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

function areOnSameLine(a: CharSpan, b: CharSpan): boolean {
  return Math.abs(a.top - b.top) <= SAME_LINE_TOP_THRESHOLD_PX;
}

type TrigramLineStatus = "pending" | "faster" | "slower";

type VisibleWord = {
  wordIndex: number;
  text: string;
};

type WordCharRef = {
  wordIndex: number;
  charIndex: number;
};

let wordsProvider: () => string[] = () => [];
let keystrokesProvider: () => KeystrokeEvent[] = () => [];
let typedFlatLengthProvider: () => number = () => 0;
let pendingFrame: number | null = null;

function ensureLinesLayer(): HTMLElement {
  const container = getWordsContainer();
  let layer = container.querySelector<HTMLElement>("#slow-trigram-lines");

  if (!layer) {
    layer = document.createElement("div");
    layer.id = "slow-trigram-lines";
    layer.className = LINES_LAYER_CLASS;
  }

  if (layer.parentElement !== container || container.firstElementChild !== layer) {
    container.prepend(layer);
  }

  return layer;
}

function getLinesLayer(): HTMLElement {
  return ensureLinesLayer();
}

export function setSlowTrigramWordsProvider(provider: () => string[]): void {
  wordsProvider = provider;
}

export function setSlowTrigramKeystrokesProvider(
  provider: () => KeystrokeEvent[],
): void {
  keystrokesProvider = provider;
}

export function setSlowTrigramTypedFlatLengthProvider(
  provider: () => number,
): void {
  typedFlatLengthProvider = provider;
}

function getTrigramLineStatus(
  globalFlatStart: number,
  flatText: string,
  localFlatStart: number,
  attempts: Map<number, TargetPositionAttempt>,
  typedFlatLength: number,
): TrigramLineStatus {
  if (typedFlatLength <= globalFlatStart + 2) return "pending";

  const trigram = formatNgramLabel([
    flatText[localFlatStart]!,
    flatText[localFlatStart + 1]!,
    flatText[localFlatStart + 2]!,
  ]);
  const meanMs = getStoredTrigramMeanMs(trigram);
  if (meanMs === null) return "pending";

  const duration = getTargetTrigramDurationMs(globalFlatStart, attempts);
  if (duration === null) return "pending";

  return duration < meanMs ? "faster" : "slower";
}

function lineColorClass(status: TrigramLineStatus): string {
  switch (status) {
    case "faster":
      return LINE_COLOR_FASTER;
    case "slower":
      return LINE_COLOR_SLOWER;
    default:
      return LINE_COLOR_PENDING;
  }
}

function getVisibleWords(allWords: string[]): VisibleWord[] {
  const container = getWordsContainer();

  return [...container.querySelectorAll<HTMLElement>(".word")]
    .map((element) => Number(element.dataset.wordIndex))
    .filter((wordIndex) => wordIndex >= 0 && wordIndex < allWords.length)
    .sort((a, b) => a - b)
    .map((wordIndex) => ({
      wordIndex,
      text: allWords[wordIndex]!,
    }));
}

function flatIndexToWordChar(
  flatIndex: number,
  visibleWords: VisibleWord[],
): WordCharRef | null {
  let flatIdx = 0;

  for (let visibleIndex = 0; visibleIndex < visibleWords.length; visibleIndex += 1) {
    if (visibleIndex > 0) {
      if (flatIdx === flatIndex) return null;
      flatIdx += 1;
    }

    const { wordIndex, text } = visibleWords[visibleIndex]!;
    if (flatIndex >= flatIdx && flatIndex < flatIdx + text.length) {
      return { wordIndex, charIndex: flatIndex - flatIdx };
    }

    flatIdx += text.length;
  }

  return null;
}

function getLetterElement(ref: WordCharRef): HTMLElement | null {
  const wordEl = getWordsContainer().querySelector<HTMLElement>(
    `.word[data-word-index="${ref.wordIndex}"]`,
  );
  if (!wordEl) return null;

  const letters = wordEl.querySelectorAll("letter");
  return (letters[ref.charIndex] as HTMLElement | undefined) ?? null;
}

function getLetterSpan(
  ref: WordCharRef,
  wordsEl: HTMLElement,
): CharSpan | null {
  const letter = getLetterElement(ref);
  if (!letter) return null;

  const { left, top } = getOffsetWithinAncestor(letter, wordsEl);

  return {
    left,
    right: left + letter.offsetWidth,
    top,
    bottom: top + letter.offsetHeight,
  };
}

function getSpaceSpan(
  beforeSpan: CharSpan,
  afterSpan: CharSpan,
): CharSpan | null {
  if (!areOnSameLine(beforeSpan, afterSpan)) return null;
  if (afterSpan.left <= beforeSpan.right) return null;

  return {
    left: beforeSpan.right,
    right: afterSpan.left,
    top: Math.min(beforeSpan.top, afterSpan.top),
    bottom: Math.max(beforeSpan.bottom, afterSpan.bottom),
  };
}

function getFlatIndexSpan(
  flatIndex: number,
  flatText: string,
  visibleWords: VisibleWord[],
  wordsEl: HTMLElement,
): CharSpan | null {
  if (flatText[flatIndex] === " ") {
    const beforeRef = flatIndexToWordChar(flatIndex - 1, visibleWords);
    const afterRef = flatIndexToWordChar(flatIndex + 1, visibleWords);
    if (!beforeRef || !afterRef) return null;

    const beforeSpan = getLetterSpan(beforeRef, wordsEl);
    const afterSpan = getLetterSpan(afterRef, wordsEl);
    if (!beforeSpan || !afterSpan) return null;

    return getSpaceSpan(beforeSpan, afterSpan);
  }

  const ref = flatIndexToWordChar(flatIndex, visibleWords);
  if (!ref) return null;
  return getLetterSpan(ref, wordsEl);
}

function spansShareLine(...spans: CharSpan[]): boolean {
  const first = spans[0];
  if (!first) return false;

  return spans.every((span) => areOnSameLine(first, span));
}

function getTrigramLineBox(
  flatStart: number,
  flatText: string,
  visibleWords: VisibleWord[],
  wordsEl: HTMLElement,
): { left: number; top: number; width: number } | null {
  const startSpan = getFlatIndexSpan(flatStart, flatText, visibleWords, wordsEl);
  const middleSpan = getFlatIndexSpan(flatStart + 1, flatText, visibleWords, wordsEl);
  const endSpan = getFlatIndexSpan(flatStart + 2, flatText, visibleWords, wordsEl);

  if (!startSpan || !middleSpan || !endSpan) return null;
  if (!spansShareLine(startSpan, middleSpan, endSpan)) return null;

  const left = Math.min(startSpan.left, middleSpan.left, endSpan.left);
  const right = Math.max(startSpan.right, middleSpan.right, endSpan.right);
  const bottom = Math.max(startSpan.bottom, middleSpan.bottom, endSpan.bottom);

  if (right <= left) return null;

  return {
    left,
    top: bottom + LINE_OFFSET_PX,
    width: right - left,
  };
}

function renderSlowTrigramLines(allWords: string[]): void {
  const layer = getLinesLayer();
  layer.replaceChildren();

  const slowTrigrams = getSlowTrigramSet();
  if (slowTrigrams.size === 0) return;

  const visibleWords = getVisibleWords(allWords);
  if (visibleWords.length === 0) return;

  const wordsEl = getWordsContainer();
  const flatText = visibleWords.map((word) => word.text).join(" ");
  const flatTextOffset = getFlatTextOffsetBeforeWord(
    visibleWords[0]!.wordIndex,
    allWords,
  );
  const starts = getSlowTrigramStarts(flatText, slowTrigrams);
  const keystrokes = keystrokesProvider();
  const typedFlatLength = typedFlatLengthProvider();
  const { attempts } = replayTargetPositionAttempts(
    allWords,
    TEST_CONFIG.mode,
    keystrokes,
  );
  const fragment = document.createDocumentFragment();

  for (const start of starts) {
    const box = getTrigramLineBox(start, flatText, visibleWords, wordsEl);
    if (!box) continue;

    const status = getTrigramLineStatus(
      flatTextOffset + start,
      flatText,
      start,
      attempts,
      typedFlatLength,
    );
    const line = document.createElement("div");
    line.className = `${LINE_CLASS} ${lineColorClass(status)}`;
    line.style.left = `${box.left}px`;
    line.style.top = `${box.top}px`;
    line.style.width = `${box.width}px`;
    line.style.height = `${LINE_HEIGHT_PX}px`;
    fragment.appendChild(line);
  }

  layer.appendChild(fragment);
}

export function updateSlowTrigramLines(allWords?: string[]): void {
  const words = allWords ?? wordsProvider();
  if (words.length === 0) {
    getLinesLayer().replaceChildren();
    return;
  }

  renderSlowTrigramLines(words);
}

export function scheduleSlowTrigramLines(allWords?: string[]): void {
  if (pendingFrame !== null) {
    cancelAnimationFrame(pendingFrame);
  }

  pendingFrame = requestAnimationFrame(() => {
    pendingFrame = null;
    updateSlowTrigramLines(allWords);
  });
}

export function refreshSlowTrigramLines(): void {
  scheduleSlowTrigramLines();
}
