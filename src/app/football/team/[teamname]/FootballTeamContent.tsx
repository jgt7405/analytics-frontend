"use client";

// Football team page = shared TeamContent + football config (11 sections).
// Serves both the current page and the [season] archive page.

import TeamContent, {
  TeamContentConfig,
  TeamSection,
} from "@/components/features/shared/TeamContent";
import FootballTeamSchedule from "@/components/features/football/FootballTeamSchedule";
import FootballTeamScheduleChart from "@/components/features/football/FootballTeamScheduleChart";
import FootballTeamScheduleDifficulty from "@/components/features/football/FootballTeamScheduleDifficulty";
import FootballTeamSeedProjections from "@/components/features/football/FootballTeamSeedProjections";
import FootballTeamWinValues from "@/components/features/football/FootballTeamWinValues";
import { useFootballTeam, FootballTeamData } from "@/hooks/useFootballTeam";
import { useFootballTeamAllHistory } from "@/hooks/useFootballTeamAllHistory";
import dynamic from "next/dynamic";

const ChartSkeleton = () => (
  <div className="h-64 bg-gray-100 dark:bg-slate-700 animate-pulse rounded-lg" />
);

const FootballTeamRankHistory = dynamic(
  () => import("@/components/features/football/FootballTeamRankHistory"),
  { loading: ChartSkeleton },
);
const FootballTeamWinHistory = dynamic(
  () => import("@/components/features/football/FootballTeamWinHistory"),
  { loading: ChartSkeleton },
);
const FootballTeamStandingsHistory = dynamic(
  () => import("@/components/features/football/FootballTeamStandingsHistory"),
  { loading: ChartSkeleton },
);
const FootballTeamFirstPlaceHistory = dynamic(
  () => import("@/components/features/football/FootballTeamFirstPlaceHistory"),
  { loading: ChartSkeleton },
);
const FootballTeamCFPBidHistory = dynamic(
  () => import("@/components/features/football/FootballTeamCFPBidHistory"),
  { loading: ChartSkeleton },
);
const FootballTeamCFPProgressionHistory = dynamic(
  () =>
    import("@/components/features/football/FootballTeamCFPProgressionHistory"),
  { loading: ChartSkeleton },
);

type History = ReturnType<typeof useFootballTeamAllHistory>["data"];

// Football season label from latest history date; data past 12/15 belongs
// to the next season.
const computeSeason = (historyData: History | null | undefined): string => {
  if (historyData?.confWins?.data && historyData.confWins.data.length > 0) {
    const maxDate = historyData.confWins.data.reduce(
      (max: string, item: { date: string }) =>
        item.date > max ? item.date : max,
      historyData.confWins.data[0].date,
    );
    const [dataYear, dataMonth, dataDay] = maxDate.split("-").map(Number);
    if (dataMonth > 12 || (dataMonth === 12 && dataDay > 15)) {
      return `${dataYear + 1}-${(dataYear + 2).toString().slice(-2)}`;
    }
    if (dataMonth >= 8 || dataMonth <= 3) {
      return `${dataYear}-${(dataYear + 1).toString().slice(-2)}`;
    }
  }
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  return month < 3 ? `${year - 1}-${year}` : `${year}-${year + 1}`;
};

interface ApiRecordSeedCount {
  Record: string;
  Seed: string | number;
  Percentage: number;
  Playoff_Status: string;
  Count: number;
  Conf_Champ_Pct?: number;
  At_Large_Pct?: number;
}

const transformRecordSeedCounts = (apiData: ApiRecordSeedCount[]) => {
  if (!Array.isArray(apiData) || apiData.length === 0) return [];
  return apiData.map((item) => ({
    Record: item.Record,
    Seed: item.Seed,
    Playoff_Status: item.Playoff_Status,
    Count: item.Count,
    Percentage: item.Percentage,
    Conf_Champ_Pct: item.Conf_Champ_Pct || 0,
    At_Large_Pct: item.At_Large_Pct || 0,
  }));
};

const historySectionProps = (ctx: {
  teamInfo: {
    team_name: string;
    primary_color?: string;
    secondary_color?: string;
  };
  displaySeason: string;
}) => ({
  teamName: ctx.teamInfo.team_name,
  primaryColor: ctx.teamInfo.primary_color,
  secondaryColor: ctx.teamInfo.secondary_color,
  season: ctx.displaySeason,
});

const SECTIONS: TeamSection<FootballTeamData>[] = [
  {
    key: "schedule",
    heading: "Team Schedule",
    containerClass: "football-team-schedule",
    watermark: true,
    scheduleFrame: true,
    render: (ctx) => (
      <FootballTeamSchedule
        schedule={ctx.teamData.schedule}
        navigateToTeam={ctx.navigateToTeam}
      />
    ),
  },
  {
    key: "schedule-chart",
    heading: "Schedule Chart",
    containerClass: "football-schedule-chart",
    watermark: true,
    render: (ctx) => (
      <FootballTeamScheduleChart
        schedule={ctx.teamData.schedule}
        navigateToTeam={ctx.navigateToTeam}
      />
    ),
  },
  {
    key: "schedule-difficulty",
    heading: "Schedule Difficulty",
    containerClass: "football-schedule-difficulty",
    render: (ctx) => (
      <FootballTeamScheduleDifficulty
        schedule={ctx.teamData.schedule}
        allScheduleData={ctx.teamData.all_schedule_data || []}
        teamConference={ctx.teamInfo.conference}
        logoUrl={ctx.teamInfo.logo_url}
        teamColor={ctx.teamInfo.primary_color}
      />
    ),
  },
  {
    key: "win-values",
    heading: "Win Values Over Time",
    containerClass: "football-win-values",
    render: (ctx) => (
      <FootballTeamWinValues
        schedule={ctx.teamData.schedule}
        logoUrl={ctx.teamInfo.logo_url}
        season={ctx.displaySeason}
      />
    ),
  },
  {
    key: "seed-projections",
    heading: "CFP Seed Projections",
    containerClass: "football-seed-projections",
    render: (ctx) => (
      <FootballTeamSeedProjections
        recordSeedCounts={transformRecordSeedCounts(
          ctx.teamData.team_info.record_seed_counts || [],
        )}
        logoUrl={ctx.teamInfo.logo_url}
      />
    ),
  },
  {
    key: "rank-history",
    heading: "Rating Rank History",
    containerClass: "football-rank-history",
    render: (ctx) => (
      <FootballTeamRankHistory
        {...historySectionProps(ctx)}
        logoUrl={ctx.teamInfo.logo_url}
      />
    ),
  },
  {
    key: "win-history",
    heading: "Projected Wins History",
    containerClass: "football-win-history",
    render: (ctx) => (
      <FootballTeamWinHistory
        {...historySectionProps(ctx)}
        logoUrl={ctx.teamInfo.logo_url}
      />
    ),
  },
  {
    key: "standings-history",
    heading: "Projected Standings History",
    containerClass: "football-standings-history",
    render: (ctx) => (
      <FootballTeamStandingsHistory
        {...historySectionProps(ctx)}
        logoUrl={ctx.teamInfo.logo_url}
      />
    ),
  },
  {
    key: "first-place-history",
    heading: "First Place Probability History",
    containerClass: "football-first-place-history",
    render: (ctx) => (
      <FootballTeamFirstPlaceHistory
        {...historySectionProps(ctx)}
        logoUrl={ctx.teamInfo.logo_url}
      />
    ),
  },
  {
    key: "cfp-bid-history",
    heading: "CFP Bid History",
    containerClass: "football-cfp-bid-history",
    render: (ctx) => (
      <FootballTeamCFPBidHistory {...historySectionProps(ctx)} />
    ),
  },
  {
    key: "cfp-progression-history",
    heading: "CFP Progression History",
    containerClass: "football-cfp-progression-history",
    render: (ctx) => (
      <FootballTeamCFPProgressionHistory {...historySectionProps(ctx)} />
    ),
  },
];

const FOOTBALL_TEAM: TeamContentConfig<FootballTeamData, History> = {
  sport: "football",
  pageId: "football-team",
  useTeamData: useFootballTeam,
  useHistoryData: useFootballTeamAllHistory,
  computeSeason,
  getTeamInfo: (data) => data.team_info,
  getRankLabel: (info) => {
    const rank = (info as { sagarin_rank?: number }).sagarin_rank;
    return rank && rank !== 999 ? `#${rank}` : "";
  },
  bidLabel: "CFP Bid",
  getBidDisplay: (info) => {
    const pct = (info as { cfp_bid_pct?: number }).cfp_bid_pct;
    if (pct === null || pct === undefined) return "-";
    return `${Math.round(pct)}%`;
  },
  sections: SECTIONS,
  mobileOrder: [
    "schedule",
    "schedule-chart",
    "win-values",
    "schedule-difficulty",
    "screenshot",
    "seed-projections",
    "rank-history",
    "win-history",
    "standings-history",
    "first-place-history",
    "cfp-bid-history",
    "cfp-progression-history",
  ],
  desktopLeft: ["schedule", "schedule-chart", "schedule-difficulty"],
  desktopRight: [
    "win-values",
    "seed-projections",
    "rank-history",
    "win-history",
    "standings-history",
    "first-place-history",
    "cfp-bid-history",
    "cfp-progression-history",
  ],
};

export default function FootballTeamContent(props: {
  params: { teamname: string };
  season?: string;
  initialData?: FootballTeamData;
}) {
  return <TeamContent config={FOOTBALL_TEAM} {...props} />;
}
