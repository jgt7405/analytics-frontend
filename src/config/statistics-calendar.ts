// Dates marked on the statistics page's "Daily views and the sports calendar"
// chart (src/app/statistics/insights/ContentSection.tsx). Add each season's
// dates as they are announced; dates are Central-time calendar days.

export interface CalendarMarker {
  date: string; // YYYY-MM-DD
  label: string;
  sport: "basketball" | "football";
}

export const STATISTICS_CALENDAR: CalendarMarker[] = [
  { date: "2025-11-03", label: "Basketball season opens", sport: "basketball" },
  { date: "2025-11-04", label: "First CFP rankings", sport: "football" },
  { date: "2025-12-06", label: "Conference championships", sport: "football" },
  { date: "2025-12-07", label: "CFP selection day", sport: "football" },
  { date: "2026-01-19", label: "CFP national championship", sport: "football" },
  { date: "2026-03-15", label: "Selection Sunday", sport: "basketball" },
  { date: "2026-04-06", label: "NCAA championship game", sport: "basketball" },
];
