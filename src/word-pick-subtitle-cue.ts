import { queryRequired } from "./dom";
import type { WordPickMode } from "./word-picker";

const subtitleEl = queryRequired<HTMLElement>("#site-subtitle");

/** Trigram tests use · (U+00B7); random tests use ∙ (U+2219). */
export function setWordPickSubtitleCue(mode: WordPickMode): void {
  const separator = mode === "trigram" ? "\u00b7" : "\u2219";
  subtitleEl.textContent = `monkeytype-style ${separator} click words to focus`;
}
