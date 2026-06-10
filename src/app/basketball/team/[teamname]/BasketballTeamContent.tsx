"use client";

// Basketball team page = shared TeamContent + basketball config (12
// sections). Serves both the current page and the [season] archive page.

import TeamContent, {
  TeamContentConfig,
  TeamSection,
} from "@/components/features/shared/TeamContent";
import BasketballTeamScheduleChart from "@/components/features/basketball/BasketballTeamScheduleChart";
import BasketballTeamScheduleDifficulty from "@/components/features/basketball/BasketballTeamScheduleDifficulty";
import BasketballTeamWinsBreakdown from "@/components/features/basketball/BasketballTeamWinsBreakdown";
import TeamSchedule from "@/components/features/basketball/TeamSchedule";
import TeamSeedProjections from "@/components/features/basketball/TeamSeedProjections";
import TeamWinValues from "@/components/features/basketball/TeamWinValues";
import { useBasketballTeamAllHistory } from "@/hooks/useBasketballTeamAllHistory";
import { useBasketballTeamData, TeamData } from "@/hooks/useBasketballTeamData";
import dynamic from "next/dynamic";

const ChartSkeleton = () => (
  <div className="h-64 bg-gray-100 dark:bg-slate-700 animate-pulse rounded-lg" />
);

const BasketballTeamRankHistory = dynamic(
  () => import("@/components/features/basketball/BasketballTeamRankHistory"),
  { loading: ChartSkeleton },
);
const BasketballTeamWinHistory = dynamic(
  () => import("@/components/features/basketball/BasketballTeamWinHistory"),
  { loading: ChartSkeleton },
);
const BasketballTeamStandingsHistory = dynamic(
  () =>
    import("@/components/features/basketball/BasketballTeamStandingsHistory"),
  { loading: ChartSkeleton },
);
const BasketballTeamFirstPlaceHistory = dynamic(
  () =>
    import("@/components/features/basketball/BasketballTeamFirstPlaceHistory"),
  { loading: ChartSkeleton },
);
const BasketballTeamTournamentBidHistory = dynamic(
  () =>
    import(
      "@/components/features/basketball/BasketballTeamTournamentBidHistory"
    ),
  { loading: ChartSkeleton },
);
const BasketballTeamTournamentProgressionHistory = dynamic(
  () =>
    import(
      "@/components/features/basketball/BasketballTeamTournamentProgressionHistory"
    ),
  { loading: ChartSkeleton },
);

type History = ReturnType<typeof useBasketballTeamAllHistory>["data"];

// Basketball season label from latest history date (Oct-Dec -> starts that
// year; Jan-Sep -> started the prior year).
const computeSeason = (historyData: History | null | undefined): string => {
  if (historyData?.confWins?.data && historyData.confWins.data.length > 0) {
    const maxDate = historyData.confWins.data.reduce(
      (max: string, item: { date: string }) =>
        item.date > max ? item.date : max,
      historyData.confWins.data[0].date,
    );
    const [dataYear, dataMonth] = maxDate.split("-").map(Number);
    if (dataMonth >= 10) {
      return `${dataYear}-${(dataYear + 1).toString().slice(-2)}`;
    }
    return `${dataYear - 1}-${dataYear.toString().slice(-2)}`;
  }
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  return month < 10
    ? `${year - 1}-${year.toString().slice(-2)}`
    : `${year}-${(year + 1).toString().slice(-2)}`;
};

const historySectionProps = (ctx: {
  teamInfo: {
    team_name: string;
    primary_color?: string;
    secondary_color?: string;
    logo_url: string;
  };
  displaySeason: string;
}) => ({
  teamName: ctx.teamInfo.team_name,
  primaryColor: ctx.teamInfo.primary_color,
  secondaryColor: ctx.teamInfo.secondary_color,
  season: ctx.displaySeason,
});

const SECTIONS: TeamSection<TeamData>[] = [
  {
    key: "schedule",
    heading: "Team Schedule",
    containerClass: "basketball-team-schedule",
    watermark: true,
    scheduleFrame: true,
    render: (ctx) => (
      <TeamSchedule
        schedule={ctx.teamData.schedule}
        teamName={ctx.teamInfo.team_name}
        navigateToTeam={ctx.navigateToTeam}
      />
    ),
  },
  {
    key: "schedule-chart",
    heading: "Schedule Chart",
    containerClass: "basketball-schedule-chart",
    watermark: true,
    render: (ctx) => (
      <BasketballTeamScheduleChart
        schedule={ctx.teamData.schedule}
        navigateToTeam={ctx.navigateToTeam}
        teamName={ctx.teamInfo.team_name}
      />
    ),
  },
  {
    key: "schedule-difficulty",
    heading: "Schedule Difficulty",
    containerClass: "basketball-schedule-difficulty",
    visible: (teamData) => Boolean(teamData.all_schedule_data),
    render: (ctx) => (
      <BasketballTeamScheduleDifficulty
        schedule={ctx.teamData.schedule}
        allScheduleData={ctx.teamData.all_schedule_data!}
        teamConference={ctx.teamInfo.conference}
        logoUrl={ctx.teamInfo.logo_url}
        teamColor={ctx.teamData.team_info.primary_color}
      />
    ),
  },
  {
    key: "wins-to-seed-map",
    heading: "Wins to Seed Map",
    containerClass: "basketball-wins-breakdown",
    watermark: true,
    render: (ctx) => (
      <BasketballTeamWinsBreakdown
        schedule={ctx.teamData.schedule}
        teamName={ctx.teamInfo.team_name}
        conference={ctx.teamInfo.conference}
        primaryColor={ctx.teamData.team_info.primary_color}
        secondaryColor={ctx.teamInfo.secondary_color}
        logoUrl={ctx.teamInfo.logo_url}
      />
    ),
  },
  {
    key: "win-values",
    heading: "Win Values Over Time",
    containerClass: "basketball-win-values",
    render: (ctx) => (
      <TeamWinValues
        schedule={ctx.teamData.schedule}
        logoUrl={ctx.teamInfo.logo_url}
        primaryColor={ctx.teamInfo.primary_color}
        secondaryColor={ctx.teamInfo.secondary_color}
        season={ctx.displaySeason}
      />
    ),
  },
  {
    key: "seed-projections",
    heading: "NCAA Tournament Seed Projections",
    containerClass: "basketball-seed-projections",
    render: (ctx) => (
      <TeamSeedProjections
        winSeedCounts={ctx.teamData.team_info.win_seed_counts}
        logoUrl={ctx.teamInfo.logo_url}
      />
    ),
  },
  {
    key: "rank-history",
    heading: "Rating History",
    containerClass: "basketball-rank-history",
    render: (ctx) => (
      <BasketballTeamRankHistory
        {...historySectionProps(ctx)}
        logoUrl={ctx.teamInfo.logo_url}
      />
    ),
  },
  {
    key: "win-history",
    heading: "Projected Wins History",
    containerClass: "basketball-win-history",
    render: (ctx) => (
      <BasketballTeamWinHistory
        {...historySectionProps(ctx)}
        logoUrl={ctx.teamInfo.logo_url}
      />
    ),
  },
  {
    key: "standings-history",
    heading: "Projected Standings History",
    containerClass: "basketball-standings-history",
    render: (ctx) => (
      <BasketballTeamStandingsHistory
        {...historySectionProps(ctx)}
        logoUrl={ctx.teamInfo.logo_url}
      />
    ),
  },
  {
    key: "first-place-history",
    heading: "First Place Probability History",
    containerClass: "basketball-first-place-history",
    render: (ctx) => (
      <BasketballTeamFirstPlaceHistory
        {...historySectionProps(ctx)}
        logoUrl={ctx.teamInfo.logo_url}
      />
    ),
  },
  {
    key: "tournament-bid-history",
    heading: "NCAA Tournament Bid History",
    containerClass: "basketball-tournament-bid-history",
    render: (ctx) => (
      <BasketballTeamTournamentBidHistory {...historySectionProps(ctx)} />
    ),
  },
  {
    key: "tournament-progression-history",
    heading: "NCAA Tournament Progression History",
    containerClass: "basketball-tournament-progression-history",
    render: (ctx) => (
      <BasketballTeamTournamentProgressionHistory
        {...historySectionProps(ctx)}
      />
    ),
  },
];

const BASKETBALL_TEAM: TeamContentConfig<TeamData, History> = {
  sport: "basketball",
  pageId: "basketball-team",
  useTeamData: useBasketballTeamData,
  useHistoryData: useBasketballTeamAllHistory,
  computeSeason,
  getTeamInfo: (data) => data.team_info,
  getRankLabel: (info) => {
    const rank = (info as { kenpom_rank?: number }).kenpom_rank;
    return rank && rank !== 999 ? `#${rank}` : "";
  },
  bidLabel: "NCAA Bid",
  getBidDisplay: (info) => {
    const pct = (info as { tournament_bid_pct?: number }).tournament_bid_pct;
    if (pct === null || pct === undefined) return "-";
    return `${Math.round(pct)}%`;
  },
  sections: SECTIONS,
  mobileOrder: [
    "schedule",
    "schedule-chart",
    "win-values",
    "schedule-difficulty",
    "wins-to-seed-map",
    "screenshot",
    "seed-projections",
    "rank-history",
    "win-history",
    "standings-history",
    "first-place-history",
    "tournament-bid-history",
    "tournament-progression-history",
  ],
  desktopLeft: [
    "schedule",
    "schedule-chart",
    "schedule-difficulty",
    "wins-to-seed-map",
  ],
  desktopRight: [
    "win-values",
    "seed-projections",
    "rank-history",
    "win-history",
    "standings-history",
    "first-place-history",
    "tournament-bid-history",
    "tournament-progression-history",
  ],
};

export default function BasketballTeamContent(props: {
  params: { teamname: string };
  season?: string;
  initialData?: TeamData;
}) {
  return <TeamContent config={BASKETBALL_TEAM} {...props} />;
}
