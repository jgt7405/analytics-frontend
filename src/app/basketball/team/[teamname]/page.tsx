// src/app/basketball/team/[teamname]/page.tsx
"use client";

import TeamSchedule from "@/components/features/basketball/TeamSchedule";
import TeamSeedProjections from "@/components/features/basketball/TeamSeedProjections";
import TeamWinValues from "@/components/features/basketball/TeamWinValues";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { useMonitoring } from "@/lib/unified-monitoring";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

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
  win_seed_counts: any[];
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

  const resolvedParams = use(params);
  const teamname = decodeURIComponent(resolvedParams.teamname);

  useEffect(() => {
    trackEvent({
      name: "page_view",
      properties: { page: "team", team: teamname },
    });
  }, [teamname, trackEvent]);

  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        setLoading(true);
        const baseUrl =
          process.env.NEXT_PUBLIC_API_URL ||
          "https://analytics-backend-production.up.railway.app/api";

        const response = await fetch(
          `${baseUrl}/team/${encodeURIComponent(teamname)}`
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

    if (teamname) {
      fetchTeamData();
    }
  }, [teamname]);

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

  if (error) {
    return (
      <ErrorBoundary level="page">
        <PageLayoutWrapper title="Team Page" isLoading={false}>
          <ErrorMessage message={error} />
        </PageLayoutWrapper>
      </ErrorBoundary>
    );
  }

  if (loading || !teamData) {
    return (
      <PageLayoutWrapper title="Team Page" isLoading={true}>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" message="Loading team data..." />
        </div>
      </PageLayoutWrapper>
    );
  }

  const { team_info, schedule } = teamData;
  const formattedConfName = team_info.conference.replace(/ /g, "_");
  const conferenceLogoUrl = `/images/conf_logos/${formattedConfName}.png`;

  return (
    <ErrorBoundary level="page">
      <PageLayoutWrapper title="" isLoading={false}>
        <div className={isMobile ? "px-1" : "px-4"}>
          <div className={isMobile ? "-mt-4" : "-mt-2"}>
            {isMobile ? (
              // Mobile Layout (unchanged)
              <div className="flex flex-col items-start w-full">
                <div className="flex-shrink-0 w-full">
                  {/* Team Header */}
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <TeamLogo
                        logoUrl={team_info.logo_url}
                        teamName={team_info.team_name}
                        size={32}
                      />
                      <div>
                        <h1
                          className="text-lg font-semibold"
                          style={{
                            color: team_info.primary_color || "#1f2937",
                          }}
                        >
                          {team_info.team_name}
                        </h1>
                        <p className="text-gray-600 text-xs">Team Page</p>
                      </div>
                    </div>

                    {/* Conference Logo - Mobile: Right side of header */}
                    <div className="flex flex-col items-center">
                      <img
                        src={conferenceLogoUrl}
                        alt={`${team_info.conference} logo`}
                        className="h-8 w-auto object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      <div className="text-xs font-medium text-gray-700 mt-1 text-center">
                        {team_info.conference}
                      </div>
                    </div>
                  </div>

                  {/* Records */}
                  <div className="flex gap-2 mb-2">
                    <div className="bg-white p-4 rounded-lg border flex-1">
                      <div className="flex justify-between gap-4">
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

                    <div className="bg-white p-4 rounded-lg border flex-1">
                      <div className="flex justify-between gap-4">
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

                  {/* Content Grid */}
                  <div className="grid gap-3 grid-cols-1">
                    {/* Schedule */}
                    <div className="bg-white rounded-lg border">
                      <div className="p-2 border-b border-gray-200">
                        <h2 className="text-base font-semibold">
                          Team Schedule
                        </h2>
                      </div>
                      <div className="p-3 flex justify-center items-center min-h-[300px]">
                        <TeamSchedule
                          schedule={schedule}
                          teamName={team_info.team_name}
                          navigateToTeam={navigateToTeam}
                        />
                      </div>
                    </div>

                    {/* Charts */}
                    <div className="space-y-3">
                      <div className="bg-white rounded-lg border p-4">
                        <h2 className="text-base font-semibold mb-4">
                          Win Values Over Time
                        </h2>
                        <TeamWinValues
                          schedule={schedule}
                          primaryColor={team_info.primary_color}
                          secondaryColor={team_info.secondary_color}
                        />
                      </div>

                      <div className="bg-white rounded-lg border p-4">
                        <h2 className="text-base font-semibold mb-4">
                          NCAA Tournament Seed Projections
                        </h2>
                        <TeamSeedProjections
                          winSeedCounts={team_info.win_seed_counts}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Desktop Layout (new structure)
              <div className="w-full">
                {/* Desktop Header Row: Team Logo + Records + Conference Logo */}
                <div className="flex items-center justify-between mb-4">
                  {/* Left: Team Logo and Info */}
                  <div className="flex items-center gap-4">
                    <TeamLogo
                      logoUrl={team_info.logo_url}
                      teamName={team_info.team_name}
                      size={64}
                    />
                    <div>
                      <h1
                        className="text-2xl font-semibold"
                        style={{ color: team_info.primary_color || "#1f2937" }}
                      >
                        {team_info.team_name}
                      </h1>
                      <p className="text-gray-600">Team Page</p>
                    </div>
                  </div>

                  {/* Center: Records */}
                  <div className="flex gap-4">
                    <div className="bg-white p-4 rounded-lg border">
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

                    <div className="bg-white p-4 rounded-lg border">
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

                  {/* Right: Conference Logo */}
                  <div className="flex flex-col items-center ml-4">
                    <img
                      src={conferenceLogoUrl}
                      alt={`${team_info.conference} logo`}
                      className="h-12 w-auto object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    <div className="text-sm font-medium text-gray-700 mt-2">
                      {team_info.conference}
                    </div>
                  </div>
                </div>

                {/* Desktop Content Grid */}
                <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                  {/* Schedule */}
                  <div
                    className="bg-white rounded-lg border"
                    style={{ minWidth: "350px" }}
                  >
                    <div className="p-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold">Team Schedule</h2>
                    </div>
                    <div className="p-6 flex justify-center items-center min-h-[300px]">
                      <TeamSchedule
                        schedule={schedule}
                        teamName={team_info.team_name}
                        navigateToTeam={navigateToTeam}
                      />
                    </div>
                  </div>

                  {/* Charts */}
                  <div className="space-y-6 col-span-2">
                    <div className="bg-white rounded-lg border p-4">
                      <h2 className="text-lg font-semibold mb-4">
                        Win Values Over Time
                      </h2>
                      <TeamWinValues
                        schedule={schedule}
                        primaryColor={team_info.primary_color}
                        secondaryColor={team_info.secondary_color}
                      />
                    </div>

                    <div className="bg-white rounded-lg border p-4">
                      <h2 className="text-lg font-semibold mb-4">
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
      </PageLayoutWrapper>
    </ErrorBoundary>
  );
}
