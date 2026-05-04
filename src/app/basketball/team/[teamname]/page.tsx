"use client";

import ScreenshotModal from "@/components/common/ScreenshotModal";
import BasketballTeamScheduleChart from "@/components/features/basketball/BasketballTeamScheduleChart";
import BasketballTeamScheduleDifficulty from "@/components/features/basketball/BasketballTeamScheduleDifficulty";
import BasketballTeamWinsBreakdown from "@/components/features/basketball/BasketballTeamWinsBreakdown";
import TeamSchedule from "@/components/features/basketball/TeamSchedule";
import TeamSeedProjections from "@/components/features/basketball/TeamSeedProjections";
import TeamWinValues from "@/components/features/basketball/TeamWinValues";
import dynamic from "next/dynamic";

const ChartSkeleton = () => <div className="h-64 bg-gray-100 dark:bg-slate-700 animate-pulse rounded-lg" />;

const BasketballTeamRankHistory = dynamic(
  () => import("@/components/features/basketball/BasketballTeamRankHistory"),
  { loading: ChartSkeleton },
);
const BasketballTeamWinHistory = dynamic(
  () => import("@/components/features/basketball/BasketballTeamWinHistory"),
  { loading: ChartSkeleton },
);
const BasketballTeamStandingsHistory = dynamic(
  () => import("@/components/features/basketball/BasketballTeamStandingsHistory"),
  { loading: ChartSkeleton },
);
const BasketballTeamFirstPlaceHistory = dynamic(
  () => import("@/components/features/basketball/BasketballTeamFirstPlaceHistory"),
  { loading: ChartSkeleton },
);
const BasketballTeamTournamentBidHistory = dynamic(
  () => import("@/components/features/basketball/BasketballTeamTournamentBidHistory"),
  { loading: ChartSkeleton },
);
const BasketballTeamTournamentProgressionHistory = dynamic(
  () => import("@/components/features/basketball/BasketballTeamTournamentProgressionHistory"),
  { loading: ChartSkeleton },
);
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import TeamLogo from "@/components/ui/TeamLogo";
import { useBasketballTeamAllHistory } from "@/hooks/useBasketballTeamAllHistory";
import { useBasketballTeamData } from "@/hooks/useBasketballTeamData";
import { useResponsive } from "@/hooks/useResponsive";
import { useMonitoring } from "@/lib/unified-monitoring";
import { Download } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";

export default function BasketballTeamPage({
  params,
}: {
  params: { teamname: string };
}) {
  const { trackEvent } = useMonitoring();
  const { isMobile } = useResponsive();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isScreenshotModalOpen, setIsScreenshotModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const teamname = decodeURIComponent(params.teamname);

  const { data: teamData, isLoading, error } = useBasketballTeamData(teamname);
  const { data: historyData } = useBasketballTeamAllHistory(teamname);

  const currentSeason = useMemo(() => {
    if (historyData?.confWins?.data && historyData.confWins.data.length > 0) {
      const maxDate = historyData.confWins.data.reduce((max: string, item) =>
        item.date > max ? item.date : max,
        historyData.confWins.data[0].date
      );
      const [dataYear, dataMonth] = maxDate.split('-').map(Number);

      if (dataMonth >= 4 && dataMonth <= 9) {
        return `${dataYear - 1}-${dataYear.toString().slice(-2)}`;
      }
      if (dataMonth >= 1 && dataMonth <= 3) {
        return `${dataYear - 1}-${dataYear.toString().slice(-2)}`;
      }
      if (dataMonth >= 10) {
        return `${dataYear}-${(dataYear + 1).toString().slice(-2)}`;
      }
    }

    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    return month < 10 ? `${year - 1}-${year.toString().slice(-2)}` : `${year}-${(year + 1).toString().slice(-2)}`;
  }, [historyData]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      trackEvent({
        name: "page_view",
        properties: { page: "basketball-team", team: teamname },
      });
      if (teamData?.team_info?.conference) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("teamConf", encodeURIComponent(teamData.team_info.conference));
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, "", newUrl);
      }
    }
  }, [teamname, mounted, teamData?.team_info?.conference, trackEvent, searchParams]);

  const navigateToTeam = useCallback((targetTeam: string) => {
    if (targetTeam && targetTeam !== teamname) {
      router.push(`/basketball/team/${encodeURIComponent(targetTeam)}`);
    }
  }, [teamname, router]);

  const formatTournamentPct = (value?: number) => {
    if (value === null || value === undefined) return "-";
    return `${Math.round(value)}%`;
  };

  // Screenshot options
  const screenshotOptions = [
    {
      id: "schedule",
      label: "Team Schedule",
      selector: ".basketball-team-schedule",
    },
    {
      id: "schedule-chart",
      label: "Schedule Chart",
      selector: ".basketball-schedule-chart",
    },
    {
      id: "schedule-difficulty",
      label: "Schedule Difficulty",
      selector: ".basketball-schedule-difficulty",
    },
    {
      id: "wins-to-seed-map",
      label: "Wins to Seed Map",
      selector: ".basketball-wins-breakdown",
    },
    {
      id: "win-values",
      label: "Win Values Over Time",
      selector: ".basketball-win-values",
    },
    {
      id: "seed-projections",
      label: "NCAA Tournament Seed Projections",
      selector: ".basketball-seed-projections",
    },
    {
      id: "rank-history",
      label: "Rating History",
      selector: ".basketball-rank-history",
    },
    {
      id: "win-history",
      label: "Projected Wins History",
      selector: ".basketball-win-history",
    },
    {
      id: "standings-history",
      label: "Projected Standings History",
      selector: ".basketball-standings-history",
    },
    {
      id: "first-place-history",
      label: "First Place Probability History",
      selector: ".basketball-first-place-history",
    },
    {
      id: "tournament-bid-history",
      label: "NCAA Tournament Bid History",
      selector: ".basketball-tournament-bid-history",
    },
    {
      id: "tournament-progression-history",
      label: "NCAA Tournament Progression History",
      selector: ".basketball-tournament-progression-history",
    },
  ];

  if (!mounted || isLoading || !teamData) {
    return (
      <div className="container mx-auto px-4 pt-6 pb-2 md:pt-6 md:pb-3">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" message="Loading team data..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorBoundary level="page">
        <div className="container mx-auto px-4 pt-6 pb-2 md:pt-6 md:pb-3">
          <ErrorMessage
            message={error.message || "Failed to load team data"}
            onRetry={() => window.location.reload()}
            retryLabel="Reload Team Data"
          />
        </div>
      </ErrorBoundary>
    );
  }

  const { team_info, schedule } = teamData;

  // ✅ FIXED: Replace both spaces AND hyphens with underscores
  // Big 12 → Big_12
  // Mid-American → Mid_American
  const formattedConfName = team_info.conference
    .replace(/ /g, "_")
    .replace(/-/g, "_");

  // Use API-provided conf_logo_url if available, otherwise construct it
  const conferenceLogoUrl =
    team_info.conf_logo_url || `/images/conf_logos/${formattedConfName}.png`;

  return (
    <ErrorBoundary level="page">
      <div className="container mx-auto px-4 pt-6 pb-2 md:pt-6 md:pb-3">
        <div className="space-y-3">
          {isMobile ? (
            // MOBILE LAYOUT
            <div className="space-y-2">
              {/* Mobile Header */}
              <div className="bg-white dark:bg-slate-800 rounded-lg px-2 py-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <TeamLogo
                      logoUrl={team_info.logo_url}
                      teamName={team_info.team_name}
                      size={40}
                    />
                    <div className="flex flex-col justify-center">
                      <h1
                        className="text-xl font-semibold leading-tight -mb-1"
                        style={{ color: team_info.primary_color || "#1f2937" }}
                      >
                        {team_info.team_name}{" "}
                        {team_info.kenpom_rank && team_info.kenpom_rank !== 999
                          ? `#${team_info.kenpom_rank}`
                          : ""}
                      </h1>
                      <p className="text-gray-600 dark:text-gray-300 text-sm leading-tight -mt-0">
                        Team Page
                      </p>
                    </div>
                  </div>

                  <div
                    className="flex flex-col items-center"
                    title={team_info.conference}
                  >
                    <Image
                      src={conferenceLogoUrl}
                      alt={`${team_info.conference} logo`}
                      width={32}
                      height={32}
                      className="h-8 w-auto object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                </div>

                {/* Mobile Stats */}
                <div className="flex gap-2 -mt-2 mx-0">
                  <div
                    className="bg-white p-3 rounded-lg flex-1"
                    className="border border-gray-300 dark:border-gray-700"
                  >
                    <div className="flex gap-3">
                      <div className="text-center flex-1">
                        <div className="text-base font-semibold text-gray-700 dark:text-gray-200">
                          {team_info.overall_record}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-300 italic">
                          Overall
                        </div>
                      </div>
                      <div className="text-center flex-1">
                        <div className="text-base font-semibold text-gray-700 dark:text-gray-200">
                          {team_info.conference_record}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-300 italic">
                          Conference
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className="bg-white p-3 rounded-lg flex-1"
                    className="border border-gray-300 dark:border-gray-700"
                  >
                    <div className="flex gap-3">
                      <div className="text-center flex-1">
                        <div className="text-base font-semibold text-gray-700 dark:text-gray-200">
                          {formatTournamentPct(team_info.tournament_bid_pct)}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-300 italic">
                          NCAA Bid
                        </div>
                      </div>
                      <div className="text-center flex-1">
                        <div className="text-base font-semibold text-gray-700 dark:text-gray-200">
                          {team_info.average_seed
                            ? team_info.average_seed.toFixed(1)
                            : "-"}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-300 italic">
                          Avg Seed
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Schedule */}
              <div
                className="bg-white dark:bg-slate-800 rounded-lg mx-2 relative basketball-team-schedule"
                className="border border-gray-300 dark:border-gray-700"
              >
                <div className="px-2 py-1 border-b border-gray-200 -mt-4 relative">
                  <h2 className="text-base font-semibold">Team Schedule</h2>
                  {team_info.logo_url && (
                    <div
                      className="absolute"
                      style={{
                        top: "20px",
                        right: "5px",
                        width: "24px",
                        height: "24px",
                      }}
                    >
                      <Image
                        src={team_info.logo_url}
                        alt={`${team_info.team_name} logo`}
                        width={24}
                        height={24}
                        className="object-contain opacity-80"
                      />
                    </div>
                  )}
                </div>
                <div className="border-b border-gray-200"></div>
                <div className="px-1 pb-1 -mt-8 flex justify-center items-center min-h-[300px]">
                  <TeamSchedule
                    schedule={schedule}
                    teamName={team_info.team_name}
                    navigateToTeam={navigateToTeam}
                  />
                </div>
              </div>

              {/* Mobile Schedule Chart */}
              <div
                className="bg-white dark:bg-slate-800 rounded-lg p-3 relative basketball-schedule-chart"
                className="border border-gray-300 dark:border-gray-700"
              >
                <div className="relative">
                  <h2 className="text-base font-semibold mb-1 -mt-2">
                    Schedule Chart
                  </h2>
                  {team_info.logo_url && (
                    <div
                      className="absolute"
                      style={{
                        top: "0px",
                        right: "-5px",
                        width: "24px",
                        height: "24px",
                      }}
                    >
                      <Image
                        src={team_info.logo_url}
                        alt={`${team_info.team_name} logo`}
                        width={24}
                        height={24}
                        className="object-contain opacity-80"
                      />
                    </div>
                  )}
                </div>
                <BasketballTeamScheduleChart
                  schedule={schedule}
                  navigateToTeam={navigateToTeam}
                  teamName={team_info.team_name}
                />
              </div>

              {/* Mobile Win Values */}
              <div
                className="bg-white dark:bg-slate-800 rounded-lg p-3 basketball-win-values"
                className="border border-gray-300 dark:border-gray-700"
              >
                <h2 className="text-base font-semibold mb-1 -mt-2">
                  Win Values Over Time
                </h2>
                <TeamWinValues
                  schedule={schedule}
                  logoUrl={team_info.logo_url}
                  primaryColor={team_info.primary_color}
                  secondaryColor={team_info.secondary_color}
                  season={currentSeason}
                />
              </div>

              {/* Mobile Schedule Difficulty */}
              {teamData.all_schedule_data && (
                <div
                  className="bg-white dark:bg-slate-800 rounded-lg p-3 basketball-schedule-difficulty"
                  className="border border-gray-300 dark:border-gray-700"
                >
                  <h2 className="text-base font-semibold mb-1 -mt-2">
                    Schedule Difficulty
                  </h2>
                  <BasketballTeamScheduleDifficulty
                    schedule={schedule}
                    allScheduleData={teamData.all_schedule_data}
                    teamConference={team_info.conference}
                    logoUrl={team_info.logo_url}
                    teamColor={team_info.primary_color}
                  />
                </div>
              )}

              {/* Mobile Wins Breakdown - NEW COMPONENT */}
              <div
                className="bg-white dark:bg-slate-800 rounded-lg p-3 basketball-wins-breakdown relative"
                className="border border-gray-300 dark:border-gray-700"
              >
                <div className="relative">
                  <h2 className="text-base font-semibold mb-1 -mt-2">
                    Wins to Seed Map
                  </h2>
                  {team_info.logo_url && (
                    <div
                      className="absolute"
                      style={{
                        top: "0px",
                        right: "-5px",
                        width: "24px",
                        height: "24px",
                      }}
                    >
                      <Image
                        src={team_info.logo_url}
                        alt={`${team_info.team_name} logo`}
                        width={24}
                        height={24}
                        className="object-contain opacity-80"
                      />
                    </div>
                  )}
                </div>
                <BasketballTeamWinsBreakdown
                  schedule={schedule}
                  teamName={team_info.team_name}
                  conference={team_info.conference}
                  primaryColor={team_info.primary_color}
                  secondaryColor={team_info.secondary_color}
                  logoUrl={team_info.logo_url}
                />
              </div>

              {/* Screenshot Button - Mobile */}
              <div className="flex justify-end px-2 mt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsScreenshotModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-xs bg-gray-700 text-white rounded-md hover:bg-gray-800 transition-colors border border-gray-700"
                >
                  <Download className="h-3 w-3" />
                  Download
                </button>
              </div>

              {/* Mobile Seed Projections */}
              <div
                className="bg-white dark:bg-slate-800 rounded-lg p-3 basketball-seed-projections"
                className="border border-gray-300 dark:border-gray-700"
              >
                <h2 className="text-base font-semibold mb-1 -mt-2">
                  NCAA Tournament Seed Projections
                </h2>
                <TeamSeedProjections
                  winSeedCounts={team_info.win_seed_counts}
                  logoUrl={team_info.logo_url}
                />
              </div>

              {/* Mobile History Components */}
              <div
                className="bg-white dark:bg-slate-800 rounded-lg p-3 basketball-rank-history"
                className="border border-gray-300 dark:border-gray-700"
              >
                <h2 className="text-base font-semibold mb-1 -mt-2">
                  Rating History
                </h2>
                <BasketballTeamRankHistory
                  teamName={team_info.team_name}
                  primaryColor={team_info.primary_color}
                  secondaryColor={team_info.secondary_color}
                  logoUrl={team_info.logo_url}
                  season={currentSeason}
                />
              </div>

              <div
                className="bg-white dark:bg-slate-800 rounded-lg p-3 basketball-win-history"
                className="border border-gray-300 dark:border-gray-700"
              >
                <h2 className="text-base font-semibold mb-1 -mt-2">
                  Projected Wins History
                </h2>
                <BasketballTeamWinHistory
                  teamName={team_info.team_name}
                  primaryColor={team_info.primary_color}
                  secondaryColor={team_info.secondary_color}
                  logoUrl={team_info.logo_url}
                  season={currentSeason}
                />
              </div>

              <div
                className="bg-white dark:bg-slate-800 rounded-lg p-3 basketball-standings-history"
                className="border border-gray-300 dark:border-gray-700"
              >
                <h2 className="text-base font-semibold mb-1 -mt-2">
                  Projected Standings History
                </h2>
                <BasketballTeamStandingsHistory
                  teamName={team_info.team_name}
                  primaryColor={team_info.primary_color}
                  secondaryColor={team_info.secondary_color}
                  logoUrl={team_info.logo_url}
                  season={currentSeason}
                />
              </div>

              <div
                className="bg-white dark:bg-slate-800 rounded-lg p-3 basketball-first-place-history"
                className="border border-gray-300 dark:border-gray-700"
              >
                <h2 className="text-base font-semibold mb-1 -mt-2">
                  First Place Probability History
                </h2>
                <BasketballTeamFirstPlaceHistory
                  teamName={team_info.team_name}
                  primaryColor={team_info.primary_color}
                  secondaryColor={team_info.secondary_color}
                  logoUrl={team_info.logo_url}
                  season={currentSeason}
                />
              </div>

              <div
                className="bg-white dark:bg-slate-800 rounded-lg p-3 basketball-tournament-bid-history"
                className="border border-gray-300 dark:border-gray-700"
              >
                <h2 className="text-base font-semibold mb-1 -mt-2">
                  NCAA Tournament Bid History
                </h2>
                <BasketballTeamTournamentBidHistory
                  teamName={team_info.team_name}
                  primaryColor={team_info.primary_color}
                  secondaryColor={team_info.secondary_color}
                  season={currentSeason}
                />
              </div>

              <div
                className="bg-white dark:bg-slate-800 rounded-lg p-3 basketball-tournament-progression-history"
                className="border border-gray-300 dark:border-gray-700"
              >
                <h2 className="text-base font-semibold mb-1 -mt-2">
                  NCAA Tournament Progression History
                </h2>
                <BasketballTeamTournamentProgressionHistory
                  teamName={team_info.team_name}
                  primaryColor={team_info.primary_color}
                  secondaryColor={team_info.secondary_color}
                  season={currentSeason}
                />
              </div>
            </div>
          ) : (
            // DESKTOP LAYOUT
            <div className="w-full">
              {/* Desktop Header */}
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <TeamLogo
                      logoUrl={team_info.logo_url}
                      teamName={team_info.team_name}
                      size={64}
                    />
                    <div className="flex flex-col justify-center">
                      <h1
                        className="text-2xl font-semibold leading-tight -mb-1"
                        style={{ color: team_info.primary_color || "#1f2937" }}
                      >
                        {team_info.team_name}{" "}
                        {team_info.kenpom_rank && team_info.kenpom_rank !== 999
                          ? `#${team_info.kenpom_rank}`
                          : ""}
                      </h1>
                      <p className="text-gray-600 dark:text-gray-300 leading-tight -mt-0">
                        Team Page
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div
                      className="bg-white p-4 rounded-lg"
                      className="border border-gray-300 dark:border-gray-700"
                    >
                      <div className="flex gap-4">
                        <div className="text-center">
                          <div className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                            {team_info.overall_record}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300 italic">
                            Overall
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                            {team_info.conference_record}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300 italic">
                            Conference
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      className="bg-white p-4 rounded-lg"
                      className="border border-gray-300 dark:border-gray-700"
                    >
                      <div className="flex gap-4">
                        <div className="text-center">
                          <div className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                            {formatTournamentPct(team_info.tournament_bid_pct)}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300 italic">
                            NCAA Bid
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                            {team_info.average_seed
                              ? team_info.average_seed.toFixed(1)
                              : "-"}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300 italic">
                            Avg Seed
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className="flex flex-col items-center ml-4"
                    title={team_info.conference}
                  >
                    <Image
                      src={conferenceLogoUrl}
                      alt={`${team_info.conference} logo`}
                      width={48}
                      height={48}
                      className="h-12 w-auto object-contain"
                      unoptimized
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Desktop Content Grid */}
              <div className="grid gap-3 grid-cols-1 lg:grid-cols-3">
                {/* Left Column - Schedules */}
                <div className="space-y-3">
                  <div
                    className="bg-white dark:bg-slate-800 rounded-lg relative basketball-team-schedule"
                    style={{ minWidth: "350px", border: "1px solid #d1d5db" }}
                  >
                    <div className="pt-0 px-3 pb-3 border-b border-gray-200 -mt-2 relative">
                      <h2 className="text-lg font-semibold">Team Schedule</h2>
                      {team_info.logo_url && (
                        <div
                          className="absolute"
                          style={{
                            top: "-5px",
                            right: "5px",
                            width: "32px",
                            height: "32px",
                          }}
                        >
                          <Image
                            src={team_info.logo_url}
                            alt={`${team_info.team_name} logo`}
                            width={32}
                            height={32}
                            className="object-contain opacity-80"
                          />
                        </div>
                      )}
                    </div>
                    <div className="border-b border-gray-200"></div>
                    <div className="pt-0 px-3 pb-3 flex justify-center items-center min-h-[300px] -mt-6">
                      <TeamSchedule
                        schedule={schedule}
                        teamName={team_info.team_name}
                        navigateToTeam={navigateToTeam}
                      />
                    </div>
                  </div>

                  <div
                    className="bg-white dark:bg-slate-800 rounded-lg p-3 relative basketball-schedule-chart"
                    className="border border-gray-300 dark:border-gray-700"
                  >
                    <div className="relative">
                      <h2 className="text-lg font-semibold mb-1 -mt-2">
                        Schedule Chart
                      </h2>
                      {team_info.logo_url && (
                        <div
                          className="absolute"
                          style={{
                            top: "0px",
                            right: "-5px",
                            width: "32px",
                            height: "32px",
                          }}
                        >
                          <Image
                            src={team_info.logo_url}
                            alt={`${team_info.team_name} logo`}
                            width={32}
                            height={32}
                            className="object-contain opacity-80"
                          />
                        </div>
                      )}
                    </div>
                    <BasketballTeamScheduleChart
                      schedule={schedule}
                      navigateToTeam={navigateToTeam}
                      teamName={team_info.team_name}
                    />
                  </div>

                  {teamData.all_schedule_data && (
                    <div
                      className="bg-white dark:bg-slate-800 rounded-lg p-3 basketball-schedule-difficulty"
                      className="border border-gray-300 dark:border-gray-700"
                    >
                      <h2 className="text-lg font-semibold mb-1 -mt-2">
                        Schedule Difficulty
                      </h2>
                      <BasketballTeamScheduleDifficulty
                        schedule={schedule}
                        allScheduleData={teamData.all_schedule_data}
                        teamConference={team_info.conference}
                        logoUrl={team_info.logo_url}
                        teamColor={team_info.primary_color}
                      />
                    </div>
                  )}

                  {/* Wins Breakdown - NEW COMPONENT */}
                  <div
                    className="bg-white dark:bg-slate-800 rounded-lg p-3 basketball-wins-breakdown relative"
                    className="border border-gray-300 dark:border-gray-700"
                  >
                    <div className="relative">
                      <h2 className="text-lg font-semibold mb-1 -mt-2">
                        Wins to Seed Map
                      </h2>
                      {team_info.logo_url && (
                        <div
                          className="absolute"
                          style={{
                            top: "0px",
                            right: "-5px",
                            width: "32px",
                            height: "32px",
                          }}
                        >
                          <Image
                            src={team_info.logo_url}
                            alt={`${team_info.team_name} logo`}
                            width={32}
                            height={32}
                            className="object-contain opacity-80"
                          />
                        </div>
                      )}
                    </div>
                    <BasketballTeamWinsBreakdown
                      schedule={schedule}
                      teamName={team_info.team_name}
                      conference={team_info.conference}
                      primaryColor={team_info.primary_color}
                      secondaryColor={team_info.secondary_color}
                      logoUrl={team_info.logo_url}
                    />
                  </div>

                  {/* Screenshot Button - Desktop */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => setIsScreenshotModalOpen(true)}
                      className="flex items-center gap-2 px-3 py-2 text-xs bg-gray-700 text-white rounded-md hover:bg-gray-800 transition-colors border border-gray-700"
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </button>
                  </div>
                </div>

                {/* Right Column - Charts */}
                <div className="space-y-3 col-span-2">
                  <div
                    className="bg-white dark:bg-slate-800 rounded-lg p-3 basketball-win-values"
                    className="border border-gray-300 dark:border-gray-700"
                  >
                    <h2 className="text-lg font-semibold mb-1 -mt-2">
                      Win Values Over Time
                    </h2>
                    <TeamWinValues
                      schedule={schedule}
                      logoUrl={team_info.logo_url}
                      primaryColor={team_info.primary_color}
                      secondaryColor={team_info.secondary_color}
                      season={currentSeason}
                    />
                  </div>

                  <div
                    className="bg-white dark:bg-slate-800 rounded-lg p-3 basketball-seed-projections"
                    className="border border-gray-300 dark:border-gray-700"
                  >
                    <h2 className="text-lg font-semibold mb-1 -mt-2">
                      NCAA Tournament Seed Projections
                    </h2>
                    <TeamSeedProjections
                      winSeedCounts={team_info.win_seed_counts}
                      logoUrl={team_info.logo_url}
                    />
                  </div>

                  <div
                    className="bg-white dark:bg-slate-800 rounded-lg p-3 basketball-rank-history"
                    className="border border-gray-300 dark:border-gray-700"
                  >
                    <h2 className="text-lg font-semibold mb-1 -mt-2">
                      Rating History
                    </h2>
                    <BasketballTeamRankHistory
                      teamName={team_info.team_name}
                      primaryColor={team_info.primary_color}
                      secondaryColor={team_info.secondary_color}
                      logoUrl={team_info.logo_url}
                      season={currentSeason}
                    />
                  </div>

                  <div
                    className="bg-white dark:bg-slate-800 rounded-lg p-3 basketball-win-history"
                    className="border border-gray-300 dark:border-gray-700"
                  >
                    <h2 className="text-lg font-semibold mb-1 -mt-2">
                      Projected Wins History
                    </h2>
                    <BasketballTeamWinHistory
                      teamName={team_info.team_name}
                      primaryColor={team_info.primary_color}
                      secondaryColor={team_info.secondary_color}
                      logoUrl={team_info.logo_url}
                      season={currentSeason}
                    />
                  </div>

                  <div
                    className="bg-white dark:bg-slate-800 rounded-lg p-3 basketball-standings-history"
                    className="border border-gray-300 dark:border-gray-700"
                  >
                    <h2 className="text-lg font-semibold mb-1 -mt-2">
                      Projected Standings History
                    </h2>
                    <BasketballTeamStandingsHistory
                      teamName={team_info.team_name}
                      primaryColor={team_info.primary_color}
                      secondaryColor={team_info.secondary_color}
                      logoUrl={team_info.logo_url}
                      season={currentSeason}
                    />
                  </div>

                  <div
                    className="bg-white dark:bg-slate-800 rounded-lg p-3 basketball-first-place-history"
                    className="border border-gray-300 dark:border-gray-700"
                  >
                    <h2 className="text-lg font-semibold mb-1 -mt-2">
                      First Place Probability History
                    </h2>
                    <BasketballTeamFirstPlaceHistory
                      teamName={team_info.team_name}
                      primaryColor={team_info.primary_color}
                      secondaryColor={team_info.secondary_color}
                      logoUrl={team_info.logo_url}
                      season={currentSeason}
                    />
                  </div>

                  <div
                    className="bg-white dark:bg-slate-800 rounded-lg p-3 basketball-tournament-bid-history"
                    className="border border-gray-300 dark:border-gray-700"
                  >
                    <h2 className="text-lg font-semibold mb-1 -mt-2">
                      NCAA Tournament Bid History
                    </h2>
                    <BasketballTeamTournamentBidHistory
                      teamName={team_info.team_name}
                      primaryColor={team_info.primary_color}
                      secondaryColor={team_info.secondary_color}
                      season={currentSeason}
                    />
                  </div>

                  <div
                    className="bg-white dark:bg-slate-800 rounded-lg p-3 basketball-tournament-progression-history"
                    className="border border-gray-300 dark:border-gray-700"
                  >
                    <h2 className="text-lg font-semibold mb-1 -mt-2">
                      NCAA Tournament Progression History
                    </h2>
                    <BasketballTeamTournamentProgressionHistory
                      teamName={team_info.team_name}
                      primaryColor={team_info.primary_color}
                      secondaryColor={team_info.secondary_color}
                      season={currentSeason}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Screenshot Modal */}
        <ScreenshotModal
          isOpen={isScreenshotModalOpen}
          onClose={() => setIsScreenshotModalOpen(false)}
          options={screenshotOptions}
          teamName={team_info.team_name}
          teamLogoUrl={team_info.logo_url}
        />
      </div>
    </ErrorBoundary>
  );
}
