import {
  destroyResultChart,
  resizeResultChart,
  setChartDatasetVisibility,
  updateResultChart,
} from "./chart";
import { queryRequired } from "./dom";
import { createNgramTable, enrichNgramStatsWithGlobalMean } from "./ngram-table";
import { loadStoredNgramStats } from "./ngram-storage";
import { clearStoredLastResult, saveStoredLastResult } from "./result-storage";
import {
  formatAccuracy,
  formatPercentage,
  formatResultDateTime,
  formatTypingSpeed,
  type TestResult,
} from "./result-stats";

const resultsEmptyEl = queryRequired<HTMLElement>("#results-empty");
const resultEl = queryRequired<HTMLElement>("#result");

const wpmEl = queryRequired<HTMLElement>("#result-wpm");
const accEl = queryRequired<HTMLElement>("#result-acc");
const dateEl = queryRequired<HTMLElement>("#result-date");
const rawEl = queryRequired<HTMLElement>("#result-raw");
const charsEl = queryRequired<HTMLElement>("#result-chars");
const consistencyEl = queryRequired<HTMLElement>("#result-consistency");
const modeEl = queryRequired<HTMLElement>("#result-mode");
const chartCanvas = queryRequired<HTMLCanvasElement>("#wpm-chart");

const tabSummaryBtn = queryRequired<HTMLButtonElement>("#result-tab-chart");
const tabBigramsBtn = queryRequired<HTMLButtonElement>("#result-tab-bigrams");
const tabTrigramsBtn = queryRequired<HTMLButtonElement>("#result-tab-trigrams");
const summaryPanelEl = queryRequired<HTMLElement>("#result-summary-panel");
const bigramsPanelEl = queryRequired<HTMLElement>("#result-bigrams-panel");
const trigramsPanelEl = queryRequired<HTMLElement>("#result-trigrams-panel");

const toggleBurstBtn = queryRequired<HTMLButtonElement>("#toggle-burst");
const toggleRawBtn = queryRequired<HTMLButtonElement>("#toggle-raw");
const toggleErrorsBtn = queryRequired<HTMLButtonElement>("#toggle-errors");

type ResultTab = "summary" | "bigrams" | "trigrams";

let lastResult: TestResult | null = null;
let activeTab: ResultTab = "summary";
let burstVisible = true;
let rawVisible = true;
let errorsVisible = true;

const bigramTable = createNgramTable({
  bodyEl: queryRequired<HTMLElement>("#result-bigrams-body"),
  emptyEl: queryRequired<HTMLElement>("#result-bigrams-empty"),
  sortHeaders: [
    {
      button: queryRequired<HTMLButtonElement>("#bigram-sort-name"),
      key: "ngram",
      label: "bigram",
    },
    {
      button: queryRequired<HTMLButtonElement>("#bigram-sort-ms"),
      key: "meanMs",
      label: "avg ms",
    },
    {
      button: queryRequired<HTMLButtonElement>("#bigram-sort-global-ms"),
      key: "globalMeanMs",
      label: "global ms",
    },
    {
      button: queryRequired<HTMLButtonElement>("#bigram-sort-count"),
      key: "count",
      label: "count",
    },
  ],
});

const trigramTable = createNgramTable({
  bodyEl: queryRequired<HTMLElement>("#result-trigrams-body"),
  emptyEl: queryRequired<HTMLElement>("#result-trigrams-empty"),
  sortHeaders: [
    {
      button: queryRequired<HTMLButtonElement>("#trigram-sort-name"),
      key: "ngram",
      label: "trigram",
    },
    {
      button: queryRequired<HTMLButtonElement>("#trigram-sort-ms"),
      key: "meanMs",
      label: "avg ms",
    },
    {
      button: queryRequired<HTMLButtonElement>("#trigram-sort-global-ms"),
      key: "globalMeanMs",
      label: "global ms",
    },
    {
      button: queryRequired<HTMLButtonElement>("#trigram-sort-count"),
      key: "count",
      label: "count",
    },
  ],
});

function setToggleState(button: HTMLButtonElement, active: boolean): void {
  button.classList.toggle("border-amber-500/60", active);
  button.classList.toggle("text-amber-400", active);
  button.classList.toggle("border-zinc-700", !active);
  button.classList.toggle("text-zinc-500", !active);
}

function setResultTabState(tab: ResultTab): void {
  activeTab = tab;

  setToggleState(tabSummaryBtn, tab === "summary");
  setToggleState(tabBigramsBtn, tab === "bigrams");
  setToggleState(tabTrigramsBtn, tab === "trigrams");

  summaryPanelEl.classList.toggle("hidden", tab !== "summary");
  summaryPanelEl.classList.toggle("flex", tab === "summary");
  bigramsPanelEl.classList.toggle("hidden", tab !== "bigrams");
  bigramsPanelEl.classList.toggle("flex", tab === "bigrams");
  trigramsPanelEl.classList.toggle("hidden", tab !== "trigrams");
  trigramsPanelEl.classList.toggle("flex", tab === "trigrams");
}

function updateResultsVisibility(): void {
  const hasResult = lastResult !== null;
  resultsEmptyEl.classList.toggle("hidden", hasResult);
  resultEl.classList.toggle("hidden", !hasResult);
  resultEl.classList.toggle("flex", hasResult);
}

function populateResult(result: TestResult): void {
  wpmEl.textContent = formatTypingSpeed(result.wpm);
  accEl.textContent = formatAccuracy(result.accuracy);
  dateEl.textContent =
    result.completedAt == null
      ? "—"
      : formatResultDateTime(result.completedAt);
  rawEl.textContent = formatTypingSpeed(result.rawWpm);
  charsEl.textContent = result.charStats.join("/");
  consistencyEl.textContent = formatPercentage(result.consistency);
  modeEl.textContent = result.wordList ?? "—";

  updateResultChart(chartCanvas, result);
  setChartDatasetVisibility("burst", burstVisible);
  setChartDatasetVisibility("raw", rawVisible);
  setChartDatasetVisibility("errors", errorsVisible);
  setToggleState(toggleBurstBtn, burstVisible);
  setToggleState(toggleRawBtn, rawVisible);
  setToggleState(toggleErrorsBtn, errorsVisible);

  const stored = loadStoredNgramStats();

  bigramTable.resetRows(
    enrichNgramStatsWithGlobalMean(result.bigrams, stored.bigrams),
  );
  trigramTable.resetRows(
    enrichNgramStatsWithGlobalMean(result.trigrams, stored.trigrams),
  );
  setResultTabState(activeTab);
}

export function setLastResult(result: TestResult): void {
  lastResult = result;
  saveStoredLastResult(result);
  populateResult(result);
  updateResultsVisibility();
}

export function refreshResultsView(): void {
  if (!lastResult) {
    updateResultsVisibility();
    return;
  }

  populateResult(lastResult);
  updateResultsVisibility();
  requestAnimationFrame(() => {
    resizeResultChart();
  });
}

export function clearResultsView(): void {
  lastResult = null;
  clearStoredLastResult();
  destroyResultChart();
  setResultTabState("summary");
  bigramTable.resetRows([]);
  trigramTable.resetRows([]);
  updateResultsVisibility();
}

tabSummaryBtn.addEventListener("click", () => {
  setResultTabState("summary");
  requestAnimationFrame(resizeResultChart);
});

tabBigramsBtn.addEventListener("click", () => {
  setResultTabState("bigrams");
});

tabTrigramsBtn.addEventListener("click", () => {
  setResultTabState("trigrams");
});

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
