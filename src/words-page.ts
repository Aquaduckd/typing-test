import { queryRequired } from "./dom";
import {
  loadWordListText,
  parseWordList,
  saveWordListText,
} from "./word-list-storage";
import {
  getPresetWordListText,
  type WordListPreset,
} from "./word-list-presets";

const wordsInputEl = queryRequired<HTMLTextAreaElement>("#words-list-input");
const wordCountEl = queryRequired<HTMLElement>("#words-list-count");
const presetButtons = [
  ...document.querySelectorAll<HTMLButtonElement>("[data-word-preset]"),
];

let saveTimeout: number | null = null;

function updateWordCount(text: string): void {
  const count = parseWordList(text).length;
  wordCountEl.textContent = `${count} word${count === 1 ? "" : "s"}`;
}

function persistWordList(text: string): void {
  if (saveTimeout !== null) {
    window.clearTimeout(saveTimeout);
    saveTimeout = null;
  }

  saveWordListText(text);
  updateWordCount(text);
}

function scheduleSave(text: string): void {
  if (saveTimeout !== null) {
    window.clearTimeout(saveTimeout);
  }

  saveTimeout = window.setTimeout(() => {
    saveTimeout = null;
    saveWordListText(text);
    updateWordCount(text);
  }, 300);
}

function applyWordListText(text: string): void {
  wordsInputEl.value = text;
  persistWordList(text);
}

export function refreshWordsView(): void {
  const text = loadWordListText();
  wordsInputEl.value = text;
  updateWordCount(text);
}

wordsInputEl.addEventListener("input", () => {
  const text = wordsInputEl.value;
  updateWordCount(text);
  scheduleSave(text);
});

wordsInputEl.addEventListener("blur", () => {
  persistWordList(wordsInputEl.value);
});

for (const button of presetButtons) {
  button.addEventListener("click", () => {
    const preset = button.dataset.wordPreset as WordListPreset | undefined;
    if (!preset) return;

    applyWordListText(getPresetWordListText(preset));
  });
}
