"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import {
  NCAAProjectionsMode,
  NCAATeam,
  useNCAAProjections,
} from "@/hooks/useNCAAProjections";
import { useResponsive } from "@/hooks/useResponsive";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import styles from "./NCAABracketTable.module.css";

interface NCAABracketTableProps {
  className?: string;
  season?: string;
  // Current Snapshot uses completed-game TWV and today's rating, so the
  // columns drop the "Proj" prefix.
  mode?: NCAAProjectionsMode;
  // Also list every team outside the field and bubble, ranked on from 85
  showAll?: boolean;
}

// TWV_50 picks the field; each seeding tier then scores on its own baseline.
const TWV_RANKS = [30, 50, 200] as const;
type TwvRank = (typeof TWV_RANKS)[number];

const twvValue = (team: NCAATeam, rank: TwvRank) =>
  rank === 30
    ? team.twv_30
    : rank === 50
      ? (team.twv_50 ?? team.post_conf_tourney_twv_50)
      : team.twv_200;

const blendValue = (team: NCAATeam, rank: TwvRank) =>
  rank === 30 ? team.blend_30 : rank === 50 ? team.blend_50 : team.blend_200;

const formatStat = (value: number | null | undefined) =>
  value != null ? value.toFixed(2) : "—";

// Extend NCAATeam interface to include conf_logo_url
interface NCAATeamWithConfLogo extends NCAATeam {
  conf_logo_url?: string;
}

// Category badge palette. Six categories can't be told apart by hue alone -
// validated against the all-pairs colorblind + normal-vision separation checks,
// which cap a single-hue-per-category set at ~3. So each badge carries two
// signals: WEIGHT (plain tint = in the field or play-in, outlined on near-white
// = out) and hue, spaced so the four tinted fills stay apart. Every fill sits in
// the same mid-light band as the rest of the site, with dark text.
const CATEGORY_STYLES: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  // In the field outright - plain tint, the calm bulk of the table.
  "Auto Bid": { bg: "#86efac", text: "#14532d", border: "transparent" },
  "At Large": { bg: "#93c5fd", text: "#1e3a8a", border: "transparent" },
  // Playing their way in - plain tint like the two above, separated by hue.
  // Rose, not violet: a light violet collapses into the At Large blue under
  // deuteranopia.
  "Play-In Game": { bg: "#fcd34d", text: "#78350f", border: "transparent" },
  "Last 4 In": { bg: "#f9a8d4", text: "#9d174d", border: "transparent" },
  // Out - outlined on near-white, hollow next to the filled field.
  "First 4 Out": { bg: "#fff7ed", text: "#c2410c", border: "#c2410c" },
  "Next 4 Out": { bg: "#f8fafc", text: "#334155", border: "#94a3b8" },
  // Pre-split label, kept so historical seasons still get a badge.
  "Last 12 In": { bg: "#f9a8d4", text: "#9d174d", border: "transparent" },
};

const DEFAULT_CATEGORY_STYLE = {
  bg: "#f3f4f6",
  text: "#374151",
  border: "transparent",
};

const getCategoryStyle = (category: string | undefined) =>
  (category && CATEGORY_STYLES[category]) || DEFAULT_CATEGORY_STYLE;

function NCAABracketTable({
  className,
  season,
  mode = "season",
  showAll = false,
}: NCAABracketTableProps) {
  const { isMobile } = useResponsive();
  const router = useRouter();
  const { data, loading, error } = useNCAAProjections(season, undefined, mode);
  const prefix = mode === "current" ? "" : "Proj ";

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

    // Sort tournament teams by seed, then by overall standing - the order
    // they were seeded in, so Seed Rtg % reads down each line - with TWV as
    // the fallback for rows without one.
    const sortedTournament = [...tournament].sort((a, b) => {
      const seedA = a.seed ? parseInt(a.seed, 10) : 999;
      const seedB = b.seed ? parseInt(b.seed, 10) : 999;

      if (seedA !== seedB) {
        return seedA - seedB;
      }

      if (a.standing != null && b.standing != null && a.standing !== b.standing) {
        return a.standing - b.standing;
      }

      return b.post_conf_tourney_twv_50 - a.post_conf_tourney_twv_50;
    });

    // Sort First 4 Out by TWV descending
    const sortedFirst4Out = [...firstFourOut]
      .map((team) => ({
        ...team,
        category: "First 4 Out",
        seed: "Out",
      }))
      .sort((a, b) => b.post_conf_tourney_twv_50 - a.post_conf_tourney_twv_50);

    // Sort Next 4 Out by TWV descending
    const sortedNext4Out = [...nextFourOut]
      .map((team) => ({
        ...team,
        category: "Next 4 Out",
        seed: "Out",
      }))
      .sort((a, b) => b.post_conf_tourney_twv_50 - a.post_conf_tourney_twv_50);

    // Everyone else, already ranked by the API (TWV 50, then rating); the
    // rank sits in the seed column as on football/home.
    const others = showAll
      ? ((data.other_teams as NCAATeamWithConfLogo[]) || []).map((team) => ({
          ...team,
          category: "",
          seed: team.standing != null ? String(team.standing) : "-",
          isOther: true,
        }))
      : [];

    // Tournament, then First 4 Out, then Next 4 Out, then (optionally) the rest
    return [
      ...sortedTournament,
      ...sortedFirst4Out,
      ...sortedNext4Out,
      ...others,
    ] as (NCAATeamWithConfLogo & { isOther?: boolean })[];
  }, [data, showAll]);

  // Dark separator between seed groups and between tournament/out-of-tournament
  // sections - mirrors the football CFP bracket's isGroupBoundary logic but
  // keyed off basketball's seed/category fields instead of a "group" enum.
  const isGroupBoundary = useCallback(
    (index: number) => {
      const team = allTeams[index];
      const nextTeam = allTeams[index + 1];

      if (!nextTeam) return true; // last row overall

      // The rest of D1: after the bubble, then every 10 ranks (as football)
      if (nextTeam.isOther && !team.isOther) return true;
      if (team.isOther) return team.standing != null && team.standing % 10 === 0;

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
                {TWV_RANKS.map((rank) => (
                  <th key={rank} scope="col">
                    {prefix}TWV {rank}
                    {rank === 50 && (
                      <span className={styles.headerNote}>decides bid</span>
                    )}
                  </th>
                ))}
                <th scope="col">{prefix}Rtg</th>
                {TWV_RANKS.map((rank) => (
                  <th key={`blend-${rank}`} scope="col">
                    Blend {rank}
                  </th>
                ))}
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
                        <span className={styles.teamName}>{team.team_name}</span>
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
                            backgroundColor: getCategoryStyle(team.category).bg,
                            color: getCategoryStyle(team.category).text,
                            borderColor: getCategoryStyle(team.category).border,
                          }}
                        >
                          {team.category}
                        </span>
                      )}
                    </td>

                    {TWV_RANKS.map((rank) => (
                      <td
                        key={rank}
                        className={cn(
                          team.seed_twv_rank === rank && styles.seedTwvCell,
                        )}
                        title={
                          team.seed_twv_rank === rank
                            ? team.seed === "Out" || team.isOther
                              ? "Selection is on TWV 50"
                              : `Seeded on TWV ${rank}`
                            : undefined
                        }
                      >
                        <span className={styles.statValue}>
                          {formatStat(twvValue(team, rank))}
                        </span>
                      </td>
                    ))}

                    <td>
                      <span className={styles.statValue}>
                        {formatStat(team.rating)}
                      </span>
                    </td>

                    {/* Blend N = 65% TWV N + 35% rating, 0-100. Shaded on the
                        one that seeded the team; teams outside the field are
                        picked on TWV 50 alone, so no blend is shaded. */}
                    {TWV_RANKS.map((rank) => {
                      const value = blendValue(team, rank);
                      return (
                        <td
                          key={`blend-${rank}`}
                          className={cn(
                            team.seed !== "Out" &&
                              !team.isOther &&
                              team.seed_twv_rank === rank &&
                              styles.seedTwvCell,
                          )}
                        >
                          <span className={styles.statValue}>
                            {value != null ? value.toFixed(1) : "—"}
                          </span>
                        </td>
                      );
                    })}
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
