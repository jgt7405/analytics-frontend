"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { BubbleTeam, PlayoffTeam } from "@/types/football";
import { useMemo } from "react";

interface FootballCFPBracketTableProps {
  playoffTeams: PlayoffTeam[];
  firstFourOut?: BubbleTeam[];
  nextFourOut?: BubbleTeam[];
}

// Unified row shape combining playoff teams and bubble teams
interface BracketRow {
  key: string;
  seedLabel: string;
  team_name: string;
  logo_url: string;
  conference: string;
  conf_logo_url?: string;
  category: string;
  twv?: number;
  rating?: number;
  cfpRating?: number;
  score?: number;
  // Group used for separator logic: "playoff" | "f4o" | "n4o"
  group: "playoff" | "f4o" | "n4o";
}

export default function FootballCFPBracketTable({
  playoffTeams,
  firstFourOut = [],
  nextFourOut = [],
}: FootballCFPBracketTableProps) {
  const { isMobile } = useResponsive();

  // Responsive dimensions - matches basketball NCAA bracket table
  const seedColWidth = isMobile ? 50 : 60;
  const teamColWidth = isMobile ? 150 : 220;
  const confColWidth = isMobile ? 80 : 120;
  const categoryColWidth = isMobile ? 80 : 120;
  const twvColWidth = isMobile ? 70 : 80;
  const ratingColWidth = isMobile ? 70 : 100;
  const cfpRatingColWidth = isMobile ? 70 : 100;
  const normColWidth = isMobile ? 80 : 120;
  const cellHeight = isMobile ? 32 : 36;
  const headerHeight = isMobile ? 40 : 48;

  // Combine playoff teams, First Four Out, and Next Four Out into one list
  const rows = useMemo<BracketRow[]>(() => {
    const playoffRows: BracketRow[] = playoffTeams.map((team) => ({
      key: `playoff-${team.rank}-${team.team_name}`,
      seedLabel: String(team.rank),
      team_name: team.team_name,
      logo_url: team.logo_url,
      conference: team.conference,
      conf_logo_url: team.conf_logo_url,
      category:
        team.bid_type === "Conference Champion" ? "Auto Bid" : "At Large",
      twv: team.post_champ_twv,
      rating: team.blended_full_season_rating_avg,
      cfpRating: team.full_season_cfp_rating_avg,
      score: team.cfp_score,
      group: "playoff",
    }));

    const f4oRows: BracketRow[] = firstFourOut.map((team) => ({
      key: `f4o-${team.position}-${team.team_name}`,
      seedLabel: "Out",
      team_name: team.team_name,
      logo_url: team.logo_url,
      conference: team.conference,
      conf_logo_url: team.conf_logo_url,
      category: "First 4 Out",
      twv: team.post_champ_twv,
      rating: team.blended_full_season_rating_avg,
      cfpRating: team.full_season_cfp_rating_avg,
      score: team.cfp_score,
      group: "f4o",
    }));

    const n4oRows: BracketRow[] = nextFourOut.map((team) => ({
      key: `n4o-${team.position}-${team.team_name}`,
      seedLabel: "Out",
      team_name: team.team_name,
      logo_url: team.logo_url,
      conference: team.conference,
      conf_logo_url: team.conf_logo_url,
      category: "Next 4 Out",
      twv: team.post_champ_twv,
      rating: team.blended_full_season_rating_avg,
      cfpRating: team.full_season_cfp_rating_avg,
      score: team.cfp_score,
      group: "n4o",
    }));

    return [...playoffRows, ...f4oRows, ...n4oRows];
  }, [playoffTeams, firstFourOut, nextFourOut]);

  // Dark separator at group boundaries and every 4 playoff teams
  const getRowBorderStyle = (index: number) => {
    const row = rows[index];
    const next = rows[index + 1];

    // Last row overall
    if (!next) {
      return "1px solid var(--border-color)";
    }

    // Boundary between groups (playoff -> f4o, f4o -> n4o)
    if (row.group !== next.group) {
      return "3px solid #1f2937";
    }

    // Within playoff teams: dark line every 4 seeds (1-4, 5-8, 9-12)
    if (row.group === "playoff" && (index + 1) % 4 === 0) {
      return "3px solid #1f2937";
    }

    return "1px solid var(--border-color)";
  };

  const getCategoryBgColor = (category: string) => {
    switch (category) {
      case "Auto Bid":
        return "#dbeafe"; // light blue
      case "At Large":
        return "#dcfce7"; // light green
      case "First 4 Out":
        return "#ffedd5"; // light orange
      case "Next 4 Out":
        return "#fee2e2"; // light red
      default:
        return "#f3f4f6"; // light gray
    }
  };

  const getCategoryTextColor = (category: string) => {
    switch (category) {
      case "Auto Bid":
        return "#1e40af"; // blue
      case "At Large":
        return "#166534"; // green
      case "First 4 Out":
        return "#b45309"; // orange
      case "Next 4 Out":
        return "#991b1b"; // red
      default:
        return "#374151"; // gray
    }
  };

  return (
    <div className="relative overflow-x-auto">
      <table
        className="border-collapse border-spacing-0"
        style={{
          width: "max-content",
          borderCollapse: "separate",
          borderSpacing: 0,
        }}
      >
        <thead>
          <tr>
            {/* Seed Column Header */}
            <th
              className={`sticky left-0 z-30 bg-gray-50 dark:bg-slate-800 text-center font-normal ${
                isMobile ? "text-xs" : "text-sm"
              }`}
              style={{
                width: seedColWidth,
                minWidth: seedColWidth,
                maxWidth: seedColWidth,
                height: headerHeight,
                position: "sticky",
                top: 0,
                left: 0,
                border: "1px solid var(--border-color)",
                borderRight: "1px solid var(--border-color)",
              }}
            >
              Seed
            </th>

            {/* Team Column Header */}
            <th
              className={`sticky z-30 bg-gray-50 dark:bg-slate-800 text-left font-normal px-2 ${
                isMobile ? "text-xs" : "text-sm"
              }`}
              style={{
                width: teamColWidth,
                minWidth: teamColWidth,
                maxWidth: teamColWidth,
                height: headerHeight,
                position: "sticky",
                top: 0,
                left: seedColWidth,
                border: "1px solid var(--border-color)",
                borderLeft: "none",
                borderRight: "2px solid var(--border-color)",
              }}
            >
              Team
            </th>

            {/* Conference Column Header */}
            <th
              className={`sticky bg-gray-50 dark:bg-slate-800 text-center font-normal z-20 ${
                isMobile ? "text-xs" : "text-sm"
              }`}
              style={{
                width: confColWidth,
                minWidth: confColWidth,
                maxWidth: confColWidth,
                height: headerHeight,
                position: "sticky",
                top: 0,
                border: "1px solid var(--border-color)",
                borderLeft: "none",
              }}
            >
              Conf
            </th>

            {/* Category Column Header */}
            <th
              className={`bg-gray-50 dark:bg-slate-800 text-center font-normal ${
                isMobile ? "text-xs" : "text-sm"
              }`}
              style={{
                width: categoryColWidth,
                minWidth: categoryColWidth,
                maxWidth: categoryColWidth,
                height: headerHeight,
                border: "1px solid var(--border-color)",
                borderLeft: "none",
              }}
            >
              Category
            </th>

            {/* Proj TWV Column Header */}
            <th
              className={`sticky bg-gray-50 dark:bg-slate-800 text-center font-normal z-20 ${
                isMobile ? "text-xs" : "text-sm"
              }`}
              style={{
                width: twvColWidth,
                minWidth: twvColWidth,
                maxWidth: twvColWidth,
                height: headerHeight,
                position: "sticky",
                top: 0,
                border: "1px solid var(--border-color)",
                borderLeft: "none",
              }}
            >
              Proj TWV
            </th>

            {/* Proj Rtg Column Header */}
            <th
              className={`bg-gray-50 dark:bg-slate-800 text-center font-normal ${
                isMobile ? "text-xs" : "text-sm"
              }`}
              style={{
                width: ratingColWidth,
                minWidth: ratingColWidth,
                maxWidth: ratingColWidth,
                height: headerHeight,
                border: "1px solid var(--border-color)",
                borderLeft: "none",
              }}
            >
              Proj Rtg
            </th>

            {/* CFP Rtg Column Header */}
            <th
              className={`bg-gray-50 dark:bg-slate-800 text-center font-normal ${
                isMobile ? "text-xs" : "text-sm"
              }`}
              style={{
                width: cfpRatingColWidth,
                minWidth: cfpRatingColWidth,
                maxWidth: cfpRatingColWidth,
                height: headerHeight,
                border: "1px solid var(--border-color)",
                borderLeft: "none",
              }}
            >
              CFP Rtg
            </th>

            {/* CFP Rtg % Column Header */}
            <th
              className={`bg-gray-50 dark:bg-slate-800 text-center font-normal ${
                isMobile ? "text-xs" : "text-sm"
              }`}
              style={{
                width: normColWidth,
                minWidth: normColWidth,
                maxWidth: normColWidth,
                height: headerHeight,
                border: "1px solid var(--border-color)",
                borderLeft: "none",
              }}
            >
              CFP Rtg %
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const rowBorder = getRowBorderStyle(index);
            return (
              <tr key={row.key}>
                {/* Seed Cell */}
                <td
                  className={`sticky left-0 z-20 bg-white dark:bg-slate-900 text-center ${
                    isMobile ? "text-xs" : "text-sm"
                  }`}
                  style={{
                    width: seedColWidth,
                    minWidth: seedColWidth,
                    maxWidth: seedColWidth,
                    height: cellHeight,
                    position: "sticky",
                    left: 0,
                    border: "1px solid var(--border-color)",
                    borderTop: "none",
                    borderRight: "1px solid var(--border-color)",
                    borderBottom: rowBorder,
                    fontWeight: "500",
                  }}
                >
                  {row.seedLabel}
                </td>

                {/* Team Cell */}
                <td
                  className={`sticky z-20 text-left px-2 ${
                    isMobile ? "text-xs" : "text-sm"
                  }`}
                  style={{
                    width: teamColWidth,
                    minWidth: teamColWidth,
                    maxWidth: teamColWidth,
                    height: cellHeight,
                    position: "sticky",
                    left: seedColWidth,
                    backgroundColor: "white",
                    border: "1px solid var(--border-color)",
                    borderTop: "none",
                    borderLeft: "none",
                    borderRight: "2px solid var(--border-color)",
                    borderBottom: rowBorder,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <TeamLogo
                      logoUrl={row.logo_url}
                      teamName={row.team_name}
                      size={isMobile ? 24 : 28}
                      className="flex-shrink-0"
                    />
                    <span className="truncate">{row.team_name}</span>
                  </div>
                </td>

                {/* Conference Cell */}
                <td
                  className={`bg-white dark:bg-slate-900 text-center ${
                    isMobile ? "text-xs" : "text-sm"
                  }`}
                  style={{
                    width: confColWidth,
                    minWidth: confColWidth,
                    maxWidth: confColWidth,
                    height: cellHeight,
                    border: "1px solid var(--border-color)",
                    borderTop: "none",
                    borderLeft: "none",
                    borderBottom: rowBorder,
                    verticalAlign: "middle",
                  }}
                >
                  <div className="flex items-center justify-center">
                    {row.conf_logo_url ? (
                      <TeamLogo
                        logoUrl={row.conf_logo_url}
                        teamName={row.conference}
                        size={isMobile ? 20 : 24}
                        className="flex-shrink-0"
                      />
                    ) : (
                      <span className="text-xs text-gray-500 dark:text-gray-300">
                        -
                      </span>
                    )}
                  </div>
                </td>

                {/* Category Cell */}
                <td
                  className={`bg-white dark:bg-slate-900 text-center ${
                    isMobile ? "text-xs" : "text-sm"
                  }`}
                  style={{
                    width: categoryColWidth,
                    minWidth: categoryColWidth,
                    maxWidth: categoryColWidth,
                    height: cellHeight,
                    border: "1px solid var(--border-color)",
                    borderTop: "none",
                    borderLeft: "none",
                    borderBottom: rowBorder,
                    backgroundColor: getCategoryBgColor(row.category),
                    color: getCategoryTextColor(row.category),
                    fontWeight: "500",
                  }}
                >
                  {row.category}
                </td>

                {/* Proj TWV Cell */}
                <td
                  className={`bg-white dark:bg-slate-900 text-center ${
                    isMobile ? "text-xs" : "text-sm"
                  }`}
                  style={{
                    width: twvColWidth,
                    minWidth: twvColWidth,
                    maxWidth: twvColWidth,
                    height: cellHeight,
                    border: "1px solid var(--border-color)",
                    borderTop: "none",
                    borderLeft: "none",
                    borderBottom: rowBorder,
                    fontWeight: "500",
                  }}
                >
                  {row.twv != null ? row.twv.toFixed(2) : "—"}
                </td>

                {/* Proj Rtg Cell */}
                <td
                  className={`bg-white dark:bg-slate-900 text-center ${
                    isMobile ? "text-xs" : "text-sm"
                  }`}
                  style={{
                    width: ratingColWidth,
                    minWidth: ratingColWidth,
                    maxWidth: ratingColWidth,
                    height: cellHeight,
                    border: "1px solid var(--border-color)",
                    borderTop: "none",
                    borderLeft: "none",
                    borderBottom: rowBorder,
                    fontWeight: "500",
                  }}
                >
                  {row.rating != null ? row.rating.toFixed(2) : "—"}
                </td>

                {/* CFP Rtg Cell */}
                <td
                  className={`bg-white dark:bg-slate-900 text-center ${
                    isMobile ? "text-xs" : "text-sm"
                  }`}
                  style={{
                    width: cfpRatingColWidth,
                    minWidth: cfpRatingColWidth,
                    maxWidth: cfpRatingColWidth,
                    height: cellHeight,
                    border: "1px solid var(--border-color)",
                    borderTop: "none",
                    borderLeft: "none",
                    borderBottom: rowBorder,
                    fontWeight: "500",
                  }}
                >
                  {row.cfpRating != null ? row.cfpRating.toFixed(2) : "—"}
                </td>

                {/* CFP Rtg % Cell */}
                <td
                  className={`bg-white dark:bg-slate-900 text-center ${
                    isMobile ? "text-xs" : "text-sm"
                  }`}
                  style={{
                    width: normColWidth,
                    minWidth: normColWidth,
                    maxWidth: normColWidth,
                    height: cellHeight,
                    border: "1px solid var(--border-color)",
                    borderTop: "none",
                    borderLeft: "none",
                    borderBottom: rowBorder,
                    fontWeight: "500",
                  }}
                >
                  {row.score != null ? row.score.toFixed(1) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
