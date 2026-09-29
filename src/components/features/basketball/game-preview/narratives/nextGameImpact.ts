// What a win or a loss in this game does to the team's chances.

import { type NextGameImpactData, type NextGameMetrics, type TeamInfo } from "@/types/gamePreview";
import { ordinal } from "../metrics";

export function buildNextGameImpactNarrative(
  awayTeam: string,
  homeTeam: string,
  awayInfo: TeamInfo,
  homeInfo: TeamInfo,
  awayImpact?: NextGameImpactData | null,
  homeImpact?: NextGameImpactData | null,
): string {
  const teamParagraph = (
    team: string,
    info: TeamInfo,
    impact: NextGameImpactData | null | undefined,
  ) => {
    const parts: string[] = [];

    // Extract metrics if available
    const teamKey = impact ? String(impact.team_id) : null;
    const current = teamKey
      ? (impact?.current as Record<string, NextGameMetrics>)?.[teamKey]
      : null;
    const win = teamKey
      ? (impact?.with_win as Record<string, NextGameMetrics>)?.[teamKey]
      : null;
    const loss = teamKey
      ? (impact?.with_loss as Record<string, NextGameMetrics>)?.[teamKey]
      : null;

    if (win && loss && current) {
      // Conference tournament impact
      const confParts: string[] = [];

      // Top 4 seed
      const winTop4 = Math.round(win.top4_pct);
      const lossTop4 = Math.round(loss.top4_pct);
      if (winTop4 > 10 || lossTop4 > 10) {
        if (winTop4 >= 80 && lossTop4 >= 80) {
          confParts.push(
            `a top 4 seed is likely either way — ${winTop4}% with a win and ${lossTop4}% with a loss`,
          );
        } else if (winTop4 >= 40 && lossTop4 < 15) {
          confParts.push(
            `with a win the probability of a top 4 seed increases to ${winTop4}%, but is unlikely with a loss at only ${lossTop4}%`,
          );
        } else {
          confParts.push(
            `a top 4 seed is at ${winTop4}% with a win and ${lossTop4}% with a loss`,
          );
        }
      }

      // Top 8 seed
      const winTop8 = Math.round(win.top8_pct);
      const lossTop8 = Math.round(loss.top8_pct);
      if (winTop8 >= 90 && lossTop8 >= 80) {
        confParts.push(
          `a top 8 seed is pretty likely either way — ${winTop8 >= 99 ? "almost 100%" : `${winTop8}%`} chance with a win and still ${lossTop8}% with a loss`,
        );
      } else if (winTop8 > 10 || lossTop8 > 10) {
        confParts.push(
          `top 8 seed: ${winTop8}% with a win, ${lossTop8}% with a loss`,
        );
      }

      // Average seed
      const winSeed = win.avg_seed;
      const lossSeed = loss.avg_seed;
      confParts.push(
        `on average would expect to be around a ${winSeed.toFixed(0)} seed with a win and a ${lossSeed.toFixed(0)} seed with a loss`,
      );

      if (confParts.length > 0) {
        parts.push(
          `${team} — For the conference tournament, ${confParts.join(". ")}.`,
        );
      }

      // NCAA Tournament impact
      const ncaaParts: string[] = [];
      const winBid = win.tournament_bid_pct ?? null;
      const lossBid = loss.tournament_bid_pct ?? null;
      const winNcaaSeed = win.average_seed ?? null;
      const lossNcaaSeed = loss.average_seed ?? null;

      if (winBid !== null && lossBid !== null) {
        if (winBid >= 95 && lossBid >= 95) {
          ncaaParts.push(`they should be in the tournament with a win or loss`);
        } else if (winBid >= 95 && lossBid >= 70) {
          ncaaParts.push(
            `they should be in with a win, and still likely with a loss at ${lossBid.toFixed(0)}%`,
          );
        } else if (winBid >= 70 && lossBid < 50) {
          ncaaParts.push(
            `a win would put them in a strong position at ${winBid.toFixed(0)}%, but a loss could be troubling at only ${lossBid.toFixed(0)}%`,
          );
        } else if (winBid >= 50 && lossBid < 30) {
          ncaaParts.push(
            `a win keeps them in the hunt at ${winBid.toFixed(0)}%, but a loss could be devastating at ${lossBid.toFixed(0)}%`,
          );
        } else {
          ncaaParts.push(
            `tournament probability: ${winBid.toFixed(0)}% with a win, ${lossBid.toFixed(0)}% with a loss`,
          );
        }
      }

      if (
        winNcaaSeed !== null &&
        lossNcaaSeed !== null &&
        winNcaaSeed > 0 &&
        lossNcaaSeed > 0
      ) {
        const seedDiff = Math.abs(winNcaaSeed - lossNcaaSeed);
        if (seedDiff < 0.5) {
          ncaaParts.push(
            `projected around a ${winNcaaSeed.toFixed(0)} seed either way`,
          );
        } else {
          // Determine seed range based on average seed value
          const winSeedLow = Math.floor(winNcaaSeed);
          const winSeedHigh = Math.ceil(winNcaaSeed);
          const lossSeedLow = Math.floor(lossNcaaSeed);
          const lossSeedHigh = Math.ceil(lossNcaaSeed);

          let winDesc = `${ordinal(winSeedLow)}`;
          if (winSeedLow !== winSeedHigh) {
            winDesc = `between a ${ordinal(winSeedLow)} and ${ordinal(winSeedHigh)} seed`;
          } else {
            winDesc = `a ${ordinal(winSeedLow)} seed`;
          }

          let lossDesc = `${ordinal(lossSeedLow)}`;
          if (lossSeedLow !== lossSeedHigh) {
            lossDesc = `a ${ordinal(lossSeedLow)} to ${ordinal(lossSeedHigh)} seed`;
          } else {
            lossDesc = `a ${ordinal(lossSeedLow)} seed`;
          }

          ncaaParts.push(
            `with a win ${winDesc} is expected and with a loss ${lossDesc} is expected`,
          );
        }
      }

      if (ncaaParts.length > 0) {
        parts.push(`For the NCAA Tournament, ${ncaaParts.join(". But, ")}.`);
      }
    } else {
      // Fallback when impact data not available
      const bidPct = info.tournament_bid_pct;
      const avgSeed = info.average_seed;
      if (bidPct !== undefined) {
        if (bidPct >= 95)
          parts.push(
            `${team} — Should be in the tournament regardless of outcome.`,
          );
        else if (bidPct >= 50)
          parts.push(
            `${team} — On the bubble at ${bidPct.toFixed(0)}% tournament probability. This game matters.`,
          );
        else
          parts.push(
            `${team} — At ${bidPct.toFixed(0)}% tournament probability, they need wins.`,
          );
      }
      if (avgSeed && avgSeed > 0)
        parts.push(`Currently projected as a ${avgSeed.toFixed(1)} seed.`);
      parts.push("Impact data loading...");
    }

    return parts.join(" ");
  };

  return `${teamParagraph(awayTeam, awayInfo, awayImpact)}\n\n${teamParagraph(homeTeam, homeInfo, homeImpact)}`;
}
