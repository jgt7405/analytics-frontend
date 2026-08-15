"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { getCellColor } from "@/lib/color-utils";
import { formatTeamName } from "@/lib/formatTeamName";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { memo, ReactNode, useMemo } from "react";
import styles from "./ConferenceTourneyTable.module.css";

interface TourneyTeam {
  team_name: string;
  team_id: string;
  logo_url: string;
  Champion?: number;
  Finals?: number;
  Semifinals?: number;
  Quarterfinals?: number;
  First_Round?: number;
  Second_Round?: number;
  Third_Round?: number;
  Fourth_Round?: number;
}

interface ConferenceTourneyTableProps {
  tourneyData: TourneyTeam[];
  className?: string;
  season?: string;
  /** Optional element (e.g. conference selector) rendered on the right of the title row. */
  headerRight?: ReactNode;
}

const ROUND_ORDER = [
  "First_Round",
  "Second_Round",
  "Third_Round",
  "Fourth_Round",
  "Quarterfinals",
  "Semifinals",
  "Finals",
  "Champion",
] as const;

const FIELD_TO_LABEL: Record<string, string> = {
  First_Round: "First\nRound",
  Second_Round: "Second\nRound",
  Third_Round: "Third\nRound",
  Fourth_Round: "Fourth\nRound",
  Quarterfinals: "Quarter-\nfinals",
  Semifinals: "Semi-\nfinals",
  Finals: "Finals",
  Champion: "Champion",
};

function ConferenceTourneyTable({
  tourneyData,
  className,
  season,
  headerRight,
}: ConferenceTourneyTableProps) {
  const router = useRouter();

  const navigateToTeam = (teamName: string) => {
    const path = season
      ? `/basketball/${season}/team/${encodeURIComponent(teamName)}`
      : `/basketball/team/${encodeURIComponent(teamName)}`;
    router.push(path);
  };

  const activeRounds = useMemo(() => {
    return ROUND_ORDER.filter((round) =>
      tourneyData.some(
        (team) =>
          (team[round as keyof TourneyTeam] as number | undefined) &&
          (team[round as keyof TourneyTeam] as number | undefined)! > 0
      )
    );
  }, [tourneyData]);

  const sortedTeams = useMemo(() => {
    return [...tourneyData].sort((a, b) => {
      const reverseRounds = [...ROUND_ORDER].reverse();
      for (const round of reverseRounds) {
        if (activeRounds.includes(round)) {
          const aVal =
            (a[round as keyof TourneyTeam] as number | undefined) || 0;
          const bVal =
            (b[round as keyof TourneyTeam] as number | undefined) || 0;
          if (aVal !== bVal) return bVal - aVal;
        }
      }
      return 0;
    });
  }, [tourneyData, activeRounds]);

  if (!tourneyData || tourneyData.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-300">
        No tournament data available
      </div>
    );
  }

  return (
    <section
      className={cn(styles.card, "conf-tourney-table", className)}
      aria-labelledby="conf-tourney-title"
    >
      <div className={styles.cardHeader}>
        <div className={styles.titleGroup} data-screenshot-hide="true">
          <h2 id="conf-tourney-title" className={styles.title}>
            Conference Tournament Projections
          </h2>
        </div>
        {headerRight && <div data-screenshot-hide="true">{headerRight}</div>}
      </div>

      <div
        className={styles.scrollViewport}
        role="region"
        aria-label="Conference tournament projections by team. Scroll to see every team."
        tabIndex={0}
      >
        <table className={styles.table}>
          <thead>
            <tr className={styles.headerRow}>
              <th className={styles.stickyTeam} scope="col">
                Team
              </th>
              {activeRounds.map((round) => (
                <th key={round} scope="col">
                  {FIELD_TO_LABEL[round]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedTeams.map((team, index) => (
              <tr key={`${team.team_name}-${index}`} className={styles.bodyRow}>
                <td className={cn(styles.stickyTeam, styles.teamCell)}>
                  <button
                    type="button"
                    className={styles.teamButton}
                    onClick={() => navigateToTeam(team.team_name)}
                    aria-label={`View ${team.team_name}`}
                  >
                    <TeamLogo
                      logoUrl={team.logo_url}
                      teamName={team.team_name}
                      size={24}
                      showTooltip
                      className={styles.teamLogo}
                    />
                    <span className={styles.teamName}>
                      {formatTeamName(team.team_name)}
                    </span>
                  </button>
                </td>
                {activeRounds.map((round) => {
                  const value =
                    (team[round as keyof TourneyTeam] as number | undefined) ||
                    0;
                  const rounded = Math.round(value);
                  const colorStyle = getCellColor(value);

                  return (
                    <td
                      key={`${team.team_name}-${round}`}
                      className={styles.probabilityCell}
                      data-screenshot-tile="true"
                    >
                      <div
                        className={styles.heatTile}
                        style={value > 0 ? colorStyle : {}}
                        title={
                          value > 0
                            ? `${team.team_name}: ${rounded}% chance of ${FIELD_TO_LABEL[round].replace("\n", " ")}`
                            : undefined
                        }
                      >
                        {value > 0 ? `${rounded}%` : ""}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default memo(ConferenceTourneyTable);
