import {
  sortNgrams,
  type NgramSortKey,
  type NgramStat,
} from "./ngrams";
import type { StoredNgramAggregate } from "./ngram-storage";

export type NgramTableElements = {
  bodyEl: HTMLElement;
  emptyEl: HTMLElement;
  sortHeaders: {
    button: HTMLButtonElement;
    key: NgramSortKey;
    label: string;
  }[];
};

export type NgramTableController = {
  setRows: (rows: NgramStat[]) => void;
  resetRows: (rows: NgramStat[]) => void;
  refresh: () => void;
};

export function storedAggregatesToStats(
  store: Record<string, StoredNgramAggregate>,
): NgramStat[] {
  return Object.entries(store).map(([ngram, { totalMs, count }]) => ({
    ngram,
    meanMs: Math.round(totalMs / count),
    count,
  }));
}

function getStoredMeanMs(
  store: Record<string, StoredNgramAggregate>,
  ngram: string,
): number | null {
  const entry = store[ngram];
  if (!entry || entry.count === 0) return null;
  return Math.round(entry.totalMs / entry.count);
}

export function enrichNgramStatsWithGlobalMean(
  rows: NgramStat[],
  store: Record<string, StoredNgramAggregate>,
): NgramStat[] {
  return rows.map((row) => ({
    ...row,
    globalMeanMs: getStoredMeanMs(store, row.ngram),
  }));
}

export function enrichNgramStatsWithGlobalMeanAndDelta(
  rows: NgramStat[],
  storedBefore: Record<string, StoredNgramAggregate>,
  storedAfter: Record<string, StoredNgramAggregate>,
): NgramStat[] {
  return rows.map((row) => {
    const before = getStoredMeanMs(storedBefore, row.ngram);
    const after = getStoredMeanMs(storedAfter, row.ngram);

    return {
      ...row,
      globalMeanMs: after,
      globalMeanDelta:
        before == null || after == null ? null : after - before,
    };
  });
}

function getCellClassName(key: NgramSortKey): string {
  switch (key) {
    case "ngram":
      return "px-3 py-2 align-middle font-medium text-zinc-100";
    case "count":
      return "px-3 py-2 align-middle text-zinc-500";
    case "globalMeanDelta":
      return "px-3 py-2 align-middle";
    default:
      return "px-3 py-2 align-middle text-zinc-300";
  }
}

function appendGlobalMeanDeltaCell(cell: HTMLTableCellElement, row: NgramStat): void {
  const delta = row.globalMeanDelta;
  const base = getCellClassName("globalMeanDelta");

  if (delta == null) {
    cell.className = `${base} text-zinc-300`;
    cell.textContent = "—";
    return;
  }

  if (delta === 0) {
    cell.className = `${base} text-zinc-300`;
    cell.textContent = "0";
    return;
  }

  cell.className = `${base} ${delta > 0 ? "text-red-400" : "text-emerald-400"}`;
  cell.textContent = `${delta > 0 ? "↑" : "↓"}${Math.abs(delta)}`;
}

function formatCellValue(row: NgramStat, key: NgramSortKey): string {
  switch (key) {
    case "ngram":
      return row.ngram;
    case "meanMs":
      return String(row.meanMs);
    case "globalMeanMs":
      return row.globalMeanMs == null ? "—" : String(row.globalMeanMs);
    case "globalMeanDelta":
      if (row.globalMeanDelta == null) return "—";
      if (row.globalMeanDelta === 0) return "0";
      return `${row.globalMeanDelta > 0 ? "↑" : "↓"}${Math.abs(row.globalMeanDelta)}`;
    case "count":
      return String(row.count);
  }
}

function appendCellContent(cell: HTMLTableCellElement, row: NgramStat, key: NgramSortKey): void {
  if (key === "globalMeanDelta") {
    appendGlobalMeanDeltaCell(cell, row);
    return;
  }

  cell.textContent = formatCellValue(row, key);
}

export function createNgramTable(elements: NgramTableElements): NgramTableController {
  let rows: NgramStat[] = [];
  let sortKey: NgramSortKey = "meanMs";
  let sortAsc = false;

  function updateSortHeaders(): void {
    for (const { button, key, label } of elements.sortHeaders) {
      const active = sortKey === key;
      button.classList.toggle("text-amber-400", active);
      button.classList.toggle("text-zinc-600", !active);
      const arrow = active ? (sortAsc ? " ↑" : " ↓") : "";
      button.textContent = `${label}${arrow}`;
    }
  }

  function render(sortedRows: NgramStat[]): void {
    elements.bodyEl.replaceChildren();

    if (sortedRows.length === 0) {
      elements.emptyEl.classList.remove("hidden");
      return;
    }

    elements.emptyEl.classList.add("hidden");

    for (const row of sortedRows) {
      const tr = document.createElement("tr");
      tr.className = "border-t border-zinc-800/60";

      for (const { key } of elements.sortHeaders) {
        const cell = document.createElement("td");
        if (key !== "globalMeanDelta") {
          cell.className = getCellClassName(key);
        }
        appendCellContent(cell, row, key);
        tr.append(cell);
      }

      elements.bodyEl.append(tr);
    }
  }

  function refresh(): void {
    render(sortNgrams(rows, sortKey, sortAsc));
    updateSortHeaders();
  }

  function setSort(key: NgramSortKey): void {
    if (sortKey === key) {
      sortAsc = !sortAsc;
    } else {
      sortKey = key;
      sortAsc = key === "ngram";
    }
    refresh();
  }

  for (const { button, key } of elements.sortHeaders) {
    button.addEventListener("click", () => {
      setSort(key);
    });
  }

  return {
    setRows(nextRows: NgramStat[]): void {
      rows = nextRows;
      refresh();
    },
    resetRows(nextRows: NgramStat[]): void {
      rows = nextRows;
      sortKey = "meanMs";
      sortAsc = false;
      refresh();
    },
    refresh,
  };
}
