import { queryRequired } from "./dom";

const progressBarEl = queryRequired<HTMLElement>("#test-progress-bar");

export function resetTestProgress(): void {
  progressBarEl.style.transition = "none";
  progressBarEl.style.width = "0%";
  void progressBarEl.offsetWidth;
}

export function startTestProgress(durationSeconds: number): void {
  resetTestProgress();
  progressBarEl.style.transition = `width ${durationSeconds}s linear`;
  requestAnimationFrame(() => {
    progressBarEl.style.width = "100%";
  });
}

export function completeTestProgress(): void {
  progressBarEl.style.transition = "none";
  progressBarEl.style.width = "100%";
}
