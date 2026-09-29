import type { TooltipRow } from "@/lib/chartTooltip";
import type {
  LogoTeam,
  ProbabilityKey,
  ProbabilityRow,
  ProbabilityTheme,
  TeamDataPoint,
  TeamInfo,
} from "./types";

const DEFAULT_LOGO = "/images/team_logos/default.png";

/** A row's plotted value (the field named by the theme's valueKey). */
export const valueOf = (row: ProbabilityRow, key: ProbabilityKey) =>
  row[key] as number;

/**
 * Tooltip rows for one date, highest probability first. "everyRow" lists
 * every backend row for the date; "teamsAboveZero" lists the charted teams
 * whose line is above 0% at that date.
 */
export function tooltipRows(
  theme: Pick<
    ProbabilityTheme,
    "tooltipRows" | "rankTooltipRows" | "valueKey" | "formatPct"
  >,
  label: { isoDate?: string; displayLabel?: string },
  rows: ProbabilityRow[],
  teamData: Record<string, TeamInfo>,
): TooltipRow[] {
  const { valueKey, formatPct } = theme;
  if (theme.tooltipRows === "everyRow") {
    return rows
      .filter((item) => item.date === label.isoDate)
      .sort((a, b) => valueOf(b, valueKey) - valueOf(a, valueKey))
      .map((item, index) => ({
        label: theme.rankTooltipRows
          ? `${index + 1}. ${item.team_name}`
          : item.team_name,
        value: formatPct(valueOf(item, valueKey)),
        color: item.team_info.primary_color || "#000000",
        logoUrl: item.team_info.logo_url || DEFAULT_LOGO,
      }));
  }
  return Object.entries(teamData)
    .map(([teamName, team]) => {
      const dataPoint = team.data.find(
        (d: TeamDataPoint) => d.x === label.displayLabel,
      );
      return {
        name: teamName,
        pct: dataPoint?.y || 0,
        color: team.team_info.primary_color || "#000000",
        logoUrl: team.team_info.logo_url || DEFAULT_LOGO,
      };
    })
    .filter((team) => team.pct > 0)
    .sort((a, b) => b.pct - a.pct)
    .map((team, index) => ({
      label: theme.rankTooltipRows ? `${index + 1}. ${team.name}` : team.name,
      value: formatPct(team.pct),
      color: team.color,
      logoUrl: team.logoUrl,
    }));
}

export interface LogoPosition {
  team: LogoTeam;
  idealY: number;
  adjustedY: number;
}

/**
 * Vertical positions for the end-of-line logos: each at its line's end,
 * clamped to the plot, then pushed up until it is at least `minSpacing`
 * above the logo below it.
 */
export function layoutEndLogos(
  teams: LogoTeam[],
  yFor: (pct: number) => number,
  { top, bottom }: { top: number; bottom: number },
  minSpacing: number,
): LogoPosition[] {
  const positions = teams.map((team) => ({
    team,
    idealY: yFor(team.final_pct),
    adjustedY: yFor(team.final_pct),
  }));

  // If only one team visible, don't adjust - use ideal position
  if (positions.length === 1) {
    return positions;
  }

  // Sort by final_pct descending (highest to lowest) to stack from top
  positions.sort((a, b) => b.team.final_pct - a.team.final_pct);

  // Adjust for collisions, working from the bottom logo up
  for (let i = positions.length - 1; i >= 0; i--) {
    if (positions[i].adjustedY > bottom) {
      positions[i].adjustedY = bottom;
    }
    if (positions[i].adjustedY < top) {
      positions[i].adjustedY = top;
    }

    // Keep clear of the logo below (higher index, lower on chart)
    if (i < positions.length - 1) {
      const lowerLogo = positions[i + 1];
      const minY = lowerLogo.adjustedY - minSpacing;
      if (positions[i].adjustedY > minY) {
        positions[i].adjustedY = minY;
      }
    }
  }

  return positions;
}

/**
 * Football's conference-champion and championship-game layout: from the
 * bottom logo up, each sits at its line's end or `minSpacing` above the logo
 * below, whichever is higher, and not above the plot. Logos then bunched at
 * the top are fanned out, `minSpacing` apart, without running into the next
 * logo below them.
 */
export function layoutEndLogosCascade(
  teams: LogoTeam[],
  yFor: (pct: number) => number,
  { top, bottom }: { top: number; bottom: number },
  minSpacing: number,
): LogoPosition[] {
  const positions = teams.map((team) => ({
    team,
    idealY: yFor(team.final_pct),
    adjustedY: yFor(team.final_pct),
  }));

  positions.sort((a, b) => b.team.final_pct - a.team.final_pct);

  for (let i = positions.length - 1; i >= 0; i--) {
    if (i === positions.length - 1) {
      positions[i].adjustedY = Math.min(positions[i].idealY, bottom);
    } else {
      const lowerLogo = positions[i + 1];
      const maxAllowedY = lowerLogo.adjustedY - minSpacing;
      positions[i].adjustedY = Math.min(positions[i].idealY, maxAllowedY);
      if (positions[i].adjustedY < top) {
        positions[i].adjustedY = top;
      }
    }
  }

  // Fan out only the logos bunched at the top, tight (minSpacing per step)
  // so near-identical values still look close, and never past the next,
  // already placed logo (a large bunch would otherwise create new overlaps).
  const topBunchedLogos = positions.filter(
    (pos) => pos.adjustedY <= top + minSpacing,
  );
  if (topBunchedLogos.length > 1) {
    const bunchedCount = topBunchedLogos.length;
    const nextPosition = positions[bunchedCount];
    const idealSpan = (bunchedCount - 1) * minSpacing;
    const availableSpan = nextPosition
      ? Math.max(0, nextPosition.adjustedY - minSpacing - top)
      : idealSpan;
    const span = Math.min(idealSpan, availableSpan);
    const step = span / (bunchedCount - 1);
    topBunchedLogos.forEach((pos, i) => {
      pos.adjustedY = top + i * step;
    });
  }

  return positions;
}
