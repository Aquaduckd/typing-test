import {
  destroyResultChart,
  setChartDatasetVisibility,
  updateResultChart,
} from "./chart";
import { queryRequired } from "./dom";
import {
  formatAccuracy,
  formatPercentage,
  formatResultTime,
  formatTypingSpeed,
  type TestResult,
} from "./result-stats";

const resultEl = queryRequired<HTMLElement>("#result");
const typingTestEl = queryRequired<HTMLElement>("#typing-test");
const liveHeaderEl = queryRequired<HTMLElement>("#live-header");
const footerEl = queryRequired<HTMLElement>("#test-footer");

const wpmEl = queryRequired<HTMLElement>("#result-wpm");
const accEl = queryRequired<HTMLElement>("#result-acc");
const rawEl = queryRequired<HTMLElement>("#result-raw");
const charsEl = queryRequired<HTMLElement>("#result-chars");
const consistencyEl = queryRequired<HTMLElement>("#result-consistency");
const timeEl = queryRequired<HTMLElement>("#result-time");
const chartCanvas = queryRequired<HTMLCanvasElement>("#wpm-chart");

const toggleBurstBtn = queryRequired<HTMLButtonElement>("#toggle-burst");
const toggleRawBtn = queryRequired<HTMLButtonElement>("#toggle-raw");
const toggleErrorsBtn = queryRequired<HTMLButtonElement>("#toggle-errors");

let burstVisible = true;
let rawVisible = true;
let errorsVisible = true;

function setToggleState(button: HTMLButtonElement, active: boolean): void {
  button.classList.toggle("border-amber-500/60", active);
  button.classList.toggle("text-amber-400", active);
  button.classList.toggle("border-zinc-700", !active);
  button.classList.toggle("text-zinc-500", !active);
}

function populateResult(result: TestResult): void {
  wpmEl.textContent = formatTypingSpeed(result.wpm);
  accEl.textContent = formatAccuracy(result.accuracy);
  rawEl.textContent = formatTypingSpeed(result.rawWpm);
  charsEl.textContent = result.charStats.join("/");
  consistencyEl.textContent = formatPercentage(result.consistency);
  timeEl.textContent = formatResultTime(result.durationMs);

  updateResultChart(chartCanvas, result);
  setChartDatasetVisibility("burst", burstVisible);
  setChartDatasetVisibility("raw", rawVisible);
  setChartDatasetVisibility("errors", errorsVisible);
  setToggleState(toggleBurstBtn, burstVisible);
  setToggleState(toggleRawBtn, rawVisible);
  setToggleState(toggleErrorsBtn, errorsVisible);
}

export function showResult(result: TestResult): void {
  populateResult(result);

  liveHeaderEl.classList.add("hidden");
  typingTestEl.classList.add("hidden");
  footerEl.classList.add("hidden");
  resultEl.classList.remove("hidden");
  resultEl.classList.add("flex");

  requestAnimationFrame(() => {
    resultEl.classList.remove("opacity-0");
    resultEl.classList.add("opacity-100");
  });
}

export function hideResult(immediate = false): void {
  if (resultEl.classList.contains("hidden")) {
    destroyResultChart();
    return;
  }

  const finish = (): void => {
    resultEl.classList.add("hidden");
    resultEl.classList.remove("flex", "opacity-100");
    resultEl.classList.add("opacity-0");
    liveHeaderEl.classList.remove("hidden");
    typingTestEl.classList.remove("hidden");
    footerEl.classList.remove("hidden");
    destroyResultChart();
  };

  if (immediate) {
    finish();
    return;
  }

  resultEl.classList.remove("opacity-100");
  resultEl.classList.add("opacity-0");

  window.setTimeout(finish, 200);
}

toggleBurstBtn.addEventListener("click", () => {
  burstVisible = !burstVisible;
  setChartDatasetVisibility("burst", burstVisible);
  setToggleState(toggleBurstBtn, burstVisible);
});

toggleRawBtn.addEventListener("click", () => {
  rawVisible = !rawVisible;
  setChartDatasetVisibility("raw", rawVisible);
  setToggleState(toggleRawBtn, rawVisible);
});

toggleErrorsBtn.addEventListener("click", () => {
  errorsVisible = !errorsVisible;
  setChartDatasetVisibility("errors", errorsVisible);
  setToggleState(toggleErrorsBtn, errorsVisible);
});
