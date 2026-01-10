"use client";

import ScreenshotModal from "@/components/common/ScreenshotModal";
import BasketballTeamFirstPlaceHistory from "@/components/features/basketball/BasketballTeamFirstPlaceHistory";
import BasketballTeamRankHistory from "@/components/features/basketball/BasketballTeamRankHistory";
import BasketballTeamScheduleChart from "@/components/features/basketball/BasketballTeamScheduleChart";
import BasketballTeamScheduleDifficulty from "@/components/features/basketball/BasketballTeamScheduleDifficulty";
import BasketballTeamStandingsHistory from "@/components/features/basketball/BasketballTeamStandingsHistory";
import BasketballTeamTournamentBidHistory from "@/components/features/basketball/BasketballTeamTournamentBidHistory";
import BasketballTeamTournamentProgressionHistory from "@/components/features/basketball/BasketballTeamTournamentProgressionHistory";
import BasketballTeamWinHistory from "@/components/features/basketball/BasketballTeamWinHistory";
import BasketballTeamWinsBreakdown from "@/components/features/basketball/BasketballTeamWinsBreakdown";
import TeamSchedule from "@/components/features/basketball/TeamSchedule";
import TeamSeedProjections from "@/components/features/basketball/TeamSeedProjections";
import TeamWinValues from "@/components/features/basketball/TeamWinValues";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { useMonitoring } from "@/lib/unified-monitoring";
import { Download } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface WinSeedCountEntry {
  Wins: number;
  Seed?: string;
  Tournament_Status?: string;
  Count: number;
}

interface TeamInfo {
  team_name: string;
  team_id: string;
  conference: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  overall_record: string;
  conference_record: string;
  tournament_bid_pct?: number;
  average_seed?: number;
  kenpom_rank?: number;
  seed_distribution: Record<string, number>;
  win_seed_counts: WinSeedCountEntry[];
}

interface TeamGame {
  date: string;
  opponent: string;
  opponent_logo?: string;
  location: string;
  status: string;
  twv?: number;
  cwv?: number;
  kenpom_rank?: number;
  opp_kp_rank?: number;
  team_win_prob?: number;
  kenpom_win_prob?: number;
  team_points?: number;
  opp_points?: number;
}

interface AllScheduleGame {
  team: string;
  opponent: string;
  kenpom_win_prob: number;
  team_conf: string;
  status: string;
}

interface TeamData {
  team_info: TeamInfo;
  schedule: TeamGame[];
  all_schedule_data?: AllScheduleGame[];
}

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

  const teamname = decodeURIComponent(params.teamname);

  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    trackEvent({
      name: "page_view",
      properties: { page: "basketball-team", team: teamname },
    });
  }, [teamname, trackEvent]);

  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/proxy/team/${encodeURIComponent(teamname)}`
        );

        if (!response.ok) throw new Error("Failed to load team data");

        const data = await response.json();
        setTeamData(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load team data"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTeamData();
  }, [teamname]);

  // ✅ SINGLE CLEAN EFFECT - Update URL with teamConf when team data loads
  useEffect(() => {
    if (teamData?.team_info?.conference && mounted) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("teamConf", encodeURIComponent(teamData.team_info.conference));
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, "", newUrl);
    }
  }, [teamData?.team_info?.conference, mounted, searchParams]);

  const navigateToTeam = (targetTeam: string) => {
    if (targetTeam && targetTeam !== teamname) {
      router.push(`/basketball/team/${encodeURIComponent(targetTeam)}`);
    }
  };

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

  if (!mounted || loading || !teamData) {
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
            message={error}
            onRetry={() => window.location.reload()}
            retryLabel="Reload Team Data"
          />
        </div>
      </ErrorBoundary>
    );
  }

  const { team_info, schedule } = teamData;
  const formattedConfName = team_info.conference.replace(/ /g, "_");
  const conferenceLogoUrl = `/images/conf_logos/${formattedConfName}.png`;

  return (
    <ErrorBoundary level="page">
      <div className="container mx-auto px-4 pt-6 pb-2 md:pt-6 md:pb-3">
        <div className="space-y-3">
          {isMobile ? (
            // MOBILE LAYOUT
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
                        {team_info.kenpom_rank && team_info.kenpom_rank !== 999
                          ? `#${team_info.kenpom_rank}`
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
                          {formatTournamentPct(team_info.tournament_bid_pct)}
                        </div>
                        <div className="text-xs text-gray-600 italic">
                          NCAA Bid
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
                className="bg-white rounded-lg mx-2 relative basketball-team-schedule"
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
                  <TeamSchedule
                    schedule={schedule}
                    teamName={team_info.team_name}
                    navigateToTeam={navigateToTeam}
                  />
                </div>
              </div>

              {/* Mobile Schedule Chart */}
              <div
                className="bg-white rounded-lg p-3 relative basketball-schedule-chart"
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
                <BasketballTeamScheduleChart
                  schedule={schedule}
                  navigateToTeam={navigateToTeam}
                />
              </div>

              {/* Mobile Win Values */}
              <div
                className="bg-white rounded-lg p-3 basketball-win-values"
                style={{ border: "1px solid #d1d5db" }}
              >
                <h2 className="text-base font-semibold mb-1 -mt-2">
                  Win Values Over Time
                </h2>
                <TeamWinValues
                  schedule={schedule}
                  logoUrl={team_info.logo_url}
                  primaryColor={team_info.primary_color}
                  secondaryColor={team_info.secondary_color}
                />
              </div>

              {/* Mobile Schedule Difficulty */}
              {teamData.all_schedule_data && (
                <div
                  className="bg-white rounded-lg p-3 basketball-schedule-difficulty"
                  style={{ border: "1px solid #d1d5db" }}
                >
                  <h2 className="text-base font-semibold mb-1 -mt-2">
                    Schedule Difficulty
                  </h2>
                  <BasketballTeamScheduleDifficulty
                    schedule={schedule}
                    allScheduleData={teamData.all_schedule_data}
                    teamConference={team_info.conference}
                    logoUrl={team_info.logo_url}
                  />
                </div>
              )}

              {/* Mobile Wins Breakdown - NEW COMPONENT */}
              <div
                className="bg-white rounded-lg p-3 basketball-wins-breakdown relative"
                style={{ border: "1px solid #d1d5db" }}
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
                className="bg-white rounded-lg p-3 basketball-seed-projections"
                style={{ border: "1px solid #d1d5db" }}
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
                className="bg-white rounded-lg p-3 basketball-rank-history"
                style={{ border: "1px solid #d1d5db" }}
              >
                <h2 className="text-base font-semibold mb-1 -mt-2">
                  Rating History
                </h2>
                <BasketballTeamRankHistory
                  teamName={team_info.team_name}
                  primaryColor={team_info.primary_color}
                  secondaryColor={team_info.secondary_color}
                  logoUrl={team_info.logo_url}
                />
              </div>

              <div
                className="bg-white rounded-lg p-3 basketball-win-history"
                style={{ border: "1px solid #d1d5db" }}
              >
                <h2 className="text-base font-semibold mb-1 -mt-2">
                  Projected Wins History
                </h2>
                <BasketballTeamWinHistory
                  teamName={team_info.team_name}
                  primaryColor={team_info.primary_color}
                  secondaryColor={team_info.secondary_color}
                  logoUrl={team_info.logo_url}
                />
              </div>

              <div
                className="bg-white rounded-lg p-3 basketball-standings-history"
                style={{ border: "1px solid #d1d5db" }}
              >
                <h2 className="text-base font-semibold mb-1 -mt-2">
                  Projected Standings History
                </h2>
                <BasketballTeamStandingsHistory
                  teamName={team_info.team_name}
                  primaryColor={team_info.primary_color}
                  secondaryColor={team_info.secondary_color}
                  logoUrl={team_info.logo_url}
                />
              </div>

              <div
                className="bg-white rounded-lg p-3 basketball-first-place-history"
                style={{ border: "1px solid #d1d5db" }}
              >
                <h2 className="text-base font-semibold mb-1 -mt-2">
                  First Place Probability History
                </h2>
                <BasketballTeamFirstPlaceHistory
                  teamName={team_info.team_name}
                  primaryColor={team_info.primary_color}
                  secondaryColor={team_info.secondary_color}
                  logoUrl={team_info.logo_url}
                />
              </div>

              <div
                className="bg-white rounded-lg p-3 basketball-tournament-bid-history"
                style={{ border: "1px solid #d1d5db" }}
              >
                <h2 className="text-base font-semibold mb-1 -mt-2">
                  NCAA Tournament Bid History
                </h2>
                <BasketballTeamTournamentBidHistory
                  teamName={team_info.team_name}
                  primaryColor={team_info.primary_color}
                  secondaryColor={team_info.secondary_color}
                />
              </div>

              <div
                className="bg-white rounded-lg p-3 basketball-tournament-progression-history"
                style={{ border: "1px solid #d1d5db" }}
              >
                <h2 className="text-base font-semibold mb-1 -mt-2">
                  NCAA Tournament Progression History
                </h2>
                <BasketballTeamTournamentProgressionHistory
                  teamName={team_info.team_name}
                  primaryColor={team_info.primary_color}
                  secondaryColor={team_info.secondary_color}
                />
              </div>
            </div>
          ) : (
            // DESKTOP LAYOUT
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
                        {team_info.kenpom_rank && team_info.kenpom_rank !== 999
                          ? `#${team_info.kenpom_rank}`
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
                            {formatTournamentPct(team_info.tournament_bid_pct)}
                          </div>
                          <div className="text-sm text-gray-600 italic">
                            NCAA Bid
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
                    className="bg-white rounded-lg relative basketball-team-schedule"
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
                    className="bg-white rounded-lg p-3 relative basketball-schedule-chart"
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
                    <BasketballTeamScheduleChart
                      schedule={schedule}
                      navigateToTeam={navigateToTeam}
                    />
                  </div>

                  {teamData.all_schedule_data && (
                    <div
                      className="bg-white rounded-lg p-3 basketball-schedule-difficulty"
                      style={{ border: "1px solid #d1d5db" }}
                    >
                      <h2 className="text-lg font-semibold mb-1 -mt-2">
                        Schedule Difficulty
                      </h2>
                      <BasketballTeamScheduleDifficulty
                        schedule={schedule}
                        allScheduleData={teamData.all_schedule_data}
                        teamConference={team_info.conference}
                        logoUrl={team_info.logo_url}
                      />
                    </div>
                  )}

                  {/* Wins Breakdown - NEW COMPONENT */}
                  <div
                    className="bg-white rounded-lg p-3 basketball-wins-breakdown relative"
                    style={{ border: "1px solid #d1d5db" }}
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
                    className="bg-white rounded-lg p-3 basketball-win-values"
                    style={{ border: "1px solid #d1d5db" }}
                  >
                    <h2 className="text-lg font-semibold mb-1 -mt-2">
                      Win Values Over Time
                    </h2>
                    <TeamWinValues
                      schedule={schedule}
                      logoUrl={team_info.logo_url}
                      primaryColor={team_info.primary_color}
                      secondaryColor={team_info.secondary_color}
                    />
                  </div>

                  <div
                    className="bg-white rounded-lg p-3 basketball-seed-projections"
                    style={{ border: "1px solid #d1d5db" }}
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
                    className="bg-white rounded-lg p-3 basketball-rank-history"
                    style={{ border: "1px solid #d1d5db" }}
                  >
                    <h2 className="text-lg font-semibold mb-1 -mt-2">
                      Rating History
                    </h2>
                    <BasketballTeamRankHistory
                      teamName={team_info.team_name}
                      primaryColor={team_info.primary_color}
                      secondaryColor={team_info.secondary_color}
                      logoUrl={team_info.logo_url}
                    />
                  </div>

                  <div
                    className="bg-white rounded-lg p-3 basketball-win-history"
                    style={{ border: "1px solid #d1d5db" }}
                  >
                    <h2 className="text-lg font-semibold mb-1 -mt-2">
                      Projected Wins History
                    </h2>
                    <BasketballTeamWinHistory
                      teamName={team_info.team_name}
                      primaryColor={team_info.primary_color}
                      secondaryColor={team_info.secondary_color}
                      logoUrl={team_info.logo_url}
                    />
                  </div>

                  <div
                    className="bg-white rounded-lg p-3 basketball-standings-history"
                    style={{ border: "1px solid #d1d5db" }}
                  >
                    <h2 className="text-lg font-semibold mb-1 -mt-2">
                      Projected Standings History
                    </h2>
                    <BasketballTeamStandingsHistory
                      teamName={team_info.team_name}
                      primaryColor={team_info.primary_color}
                      secondaryColor={team_info.secondary_color}
                      logoUrl={team_info.logo_url}
                    />
                  </div>

                  <div
                    className="bg-white rounded-lg p-3 basketball-first-place-history"
                    style={{ border: "1px solid #d1d5db" }}
                  >
                    <h2 className="text-lg font-semibold mb-1 -mt-2">
                      First Place Probability History
                    </h2>
                    <BasketballTeamFirstPlaceHistory
                      teamName={team_info.team_name}
                      primaryColor={team_info.primary_color}
                      secondaryColor={team_info.secondary_color}
                      logoUrl={team_info.logo_url}
                    />
                  </div>

                  <div
                    className="bg-white rounded-lg p-3 basketball-tournament-bid-history"
                    style={{ border: "1px solid #d1d5db" }}
                  >
                    <h2 className="text-lg font-semibold mb-1 -mt-2">
                      NCAA Tournament Bid History
                    </h2>
                    <BasketballTeamTournamentBidHistory
                      teamName={team_info.team_name}
                      primaryColor={team_info.primary_color}
                      secondaryColor={team_info.secondary_color}
                    />
                  </div>

                  <div
                    className="bg-white rounded-lg p-3 basketball-tournament-progression-history"
                    style={{ border: "1px solid #d1d5db" }}
                  >
                    <h2 className="text-lg font-semibold mb-1 -mt-2">
                      NCAA Tournament Progression History
                    </h2>
                    <BasketballTeamTournamentProgressionHistory
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
