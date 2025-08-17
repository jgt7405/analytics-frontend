"use client";

import FootballTeamSchedule from "@/components/features/football/FootballTeamSchedule";
import FootballTeamSeedProjections from "@/components/features/football/FootballTeamSeedProjections";
import FootballTeamStandingsHistory from "@/components/features/football/FootballTeamStandingsHistory";
import FootballTeamWinHistory from "@/components/features/football/FootballTeamWinHistory";
import FootballTeamWinValues from "@/components/features/football/FootballTeamWinValues";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { useMonitoring } from "@/lib/unified-monitoring";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// API response interfaces
interface ApiSeedCount {
  Seed: string | number;
  Percentage: number;
  Tournament_Status: string;
  Wins: number;
  Count: number;
  Conf_Champ_Pct?: number; // Add this
  At_Large_Pct?: number; // Add this
}

interface FootballTeamInfo {
  team_name: string;
  team_id: string;
  conference: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  overall_record: string;
  conference_record: string;
  cfp_bid_pct?: number;
  average_seed?: number;
  sagarin_rank?: number;
  rating?: number;
  seed_distribution: Record<string, number>;
  win_seed_counts: ApiSeedCount[];
}

interface FootballTeamGame {
  date: string;
  opponent: string;
  opponent_logo?: string;
  location: string;
  status: string;
  twv?: number;
  cwv?: number;
  sagarin_rank?: number;
}

interface FootballTeamData {
  team_info: FootballTeamInfo;
  schedule: FootballTeamGame[];
}

// Component expected interface
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
  const [teamData, setTeamData] = useState<FootballTeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const teamname = decodeURIComponent(params.teamname);

  useEffect(() => {
    trackEvent({
      name: "page_view",
      properties: { page: "football-team", team: teamname },
    });
  }, [teamname, trackEvent]);

  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/proxy/football/team/${encodeURIComponent(teamname)}`
        );

        if (!response.ok) throw new Error("Failed to load team data");

        const data = await response.json();
        setTeamData(data);
        setError(null);
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

  const navigateToTeam = (targetTeam: string) => {
    if (targetTeam && targetTeam !== teamname) {
      router.push(`/football/team/${encodeURIComponent(targetTeam)}`);
    }
  };

  const formatCFPPct = (value?: number) => {
    if (value === null || value === undefined) return "-";
    if (value > 0 && value <= 1) return `${Math.round(value * 100)}%`;
    return `${Math.round(value)}%`;
  };

  // Transform API data to component expected format
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
      Conf_Champ_Pct: item.Conf_Champ_Pct || 0, // Add this
      At_Large_Pct: item.At_Large_Pct || 0, // Add this
    }));
  };

  if (error) {
    return (
      <ErrorBoundary level="page">
        <div className="container mx-auto px-4 pt-6 pb-2 md:pt-6 md:pb-3">
          <ErrorMessage message={error} />
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

  const { team_info, schedule } = teamData;
  const formattedConfName = team_info.conference.replace(/ /g, "_");
  const conferenceLogoUrl = `/images/conf_logos/${formattedConfName}.png`;

  return (
    <ErrorBoundary level="page">
      <div className="container mx-auto px-4 pt-6 pb-2 md:pt-6 md:pb-3">
        <div className="space-y-3">
          {isMobile ? (
            // Mobile Layout
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
                        {team_info.team_name}
                      </h1>
                      <p className="text-gray-600 text-sm leading-tight -mt-0">
                        Team Page
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
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
                    <div className="text-xs font-medium text-gray-700 mt-1">
                      {team_info.conference}
                    </div>
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

              {/* Schedule */}
              <div
                className="bg-white rounded-lg mx-2"
                style={{ border: "1px solid #d1d5db" }}
              >
                <div className="px-2 py-1 border-b border-gray-200 -mt-4">
                  <h2 className="text-base font-semibold">Team Schedule</h2>
                </div>
                <div className="border-b border-gray-200"></div>
                <div className="px-1 pb-1 -mt-8 flex justify-center items-center min-h-[300px]">
                  <FootballTeamSchedule
                    schedule={schedule}
                    navigateToTeam={navigateToTeam}
                  />
                </div>
              </div>

              {/* Charts */}
              <div
                className="bg-white rounded-lg p-3"
                style={{ border: "1px solid #d1d5db" }}
              >
                <h2 className="text-base font-semibold mb-1 -mt-2">
                  Win Values Over Time
                </h2>
                <FootballTeamWinValues
                  schedule={schedule}
                  primaryColor={team_info.primary_color}
                  secondaryColor={team_info.secondary_color}
                />
              </div>

              <div
                className="bg-white rounded-lg p-3"
                style={{ border: "1px solid #d1d5db" }}
              >
                <h2 className="text-base font-semibold mb-1 -mt-2">
                  CFP Seed Projections
                </h2>
                <FootballTeamSeedProjections
                  winSeedCounts={transformFootballWinSeedCounts(
                    team_info.win_seed_counts
                  )}
                />
              </div>

              {/* Mobile Historical Wins Chart */}
              <div
                className="bg-white rounded-lg p-3"
                style={{ border: "1px solid #d1d5db" }}
              >
                <h2 className="text-base font-semibold mb-1 -mt-2">
                  Projected Wins History
                </h2>
                <FootballTeamWinHistory
                  teamName={team_info.team_name}
                  primaryColor={team_info.primary_color}
                />
              </div>

              {/* NEW: Mobile Historical Standings Chart */}
              <div
                className="bg-white rounded-lg p-3"
                style={{ border: "1px solid #d1d5db" }}
              >
                <h2 className="text-base font-semibold mb-1 -mt-2">
                  Conference Standings History
                </h2>
                <FootballTeamStandingsHistory
                  teamName={team_info.team_name}
                  primaryColor={team_info.primary_color}
                />
              </div>
            </div>
          ) : (
            // Desktop Layout
            <div className="w-full">
              {/* Desktop Header Row */}
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
                        {team_info.team_name}
                      </h1>
                      <p className="text-gray-600 leading-tight -mt-0">
                        Team Page
                      </p>
                    </div>
                  </div>

                  {/* Center: Records */}
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

                  {/* Right: Conference Logo */}
                  <div className="flex flex-col items-center ml-4">
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
                    <div className="text-sm font-medium text-gray-700 mt-2">
                      {team_info.conference}
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Content Grid */}
              <div className="grid gap-3 grid-cols-1 lg:grid-cols-3">
                {/* Schedule */}
                <div
                  className="bg-white rounded-lg"
                  style={{ minWidth: "350px", border: "1px solid #d1d5db" }}
                >
                  <div className="pt-0 px-3 pb-3 border-b border-gray-200 -mt-2">
                    <h2 className="text-lg font-semibold">Team Schedule</h2>
                  </div>
                  <div className="border-b border-gray-200"></div>
                  <div className="pt-0 px-3 pb-3 flex justify-center items-center min-h-[300px] -mt-6">
                    <FootballTeamSchedule
                      schedule={schedule}
                      navigateToTeam={navigateToTeam}
                    />
                  </div>
                </div>

                {/* Charts */}
                <div className="space-y-3 col-span-2">
                  <div
                    className="bg-white rounded-lg p-3"
                    style={{ border: "1px solid #d1d5db" }}
                  >
                    <h2 className="text-lg font-semibold mb-1 -mt-2">
                      Win Values Over Time
                    </h2>
                    <FootballTeamWinValues
                      schedule={schedule}
                      primaryColor={team_info.primary_color}
                      secondaryColor={team_info.secondary_color}
                    />
                  </div>

                  <div
                    className="bg-white rounded-lg p-3"
                    style={{ border: "1px solid #d1d5db" }}
                  >
                    <h2 className="text-lg font-semibold mb-1 -mt-2">
                      CFP Seed Projections
                    </h2>
                    <FootballTeamSeedProjections
                      winSeedCounts={transformFootballWinSeedCounts(
                        team_info.win_seed_counts
                      )}
                    />
                  </div>

                  {/* Desktop Historical Wins Chart */}
                  <div
                    className="bg-white rounded-lg p-3"
                    style={{ border: "1px solid #d1d5db" }}
                  >
                    <h2 className="text-lg font-semibold mb-1 -mt-2">
                      Projected Wins History
                    </h2>
                    <FootballTeamWinHistory
                      teamName={team_info.team_name}
                      primaryColor={team_info.primary_color}
                    />
                  </div>

                  {/* NEW: Desktop Historical Standings Chart */}
                  <div
                    className="bg-white rounded-lg p-3"
                    style={{ border: "1px solid #d1d5db" }}
                  >
                    <h2 className="text-lg font-semibold mb-1 -mt-2">
                      Conference Standings History
                    </h2>
                    <FootballTeamStandingsHistory
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
      </div>
    </ErrorBoundary>
  );
}
