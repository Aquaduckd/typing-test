import { sortNgrams, type NgramSortKey, type NgramStat } from "./ngrams";
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

      const ngramCell = document.createElement("td");
      ngramCell.className = "px-3 py-2 align-middle font-medium text-zinc-100";
      ngramCell.textContent = row.ngram;

      const meanCell = document.createElement("td");
      meanCell.className = "px-3 py-2 align-middle text-zinc-300";
      meanCell.textContent = String(row.meanMs);

      const countCell = document.createElement("td");
      countCell.className = "px-3 py-2 align-middle text-zinc-500";
      countCell.textContent = String(row.count);

      tr.append(ngramCell, meanCell, countCell);
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
