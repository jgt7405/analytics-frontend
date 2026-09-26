// React Query keys for every backend resource (docs/ARCHITECTURE_PLAN.md
// step 3). Hooks take their key from here instead of writing an array, so:
//   - two hooks can't collide on a key by accident, or use different keys for
//     the same data;
//   - every key starts with its sport, so one sport's cache can be cleared
//     with queryClient.invalidateQueries({ queryKey: queryKeys.football.all });
//   - a key lists every parameter its fetch depends on (conference, season,
//     mode, ...). When a hook gains a fetch parameter, add it here too, or
//     different requests will share one cache entry.
//
// ESLint rejects inline `queryKey: [...]` arrays outside this file.

type Season = string | undefined;

export const queryKeys = {
  basketball: {
    all: ["basketball"] as const,
    compositeRatings: () => ["basketball", "composite-ratings"] as const,
    confChampAnalysis: (conference: string) =>
      ["basketball", "conf-champ-analysis", conference] as const,
    confData: (season: Season) => ["basketball", "conf-data", season] as const,
    confDataHistory: (season: Season) =>
      ["basketball", "conf-data-history", season] as const,
    confTourney: (conference: string, season: Season) =>
      ["basketball", "conf-tourney", conference, season] as const,
    confTourneyHistory: (conference: string, season: Season) =>
      ["basketball", "conf-tourney-history", conference, season] as const,
    cwv: (conference: string, season: Season) =>
      ["basketball", "cwv", conference, season] as const,
    ncaaProjections: (season: Season, mode: string) =>
      ["basketball", "ncaa-projections", season, mode] as const,
    ncaaTourney: (conference: string, season: Season) =>
      ["basketball", "ncaa-tourney", conference, season] as const,
    nextGameImpact: (conference: string, teamId: number) =>
      ["basketball", "next-game-impact", conference, teamId] as const,
    schedule: (conference: string, season: Season) =>
      ["basketball", "schedule", conference, season] as const,
    seed: (conference: string, season: Season) =>
      ["basketball", "seed", conference, season] as const,
    seedWins: (conference: string | null, season: Season) =>
      ["basketball", "seed-wins", conference, season] as const,
    standings: (conference: string, season: Season) =>
      ["basketball", "standings", conference, season] as const,
    standingsHistory: (conference: string, season: Season) =>
      ["basketball", "standings-history", conference, season] as const,
    team: (teamName: string, season: Season) =>
      ["basketball", "team", teamName, season] as const,
    teamAllHistory: (teamName: string, season: Season) =>
      ["basketball", "team-all-history", teamName, season] as const,
    teams: (season: Season) => ["basketball", "teams", season] as const,
    twv: (conference: string, season: Season) =>
      ["basketball", "twv", conference, season] as const,
    upcomingGames: () => ["basketball", "upcoming-games"] as const,
  },
  football: {
    all: ["football"] as const,
    allFutureGames: () => ["football", "all-future-games"] as const,
    bowlPicks: () => ["football", "bowl-picks"] as const,
    cfp: (conference: string, season: Season) =>
      ["football", "cfp", conference, season] as const,
    compositeRatingDates: () => ["football", "composite-rating-dates"] as const,
    compositeRatings: (date: string | undefined) =>
      ["football", "composite-ratings", date] as const,
    confChamp: (conference: string, season: Season) =>
      ["football", "conf-champ", conference, season] as const,
    confData: (season: Season) => ["football", "conf-data", season] as const,
    confDataHistory: (season: Season) =>
      ["football", "conf-data-history", season] as const,
    cwv: (conference: string, season: Season) =>
      ["football", "cwv", conference, season] as const,
    playoffRankings: (season: Season, mode: string) =>
      ["football", "playoff-rankings", season, mode] as const,
    schedule: (conference: string, season: Season) =>
      ["football", "schedule", conference, season] as const,
    seed: (conference: string, season: Season) =>
      ["football", "seed", conference, season] as const,
    standings: (conference: string, season: Season) =>
      ["football", "standings", conference, season] as const,
    standingsHistory: (conference: string, season: Season) =>
      ["football", "standings-history", conference, season] as const,
    team: (teamName: string, season: Season) =>
      ["football", "team", teamName, season] as const,
    teamAllHistory: (teamName: string, season: Season) =>
      ["football", "team-all-history", teamName, season] as const,
    teamCfpHistory: (teamName: string) =>
      ["football", "team-cfp-history", teamName] as const,
    teams: (season: Season) => ["football", "teams", season] as const,
    twv: (conference: string, season: Season) =>
      ["football", "twv", conference, season] as const,
  },
};
