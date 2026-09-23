export interface ChartDateRange {
  start: Date;
  end: Date;
}

/**
 * The one basketball season-boundary rule for the whole app.
 *
 * A basketball season spans two calendar years and its chart window runs
 * 10/30 -> 3/22, so April is the natural cut: anything dated April or later
 * belongs to the season that tips off that fall, anything in Jan-Mar belongs
 * to the season that started the previous fall. Pass the latest date the
 * page has data for (ISO `YYYY-MM-DD`, or a Date); omit it to use today.
 *
 * Four pages used to derive this independently and disagreed - conf-data,
 * conf-tourney and team all rolled over in October, so through the entire
 * off-season they labelled the finished season as current and their charts
 * kept starting 10/30 of the *previous* year. Standings already used this
 * April rule; everything now shares it.
 */
export function getBasketballSeasonLabel(latest?: string | Date | null): string {
  let year: number;
  let month: number;

  if (typeof latest === "string" && latest.length >= 7) {
    const [y, m] = latest.split("-").map(Number);
    year = y;
    month = m;
  } else if (latest instanceof Date && !isNaN(latest.getTime())) {
    year = latest.getFullYear();
    month = latest.getMonth() + 1;
  } else {
    const today = new Date();
    year = today.getFullYear();
    month = today.getMonth() + 1;
  }

  const startYear = month <= 3 ? year - 1 : year;
  return `${startYear}-${(startYear + 1).toString().slice(-2)}`;
}

/** Latest `date` in a timeline-ish array, as ISO `YYYY-MM-DD`. */
export function getLatestDataDate(
  data?: Array<{ date: string }> | null
): string | undefined {
  if (!data || data.length === 0) return undefined;
  return data.reduce((max, d) => (d.date > max ? d.date : max), data[0].date);
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
  data?: Array<{ date: string }>,
  { clipToData = true }: { clipToData?: boolean } = {}
): ChartDateRange {
  let year: number;

  if (season) {
    year = parseSeasonStartYear(season);
  } else {
    const dataYear = getLatestDataYear(data);
    year = dataYear ?? new Date().getFullYear();
  }

  const seasonEnd = new Date(year, 11, 15, 12, 0, 0); // 12/15
  const start = new Date(year, 7, 27, 12, 0, 0); // 8/27
  const today = new Date();
  let end = today < seasonEnd ? today : seasonEnd;

  // Stop the axis at the latest data point when it falls short of the cap
  // (e.g. today's pipeline run hasn't landed yet) - otherwise the empty
  // trailing label pushes the plot's right edge, where ChartEndLabels draws
  // the end-of-line dot, past the end of the line.
  if (clipToData && data && data.length > 0) {
    const maxDate = data.reduce((max, d) => (d.date > max ? d.date : max), data[0].date);
    const [y, m, d] = maxDate.split("-").map(Number);
    const latest = new Date(y, m - 1, d, 12, 0, 0);
    if (latest < end && latest >= start) end = latest;
  }

  return {
    start,
    end,
  };
}

export function getBasketballDateRange(
  season?: string,
  data?: Array<{ date: string }>
): ChartDateRange {
  const startYear = parseSeasonStartYear(
    season ?? getBasketballSeasonLabel(getLatestDataDate(data))
  );

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
