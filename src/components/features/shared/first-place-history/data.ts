import type { TooltipRow } from "@/lib/chartTooltip";
import type {
  FirstPlaceData,
  FirstPlaceTheme,
  LogoTeam,
  TeamDataPoint,
  TeamInfo,
} from "./types";

const DEFAULT_LOGO = "/images/team_logos/default.png";

/**
 * Tooltip rows for one date, highest probability first. "everyRow" lists
 * every backend row for the date; "teamsAboveZero" lists the charted teams
 * whose line is above 0% at that date.
 */
export function tooltipRows(
  mode: FirstPlaceTheme["tooltipRows"],
  label: { isoDate?: string; displayLabel?: string },
  rows: FirstPlaceData[],
  teamData: Record<string, TeamInfo>,
  formatPct: (pct: number) => string,
): TooltipRow[] {
  if (mode === "everyRow") {
    return rows
      .filter((item) => item.date === label.isoDate)
      .sort((a, b) => b.first_place_pct - a.first_place_pct)
      .map((item, index) => ({
        label: `${index + 1}. ${item.team_name}`,
        value: formatPct(item.first_place_pct),
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
      label: `${index + 1}. ${team.name}`,
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
