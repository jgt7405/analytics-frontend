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
  // "TWV"/"Rtg" rather than the projected "Proj CFP TWV"/"Proj Rtg", and it
  // alone shows the TWV 12 reference column. Both views show CFP %, the
  // committee-anchored chance of making the field.
  isCurrent?: boolean;
  // Which TWV ranks the table (the home page's "Ranked by" choice); the
  // projected view shows that one.
  twvMetric?: "cfp" | "twv12";
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
  record?: string;
  // CFP TWV ranks the field; TWV 12 is shown beside it for reference.
  twv?: number;
  twv12?: number;
  rating?: number;
  score?: number;
  // Chance (0-100) of making the field from the committee's latest ranking
  bidPct?: number | null;
  // Group used for separator logic: "playoff" | "f4o" | "n4o" | "other"
  group: "playoff" | "f4o" | "n4o" | "other";
}

// Rows from before CFP TWV existed carry only TWV 12.
const twvColumns = (team: { cfp_twv?: number; post_champ_twv?: number }) => ({
  twv: team.cfp_twv ?? team.post_champ_twv,
  twv12: team.post_champ_twv,
});

// Odds of making the field: whole percent, with "<1" / ">99" for the tails
// so a long shot doesn't read as impossible or certain.
const formatBidPct = (pct?: number | null) => {
  if (pct == null) return "—";
  if (pct === 0 || pct === 100) return `${pct}%`;
  if (pct < 1) return "<1%";
  if (pct > 99) return ">99%";
  return `${Math.round(pct)}%`;
};

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
  twvMetric = "cfp",
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
      record: team.record,
      ...twvColumns(team),
      rating: team.blended_full_season_rating_avg,
      score: team.cfp_score,
      bidPct: team.current_cfp_bid_pct,
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
      record: team.record,
      ...twvColumns(team),
      rating: team.blended_full_season_rating_avg,
      score: team.cfp_score,
      bidPct: team.current_cfp_bid_pct,
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
      record: team.record,
      ...twvColumns(team),
      rating: team.blended_full_season_rating_avg,
      score: team.cfp_score,
      bidPct: team.current_cfp_bid_pct,
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
          record: team.record,
      ...twvColumns(team),
          rating: team.blended_full_season_rating_avg,
          score: team.cfp_score,
          bidPct: team.current_cfp_bid_pct,
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

  // The first TWV column: the ranking TWV in the projected view, CFP TWV
  // in the snapshot (which shows TWV 12 in its own column)
  const shownTwv = (row: BracketRow) =>
    isCurrent || twvMetric === "cfp" ? row.twv : row.twv12;

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
                <th scope="col">Record</th>
                <th scope="col">
                  {isCurrent ? "TWV" : twvMetric === "cfp" ? "Proj CFP TWV" : "Proj TWV 12"}
                </th>
                {isCurrent && <th scope="col">TWV 12</th>}
                <th scope="col">{isCurrent ? "Rtg" : "Proj Rtg"}</th>
                <th className={styles.scoreHeader} scope="col">
                  CFP Rtg %
                </th>
                <th
                  scope="col"
                  title="Chance of making the 12-team field, starting from the CFP committee's latest ranking"
                >
                  CFP %
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
                      <span className={styles.statValue}>{row.record || "—"}</span>
                    </td>

                    <td>
                      <span className={styles.statValue}>
                        {shownTwv(row)?.toFixed(2) ?? "—"}
                      </span>
                    </td>

                    {isCurrent && (
                      <td>
                        <span className={styles.statValue}>
                          {row.twv12 != null ? row.twv12.toFixed(2) : "—"}
                        </span>
                      </td>
                    )}

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

                    <td>
                      <span className={styles.statValue}>
                        {formatBidPct(row.bidPct)}
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
