import { queryRequired } from "./dom";

export type SiteTab = "test" | "results" | "stats" | "words";

const tabTestBtn = queryRequired<HTMLButtonElement>("#site-tab-test");
const tabResultsBtn = queryRequired<HTMLButtonElement>("#site-tab-results");
const tabStatsBtn = queryRequired<HTMLButtonElement>("#site-tab-stats");
const tabWordsBtn = queryRequired<HTMLButtonElement>("#site-tab-words");
const testPanelEl = queryRequired<HTMLElement>("#site-panel-test");
const resultsPanelEl = queryRequired<HTMLElement>("#site-panel-results");
const statsPanelEl = queryRequired<HTMLElement>("#site-panel-stats");
const wordsPanelEl = queryRequired<HTMLElement>("#site-panel-words");

const TAB_BUTTONS: Record<SiteTab, HTMLButtonElement> = {
  test: tabTestBtn,
  results: tabResultsBtn,
  stats: tabStatsBtn,
  words: tabWordsBtn,
};

const TAB_PANELS: Record<SiteTab, HTMLElement> = {
  test: testPanelEl,
  results: resultsPanelEl,
  stats: statsPanelEl,
  words: wordsPanelEl,
};

let activeTab: SiteTab = "test";
const listeners = new Set<(tab: SiteTab) => void>();

function setTabButtonState(button: HTMLButtonElement, active: boolean): void {
  button.classList.toggle("border-amber-500/60", active);
  button.classList.toggle("text-amber-400", active);
  button.classList.toggle("border-zinc-700", !active);
  button.classList.toggle("text-zinc-500", !active);
}

export function getSiteTab(): SiteTab {
  return activeTab;
}

function notifyTabListeners(tab: SiteTab): void {
  for (const listener of listeners) {
    listener(tab);
  }
}

export function setSiteTab(tab: SiteTab): void {
  if (tab === activeTab) return;

  activeTab = tab;

  for (const [key, button] of Object.entries(TAB_BUTTONS) as [SiteTab, HTMLButtonElement][]) {
    setTabButtonState(button, key === tab);
  }

  for (const [key, panel] of Object.entries(TAB_PANELS) as [SiteTab, HTMLElement][]) {
    const isActive = key === tab;
    panel.classList.toggle("hidden", !isActive);
    panel.classList.toggle("flex", isActive);
  }

  notifyTabListeners(tab);
}

export function onSiteTabChange(listener: (tab: SiteTab) => void): void {
  listeners.add(listener);
}

tabTestBtn.addEventListener("click", () => {
  if (activeTab === "test") {
    notifyTabListeners("test");
    return;
  }

  setSiteTab("test");
});

tabResultsBtn.addEventListener("click", () => {
  setSiteTab("results");
});

tabStatsBtn.addEventListener("click", () => {
  setSiteTab("stats");
});

tabWordsBtn.addEventListener("click", () => {
  setSiteTab("words");
});
