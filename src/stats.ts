import type { KeystrokeEvent } from "./state";

export type LiveStats = {
  wpm: number;
  accuracy: number;
};

/** Monkeytype: charCount / 5 / (durationSeconds / 60) */
export function calculateWpm(charCount: number, durationMs: number): number {
  const durationSeconds = durationMs / 1000;
  if (durationSeconds <= 0) return 0;
  return (charCount / 5 / durationSeconds) * 60;
}

/** Counts every insert; backspace does not undo mistakes (Monkeytype getAccuracy). */
export function calculateAccuracy(keystrokes: KeystrokeEvent[]): number {
  let correct = 0;
  let incorrect = 0;

  for (const keystroke of keystrokes) {
    if (keystroke.correct) {
      correct += 1;
    } else {
      incorrect += 1;
    }
  }

  const total = correct + incorrect;
  if (total === 0) return 100;
  return Math.round((correct / total) * 100);
}

export function calculateStats(
  correctChars: number,
  keystrokes: KeystrokeEvent[],
  elapsedMs: number,
): LiveStats {
  const wpm = Math.round(calculateWpm(correctChars, elapsedMs));
  const accuracy = calculateAccuracy(keystrokes);

  return { wpm, accuracy };
}

export function formatElapsedMs(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

export function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}
