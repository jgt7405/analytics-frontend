// Summary of projected wins and the seed they point to.

import { type ConfChampData, type TeamGameData, type TeamInfo } from "@/types/gamePreview";
import { ordinal } from "../metrics";

export function buildWinsBreakdownNarrative(
  awayTeam: string,
  homeTeam: string,
  awaySchedule: TeamGameData[],
  homeSchedule: TeamGameData[],
  awayInfo?: TeamInfo,
  homeInfo?: TeamInfo,
  awayConfChampData?: ConfChampData | null,
  homeConfChampData?: ConfChampData | null,
): string {
  const teamParagraph = (
    team: string,
    schedule: TeamGameData[],
    info?: TeamInfo,
    opponent?: string,
    confChampData?: ConfChampData | null,
  ) => {
    const completed = schedule.filter(
      (g) => g.status === "W" || g.status === "L",
    );
    const currentWins = completed.filter((g) => g.status === "W").length;
    const remaining = schedule.filter(
      (g) => g.status !== "W" && g.status !== "L",
    );
    const parts: string[] = [];
    // Projected wins from win_seed_counts (weighted average — matches Proj Final Record)
    let projectedWinsExact: number | null = null;
    if (info && info.win_seed_counts && info.win_seed_counts.length > 0) {
      const wsc = info.win_seed_counts;
      const totalCount = wsc.reduce((sum, e) => sum + e.Count, 0);
      if (totalCount > 0) {
        projectedWinsExact =
          wsc.reduce((sum, e) => sum + e.Wins * e.Count, 0) / totalCount;
      }
    }

    // Fallback: compute from team_win_prob if win_seed_counts unavailable
    if (projectedWinsExact === null) {
      const remainingWithProb = remaining.filter(
        (g) => g.team_win_prob !== undefined && g.team_win_prob !== null,
      );
      const remainingExpectedWins = remainingWithProb.reduce(
        (sum, g) => sum + (g.team_win_prob ?? 0),
        0,
      );
      projectedWinsExact = currentWins + remainingExpectedWins;
    }

    const projLow = Math.floor(projectedWinsExact);
    const projHigh = Math.ceil(projectedWinsExact);
    const frac = projectedWinsExact - projLow;

    // Use tournament_bid_pct to decide if we should show seed or "out of tournament"
    const bidPct = info?.tournament_bid_pct;
    const avgSeed = info?.average_seed;
    let seedStr = "";
    if (bidPct !== undefined && bidPct < 50) {
      // Team is more likely OUT of the tournament — don't show misleading seed
    } else if (avgSeed && avgSeed > 0) {
      seedStr = ` which would put them at around a ${avgSeed.toFixed(0)} seed`;
    }

    if (projLow === projHigh) {
      parts.push(
        `${team} is projected to finish with around ${projLow} wins${seedStr}.`,
      );
    } else if (frac <= 0.2) {
      parts.push(
        `${team} is projected to finish with around ${projLow} wins${seedStr}.`,
      );
    } else if (frac >= 0.8) {
      parts.push(
        `${team} is projected to finish with around ${projHigh} wins${seedStr}.`,
      );
    } else {
      parts.push(
        `${team} is projected to finish with between ${projLow} and ${projHigh} wins${seedStr}.`,
      );
    }

    // Determine total remaining games including conference tournament
    let totalRemainingCount = remaining.length;
    if (info && info.win_seed_counts && info.win_seed_counts.length > 0) {
      const maxWinsInDist = Math.max(
        ...info.win_seed_counts.map((e) => e.Wins),
      );
      const impliedTotalRemaining = maxWinsInDist - currentWins;
      if (impliedTotalRemaining > totalRemainingCount) {
        totalRemainingCount = impliedTotalRemaining;
      }
    }

    // ─── Rank this game among ALL remaining games (regular + conf tourney) ───
    // Build the same combined+sorted list the chart (BasketballTeamWinsBreakdown) uses:
    // scheduled remaining games + conference tournament games, sorted by win prob descending.
    if (totalRemainingCount > 0 && opponent) {
      // Scheduled remaining games with win probs
      const scheduledRemaining = remaining
        .filter(
          (g) => g.team_win_prob !== undefined && g.team_win_prob !== null,
        )
        .map((g) => ({
          opponent: g.opponent,
          winProb: g.team_win_prob ?? 0,
          isConfTourney: false,
        }));

      // Build conference tournament games from ACTUAL confChampData
      // (same data source the chart component uses)
      const confTourneyGames: {
        opponent: string;
        winProb: number;
        isConfTourney: boolean;
      }[] = [];
      if (confChampData) {
        for (let gameNum = 1; gameNum <= 6; gameNum++) {
          const probKey =
            `pct_prob_win_conf_tourney_game_${gameNum}` as keyof ConfChampData;
          const prob = (confChampData[probKey] as number) || 0;
          if (prob > 0) {
            confTourneyGames.push({
              opponent: `Conf Tourney Game ${gameNum}`,
              winProb: prob / 100, // API returns percentage, convert to decimal
              isConfTourney: true,
            });
          }
        }
      }

      // Combine and sort all remaining games by win prob descending (easiest first)
      // This exactly matches the chart's ordering
      const allRemaining = [...scheduledRemaining, ...confTourneyGames].sort(
        (a, b) => b.winProb - a.winProb,
      );

      // Find this game's position in the combined sorted list
      const gameIdx = allRemaining.findIndex(
        (g) => !g.isConfTourney && g.opponent === opponent,
      );

      if (gameIdx >= 0) {
        const easeRank = gameIdx + 1; // 1 = most likely to win
        const totalRemaining = allRemaining.length;

        // Compare to projected remaining wins to contextualize
        const projectedRemainingWins =
          projectedWinsExact !== null ? projectedWinsExact - currentWins : null;
        const likelyInProjection =
          projectedRemainingWins !== null &&
          easeRank <= Math.round(projectedRemainingWins);

        const rankLabel = easeRank === 1 ? "most" : ordinal(easeRank) + " most";

        if (likelyInProjection) {
          parts.push(
            `This is the ${rankLabel} likely of their up to ${totalRemaining} remaining games that they would win and is one of the more likely games they would win if they achieve their projected total.`,
          );
        } else if (
          projectedRemainingWins !== null &&
          easeRank > Math.round(projectedRemainingWins)
        ) {
          parts.push(
            `This is the ${rankLabel} likely of their up to ${totalRemaining} projected remaining games that they would win and a win here positions them to exceed their current projected win total.`,
          );
        } else {
          parts.push(
            `This is the ${rankLabel} likely of their up to ${totalRemaining} projected remaining games that they would win.`,
          );
        }
      } else {
        parts.push(
          `They have up to ${totalRemainingCount} game${totalRemainingCount !== 1 ? "s" : ""} remaining.`,
        );
      }
    } else if (totalRemainingCount > 0) {
      parts.push(
        `They have up to ${totalRemainingCount} game${totalRemainingCount !== 1 ? "s" : ""} remaining.`,
      );
    }

    // Seed range and no-more-wins from win_seed_counts
    if (info && info.win_seed_counts && info.win_seed_counts.length > 0) {
      const wsc = info.win_seed_counts;
      const withSeeds = wsc.filter(
        (e) => e.Seed && e.Seed !== "Out" && e.Seed !== "None" && e.Count > 0,
      );
      const seeds = withSeeds
        .map((e) => parseInt(String(e.Seed)))
        .filter((n) => !isNaN(n));

      const currentWinEntry = wsc.find((e) => e.Wins === currentWins);
      const noMoreSeed = currentWinEntry?.Seed;
      const noMoreIsOut =
        !noMoreSeed || noMoreSeed === "Out" || noMoreSeed === "None";

      if (seeds.length > 0) {
        const bestSeed = Math.min(...seeds);
        parts.push(
          `Top end seed possibility looks to be around a ${bestSeed} seed`,
        );
        if (noMoreIsOut) {
          parts.push(
            `and with no more wins they would project to be out of the tournament.`,
          );
        } else {
          parts.push(
            `and with no more wins they would project as around a ${noMoreSeed} seed.`,
          );
        }
      } else if (currentWinEntry) {
        if (noMoreIsOut) {
          parts.push(
            `With no more wins they would project to be out of the tournament.`,
          );
        } else {
          parts.push(
            `With no more wins they would project as around a ${noMoreSeed} seed.`,
          );
        }
      }
    }

    return parts.join(" ");
  };
  return `${teamParagraph(awayTeam, awaySchedule, awayInfo, homeTeam, awayConfChampData)}\n\n${teamParagraph(homeTeam, homeSchedule, homeInfo, awayTeam, homeConfChampData)}`;
}
