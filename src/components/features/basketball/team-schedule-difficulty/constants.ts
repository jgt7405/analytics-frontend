import type { ComparisonFilter, GameFilter, LocationFilter, Margin } from "./types";

export const TOP_SECTION_HEIGHT = 480;
export const BOTTOM_SECTION_HEIGHT = 35;
export const TOTAL_CHART_HEIGHT = TOP_SECTION_HEIGHT + BOTTOM_SECTION_HEIGHT;
export const CHART_WIDTH_DESKTOP = 380;
export const CHART_WIDTH_MOBILE = 320;
export const THRESHOLD = 0.95; // 95% probability threshold

export const TOP_MARGIN: Margin = { top: 20, right: 60, bottom: 30, left: 60 };
export const BOTTOM_MARGIN: Margin = { top: 2, right: 60, bottom: 5, left: 60 };
export const TOP_PLOT_HEIGHT = TOP_SECTION_HEIGHT - TOP_MARGIN.top - TOP_MARGIN.bottom;

// Fallback when a game has no team_conf_catg.
export const POWER_CONFERENCES = [
  "Southeastern",
  "Big Ten",
  "Atlantic Coast",
  "Big 12",
  "Big East",
];

export const COMPARISON_OPTIONS = [
  { value: "all_d1" as ComparisonFilter, label: "All D1" },
  { value: "power_6" as ComparisonFilter, label: "Power 5" },
  { value: "non_power_6" as ComparisonFilter, label: "Non Pwr 5" },
  { value: "conference" as ComparisonFilter, label: "Conference" },
];

export const GAME_OPTIONS = [
  { value: "all" as GameFilter, label: "All" },
  { value: "completed" as GameFilter, label: "Completed" },
  { value: "wins" as GameFilter, label: "Wins" },
  { value: "losses" as GameFilter, label: "Losses" },
  { value: "remaining" as GameFilter, label: "Remaining" },
];

export const LOCATION_OPTIONS = [
  { value: "all" as LocationFilter, label: "All" },
  { value: "home" as LocationFilter, label: "Home" },
  { value: "away" as LocationFilter, label: "Away" },
  { value: "neutral" as LocationFilter, label: "Neutral" },
];
