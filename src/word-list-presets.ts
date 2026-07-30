import english from "./data/english.json";
import english1k from "./data/english_1k.json";
import english5k from "./data/english_5k.json";
import english10k from "./data/english_10k.json";
import english25k from "./data/english_25k.json";
import english450k from "./data/english_450k.json";

import { parseWordList } from "./word-list-storage";

export type WordListPreset = "e200" | "1k" | "5k" | "10k" | "25k" | "450k";

export type WordListSelection = WordListPreset | "custom";

export const WORD_LIST_PRESETS: WordListPreset[] = [
  "e200",
  "1k",
  "5k",
  "10k",
  "25k",
  "450k",
];

export const WORD_LIST_SELECTIONS: WordListSelection[] = [
  ...WORD_LIST_PRESETS,
  "custom",
];

const PRESET_WORDS: Record<WordListPreset, string[]> = {
  e200: english.words,
  "1k": english1k.words,
  "5k": english5k.words,
  "10k": english10k.words,
  "25k": english25k.words,
  "450k": english450k.words,
};

export function getPresetWordListText(preset: WordListPreset): string {
  return PRESET_WORDS[preset].join(" ");
}

export function matchWordListPreset(text: string): WordListPreset | null {
  const words = parseWordList(text);

  for (const preset of WORD_LIST_PRESETS) {
    const presetWords = PRESET_WORDS[preset];
    if (words.length !== presetWords.length) continue;

    let matches = true;
    for (let i = 0; i < words.length; i += 1) {
      if (words[i] !== presetWords[i]) {
        matches = false;
        break;
      }
    }

    if (matches) return preset;
  }

  return null;
}
