import type { ComparisonFilter, GameFilter } from "./types";

export const GRAY_COLOR = "#9ca3af";
export const CHART_HEIGHT = 650;
export const COLUMN_WIDTH = 130;
export const MARGIN = { top: 60, right: 100, bottom: 40, left: 100 };
export const PLOT_HEIGHT = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;

// Fallback when a game has no team_conf_catg.
export const POWER_4_CONFERENCES = ["SEC", "Big Ten", "ACC", "Big 12"];

export const COMPARISON_OPTIONS = [
  { value: "all_fbs" as ComparisonFilter, label: "FBS" },
  { value: "power_4" as ComparisonFilter, label: "Power 4" },
  { value: "non_power_4" as ComparisonFilter, label: "Non Pwr 4" },
  { value: "teams_selected" as ComparisonFilter, label: "Teams Selected" },
];

export const GAME_OPTIONS = [
  { value: "all" as GameFilter, label: "All" },
  { value: "completed" as GameFilter, label: "Completed" },
  { value: "wins" as GameFilter, label: "Wins" },
  { value: "losses" as GameFilter, label: "Losses" },
  { value: "remaining" as GameFilter, label: "Remaining" },
];
