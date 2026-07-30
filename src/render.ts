import { requestDebouncedAnimationFrame } from "./utils/debounced-animation-frame";
import { getWordsContainer } from "./words-dom";

const LETTER_CORRECT = "text-zinc-500";
const LETTER_DEFAULT = "text-zinc-600";
const LETTER_CORRECT_TYPED = "text-zinc-200";
const LETTER_INCORRECT =
  "text-red-400 underline decoration-red-400/60 underline-offset-4";
const LETTER_EXTRA = "text-red-400/80";

const pendingWordData = new Map<number, string>();

function createLetterElement(char: string, className: string): HTMLElement {
  const letter = document.createElement("letter");
  letter.className = className;
  letter.textContent = char;
  return letter;
}

export function buildWordElement(word: string, wordIndex: number): HTMLElement {
  const wordEl = document.createElement("div");
  wordEl.className = "word inline-flex";
  wordEl.dataset.wordIndex = String(wordIndex);

  for (const char of word) {
    wordEl.appendChild(createLetterElement(char, LETTER_DEFAULT));
  }

  return wordEl;
}

export function appendWordsToDom(words: string[], startIndex: number): void {
  const container = getWordsContainer();
  words.forEach((word, offset) => {
    container.appendChild(buildWordElement(word, startIndex + offset));
  });
}

export function renderWords(words: string[]): void {
  const container = getWordsContainer();
  container.replaceChildren();

  words.forEach((word, index) => {
    container.appendChild(buildWordElement(word, index));
  });
}

function renderWordLetters(
  wordIndex: number,
  input: string,
  targetWord: string,
): void {
  const container = getWordsContainer();
  const wordEl = container.querySelector<HTMLElement>(
    `.word[data-word-index="${wordIndex}"]`,
  );
  if (!wordEl) return;

  const fragment = document.createDocumentFragment();

  for (let i = 0; i < input.length; i++) {
    const typed = input[i] ?? "";
    const expected = targetWord[i];
    let className = LETTER_INCORRECT;

    if (expected === undefined) {
      className = LETTER_EXTRA;
    } else if (typed === expected) {
      className = LETTER_CORRECT_TYPED;
    }

    fragment.appendChild(createLetterElement(typed, className));
  }

  for (let i = input.length; i < targetWord.length; i++) {
    const char = targetWord[i] ?? "";
    fragment.appendChild(createLetterElement(char, LETTER_DEFAULT));
  }

  wordEl.replaceChildren(fragment);
}

/** Synchronous layout probe for line-wrap prevention. */
export function measureWordLayout(
  wordIndex: number,
  input: string,
  targetWord: string,
): { top: number; height: number } {
  const container = getWordsContainer();
  const wordEl = container.querySelector<HTMLElement>(
    `.word[data-word-index="${wordIndex}"]`,
  );
  if (!wordEl) {
    return { top: 0, height: 0 };
  }

  const saved = wordEl.innerHTML;
  renderWordLetters(wordIndex, input, targetWord);
  const { offsetTop: top, offsetHeight: height } = wordEl;
  wordEl.innerHTML = saved;
  return { top, height };
}

/** Debounced like Monkeytype's updateWordLetters. */
export function updateActiveWord(
  wordIndex: number,
  input: string,
  targetWord: string,
): void {
  pendingWordData.set(wordIndex, input);
  requestDebouncedAnimationFrame(
    `test-ui.updateWordLetters.${wordIndex}`,
    () => {
      pendingWordData.delete(wordIndex);
      renderWordLetters(wordIndex, input, targetWord);
    },
  );
}

export function markWordComplete(
  wordIndex: number,
  input: string,
  targetWord: string,
  correct: boolean,
): void {
  pendingWordData.delete(wordIndex);

  const container = getWordsContainer();
  const wordEl = container.querySelector<HTMLElement>(
    `.word[data-word-index="${wordIndex}"]`,
  );
  if (!wordEl) return;

  if (correct) {
    wordEl.className = "word inline-flex opacity-70";
    const fragment = document.createDocumentFragment();
    for (const char of targetWord) {
      fragment.appendChild(createLetterElement(char, LETTER_CORRECT));
    }
    wordEl.replaceChildren(fragment);
    return;
  }

  renderWordLetters(wordIndex, input.trimEnd(), targetWord);
  wordEl.classList.add("opacity-80");
}

export function unmarkWordComplete(
  wordIndex: number,
  input: string,
  targetWord: string,
): void {
  pendingWordData.delete(wordIndex);

  const container = getWordsContainer();
  const wordEl = container.querySelector<HTMLElement>(
    `.word[data-word-index="${wordIndex}"]`,
  );
  if (!wordEl) return;

  wordEl.className = "word inline-flex";
  renderWordLetters(wordIndex, input, targetWord);
}

export function setActiveWordHighlight(wordIndex: number): void {
  const container = getWordsContainer();
  container.querySelectorAll(".word").forEach((word) => {
    word.classList.remove("outline", "outline-1", "outline-zinc-700/40", "rounded-sm");
  });

  const active = container.querySelector(
    `.word[data-word-index="${wordIndex}"]`,
  );
  active?.classList.add("outline", "outline-1", "outline-zinc-700/40", "rounded-sm");
}

export function getPendingInput(wordIndex: number): string | undefined {
  return pendingWordData.get(wordIndex);
}
