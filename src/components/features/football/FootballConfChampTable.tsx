"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { memo, ReactNode, useMemo } from "react";
import styles from "./FootballConfChampTable.module.css";

interface FootballConfChampTeam {
  team_name: string;
  team_id: string;
  logo_url: string;
  Champ_Game?: number;
  Champion?: number;
}

interface FootballConfChampTableProps {
  confChampData: FootballConfChampTeam[];
  className?: string;
  season?: string;
  /** Optional element (e.g. conference selector) rendered on the right of the title row. */
  headerRight?: ReactNode;
}

const FIELD_TO_LABEL: Record<string, string> = {
  Champ_Game: "Champ\nGame",
  Champion: "Champion",
};

// Same blue hues and dispersion curve as the win-distribution tables, but
// without their low saturation cap: championship probabilities are true
// 0-100% values (a heavy favorite can approach 100%), unlike a single
// conference-win count which rarely exceeds ~45%.
const CELL_LIGHT = [195, 224, 236];
const CELL_DARK = [24, 98, 123];

function getCellColor(value: number): { backgroundColor: string; color: string } {
  const normalized = Math.min(Math.max(value, 0) / 100, 1);
  const intensity = Math.pow(normalized, 0.6);

  const r = Math.round(CELL_LIGHT[0] + (CELL_DARK[0] - CELL_LIGHT[0]) * intensity);
  const g = Math.round(CELL_LIGHT[1] + (CELL_DARK[1] - CELL_LIGHT[1]) * intensity);
  const b = Math.round(CELL_LIGHT[2] + (CELL_DARK[2] - CELL_LIGHT[2]) * intensity);

  return {
    backgroundColor: `rgb(${r}, ${g}, ${b})`,
    color: intensity >= 0.45 ? "#ffffff" : "var(--wins-cell-text)",
  };
}

function FootballConfChampTable({
  confChampData,
  className,
  season,
  headerRight,
}: FootballConfChampTableProps) {
  const router = useRouter();

  const navigateToTeam = (teamName: string) => {
    const path = season
      ? `/football/${season}/team/${encodeURIComponent(teamName)}`
      : `/football/team/${encodeURIComponent(teamName)}`;
    router.push(path);
  };

  const activeColumns = useMemo(() => {
    const columns = ["Champ_Game", "Champion"] as const;
    return columns.filter((column) =>
      confChampData.some((team) => team[column] && team[column]! > 0),
    );
  }, [confChampData]);

  const sortedTeams = useMemo(() => {
    return [...confChampData].sort((a, b) => {
      const aChamp = a.Champion || 0;
      const bChamp = b.Champion || 0;
      if (aChamp !== bChamp) return bChamp - aChamp;

      const aGame = a.Champ_Game || 0;
      const bGame = b.Champ_Game || 0;
      return bGame - aGame;
    });
  }, [confChampData]);

  if (!confChampData || confChampData.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-300">
        No conference championship data available
      </div>
    );
  }

  return (
    <section
      className={cn(styles.card, "conf-champ-card", className)}
      aria-labelledby="football-conf-champ-title"
    >
      <div className={styles.cardHeader}>
        <div className={styles.titleGroup} data-screenshot-hide="true">
          <h2 id="football-conf-champ-title" className={styles.title}>
            Conference Championship Projections
          </h2>
        </div>
        {headerRight && (
          <div data-screenshot-hide="true">{headerRight}</div>
        )}
      </div>

      <div
        className={styles.scrollViewport}
        role="region"
        aria-label="Conference championship projections by team. Scroll to see every team."
        tabIndex={0}
      >
        <table className={styles.table}>
          <thead>
            <tr className={styles.headerRow}>
              <th className={styles.stickyTeam} scope="col">
                Team
              </th>
              {activeColumns.map((column) => (
                <th key={column} scope="col">
                  {FIELD_TO_LABEL[column]}
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
                    <span className={styles.teamName}>{team.team_name}</span>
                  </button>
                </td>
                {activeColumns.map((column) => {
                  const value = team[column] || 0;
                  const rounded = Math.round(value);

                  return (
                    <td
                      key={`${team.team_name}-${column}`}
                      className={styles.probabilityCell}
                      data-screenshot-tile="true"
                    >
                      <div
                        className={styles.heatTile}
                        style={value > 0 ? getCellColor(value) : {}}
                        title={
                          value > 0
                            ? `${team.team_name}: ${rounded}% chance of ${FIELD_TO_LABEL[column].replace("\n", " ")}`
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

export default memo(FootballConfChampTable);
