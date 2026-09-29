// Pure calculations behind the football what-if page (table rows for the
// conference-championship and CFP tables, which games to list, the picked
// outcomes) and its two shared style constants. No React; index.tsx
// memoizes them.

import type { AllTeamCFPEntry, WhatIfGame, WhatIfTeamResult } from "@/types/football";

export const TEAL_COLOR = "rgb(0, 151, 178)";

// Matches the gradient/border/shadow "card" look used across the
// modernized Wins/Standings/CWV/etc. pages.
export const CARD_CLASS =
  "relative border border-slate-200/90 dark:border-slate-700/90 rounded-[1.25rem] bg-gradient-to-br from-white to-[#fbfdff] dark:from-[#111827] dark:to-[#0f172a] shadow-[0_22px_55px_-36px_rgb(15_23_42_/_0.36),0_8px_22px_-18px_rgb(15_23_42_/_0.24)] dark:shadow-[0_24px_58px_-34px_rgb(0_0_0_/_0.82)]";

/** % of simulated seasons in which the team played the conference title game. */
export function top2Probability(team: WhatIfTeamResult): number {
  const probability = team.conf_champ_game_played / (team.totalscenarios || 1000);
  return probability * 100;
}

export function cfpProbability(team: WhatIfTeamResult): number {
  return team.cfp_probability || 0;
}

export function confChampRows(teams: WhatIfTeamResult[], which: "current" | "whatif") {
  return teams.map((team) => ({
    team_id: team.team_id,
    team_name: team.team_name,
    logo_url: team.logo_url,
    currentProb: which === "current" ? top2Probability(team) : 0,
    whatIfProb: which === "whatif" ? top2Probability(team) : 0,
    change: 0,
  }));
}

/** Current CFP rows: every team from the all-teams CFP response when shown, else the conference. */
export function currentCFPRows(
  currentProjections: WhatIfTeamResult[],
  allTeams: { team_name: string; logo_url: string; CFP_First_Round: number }[] | undefined,
  showAllTeams: boolean,
) {
  if (showAllTeams && allTeams?.length) {
    return allTeams.map((team) => ({
      team_id: team.team_name,
      team_name: team.team_name,
      logo_url: team.logo_url,
      currentProb: team.CFP_First_Round,
      whatIfProb: 0,
      change: 0,
    }));
  }
  return currentProjections.map((team) => ({
    team_id: team.team_id,
    team_name: team.team_name,
    logo_url: team.logo_url,
    currentProb: cfpProbability(team),
    whatIfProb: 0,
    change: 0,
  }));
}

/** What-if CFP rows (undefined before a calculation), with auto / at-large / title-no-bid splits. */
export function whatIfCFPRows(
  whatIfResults: WhatIfTeamResult[],
  allTeamsWhatIf: AllTeamCFPEntry[],
  showAllTeams: boolean,
) {
  if (whatIfResults.length === 0) return undefined;
  if (showAllTeams && allTeamsWhatIf.length > 0) {
    return allTeamsWhatIf.map((team) => ({
      team_id: team.team_name,
      team_name: team.team_name,
      logo_url: team.logo_url,
      currentProb: 0,
      whatIfProb: team.cfp_probability,
      change: 0,
      whatIfAutoPct: team.auto_bid_pct ?? 0,
      whatIfAtLargePct: team.atlarge_pct ?? 0,
      whatIfConfNoBidPct: team.conf_champ_no_bid_pct ?? 0,
    }));
  }
  return whatIfResults.map((team) => ({
    team_id: team.team_id,
    team_name: team.team_name,
    logo_url: team.logo_url,
    currentProb: 0,
    whatIfProb: cfpProbability(team),
    change: 0,
    whatIfAutoPct: team.auto_bid_pct ?? 0,
    whatIfAtLargePct: team.atlarge_pct ?? 0,
    whatIfConfNoBidPct: team.conf_champ_no_bid_pct ?? 0,
  }));
}

/** Every team name in the conference's and the full FBS game lists (for team search). */
export function teamNames(games: WhatIfGame[], allFutureGames: WhatIfGame[]): string[] {
  const names = new Set<string>();
  [...games, ...allFutureGames].forEach((g) => {
    names.add(g.home_team);
    names.add(g.away_team);
  });
  return Array.from(names);
}

/** Games to list: searched teams' games (across FBS), all FBS games, or the conference's. */
export function filterGames(
  games: WhatIfGame[],
  allFutureGames: WhatIfGame[],
  gameFilter: "conference" | "all",
  selectedTeams: string[],
): WhatIfGame[] {
  if (selectedTeams.length > 0) {
    // Team selection overrides toggle: search all FBS games
    const pool = allFutureGames.length > 0 ? allFutureGames : games;
    const selectedSet = new Set(selectedTeams);
    return pool.filter((g) => selectedSet.has(g.home_team) || selectedSet.has(g.away_team));
  }
  if (gameFilter === "all") return allFutureGames;
  return games; // "conference" = games involving at least one conference team
}

export function groupByDate(games: WhatIfGame[]): { [date: string]: WhatIfGame[] } {
  const gamesByDate: { [key: string]: WhatIfGame[] } = {};
  games.forEach((game) => {
    if (!gamesByDate[game.date]) {
      gamesByDate[game.date] = [];
    }
    gamesByDate[game.date].push(game);
  });
  return gamesByDate;
}

export interface PickedOutcome {
  gameId: number;
  game: WhatIfGame;
  winnerId: string;
  leftTeam: string;
  leftLogo?: string;
  leftIsWinner: boolean;
  rightTeam: string;
  rightLogo?: string;
  rightIsWinner: boolean;
}

/** The calculated picks with their games (away team on the left), by date. */
export function pickedOutcomes(
  calculatedSelections: Map<number, string>,
  games: WhatIfGame[],
  allFutureGames: WhatIfGame[],
): PickedOutcome[] {
  const allKnownGames = new Map<number, WhatIfGame>();
  [...games, ...allFutureGames].forEach((g) => allKnownGames.set(g.game_id, g));

  const result: PickedOutcome[] = [];
  for (const [gameId, winnerId] of calculatedSelections.entries()) {
    const game = allKnownGames.get(gameId);
    if (game) {
      result.push({
        gameId,
        game,
        winnerId,
        leftTeam: game.away_team,
        leftLogo: game.away_team_logo,
        leftIsWinner: String(game.away_team_id) === winnerId,
        rightTeam: game.home_team,
        rightLogo: game.home_team_logo,
        rightIsWinner: String(game.home_team_id) === winnerId,
      });
    }
  }
  return result.sort((a, b) => a.game.date.localeCompare(b.game.date));
}
