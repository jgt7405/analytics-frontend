// What a win or a loss in this game does to the team's chances.

import { type NextGameImpactData, type NextGameMetrics, type TeamInfo } from "@/types/gamePreview";
import { aSeed } from "../metrics";

const pct = (n: number) => `${Math.round(n)}%`;

/** Conference seeding sentences: top 4, top 8, average seed. */
function conferenceSentences(win: NextGameMetrics, loss: NextGameMetrics): string[] {
  const parts: string[] = [];
  const numTeams = win.num_teams ?? 16;

  const top4W = win.top4_pct;
  const top4L = loss.top4_pct;
  const top4Likely = top4W >= 80 && top4L >= 80;
  if (top4W > 10 || top4L > 10) {
    if (Math.abs(top4W - top4L) < 1) {
      parts.push(`Their chance at a top-4 conference seed holds at about ${pct(top4W)} either way.`);
    } else if (top4Likely) {
      parts.push(
        `A top-4 conference seed is likely either way (${pct(top4W)} with a win, ${pct(top4L)} with a loss).`,
      );
    } else if (top4W >= 40 && top4L < 15) {
      parts.push(
        `A win lifts their top-4 conference seed chances to ${pct(top4W)}; a loss drops them to ${pct(top4L)}.`,
      );
    } else {
      parts.push(
        `Their top-4 conference seed chances are ${pct(top4W)} with a win and ${pct(top4L)} with a loss.`,
      );
    }
  }

  // Top 8 says nothing new when top 4 is already likely, or the league has 8 or fewer teams
  const top8W = win.top8_pct;
  const top8L = loss.top8_pct;
  if (!top4Likely && numTeams > 8 && (top8W > 10 || top8L > 10)) {
    if (top8W >= 90 && top8L >= 80) {
      parts.push(`A top-8 seed is safe either way (${pct(top8W)} / ${pct(top8L)}).`);
    } else {
      parts.push(`For a top-8 seed: ${pct(top8W)} with a win, ${pct(top8L)} with a loss.`);
    }
  }

  const seedW = win.avg_seed.toFixed(1);
  const seedL = loss.avg_seed.toFixed(1);
  parts.push(
    seedW === seedL
      ? `Their projected conference seed stays around ${seedW}.`
      : `Their average projected conference seed is ${seedW} with a win and ${seedL} with a loss.`,
  );
  return parts;
}

/** NCAA Tournament sentences: bid chances, then projected seed. */
function ncaaSentences(win: NextGameMetrics, loss: NextGameMetrics): string[] {
  const parts: string[] = [];
  const winBid = win.tournament_bid_pct ?? null;
  const lossBid = loss.tournament_bid_pct ?? null;
  if (winBid === null || lossBid === null) return parts;

  if (winBid >= 95 && lossBid >= 95) {
    parts.push(`They project as an NCAA Tournament team win or lose.`);
  } else if (Math.abs(winBid - lossBid) < 1) {
    parts.push(`Their NCAA Tournament chances barely move, at about ${pct(winBid)} either way.`);
  } else if (winBid < 5 && lossBid < 5) {
    parts.push(
      `An NCAA Tournament bid is a long shot either way (${pct(winBid)} with a win, ${pct(lossBid)} with a loss).`,
    );
  } else if (winBid >= 95 && lossBid >= 70) {
    parts.push(
      `A win keeps them a near-lock for the NCAA Tournament (${pct(winBid)}); a loss still leaves them at ${pct(lossBid)}.`,
    );
  } else if (winBid >= 50 && lossBid < 30) {
    parts.push(
      `This one matters for their NCAA Tournament hopes: ${pct(winBid)} with a win, only ${pct(lossBid)} with a loss.`,
    );
  } else {
    parts.push(
      `Their NCAA Tournament chances are ${pct(winBid)} with a win and ${pct(lossBid)} with a loss.`,
    );
  }

  // A projected seed only means something for teams with a real shot at a bid
  const winSeed = win.average_seed ?? null;
  const lossSeed = loss.average_seed ?? null;
  if (winSeed && lossSeed && winBid >= 25) {
    parts.push(
      Math.abs(winSeed - lossSeed) < 0.5
        ? `They project around ${aSeed(Math.round(winSeed))} either way.`
        : `Their average projected NCAA seed is ${winSeed.toFixed(1)} with a win and ${lossSeed.toFixed(1)} with a loss.`,
    );
  }
  return parts;
}

export function buildNextGameImpactNarrative(
  awayTeam: string,
  homeTeam: string,
  awayInfo: TeamInfo,
  homeInfo: TeamInfo,
  awayImpact: NextGameImpactData | null | undefined,
  homeImpact: NextGameImpactData | null | undefined,
  isConferenceGame: boolean,
): string {
  const teamParagraph = (
    team: string,
    info: TeamInfo,
    impact: NextGameImpactData | null | undefined,
  ) => {
    const parts: string[] = [];
    if (!isConferenceGame) {
      parts.push(`This is a non-conference game, so it won't affect their conference standing.`);
    }

    const teamKey = impact ? String(impact.team_id) : null;
    const pick = (field: "current" | "with_win" | "with_loss") =>
      teamKey
        ? (impact?.[field] as Record<string, NextGameMetrics> | undefined)?.[teamKey]
        : undefined;
    const current = pick("current");
    const win = pick("with_win");
    const loss = pick("with_loss");

    if (win && loss && current) {
      if (isConferenceGame) parts.push(...conferenceSentences(win, loss));
      parts.push(...ncaaSentences(win, loss));
    } else {
      // Impact data still loading (or unavailable): use the team's current projection
      const bidPct = info.tournament_bid_pct;
      if (bidPct !== undefined) {
        if (bidPct >= 95) parts.push(`They currently project as an NCAA Tournament team.`);
        else if (bidPct >= 75)
          parts.push(`At ${pct(bidPct)} to make the NCAA Tournament, they're in good shape.`);
        else if (bidPct >= 35)
          parts.push(`At ${pct(bidPct)} to make the NCAA Tournament, they're on the bubble.`);
        else if (bidPct >= 5)
          parts.push(`At ${pct(bidPct)} to make the NCAA Tournament, they need wins.`);
        else parts.push(`An NCAA Tournament bid is a long shot at ${pct(bidPct)}.`);
      }
      if (info.average_seed && info.average_seed > 0 && (bidPct ?? 0) >= 25)
        parts.push(`Their average projected seed is ${info.average_seed.toFixed(1)}.`);
    }

    return `${team}: ${parts.join(" ")}`;
  };

  return `${teamParagraph(awayTeam, awayInfo, awayImpact)}\n\n${teamParagraph(homeTeam, homeInfo, homeImpact)}`;
}
