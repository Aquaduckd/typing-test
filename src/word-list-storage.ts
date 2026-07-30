import english from "./data/english.json";
import type { WordListSelection } from "./word-list-presets";

const STORAGE_KEY = "typing-test-word-list";
const SELECTION_STORAGE_KEY = "typing-test-word-list-selection";

const PRESET_SELECTIONS = new Set<string>([
  "e200",
  "1k",
  "5k",
  "10k",
  "25k",
  "450k",
]);

export const DEFAULT_WORD_LIST_TEXT = english.words.join(" ");

export function parseWordList(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

function loadRawWordListText(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function loadWordListText(): string {
  return loadRawWordListText() ?? DEFAULT_WORD_LIST_TEXT;
}

export function saveWordListText(text: string): void {
  localStorage.setItem(STORAGE_KEY, text);
}

function isWordListSelection(value: string): value is WordListSelection {
  return value === "custom" || PRESET_SELECTIONS.has(value);
}

export function loadWordListSelection(): WordListSelection | null {
  try {
    const raw = localStorage.getItem(SELECTION_STORAGE_KEY);
    if (!raw || !isWordListSelection(raw)) return null;
    return raw;
  } catch {
    return null;
  }
}

export function saveWordListSelection(selection: WordListSelection): void {
  localStorage.setItem(SELECTION_STORAGE_KEY, selection);
}

/** Parsed words for the typing test; falls back to the default e200 list when empty. */
export function getActiveWordList(): string[] {
  const words = parseWordList(loadWordListText());
  return words.length > 0 ? words : [...english.words];
}
