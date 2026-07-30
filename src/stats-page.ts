import { queryRequired } from "./dom";
import { clearStoredNgramStats, hasStoredNgramStats, loadStoredNgramStats } from "./ngram-storage";
import { createNgramTable, storedAggregatesToStats } from "./ngram-table";
import { refreshSlowTrigramLines } from "./slow-trigram-lines";

const statsEmptyEl = queryRequired<HTMLElement>("#stats-empty");
const statsContentEl = queryRequired<HTMLElement>("#stats-content");
const statsResetBtn = queryRequired<HTMLButtonElement>("#stats-reset");
const statsCopyJsonBtn = queryRequired<HTMLButtonElement>("#stats-copy-json");

const COPY_JSON_LABEL = "Copy JSON";
const COPY_JSON_COPIED_LABEL = "Copied!";
let copyJsonResetTimeout: number | null = null;

function showCopyJsonFeedback(): void {
  if (copyJsonResetTimeout !== null) {
    window.clearTimeout(copyJsonResetTimeout);
  }

  statsCopyJsonBtn.textContent = COPY_JSON_COPIED_LABEL;
  statsCopyJsonBtn.disabled = true;

  copyJsonResetTimeout = window.setTimeout(() => {
    copyJsonResetTimeout = null;
    statsCopyJsonBtn.textContent = COPY_JSON_LABEL;
    statsCopyJsonBtn.disabled = false;
  }, 1500);
}

const tabBigramsBtn = queryRequired<HTMLButtonElement>("#stats-tab-bigrams");
const tabTrigramsBtn = queryRequired<HTMLButtonElement>("#stats-tab-trigrams");
const bigramsPanelEl = queryRequired<HTMLElement>("#stats-bigrams-panel");
const trigramsPanelEl = queryRequired<HTMLElement>("#stats-trigrams-panel");

type StatsTab = "bigrams" | "trigrams";

let activeTab: StatsTab = "trigrams";

const bigramTable = createNgramTable({
  bodyEl: queryRequired<HTMLElement>("#stats-bigrams-body"),
  emptyEl: queryRequired<HTMLElement>("#stats-bigrams-empty"),
  sortHeaders: [
    {
      button: queryRequired<HTMLButtonElement>("#stats-bigram-sort-name"),
      key: "ngram",
      label: "bigram",
    },
    {
      button: queryRequired<HTMLButtonElement>("#stats-bigram-sort-ms"),
      key: "meanMs",
      label: "avg ms",
    },
    {
      button: queryRequired<HTMLButtonElement>("#stats-bigram-sort-count"),
      key: "count",
      label: "count",
    },
  ],
});

const trigramTable = createNgramTable({
  bodyEl: queryRequired<HTMLElement>("#stats-trigrams-body"),
  emptyEl: queryRequired<HTMLElement>("#stats-trigrams-empty"),
  sortHeaders: [
    {
      button: queryRequired<HTMLButtonElement>("#stats-trigram-sort-name"),
      key: "ngram",
      label: "trigram",
    },
    {
      button: queryRequired<HTMLButtonElement>("#stats-trigram-sort-ms"),
      key: "meanMs",
      label: "avg ms",
    },
    {
      button: queryRequired<HTMLButtonElement>("#stats-trigram-sort-count"),
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

function setStatsTabState(tab: StatsTab): void {
  activeTab = tab;
  setToggleState(tabBigramsBtn, tab === "bigrams");
  setToggleState(tabTrigramsBtn, tab === "trigrams");
  bigramsPanelEl.classList.toggle("hidden", tab !== "bigrams");
  bigramsPanelEl.classList.toggle("flex", tab === "bigrams");
  trigramsPanelEl.classList.toggle("hidden", tab !== "trigrams");
  trigramsPanelEl.classList.toggle("flex", tab === "trigrams");
}

function updateStatsVisibility(): void {
  const hasStats = hasStoredNgramStats();
  statsEmptyEl.classList.toggle("hidden", hasStats);
  statsContentEl.classList.toggle("hidden", !hasStats);
  statsContentEl.classList.toggle("flex", hasStats);
}

function populateStatsTables(): void {
  const stored = loadStoredNgramStats();
  bigramTable.resetRows(storedAggregatesToStats(stored.bigrams));
  trigramTable.resetRows(storedAggregatesToStats(stored.trigrams));
  setStatsTabState(activeTab);
}

export function refreshStatsView(): void {
  updateStatsVisibility();
  if (!hasStoredNgramStats()) return;
  populateStatsTables();
}

tabBigramsBtn.addEventListener("click", () => {
  setStatsTabState("bigrams");
});

tabTrigramsBtn.addEventListener("click", () => {
  setStatsTabState("trigrams");
});

statsCopyJsonBtn.addEventListener("click", async () => {
  const json = JSON.stringify(loadStoredNgramStats(), null, 2);

  try {
    await navigator.clipboard.writeText(json);
    showCopyJsonFeedback();
  } catch {
    window.prompt("Copy stats JSON:", json);
  }
});

statsResetBtn.addEventListener("click", () => {
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
  refreshStatsView();
  refreshSlowTrigramLines();
});
