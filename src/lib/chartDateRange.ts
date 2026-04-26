export interface ChartDateRange {
  start: Date;
  end: Date;
}

function parseSeasonStartYear(season: string): number {
  const parts = season.split("-");
  return parseInt(parts[0], 10);
}

function getLatestDataYear(
  data?: Array<{ date: string }>
): number | null {
  if (!data || data.length === 0) return null;
  const maxDate = data.reduce((max, d) => (d.date > max ? d.date : max), data[0].date);
  return parseInt(maxDate.split("-")[0], 10);
}

export function getFootballDateRange(
  season?: string,
  data?: Array<{ date: string }>
): ChartDateRange {
  let year: number;

  if (season) {
    year = parseSeasonStartYear(season);
  } else {
    const dataYear = getLatestDataYear(data);
    year = dataYear ?? new Date().getFullYear();
  }

  return {
    start: new Date(year, 7, 15, 12, 0, 0),  // 8/15
    end: new Date(year, 11, 15, 12, 0, 0),   // 12/15
  };
}

export function getBasketballDateRange(
  season?: string,
  data?: Array<{ date: string }>
): ChartDateRange {
  let startYear: number;

  if (season) {
    startYear = parseSeasonStartYear(season);
  } else {
    const dataYear = getLatestDataYear(data);
    if (dataYear) {
      if (data && data.length > 0) {
        const maxDate = data.reduce((max, d) => (d.date > max ? d.date : max), data[0].date);
        const [, month] = maxDate.split("-").map(Number);
        // If latest data is Jan-Mar (months 1-3), season started in prior year
        startYear = month <= 3 ? dataYear - 1 : dataYear;
      } else {
        startYear = dataYear;
      }
    } else {
      // Default based on current date
      const now = new Date();
      const month = now.getMonth() + 1;
      startYear = month <= 3 ? now.getFullYear() - 1 : now.getFullYear();
    }
  }

  return {
    start: new Date(startYear, 9, 30, 12, 0, 0),    // 10/30
    end: new Date(startYear + 1, 2, 22, 12, 0, 0),  // 3/22 of next year
  };
}

export function filterDataToRange<T extends { date: string }>(
  data: T[],
  range: ChartDateRange
): T[] {
  const startISO = formatDateToISO(range.start);
  const endISO = formatDateToISO(range.end);

  return data.filter((item) => {
    return item.date >= startISO && item.date <= endISO;
  });
}

function formatDateToISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseISODate(isoDate: string): { year: number; month: number; day: number } {
  const [year, month, day] = isoDate.split("-").map(Number);
  return { year, month, day };
}

export function buildChartLabels(
  dataDates: string[],
  range: ChartDateRange,
  sport: "football" | "basketball"
): Array<{ isoDate: string; displayLabel: string }> {
  const startISO = formatDateToISO(range.start);
  const endISO = formatDateToISO(range.end);

  // Combine data dates with boundary dates
  const allDates = new Set([...dataDates, startISO, endISO]);

  // Sort chronologically
  const sortedDates = Array.from(allDates).sort();

  // Build display labels
  let prevYear: number | null = null;
  return sortedDates.map((isoDate) => {
    const { year, month, day } = parseISODate(isoDate);

    let displayLabel: string;
    if (sport === "basketball" && prevYear !== null && year !== prevYear) {
      // Show year when transitioning years in basketball (which spans two years)
      displayLabel = `${month}/${day} ${year}`;
    } else {
      displayLabel = `${month}/${day}`;
    }

    prevYear = year;
    return { isoDate, displayLabel };
  });
}
