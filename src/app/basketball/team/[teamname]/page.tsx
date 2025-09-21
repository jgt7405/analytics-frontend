"use client";

import TeamSchedule from "@/components/features/basketball/TeamSchedule";
import TeamSeedProjections from "@/components/features/basketball/TeamSeedProjections";
import TeamWinValues from "@/components/features/basketball/TeamWinValues";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { useMonitoring } from "@/lib/unified-monitoring";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
  adjusted_efficiency?: number;
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
}

interface TeamData {
  team_info: TeamInfo;
  schedule: TeamGame[];
}

// Add this function for static generation
export async function generateStaticParams() {
  try {
    // Use the same API endpoint structure as your other calls
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      "https://jthomprodbackend-production.up.railway.app";
    const response = await fetch(`${baseUrl}/basketball/teams`);

    if (!response.ok) {
      console.warn("Failed to fetch basketball teams for static generation");
      return [];
    }

    const data = await response.json();

    if (data?.data && Array.isArray(data.data)) {
      return data.data.map((team: { team_name: string }) => ({
        teamname: encodeURIComponent(team.team_name),
      }));
    }

    return [];
  } catch (error) {
    console.error(
      "Error generating static params for basketball teams:",
      error
    );
    return [];
  }
}

export default function TeamPage({
  params,
}: {
  params: Promise<{ teamname: string }>;
}) {
  const { trackEvent } = useMonitoring();
  const { isMobile } = useResponsive();
  const router = useRouter();
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamname, setTeamname] = useState<string>("");
  const [paramsResolved, setParamsResolved] = useState(false);

  // Resolve params in useEffect
  useEffect(() => {
    const resolveParams = async () => {
      try {
        const resolvedParams = await params;
        const decodedTeamname = decodeURIComponent(resolvedParams.teamname);
        setTeamname(decodedTeamname);
        setParamsResolved(true);
      } catch (err) {
        console.error("Error resolving params:", err);
        setError("Failed to load team page");
        setLoading(false);
      }
    };
    resolveParams();
  }, [params]);

  // Track page view once teamname is available
  useEffect(() => {
    if (!teamname || !paramsResolved) return;

    trackEvent({
      name: "page_view",
      properties: { page: "team", team: teamname },
    });
  }, [teamname, paramsResolved, trackEvent]);

  // Fetch team data once teamname is available
  useEffect(() => {
    if (!teamname || !paramsResolved) return;

    const fetchTeamData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use proxy instead of direct Railway call
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
  }, [teamname, paramsResolved]);

  const navigateToTeam = (targetTeam: string) => {
    if (targetTeam && targetTeam !== teamname) {
      router.push(`/basketball/team/${encodeURIComponent(targetTeam)}`);
    }
  };

  const formatTournamentPct = (value?: number) => {
    if (value === null || value === undefined) return "-";
    if (value > 0 && value <= 1) return `${Math.round(value * 100)}%`;
    return `${Math.round(value)}%`;
  };

  // Show loading while params are being resolved or data is being fetched
  if (!paramsResolved || loading || !teamData) {
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
          <ErrorMessage message={error} />
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
            <div className="space-y-2">
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

              <div
                className="bg-white rounded-lg mx-2"
                style={{ border: "1px solid #d1d5db" }}
              >
                <div className="px-2 py-1 border-b border-gray-200 -mt-4">
                  <h2 className="text-base font-semibold">Team Schedule</h2>
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

              <div
                className="bg-white rounded-lg p-3"
                style={{ border: "1px solid #d1d5db" }}
              >
                <h2 className="text-base font-semibold mb-1 -mt-2">
                  Win Values Over Time
                </h2>
                <TeamWinValues
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
                  NCAA Tournament Seed Projections
                </h2>
                <TeamSeedProjections
                  winSeedCounts={team_info.win_seed_counts}
                />
              </div>
            </div>
          ) : (
            <div className="w-full">
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

              <div className="grid gap-3 grid-cols-1 lg:grid-cols-3">
                <div
                  className="bg-white rounded-lg"
                  style={{ minWidth: "350px", border: "1px solid #d1d5db" }}
                >
                  <div className="pt-0 px-3 pb-3 border-b border-gray-200 -mt-2">
                    <h2 className="text-lg font-semibold">Team Schedule</h2>
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

                <div className="space-y-3 col-span-2">
                  <div
                    className="bg-white rounded-lg p-3"
                    style={{ border: "1px solid #d1d5db" }}
                  >
                    <h2 className="text-lg font-semibold mb-1 -mt-2">
                      Win Values Over Time
                    </h2>
                    <TeamWinValues
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
                      NCAA Tournament Seed Projections
                    </h2>
                    <TeamSeedProjections
                      winSeedCounts={team_info.win_seed_counts}
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
