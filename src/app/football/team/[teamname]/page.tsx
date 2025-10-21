"use client";

import ScreenshotModal from "@/components/common/ScreenshotModal";
import FootballTeamCFPBidHistory from "@/components/features/football/FootballTeamCFPBidHistory";
import FootballTeamCFPProgressionHistory from "@/components/features/football/FootballTeamCFPProgressionHistory";
import FootballTeamFirstPlaceHistory from "@/components/features/football/FootballTeamFirstPlaceHistory";
import FootballTeamRankHistory from "@/components/features/football/FootballTeamRankHistory";
import FootballTeamSchedule from "@/components/features/football/FootballTeamSchedule";
import FootballTeamScheduleChart from "@/components/features/football/FootballTeamScheduleChart";
import FootballTeamScheduleDifficulty from "@/components/features/football/FootballTeamScheduleDifficulty";
import FootballTeamSeedProjections from "@/components/features/football/FootballTeamSeedProjections";
import FootballTeamStandingsHistory from "@/components/features/football/FootballTeamStandingsHistory";
import FootballTeamWinHistory from "@/components/features/football/FootballTeamWinHistory";
import FootballTeamWinValues from "@/components/features/football/FootballTeamWinValues";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import TeamLogo from "@/components/ui/TeamLogo";
import { useFootballTeam } from "@/hooks/useFootballTeam";
import { useResponsive } from "@/hooks/useResponsive";
import { useMonitoring } from "@/lib/unified-monitoring";
import { Download } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface ApiSeedCount {
  Seed: string | number;
  Percentage: number;
  Tournament_Status: string;
  Wins: number;
  Count: number;
  Conf_Champ_Pct?: number;
  At_Large_Pct?: number;
}

interface FootballWinSeedCount {
  Wins: number;
  Seed: string | number;
  Tournament_Status: string;
  Count: number;
  Percentage?: number;
}

export default function FootballTeamPage({
  params,
}: {
  params: { teamname: string };
}) {
  const { trackEvent } = useMonitoring();
  const { isMobile } = useResponsive();
  const router = useRouter();
  const [isScreenshotModalOpen, setIsScreenshotModalOpen] = useState(false);

  const teamname = decodeURIComponent(params.teamname);

  // Main team data hook - optimized with React Query
  const {
    data: teamData,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useFootballTeam(teamname);

  const error = queryError?.message || null;

  // Track page view
  useEffect(() => {
    trackEvent({
      name: "page_view",
      properties: { page: "football-team", team: teamname },
    });
  }, [teamname, trackEvent]);

  const navigateToTeam = (targetTeam: string) => {
    if (targetTeam && targetTeam !== teamname) {
      router.push(`/football/team/${encodeURIComponent(targetTeam)}`);
    }
  };

  const formatCFPPct = (value?: number) => {
    if (value === null || value === undefined) return "-";
    if (value > 0 && value <= 1) return `${Math.round(value)}%`;
    return `${Math.round(value)}%`;
  };

  const transformFootballWinSeedCounts = (
    apiData: ApiSeedCount[]
  ): FootballWinSeedCount[] => {
    if (!Array.isArray(apiData) || apiData.length === 0) {
      return [];
    }

    return apiData.map((item) => ({
      Wins: item.Wins,
      Seed: item.Seed,
      Tournament_Status: item.Tournament_Status,
      Count: item.Count,
      Percentage: item.Percentage,
      Conf_Champ_Pct: item.Conf_Champ_Pct || 0,
      At_Large_Pct: item.At_Large_Pct || 0,
    }));
  };

  // Screenshot options
  const screenshotOptions = [
    {
      id: "schedule",
      label: "Team Schedule",
      selector: ".football-team-schedule",
    },
    {
      id: "schedule-chart",
      label: "Schedule Chart",
      selector: ".football-schedule-chart",
    },
    {
      id: "schedule-difficulty",
      label: "Schedule Difficulty",
      selector: ".football-schedule-difficulty",
    },
    {
      id: "win-values",
      label: "Win Values Over Time",
      selector: ".football-win-values",
    },
    {
      id: "seed-projections",
      label: "CFP Seed Projections",
      selector: ".football-seed-projections",
    },
    {
      id: "rank-history",
      label: "Rating Rank History",
      selector: ".football-rank-history",
    },
    {
      id: "win-history",
      label: "Projected Wins History",
      selector: ".football-win-history",
    },
    {
      id: "standings-history",
      label: "Projected Standings History",
      selector: ".football-standings-history",
    },
    {
      id: "first-place-history",
      label: "First Place Probability History",
      selector: ".football-first-place-history",
    },
    {
      id: "cfp-bid-history",
      label: "CFP Bid History",
      selector: ".football-cfp-bid-history",
    },
    {
      id: "cfp-progression-history",
      label: "CFP Progression History",
      selector: ".football-cfp-progression-history",
    },
  ];

  if (error) {
    return (
      <ErrorBoundary level="page">
        <div className="container mx-auto px-4 pt-6 pb-2 md:pt-6 md:pb-3">
          <ErrorMessage
            message={error}
            onRetry={refetch}
            retryLabel="Reload Team Data"
          />
        </div>
      </ErrorBoundary>
    );
  }

  if (loading || !teamData) {
    return (
      <div className="container mx-auto px-4 pt-6 pb-2 md:pt-6 md:pb-3">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" message="Loading team data..." />
        </div>
      </div>
    );
  }

  // Extract data from React Query response
  const { team_info, schedule } = teamData;
  const formattedConfName = team_info.conference.replace(/ /g, "_");
  const conferenceLogoUrl = `/images/conf_logos/${formattedConfName}.png`;

  return (
    <ErrorBoundary level="page">
      <div className="container mx-auto px-4 pt-6 pb-2 md:pt-6 md:pb-3">
        <div className="space-y-3">
          {isMobile ? (
            <div className="space-y-2">
              {/* Mobile Header */}
              <div className="bg-white rounded-lg px-2 py-4">
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
                        {team_info.sagarin_rank &&
                        team_info.sagarin_rank !== 999
                          ? `#${team_info.sagarin_rank}`
                          : ""}
                      </h1>
                      <p className="text-gray-600 text-sm leading-tight -mt-0">
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
                      unoptimized
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
                    style={{ border: "1px solid #d1d5db" }}
                  >
                    <div className="flex gap-3">
                      <div className="text-center flex-1">
                        <div className="text-base font-semibold text-gray-700">
                          {team_info.overall_record}
                        </div>
                        <div className="text-xs text-gray-600 italic">
                          Overall
                        </div>
                      </div>
                      <div className="text-center flex-1">
                        <div className="text-base font-semibold text-gray-700">
                          {team_info.conference_record}
                        </div>
                        <div className="text-xs text-gray-600 italic">
                          Conference
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className="bg-white p-3 rounded-lg flex-1"
                    style={{ border: "1px solid #d1d5db" }}
                  >
                    <div className="flex gap-3">
                      <div className="text-center flex-1">
                        <div className="text-base font-semibold text-gray-700">
                          {formatCFPPct(team_info.cfp_bid_pct)}
                        </div>
                        <div className="text-xs text-gray-600 italic">
                          CFP Bid
                        </div>
                      </div>
                      <div className="text-center flex-1">
                        <div className="text-base font-semibold text-gray-700">
                          {team_info.average_seed
                            ? team_info.average_seed.toFixed(1)
                            : "-"}
                        </div>
                        <div className="text-xs text-gray-600 italic">
                          Avg Seed
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Schedule */}
              <div
                className="bg-white rounded-lg mx-2 relative football-team-schedule"
                style={{ border: "1px solid #d1d5db" }}
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
                  <FootballTeamSchedule
                    schedule={schedule}
                    navigateToTeam={navigateToTeam}
                  />
                </div>
              </div>

              {/* Mobile Schedule Chart */}
              <div
                className="bg-white rounded-lg p-3 relative football-schedule-chart"
                style={{ border: "1px solid #d1d5db" }}
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
                <FootballTeamScheduleChart
                  schedule={schedule}
                  navigateToTeam={navigateToTeam}
                />
              </div>

              {/* Mobile Win Values */}
              <div
                className="bg-white rounded-lg p-3 football-win-values"
                style={{ border: "1px solid #d1d5db" }}
              >
                <h2 className="text-base font-semibold mb-1 -mt-2">
                  Win Values Over Time
                </h2>
                <FootballTeamWinValues
                  schedule={schedule}
                  logoUrl={team_info.logo_url}
                />
              </div>
              {/* Mobile Schedule Difficulty */}
              <div
                className="bg-white rounded-lg p-3 football-schedule-difficulty"
                style={{ border: "1px solid #d1d5db" }}
              >
                <h2 className="text-base font-semibold mb-1 -mt-2">
                  Schedule Difficulty
                </h2>
                <FootballTeamScheduleDifficulty
                  schedule={schedule}
                  allScheduleData={teamData.all_schedule_data || []}
                  teamConference={team_info.conference}
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

              {/* Mobile CFP Seed Projections */}
              <div
                className="bg-white rounded-lg p-3 football-seed-projections"
                style={{ border: "1px solid #d1d5db" }}
              >
                <h2 className="text-base font-semibold mb-1 -mt-2">
                  CFP Seed Projections
                </h2>
                <FootballTeamSeedProjections
                  winSeedCounts={transformFootballWinSeedCounts(
                    team_info.win_seed_counts || []
                  )}
                  logoUrl={team_info.logo_url}
                />
              </div>

              {/* Mobile History Components */}
              <div
                className="bg-white rounded-lg p-3 football-rank-history"
                style={{ border: "1px solid #d1d5db" }}
              >
                <h2 className="text-lg font-semibold mb-1 -mt-2">
                  Rating Rank History
                </h2>
                <FootballTeamRankHistory
                  teamName={team_info.team_name}
                  primaryColor={team_info.primary_color}
                  secondaryColor={team_info.secondary_color}
                  logoUrl={team_info.logo_url}
                />
              </div>

              <div
                className="bg-white rounded-lg p-3 football-win-history"
                style={{ border: "1px solid #d1d5db" }}
              >
                <h2 className="text-base font-semibold mb-1 -mt-2">
                  Projected Wins History
                </h2>
                <FootballTeamWinHistory
                  teamName={team_info.team_name}
                  primaryColor={team_info.primary_color}
                  secondaryColor={team_info.secondary_color}
                  logoUrl={team_info.logo_url}
                />
              </div>

              <div
                className="bg-white rounded-lg p-3 football-standings-history"
                style={{ border: "1px solid #d1d5db" }}
              >
                <h2 className="text-base font-semibold mb-1 -mt-2">
                  Projected Standings History
                </h2>
                <FootballTeamStandingsHistory
                  teamName={team_info.team_name}
                  primaryColor={team_info.primary_color}
                  secondaryColor={team_info.secondary_color}
                  logoUrl={team_info.logo_url}
                />
              </div>

              <div
                className="bg-white rounded-lg p-3 football-first-place-history"
                style={{ border: "1px solid #d1d5db" }}
              >
                <h2 className="text-base font-semibold mb-1 -mt-2">
                  First Place Probability History
                </h2>
                <FootballTeamFirstPlaceHistory
                  teamName={team_info.team_name}
                  primaryColor={team_info.primary_color}
                  secondaryColor={team_info.secondary_color}
                  logoUrl={team_info.logo_url}
                />
              </div>

              <div
                className="bg-white rounded-lg p-3 football-cfp-bid-history"
                style={{ border: "1px solid #d1d5db" }}
              >
                <h2 className="text-base font-semibold mb-1 -mt-2">
                  CFP Bid History
                </h2>
                <FootballTeamCFPBidHistory
                  teamName={team_info.team_name}
                  primaryColor={team_info.primary_color}
                  secondaryColor={team_info.secondary_color}
                />
              </div>

              <div
                className="bg-white rounded-lg p-3 football-cfp-progression-history"
                style={{ border: "1px solid #d1d5db" }}
              >
                <h2 className="text-base font-semibold mb-1 -mt-2">
                  CFP Progression History
                </h2>
                <FootballTeamCFPProgressionHistory
                  teamName={team_info.team_name}
                  primaryColor={team_info.primary_color}
                  secondaryColor={team_info.secondary_color}
                />
              </div>
            </div>
          ) : (
            <div className="w-full">
              {/* Desktop Header */}
              <div className="bg-white rounded-lg p-4 mb-3">
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
                        {team_info.sagarin_rank &&
                        team_info.sagarin_rank !== 999
                          ? `#${team_info.sagarin_rank}`
                          : ""}
                      </h1>
                      <p className="text-gray-600 leading-tight -mt-0">
                        Team Page
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div
                      className="bg-white p-4 rounded-lg"
                      style={{ border: "1px solid #d1d5db" }}
                    >
                      <div className="flex gap-4">
                        <div className="text-center">
                          <div className="text-lg font-semibold text-gray-700">
                            {team_info.overall_record}
                          </div>
                          <div className="text-sm text-gray-600 italic">
                            Overall
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-gray-700">
                            {team_info.conference_record}
                          </div>
                          <div className="text-sm text-gray-600 italic">
                            Conference
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      className="bg-white p-4 rounded-lg"
                      style={{ border: "1px solid #d1d5db" }}
                    >
                      <div className="flex gap-4">
                        <div className="text-center">
                          <div className="text-lg font-semibold text-gray-700">
                            {formatCFPPct(team_info.cfp_bid_pct)}
                          </div>
                          <div className="text-sm text-gray-600 italic">
                            CFP Bid
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-gray-700">
                            {team_info.average_seed
                              ? team_info.average_seed.toFixed(1)
                              : "-"}
                          </div>
                          <div className="text-sm text-gray-600 italic">
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
                    className="bg-white rounded-lg relative football-team-schedule"
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
                      <FootballTeamSchedule
                        schedule={schedule}
                        navigateToTeam={navigateToTeam}
                      />
                    </div>
                  </div>

                  <div
                    className="bg-white rounded-lg p-3 relative football-schedule-chart"
                    style={{ border: "1px solid #d1d5db" }}
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
                    <FootballTeamScheduleChart
                      schedule={schedule}
                      navigateToTeam={navigateToTeam}
                    />
                  </div>

                  <div
                    className="bg-white rounded-lg p-3 football-schedule-difficulty"
                    style={{ border: "1px solid #d1d5db" }}
                  >
                    <h2 className="text-lg font-semibold mb-1 -mt-2">
                      Schedule Difficulty
                    </h2>
                    <FootballTeamScheduleDifficulty
                      schedule={schedule}
                      allScheduleData={teamData.all_schedule_data || []}
                      teamConference={team_info.conference}
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

                {/* Charts */}
                <div className="space-y-3 col-span-2">
                  <div
                    className="bg-white rounded-lg p-3 football-win-values"
                    style={{ border: "1px solid #d1d5db" }}
                  >
                    <h2 className="text-lg font-semibold mb-1 -mt-2">
                      Win Values Over Time
                    </h2>
                    <FootballTeamWinValues
                      schedule={schedule}
                      logoUrl={team_info.logo_url}
                    />
                  </div>

                  <div
                    className="bg-white rounded-lg p-3 football-seed-projections"
                    style={{ border: "1px solid #d1d5db" }}
                  >
                    <h2 className="text-lg font-semibold mb-1 -mt-2">
                      CFP Seed Projections
                    </h2>
                    <FootballTeamSeedProjections
                      winSeedCounts={transformFootballWinSeedCounts(
                        team_info.win_seed_counts || []
                      )}
                      logoUrl={team_info.logo_url}
                    />
                  </div>

                  {/* Desktop History Components */}
                  <div
                    className="bg-white rounded-lg p-3 football-rank-history"
                    style={{ border: "1px solid #d1d5db" }}
                  >
                    <h2 className="text-lg font-semibold mb-1 -mt-2">
                      Rating Rank History
                    </h2>
                    <FootballTeamRankHistory
                      teamName={team_info.team_name}
                      primaryColor={team_info.primary_color}
                      secondaryColor={team_info.secondary_color}
                      logoUrl={team_info.logo_url}
                    />
                  </div>

                  <div
                    className="bg-white rounded-lg p-3 football-win-history"
                    style={{ border: "1px solid #d1d5db" }}
                  >
                    <h2 className="text-lg font-semibold mb-1 -mt-2">
                      Projected Wins History
                    </h2>
                    <FootballTeamWinHistory
                      teamName={team_info.team_name}
                      primaryColor={team_info.primary_color}
                      secondaryColor={team_info.secondary_color}
                      logoUrl={team_info.logo_url}
                    />
                  </div>

                  <div
                    className="bg-white rounded-lg p-3 football-standings-history"
                    style={{ border: "1px solid #d1d5db" }}
                  >
                    <h2 className="text-lg font-semibold mb-1 -mt-2">
                      Projected Standings History
                    </h2>
                    <FootballTeamStandingsHistory
                      teamName={team_info.team_name}
                      primaryColor={team_info.primary_color}
                      secondaryColor={team_info.secondary_color}
                      logoUrl={team_info.logo_url}
                    />
                  </div>

                  <div
                    className="bg-white rounded-lg p-3 football-first-place-history"
                    style={{ border: "1px solid #d1d5db" }}
                  >
                    <h2 className="text-lg font-semibold mb-1 -mt-2">
                      First Place Probability History
                    </h2>
                    <FootballTeamFirstPlaceHistory
                      teamName={team_info.team_name}
                      primaryColor={team_info.primary_color}
                      secondaryColor={team_info.secondary_color}
                      logoUrl={team_info.logo_url}
                    />
                  </div>

                  <div
                    className="bg-white rounded-lg p-3 football-cfp-bid-history"
                    style={{ border: "1px solid #d1d5db" }}
                  >
                    <h2 className="text-lg font-semibold mb-1 -mt-2">
                      CFP Bid History
                    </h2>
                    <FootballTeamCFPBidHistory
                      teamName={team_info.team_name}
                      primaryColor={team_info.primary_color}
                      secondaryColor={team_info.secondary_color}
                    />
                  </div>

                  <div
                    className="bg-white rounded-lg p-3 football-cfp-progression-history"
                    style={{ border: "1px solid #d1d5db" }}
                  >
                    <h2 className="text-lg font-semibold mb-1 -mt-2">
                      CFP Progression History
                    </h2>
                    <FootballTeamCFPProgressionHistory
                      teamName={team_info.team_name}
                      primaryColor={team_info.primary_color}
                      secondaryColor={team_info.secondary_color}
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
