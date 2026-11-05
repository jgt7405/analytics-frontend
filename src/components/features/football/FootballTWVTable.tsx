// src/components/features/football/FootballTWVTable.tsx
"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import styles from "./FootballTWVTable.module.css";

interface FootballTWVTeam {
  rank: number;
  team_name: string;
  team_id?: string;
  logo_url: string;
  twv: number;
  twv_25_wins?: number | null;
  twv_1_losses?: number | null;
  cfp_twv?: number | null;
  actual_record: string;
  expected_record: string;
}

interface FootballTWVTableProps {
  twvData: FootballTWVTeam[];
  className?: string;
  showAllTeams?: boolean;
  season?: string;
}

// Same diverging blue/yellow scale as the CWV table: a signed value (over
// vs under the 12th-rated team), not a probability, so it keeps its own
// color treatment rather than the win-distribution heat ramp.
function getTWVColor(twv: number, minTWV: number, maxTWV: number) {
  const blue = [24, 98, 123];
  const white = [255, 255, 255];
  const yellow = [255, 230, 113];

  let r: number, g: number, b: number;

  if (twv > 0) {
    const ratio = Math.min(Math.abs(twv / maxTWV), 1);
    r = Math.round(white[0] + (blue[0] - white[0]) * ratio);
    g = Math.round(white[1] + (blue[1] - white[1]) * ratio);
    b = Math.round(white[2] + (blue[2] - white[2]) * ratio);
  } else if (twv < 0) {
    const ratio = Math.min(Math.abs(twv / minTWV), 1);
    r = Math.round(white[0] + (yellow[0] - white[0]) * ratio);
    g = Math.round(white[1] + (yellow[1] - white[1]) * ratio);
    b = Math.round(white[2] + (yellow[2] - white[2]) * ratio);
  } else {
    [r, g, b] = white;
  }

  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  const textColor = brightness > 140 ? "#000000" : "#ffffff";

  return {
    backgroundColor: `rgb(${r}, ${g}, ${b})`,
    color: textColor,
  };
}

// The CFP TWV columns, each colored on its own range.
const CFP_COLUMNS = [
  { key: "twv_25_wins", label: "TWV 25 Wins" },
  { key: "twv_1_losses", label: "TWV 1 Losses" },
  { key: "cfp_twv", label: "CFP TWV" },
] as const;

// Rounds first so a tiny negative reads 0.0, not -0.0
const formatTWV = (value: number) => {
  const rounded = Math.round(value * 10) / 10 || 0;
  return rounded > 0 ? `+${rounded.toFixed(1)}` : rounded.toFixed(1);
};

function FootballTWVTable({
  twvData,
  className,
  showAllTeams = false,
  season,
}: FootballTWVTableProps) {
  const router = useRouter();
  const [rowsToShow, setRowsToShow] = useState<number>(twvData.length);
  const [inputValue, setInputValue] = useState<string>(twvData.length.toString());

  useEffect(() => {
    setRowsToShow(twvData.length);
    setInputValue(twvData.length.toString());
  }, [twvData.length]);

  const navigateToTeam = useCallback(
    (teamName: string) => {
      const path = season
        ? `/football/${season}/team/${encodeURIComponent(teamName)}`
        : `/football/team/${encodeURIComponent(teamName)}`;
      router.push(path);
    },
    [router, season],
  );

  const rankedTwvData = useMemo(() => {
    if (!twvData || twvData.length === 0) return [];
    return [...twvData].sort(
      (a, b) => b.twv - a.twv || a.team_name.localeCompare(b.team_name),
    );
  }, [twvData]);

  const displayedTeams = useMemo(() => {
    if (showAllTeams) {
      return rankedTwvData.slice(0, rowsToShow);
    }
    return rankedTwvData;
  }, [rankedTwvData, rowsToShow, showAllTeams]);

  const handleRowsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0 && numValue <= twvData.length) {
      setRowsToShow(numValue);
    }
  };

  const { minTWV, maxTWV } = useMemo(() => {
    const twvValues = rankedTwvData.map((team) => team.twv);
    return {
      minTWV: Math.min(...twvValues, -1),
      maxTWV: Math.max(...twvValues, 1),
    };
  }, [rankedTwvData]);

  // Archived seasons have no CFP TWV halves; hide those columns there.
  const cfpRanges = useMemo(() => {
    if (!rankedTwvData.some((team) => team.cfp_twv != null)) return null;
    return CFP_COLUMNS.map(({ key }) => {
      const values = rankedTwvData.map((team) => team[key] ?? 0);
      return { min: Math.min(...values, -1), max: Math.max(...values, 1) };
    });
  }, [rankedTwvData]);

  if (!rankedTwvData || rankedTwvData.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-300">
        No TWV data available
      </div>
    );
  }

  return (
    <section className={cn(styles.card, "twv-table", className)} aria-label="True Win Value">
      {showAllTeams && (
        <div className={styles.controls} data-screenshot-hide="true">
          <label htmlFor="twv-rows-input">Show top:</label>
          <input
            id="twv-rows-input"
            type="number"
            min="1"
            max={twvData.length}
            value={inputValue}
            onChange={handleRowsInputChange}
            className={styles.rowsInput}
            placeholder={twvData.length.toString()}
          />
          <span>teams (of {twvData.length})</span>
        </div>
      )}

      <div
        className={cn(
          styles.scrollViewport,
          !showAllTeams && styles.scrollViewportNoHeader,
        )}
        role="region"
        aria-label="True win value by team. Scroll to see every team."
        tabIndex={0}
      >
        <table className={styles.table}>
          <thead>
            <tr className={styles.headerRow}>
              <th className={styles.stickyRank} scope="col">
                Rank
              </th>
              <th className={styles.stickyTeam} scope="col">
                Team
              </th>
              <th scope="col">TWV</th>
              {cfpRanges &&
                CFP_COLUMNS.map(({ key, label }) => (
                  <th key={key} scope="col">
                    {label}
                  </th>
                ))}
              <th className={styles.recordHeader} scope="col">
                Actual Record
              </th>
              <th className={styles.recordHeader} scope="col">
                Expected Record
              </th>
            </tr>
          </thead>
          <tbody>
            {displayedTeams.map((team, index) => (
              <tr key={`${team.team_name}-${index}`} className={styles.bodyRow}>
                <td className={styles.stickyRank}>
                  <span className={styles.rankValue}>{team.rank}</span>
                </td>

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
                      size={28}
                      showTooltip
                      className={styles.teamLogo}
                    />
                    <span className={styles.teamName}>{team.team_name}</span>
                  </button>
                </td>

                <td className={styles.twvCell} data-screenshot-tile="true">
                  <div
                    className={styles.twvChip}
                    style={getTWVColor(team.twv, minTWV, maxTWV)}
                  >
                    {formatTWV(team.twv)}
                  </div>
                </td>

                {cfpRanges &&
                  CFP_COLUMNS.map(({ key }, col) => {
                    const value = team[key] ?? 0;
                    return (
                      <td key={key} className={styles.twvCell} data-screenshot-tile="true">
                        <div
                          className={styles.twvChip}
                          style={getTWVColor(value, cfpRanges[col].min, cfpRanges[col].max)}
                        >
                          {formatTWV(value)}
                        </div>
                      </td>
                    );
                  })}

                <td className={styles.recordCell}>{team.actual_record}</td>

                <td className={styles.recordCell}>{team.expected_record}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default memo(FootballTWVTable);
