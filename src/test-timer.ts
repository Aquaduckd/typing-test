import { TEST_CONFIG } from "./config";

type TimerCallbacks = {
  onTick?: (elapsedSeconds: number) => void;
  onFinish: () => void;
};

let intervalId: number | null = null;
let callbacks: TimerCallbacks | null = null;

export function startTestTimer(cbs: TimerCallbacks): void {
  stopTestTimer();
  callbacks = cbs;

  let elapsedSeconds = 0;
  callbacks.onTick?.(elapsedSeconds);

  intervalId = window.setInterval(() => {
    elapsedSeconds += 1;
    callbacks?.onTick?.(elapsedSeconds);

    if (elapsedSeconds >= TEST_CONFIG.timeLimitSeconds) {
      const onFinish = callbacks?.onFinish;
      stopTestTimer();
      onFinish?.();
    }
  }, 1000);
}

export function stopTestTimer(): void {
  if (intervalId !== null) {
    window.clearInterval(intervalId);
    intervalId = null;
  }
  callbacks = null;
}

export function getCountdownSeconds(elapsedSeconds: number): number {
  return Math.max(0, TEST_CONFIG.timeLimitSeconds - elapsedSeconds);
}

export function isTimerRunning(): boolean {
  return intervalId !== null;
}
