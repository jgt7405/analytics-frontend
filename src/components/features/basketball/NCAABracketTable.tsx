"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { NCAATeam, useNCAAProjections } from "@/hooks/useNCAAProjections";
import { useResponsive } from "@/hooks/useResponsive";
import { formatTeamName } from "@/lib/formatTeamName";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import styles from "./NCAABracketTable.module.css";

interface NCAABracketTableProps {
  className?: string;
  season?: string;
}

// Extend NCAATeam interface to include conf_logo_url
interface NCAATeamWithConfLogo extends NCAATeam {
  conf_logo_url?: string;
}

// Helper function to get category badge color
const getCategoryBgColor = (category: string | undefined) => {
  switch (category) {
    case "Auto Bid":
      return "#dcfce7"; // light green
    case "At Large":
      return "#dbeafe"; // light blue
    case "Last 12 In": // 76-team format
    case "Last 4 In": // historical seasons
      return "#e9d5ff"; // light purple
    case "First 4 Out":
      return "#ffedd5"; // light orange
    case "Next 4 Out":
      return "#fee2e2"; // light red
    default:
      return "#f3f4f6"; // light gray
  }
};

const getCategoryTextColor = (category: string | undefined) => {
  switch (category) {
    case "Auto Bid":
      return "#166534"; // green
    case "At Large":
      return "#1e40af"; // blue
    case "Last 12 In": // 76-team format
    case "Last 4 In": // historical seasons
      return "#6b21a8"; // purple
    case "First 4 Out":
      return "#b45309"; // orange
    case "Next 4 Out":
      return "#991b1b"; // red
    default:
      return "#374151"; // gray
  }
};

function NCAABracketTable({ className, season }: NCAABracketTableProps) {
  const { isMobile } = useResponsive();
  const router = useRouter();
  const { data, loading, error } = useNCAAProjections(season);

  const navigateToTeam = useCallback(
    (teamName: string) => {
      const path = season
        ? `/basketball/${season}/team/${encodeURIComponent(teamName)}`
        : `/basketball/team/${encodeURIComponent(teamName)}`;
      router.push(path);
    },
    [router, season]
  );

  // Combine all teams and sort appropriately
  const allTeams = useMemo(() => {
    if (!data) return [];

    const tournament = (data.tournament_teams as NCAATeamWithConfLogo[]) || [];
    const firstFourOut = (data.first_four_out as NCAATeamWithConfLogo[]) || [];
    const nextFourOut = (data.next_four_out as NCAATeamWithConfLogo[]) || [];

    // Sort tournament teams by seed then TWV
    const sortedTournament = [...tournament].sort((a, b) => {
      const seedA = a.seed ? parseInt(a.seed, 10) : 999;
      const seedB = b.seed ? parseInt(b.seed, 10) : 999;

      if (seedA !== seedB) {
        return seedA - seedB;
      }

      return b.post_conf_tourney_twv - a.post_conf_tourney_twv;
    });

    // Sort First 4 Out by TWV descending
    const sortedFirst4Out = [...firstFourOut]
      .map((team) => ({
        ...team,
        category: "First 4 Out",
        seed: "Out",
      }))
      .sort((a, b) => b.post_conf_tourney_twv - a.post_conf_tourney_twv);

    // Sort Next 4 Out by TWV descending
    const sortedNext4Out = [...nextFourOut]
      .map((team) => ({
        ...team,
        category: "Next 4 Out",
        seed: "Out",
      }))
      .sort((a, b) => b.post_conf_tourney_twv - a.post_conf_tourney_twv);

    // Return tournament, then First 4 Out, then Next 4 Out
    return [...sortedTournament, ...sortedFirst4Out, ...sortedNext4Out];
  }, [data]);

  // Dark separator between seed groups and between tournament/out-of-tournament
  // sections - mirrors the football CFP bracket's isGroupBoundary logic but
  // keyed off basketball's seed/category fields instead of a "group" enum.
  const isGroupBoundary = useCallback(
    (index: number) => {
      const team = allTeams[index];
      const nextTeam = allTeams[index + 1];

      if (!nextTeam) return true; // last row overall

      if (team.seed !== "Out" && nextTeam.seed === "Out") {
        return true; // last tournament team before out teams
      }

      if (
        team.seed === "Out" &&
        nextTeam.seed === "Out" &&
        team.category !== nextTeam.category
      ) {
        return true; // last First 4 Out before Next 4 Out
      }

      if (team.seed !== "Out" && team.seed !== "-") {
        const currentSeed = parseInt(team.seed || "0", 10);
        const nextSeed =
          nextTeam.seed !== "Out" ? parseInt(nextTeam.seed || "0", 10) : 999;
        if (currentSeed !== nextSeed) return true;
      }

      return false;
    },
    [allTeams]
  );

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-300">
        Loading tournament data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        Error loading data:{" "}
        {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-300">No data available</div>
    );
  }

  return (
    <section className={cn("relative", className)}>
      <div className={styles.card}>
        <div
          className={styles.scrollViewport}
          role="region"
          aria-label="NCAA Tournament bracket projections. Scroll to see every team."
          tabIndex={0}
        >
          <table className={styles.table}>
            <thead>
              <tr className={styles.headerRow}>
                <th className={styles.stickySeed} scope="col">
                  Seed
                </th>
                <th className={styles.stickyTeam} scope="col">
                  Team
                </th>
                <th className={styles.confHeader} scope="col">
                  Conf
                </th>
                <th className={styles.categoryHeader} scope="col">
                  Category
                </th>
                <th scope="col">Proj TWV</th>
              </tr>
            </thead>
            <tbody>
              {allTeams.map((team, index) => {
                // Only highlight teams that have SECURED auto bid (won
                // completed conf tourney game) - not teams with projected
                // "Auto Bid" status.
                const isSecuredAutoBid = team.is_conf_tourney_winner === true;

                return (
                  <tr
                    key={`${team.teamid}-${index}`}
                    className={cn(
                      styles.bodyRow,
                      isGroupBoundary(index) && styles.groupBoundary
                    )}
                  >
                    <td className={styles.stickySeed}>
                      <span className={styles.seedValue}>{team.seed || "-"}</span>
                    </td>

                    <td
                      className={cn(
                        styles.stickyTeam,
                        styles.teamCell,
                        isSecuredAutoBid && styles.autoBidSecured
                      )}
                    >
                      <div className={styles.teamLink}>
                        <TeamLogo
                          logoUrl={team.logo_url}
                          teamName={team.team_name}
                          size={isMobile ? 24 : 28}
                          onClick={() => navigateToTeam(team.team_name)}
                          className={styles.teamLogo}
                        />
                        <span className={styles.teamName}>
                          {formatTeamName(team.team_name)}
                        </span>
                      </div>
                    </td>

                    <td className={styles.confCell}>
                      <div className={styles.confLogoWrap}>
                        {team.conf_logo_url ? (
                          <TeamLogo
                            logoUrl={team.conf_logo_url}
                            teamName={team.full_conference_name}
                            size={isMobile ? 20 : 22}
                          />
                        ) : (
                          <span className={styles.confPlaceholder}>—</span>
                        )}
                      </div>
                    </td>

                    <td className={styles.categoryCell}>
                      {team.category && (
                        <span
                          className={styles.categoryBadge}
                          style={{
                            backgroundColor: getCategoryBgColor(team.category),
                            color: getCategoryTextColor(team.category),
                          }}
                        >
                          {team.category}
                        </span>
                      )}
                    </td>

                    <td>
                      <span className={styles.statValue}>
                        {team.post_conf_tourney_twv.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default NCAABracketTable;
