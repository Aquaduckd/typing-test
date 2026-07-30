import { queryRequired } from "./dom";
import { clearStoredNgramStats, hasStoredNgramStats, loadStoredNgramStats } from "./ngram-storage";
import { createNgramTable, storedAggregatesToStats } from "./ngram-table";
import { refreshSlowTrigramLines } from "./slow-trigram-lines";

const ngramsEmptyEl = queryRequired<HTMLElement>("#ngrams-empty");
const ngramsContentEl = queryRequired<HTMLElement>("#ngrams-content");
const ngramsResetBtn = queryRequired<HTMLButtonElement>("#ngrams-reset");
const ngramsCopyJsonBtn = queryRequired<HTMLButtonElement>("#ngrams-copy-json");

const COPY_JSON_LABEL = "Copy JSON";
const COPY_JSON_COPIED_LABEL = "Copied!";
let copyJsonResetTimeout: number | null = null;

function showCopyJsonFeedback(): void {
  if (copyJsonResetTimeout !== null) {
    window.clearTimeout(copyJsonResetTimeout);
  }

  ngramsCopyJsonBtn.textContent = COPY_JSON_COPIED_LABEL;
  ngramsCopyJsonBtn.disabled = true;

  copyJsonResetTimeout = window.setTimeout(() => {
    copyJsonResetTimeout = null;
    ngramsCopyJsonBtn.textContent = COPY_JSON_LABEL;
    ngramsCopyJsonBtn.disabled = false;
  }, 1500);
}

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

tabBigramsBtn.addEventListener("click", () => {
  setNgramsTabState("bigrams");
});

tabTrigramsBtn.addEventListener("click", () => {
  setNgramsTabState("trigrams");
});

ngramsCopyJsonBtn.addEventListener("click", async () => {
  const json = JSON.stringify(loadStoredNgramStats(), null, 2);

  try {
    await navigator.clipboard.writeText(json);
    showCopyJsonFeedback();
  } catch {
    window.prompt("Copy ngram JSON:", json);
  }
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
