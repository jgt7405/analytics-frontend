import type { ComparisonFilter, GameFilter } from "./types";

export const CHART_HEIGHT = 450;
export const CHART_WIDTH_DESKTOP = 380;
export const CHART_WIDTH_MOBILE = 320;
export const MARGIN = { top: 20, right: 60, bottom: 40, left: 60 };
export const PLOT_HEIGHT = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;
export const TOOLTIP_WIDTH = 180;

export const COMPARISON_OPTIONS = [
  { value: "all_fbs" as ComparisonFilter, label: "FBS" },
  { value: "power_4" as ComparisonFilter, label: "Power 4" },
  { value: "non_power_4" as ComparisonFilter, label: "Non Pwr 4" },
  { value: "conference" as ComparisonFilter, label: "Conference" },
];

export const GAME_OPTIONS = [
  { value: "all" as GameFilter, label: "All" },
  { value: "completed" as GameFilter, label: "Completed" },
  { value: "wins" as GameFilter, label: "Wins" },
  { value: "losses" as GameFilter, label: "Losses" },
  { value: "remaining" as GameFilter, label: "Remaining" },
];
