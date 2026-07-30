import {
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  ScatterController,
  Tooltip,
} from "chart.js";
import { CHART_CONFIG } from "./config";
import type { TestResult } from "./result-stats";

Chart.register(
  CategoryScale,
  LinearScale,
  LineController,
  ScatterController,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
);

let chart: Chart | null = null;

function smoothWithValueWindow(
  values: number[],
  windowSize: number,
  valueWindowSize: number,
): number[] {
  const smoothed: number[] = [];

  for (let i = 0; i < values.length; i += 1) {
    const currentValue = values[i]!;
    const from = Math.max(0, i - windowSize);
    const to = Math.min(values.length, i + windowSize + 1);

    let count = 0;
    let sum = 0;

    for (let j = from; j < to; j += 1) {
      const neighborValue = values[j]!;
      if (Math.abs(neighborValue - currentValue) <= valueWindowSize) {
        sum += neighborValue;
        count += 1;
      }
    }

    smoothed.push(count > 0 ? sum / count : currentValue);
  }

  return smoothed;
}

function getBurstSeries(burst: number[]): number[] {
  if (burst.length === 0) return [];

  const maxBurst = Math.max(...burst);
  const valueWindow = maxBurst * 0.25;
  return smoothWithValueWindow(burst, 1, valueWindow);
}

const WPM_DATASET_LABELS = ["wpm", "burst", "raw"] as const;

function getVisibleWpmValues(): number[] {
  if (!chart) return [];

  const values: number[] = [];
  for (const label of WPM_DATASET_LABELS) {
    const dataset = chart.data.datasets.find((entry) => entry.label === label);
    if (!dataset || dataset.hidden) continue;

    for (const point of dataset.data) {
      if (typeof point === "number" && Number.isFinite(point)) {
        values.push(point);
      }
    }
  }

  return values;
}

function applyWpmScaleBounds(): void {
  if (!chart) return;

  const values = getVisibleWpmValues();
  if (values.length === 0) return;

  const wpmScale = chart.options.scales?.wpm;
  if (!wpmScale || typeof wpmScale !== "object") return;

  let min = 0;
  let max = Math.ceil(Math.max(...values) / 10) * 10;

  if (!CHART_CONFIG.startGraphsAtZero) {
    min = Math.floor(Math.min(...values) / 10) * 10;
  }

  if (max <= min) {
    max = min + 10;
  }

  wpmScale.min = min;
  wpmScale.max = max;
}

function applyErrorScaleBounds(errors: number[]): void {
  if (!chart || errors.length === 0) return;

  const errorScale = chart.options.scales?.error;
  if (!errorScale || typeof errorScale !== "object") return;

  const maxErrors = Math.max(...errors);
  errorScale.max = maxErrors > 0 ? maxErrors : 1;
}

export function updateResultChart(canvas: HTMLCanvasElement, result: TestResult): void {
  const { chartData } = result;
  const burstSeries = getBurstSeries(chartData.burst);

  if (chart) {
    chart.destroy();
    chart = null;
  }

  chart = new Chart(canvas, {
    type: "line",
    data: {
      labels: chartData.labels,
      datasets: [
        {
          label: "burst",
          data: burstSeries,
          yAxisID: "wpm",
          order: 4,
          borderColor: "#a1a1aa",
          backgroundColor: "rgba(161, 161, 170, 0.18)",
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.2,
          fill: true,
        },
        {
          label: "wpm",
          data: chartData.wpm,
          yAxisID: "wpm",
          order: 2,
          borderColor: "#fbbf24",
          backgroundColor: "transparent",
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.2,
        },
        {
          label: "raw",
          data: chartData.raw,
          yAxisID: "wpm",
          order: 3,
          borderColor: "#60a5fa",
          backgroundColor: "transparent",
          borderWidth: 2,
          borderDash: [8, 8],
          pointRadius: 0,
          tension: 0.2,
        },
        {
          label: "errors",
          data: chartData.errors,
          yAxisID: "error",
          order: 1,
          type: "scatter",
          borderColor: "#f87171",
          backgroundColor: "#f87171",
          pointStyle: "crossRot",
          pointRadius: (context) => {
            const value = context.dataset.data[context.dataIndex];
            return typeof value === "number" && value > 0 ? 6 : 0;
          },
          pointHoverRadius: (context) => {
            const value = context.dataset.data[context.dataIndex];
            return typeof value === "number" && value > 0 ? 8 : 0;
          },
          showLine: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "#18181b",
          titleColor: "#a1a1aa",
          bodyColor: "#fafafa",
          borderColor: "#3f3f46",
          borderWidth: 1,
          callbacks: {
            label(context) {
              const datasetLabel = context.dataset.label ?? "";
              if (datasetLabel === "errors") {
                return `errors: ${context.parsed.y}`;
              }
              return `${datasetLabel}: ${context.parsed.y}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: "rgba(63, 63, 70, 0.35)",
          },
          ticks: {
            color: "#71717a",
          },
        },
        wpm: {
          type: "linear",
          position: "left",
          grid: {
            color: "rgba(63, 63, 70, 0.35)",
          },
          ticks: {
            color: "#71717a",
          },
          title: {
            display: true,
            text: "Words per Minute",
            color: "#71717a",
          },
        },
        error: {
          type: "linear",
          position: "right",
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            color: "#71717a",
            stepSize: 1,
          },
          title: {
            display: true,
            text: "Errors",
            color: "#71717a",
          },
          min: 0,
        },
      },
    },
  });

  applyWpmScaleBounds();
  applyErrorScaleBounds(chartData.errors);
}

export function destroyResultChart(): void {
  if (chart) {
    chart.destroy();
    chart = null;
  }
}

export function resizeResultChart(): void {
  chart?.resize();
}

export function setChartDatasetVisibility(
  label: "raw" | "burst" | "errors",
  visible: boolean,
): void {
  if (!chart) return;
  const dataset = chart.data.datasets.find((entry) => entry.label === label);
  if (!dataset) return;
  dataset.hidden = !visible;

  if (label === "raw" || label === "burst") {
    applyWpmScaleBounds();
  }

  chart.update();
}
