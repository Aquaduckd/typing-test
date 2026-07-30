import english from "./data/english.json";

const STORAGE_KEY = "typing-test-word-list";

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

/** Parsed words for the typing test; falls back to the default e200 list when empty. */
export function getActiveWordList(): string[] {
  const words = parseWordList(loadWordListText());
  return words.length > 0 ? words : [...english.words];
}
