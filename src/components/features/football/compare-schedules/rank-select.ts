import type { CompositeRatingTeam, FootballTWVData } from "@/types/football";

/** Rankings the compare page can auto-select teams by. */
export type RankingKey = "rating" | "twv" | "ap" | "cfp";

export const RANKING_OPTIONS: { key: RankingKey; label: string }[] = [
  { key: "rating", label: "Rating" },
  { key: "twv", label: "TWV" },
  { key: "ap", label: "AP Poll" },
  { key: "cfp", label: "CFP Rankings" },
];

/** Team names in rank order (index 0 = #1) for each ranking. */
export type RankedLists = Record<RankingKey, string[]>;

function byPollRank(teams: CompositeRatingTeam[], field: "ap_rank" | "cfp_rank"): string[] {
  return teams
    .filter((team) => typeof team[field] === "number")
    .sort((a, b) => (a[field] as number) - (b[field] as number))
    .map((team) => team.team_name);
}

/**
 * Builds each ranking's ordered team list:
 * - rating: composite rating rank, FBS only (FCS carries the 999 sentinel)
 * - twv: TWV, highest first (FBS only, from /football/twv/All_Teams)
 * - ap / cfp: the latest poll's ranked teams; empty until a poll is released
 */
export function buildRankedLists(
  compositeTeams: CompositeRatingTeam[] | undefined,
  twvTeams: FootballTWVData[] | undefined,
): RankedLists {
  const composite = compositeTeams ?? [];
  return {
    rating: composite
      .filter((team) => team.rank !== 999)
      .sort((a, b) => a.rank - b.rank)
      .map((team) => team.team_name),
    twv: (twvTeams ?? [])
      .slice()
      .sort((a, b) => b.twv - a.twv)
      .map((team) => team.team_name),
    ap: byPollRank(composite, "ap_rank"),
    cfp: byPollRank(composite, "cfp_rank"),
  };
}

/**
 * Teams ranked `from` through `to` (1-based, inclusive), capped at
 * `maxTeams` starting from `from`. Out-of-range or reversed bounds are
 * clamped/swapped rather than rejected.
 */
export function selectRankRange(list: string[], from: number, to: number, maxTeams: number): string[] {
  const start = Math.max(1, Math.floor(Math.min(from, to)) || 1);
  const end = Math.max(start, Math.floor(Math.max(from, to)) || start);
  return list.slice(start - 1, Math.min(end, start - 1 + maxTeams));
}
