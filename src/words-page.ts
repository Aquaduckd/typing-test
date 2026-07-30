import { queryRequired } from "./dom";
import {
  loadWordListSelection,
  loadWordListText,
  parseWordList,
  saveWordListSelection,
  saveWordListText,
} from "./word-list-storage";
import {
  getPresetWordListText,
  matchWordListPreset,
  type WordListPreset,
  type WordListSelection,
} from "./word-list-presets";

const wordsInputEl = queryRequired<HTMLTextAreaElement>("#words-list-input");
const wordCountEl = queryRequired<HTMLElement>("#words-list-count");
const presetButtons = [
  ...document.querySelectorAll<HTMLButtonElement>("[data-word-preset]"),
];

let saveTimeout: number | null = null;
let activeSelection: WordListSelection = "e200";

function setPresetButtonState(button: HTMLButtonElement, active: boolean): void {
  button.classList.toggle("border-amber-500/60", active);
  button.classList.toggle("text-amber-400", active);
  button.classList.toggle("border-zinc-700", !active);
  button.classList.toggle("text-zinc-500", !active);
}

function applySelectionUi(): void {
  for (const button of presetButtons) {
    const preset = button.dataset.wordPreset as WordListSelection | undefined;
    if (!preset) continue;
    setPresetButtonState(button, preset === activeSelection);
  }

  wordsInputEl.readOnly = activeSelection !== "custom";
  wordsInputEl.classList.toggle("cursor-text", activeSelection === "custom");
  wordsInputEl.classList.toggle("cursor-default", activeSelection !== "custom");
  wordsInputEl.classList.toggle("opacity-80", activeSelection !== "custom");
}

function setActiveSelection(selection: WordListSelection): void {
  activeSelection = selection;
  saveWordListSelection(selection);
  applySelectionUi();
}

function resolveInitialSelection(text: string): WordListSelection {
  return loadWordListSelection() ?? matchWordListPreset(text) ?? "custom";
}

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

function applyPreset(preset: WordListPreset): void {
  wordsInputEl.value = getPresetWordListText(preset);
  persistWordList(wordsInputEl.value);
  setActiveSelection(preset);
}

export function refreshWordsView(): void {
  const text = loadWordListText();
  wordsInputEl.value = text;
  updateWordCount(text);
  activeSelection = resolveInitialSelection(text);
  applySelectionUi();
}

wordsInputEl.addEventListener("input", () => {
  if (activeSelection !== "custom") return;

  const text = wordsInputEl.value;
  updateWordCount(text);
  scheduleSave(text);
});

wordsInputEl.addEventListener("blur", () => {
  if (activeSelection !== "custom") return;
  persistWordList(wordsInputEl.value);
});

for (const button of presetButtons) {
  button.addEventListener("click", () => {
    const preset = button.dataset.wordPreset as WordListSelection | undefined;
    if (!preset) return;

    if (preset === "custom") {
      setActiveSelection("custom");
      wordsInputEl.focus();
      return;
    }

    applyPreset(preset);
  });
}
