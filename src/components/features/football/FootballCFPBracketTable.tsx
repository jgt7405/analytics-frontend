"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { cn } from "@/lib/utils";
import { BubbleTeam, OtherTeam, PlayoffTeam } from "@/types/football";
import Link from "next/link";
import { useMemo } from "react";
import styles from "./FootballCFPBracketTable.module.css";

interface FootballCFPBracketTableProps {
  playoffTeams: PlayoffTeam[];
  firstFourOut?: BubbleTeam[];
  nextFourOut?: BubbleTeam[];
  otherTeams?: OtherTeam[];
  showAll?: boolean;
  // Current Snapshot uses live TWV/rating, so the columns are labeled
  // "TWV"/"Rtg" rather than the projected "Proj TWV"/"Proj Rtg".
  isCurrent?: boolean;
}

// Unified row shape combining playoff teams and bubble teams
interface BracketRow {
  key: string;
  seedLabel: string;
  seedNum?: number;
  team_name: string;
  logo_url: string;
  conference: string;
  conf_logo_url?: string;
  category: string;
  twv?: number;
  rating?: number;
  score?: number;
  // Group used for separator logic: "playoff" | "f4o" | "n4o" | "other"
  group: "playoff" | "f4o" | "n4o" | "other";
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  "Auto Bid": { bg: "#dbeafe", text: "#1e40af" },
  "At Large": { bg: "#dcfce7", text: "#166534" },
  "First 4 Out": { bg: "#ffedd5", text: "#b45309" },
  "Next 4 Out": { bg: "#fee2e2", text: "#991b1b" },
};

export default function FootballCFPBracketTable({
  playoffTeams,
  firstFourOut = [],
  nextFourOut = [],
  otherTeams = [],
  showAll = false,
  isCurrent = false,
}: FootballCFPBracketTableProps) {
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
      score: team.cfp_score,
      group: "n4o",
    }));

    const otherRows: BracketRow[] = showAll
      ? otherTeams.map((team) => ({
          key: `other-${team.rank}-${team.team_name}`,
          seedLabel: String(team.rank),
          seedNum: team.rank,
          team_name: team.team_name,
          logo_url: team.logo_url,
          conference: team.conference,
          conf_logo_url: team.conf_logo_url,
          category: "",
          twv: team.post_champ_twv,
          rating: team.blended_full_season_rating_avg,
          score: team.cfp_score,
          group: "other",
        }))
      : [];

    return [...playoffRows, ...f4oRows, ...n4oRows, ...otherRows];
  }, [playoffTeams, firstFourOut, nextFourOut, otherTeams, showAll]);

  // Dark separator at group boundaries, every 4 playoff teams, and every 10
  // ranks in the all-teams section.
  const isGroupBoundary = (index: number) => {
    const row = rows[index];
    const next = rows[index + 1];

    if (!next) return false;
    if (row.group !== next.group) return true;
    if (row.group === "playoff" && (index + 1) % 4 === 0) return true;
    if (row.group === "other" && row.seedNum != null && row.seedNum % 10 === 0) {
      return true;
    }
    return false;
  };

  return (
    <section className="relative" aria-label="College Football Playoff bracket">
      <div className={styles.card}>
        <div
          className={styles.scrollViewport}
          role="region"
          aria-label="College Football Playoff bracket. Scroll to see every team."
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
                <th scope="col">{isCurrent ? "TWV" : "Proj TWV"}</th>
                <th scope="col">{isCurrent ? "Rtg" : "Proj Rtg"}</th>
                <th className={styles.scoreHeader} scope="col">
                  CFP Rtg %
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const category = CATEGORY_COLORS[row.category];

                return (
                  <tr
                    key={row.key}
                    className={cn(
                      styles.bodyRow,
                      isGroupBoundary(index) && styles.groupBoundary,
                    )}
                  >
                    <td className={styles.stickySeed}>
                      <span className={styles.seedValue}>{row.seedLabel}</span>
                    </td>

                    <td className={cn(styles.stickyTeam, styles.teamCell)}>
                      <Link
                        href={`/football/team/${encodeURIComponent(row.team_name)}`}
                        className={styles.teamLink}
                      >
                        <TeamLogo
                          logoUrl={row.logo_url}
                          teamName={row.team_name}
                          size={28}
                          showTooltip
                          className={styles.teamLogo}
                        />
                        <span className={styles.teamName}>{row.team_name}</span>
                      </Link>
                    </td>

                    <td className={styles.confCell}>
                      <div className={styles.confLogoWrap}>
                        {row.conf_logo_url ? (
                          <TeamLogo
                            logoUrl={row.conf_logo_url}
                            teamName={row.conference}
                            size={22}
                            showTooltip
                          />
                        ) : (
                          <span className={styles.confPlaceholder}>—</span>
                        )}
                      </div>
                    </td>

                    <td className={styles.categoryCell}>
                      {row.category && (
                        <span
                          className={styles.categoryBadge}
                          style={{
                            backgroundColor: category?.bg ?? "#f3f4f6",
                            color: category?.text ?? "#374151",
                          }}
                        >
                          {row.category}
                        </span>
                      )}
                    </td>

                    <td>
                      <span className={styles.statValue}>
                        {row.twv != null ? row.twv.toFixed(2) : "—"}
                      </span>
                    </td>

                    <td>
                      <span className={styles.statValue}>
                        {row.rating != null ? row.rating.toFixed(2) : "—"}
                      </span>
                    </td>

                    <td className={styles.scoreCell}>
                      <span className={styles.statValue}>
                        {row.score != null ? row.score.toFixed(1) : "—"}
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
