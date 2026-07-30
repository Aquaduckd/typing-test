import { queryRequired } from "./dom";
import {
  formatAccuracy,
  formatResultDateTime,
  formatTypingSpeed,
} from "./result-stats";
import { loadTestLifetimeStats } from "./test-stats-storage";
import {
  WORD_LIST_SELECTIONS,
  type WordListSelection,
} from "./word-list-presets";

const testsStartedEl = queryRequired<HTMLElement>("#lifetime-tests-started");
const testsCompletedEl = queryRequired<HTMLElement>("#lifetime-tests-completed");
const personalBestsBodyEl = queryRequired<HTMLElement>("#lifetime-pb-body");

function formatWordListLabel(selection: WordListSelection): string {
  return selection;
}

function renderPersonalBests(): void {
  const { personalBests } = loadTestLifetimeStats();

  personalBestsBodyEl.replaceChildren();

  for (const wordList of WORD_LIST_SELECTIONS) {
    const best = personalBests[wordList];
    const tr = document.createElement("tr");
    tr.className = "border-t border-zinc-800/60";

    const wordListCell = document.createElement("td");
    wordListCell.className = "px-3 py-2 align-middle font-medium text-zinc-100";
    wordListCell.textContent = formatWordListLabel(wordList);

    const wpmCell = document.createElement("td");
    wpmCell.className = "px-3 py-2 align-middle text-zinc-300";
    wpmCell.textContent = best ? formatTypingSpeed(best.wpm) : "—";

    const accCell = document.createElement("td");
    accCell.className = "px-3 py-2 align-middle text-zinc-300";
    accCell.textContent = best ? formatAccuracy(best.accuracy) : "—";

    const dateCell = document.createElement("td");
    dateCell.className = "px-3 py-2 align-middle text-zinc-500";
    dateCell.textContent =
      best?.completedAt == null ? "—" : formatResultDateTime(best.completedAt);

    tr.append(wordListCell, wpmCell, accCell, dateCell);
    personalBestsBodyEl.append(tr);
  }
}

export function refreshStatsView(): void {
  const stats = loadTestLifetimeStats();

  testsStartedEl.textContent = String(stats.testsStarted);
  testsCompletedEl.textContent = String(stats.testsCompleted);
  renderPersonalBests();
}
