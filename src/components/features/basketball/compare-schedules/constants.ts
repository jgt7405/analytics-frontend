import type { ComparisonFilter, GameFilter, LocationFilter } from "./types";

export const GRAY_COLOR = "#9ca3af";
export const THRESHOLD = 0.95; // 95% probability threshold

export const TOP_SECTION_HEIGHT = 580;
export const BOTTOM_SECTION_HEIGHT = 130;
export const CHART_HEIGHT = TOP_SECTION_HEIGHT + BOTTOM_SECTION_HEIGHT;
export const COLUMN_WIDTH = 130;
export const MARGIN = { top: 60, right: 100, bottom: 10, left: 100 };
export const PLOT_HEIGHT = TOP_SECTION_HEIGHT - MARGIN.top - MARGIN.bottom;

export const SVG_FONT_FAMILY = '"Roboto Condensed", system-ui, -apple-system, sans-serif';

// Fallback when a game has no team_conf_catg.
export const POWER_CONFERENCES = ["Southeastern", "Big Ten", "Atlantic Coast", "Big 12", "Big East"];

export const COMPARISON_OPTIONS = [
  { value: "all_d1" as ComparisonFilter, label: "All D1" },
  { value: "power_6" as ComparisonFilter, label: "Power 5" },
  { value: "non_power_6" as ComparisonFilter, label: "Non Pwr 5" },
  { value: "teams_selected" as ComparisonFilter, label: "Teams Selected" },
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
