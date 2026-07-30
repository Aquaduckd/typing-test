import { queryRequired } from "./dom";
import {
  computeNgramSummaryStats,
  formatCount,
  formatDecimal,
  type NgramSummaryStats,
} from "./ngram-distribution-stats";
import { clearStoredNgramStats, hasStoredNgramStats, loadStoredNgramStats } from "./ngram-storage";
import { createNgramTable, storedAggregatesToStats } from "./ngram-table";
import { refreshSlowTrigramLines } from "./slow-trigram-lines";

const ngramsEmptyEl = queryRequired<HTMLElement>("#ngrams-empty");
const ngramsContentEl = queryRequired<HTMLElement>("#ngrams-content");
const ngramsResetBtn = queryRequired<HTMLButtonElement>("#ngrams-reset");
const ngramsDownloadJsonBtn = queryRequired<HTMLButtonElement>("#ngrams-download-json");
const ngramsStatsKindEl = queryRequired<HTMLElement>("#ngrams-stats-kind");
const ngramsStatUniqueEl = queryRequired<HTMLElement>("#ngrams-stat-unique");
const ngramsStatTotalEl = queryRequired<HTMLElement>("#ngrams-stat-total");
const ngramsStatAvgCountEl = queryRequired<HTMLElement>("#ngrams-stat-avg-count");
const ngramsStatAvgMsEl = queryRequired<HTMLElement>("#ngrams-stat-avg-ms");

const tabBigramsBtn = queryRequired<HTMLButtonElement>("#ngrams-tab-bigrams");
const tabTrigramsBtn = queryRequired<HTMLButtonElement>("#ngrams-tab-trigrams");
const bigramsPanelEl = queryRequired<HTMLElement>("#ngrams-bigrams-panel");
const trigramsPanelEl = queryRequired<HTMLElement>("#ngrams-trigrams-panel");

type NgramsTab = "bigrams" | "trigrams";

let activeTab: NgramsTab = "trigrams";

const bigramTable = createNgramTable({
  bodyEl: queryRequired<HTMLElement>("#ngrams-bigrams-body"),
  emptyEl: queryRequired<HTMLElement>("#ngrams-bigrams-empty"),
  sortHeaders: [
    {
      button: queryRequired<HTMLButtonElement>("#ngrams-bigram-sort-name"),
      key: "ngram",
      label: "bigram",
    },
    {
      button: queryRequired<HTMLButtonElement>("#ngrams-bigram-sort-ms"),
      key: "meanMs",
      label: "avg ms",
    },
    {
      button: queryRequired<HTMLButtonElement>("#ngrams-bigram-sort-count"),
      key: "count",
      label: "count",
    },
  ],
});

const trigramTable = createNgramTable({
  bodyEl: queryRequired<HTMLElement>("#ngrams-trigrams-body"),
  emptyEl: queryRequired<HTMLElement>("#ngrams-trigrams-empty"),
  sortHeaders: [
    {
      button: queryRequired<HTMLButtonElement>("#ngrams-trigram-sort-name"),
      key: "ngram",
      label: "trigram",
    },
    {
      button: queryRequired<HTMLButtonElement>("#ngrams-trigram-sort-ms"),
      key: "meanMs",
      label: "avg ms",
    },
    {
      button: queryRequired<HTMLButtonElement>("#ngrams-trigram-sort-count"),
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

function setNgramsTabState(tab: NgramsTab): void {
  activeTab = tab;
  setToggleState(tabBigramsBtn, tab === "bigrams");
  setToggleState(tabTrigramsBtn, tab === "trigrams");
  bigramsPanelEl.classList.toggle("hidden", tab !== "bigrams");
  bigramsPanelEl.classList.toggle("flex", tab === "bigrams");
  trigramsPanelEl.classList.toggle("hidden", tab !== "trigrams");
  trigramsPanelEl.classList.toggle("flex", tab === "trigrams");
  updateSummaryStats();
}

function renderSummaryStats(kind: NgramsTab, stats: NgramSummaryStats | null): void {
  ngramsStatsKindEl.textContent = kind;

  if (!stats) {
    ngramsStatUniqueEl.textContent = "—";
    ngramsStatTotalEl.textContent = "—";
    ngramsStatAvgCountEl.textContent = "—";
    ngramsStatAvgMsEl.textContent = "—";
    return;
  }

  ngramsStatUniqueEl.textContent = formatCount(stats.unique);
  ngramsStatTotalEl.textContent = formatCount(stats.totalReps);
  ngramsStatAvgCountEl.textContent = formatDecimal(stats.avgCount);
  ngramsStatAvgMsEl.textContent = formatCount(stats.avgMs);
}

function updateSummaryStats(): void {
  const stored = loadStoredNgramStats();
  const store = activeTab === "bigrams" ? stored.bigrams : stored.trigrams;
  renderSummaryStats(activeTab, computeNgramSummaryStats(store));
}

function updateNgramsVisibility(): void {
  const hasNgrams = hasStoredNgramStats();
  ngramsEmptyEl.classList.toggle("hidden", hasNgrams);
  ngramsContentEl.classList.toggle("hidden", !hasNgrams);
  ngramsContentEl.classList.toggle("flex", hasNgrams);
}

function populateNgramsTables(): void {
  const stored = loadStoredNgramStats();
  bigramTable.resetRows(storedAggregatesToStats(stored.bigrams));
  trigramTable.resetRows(storedAggregatesToStats(stored.trigrams));
  setNgramsTabState(activeTab);
}

export function refreshNgramsView(): void {
  updateNgramsVisibility();
  if (!hasStoredNgramStats()) return;
  populateNgramsTables();
}

function formatDownloadTimestamp(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function downloadNgramJson(): void {
  const json = JSON.stringify(loadStoredNgramStats(), null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `typing-test-ngrams-${formatDownloadTimestamp(new Date())}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

tabBigramsBtn.addEventListener("click", () => {
  setNgramsTabState("bigrams");
});

tabTrigramsBtn.addEventListener("click", () => {
  setNgramsTabState("trigrams");
});

ngramsDownloadJsonBtn.addEventListener("click", () => {
  downloadNgramJson();
});

ngramsResetBtn.addEventListener("click", () => {
  if (
    !confirm(
      "Reset all lifetime bigram and trigram stats? This cannot be undone.",
    )
  ) {
    return;
  }

  clearStoredNgramStats();
  bigramTable.resetRows([]);
  trigramTable.resetRows([]);
  refreshNgramsView();
  refreshSlowTrigramLines();
});
