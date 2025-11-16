// src/app/football/compare/page.tsx
"use client";

import CompareScreenshotModal from "@/components/common/CompareScreenshotModal";
import FootballCompareSchedulesChart from "@/components/features/football/FootballCompareSchedulesChart";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Download } from "@/components/ui/icons";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useCallback, useEffect, useState } from "react";

interface Team {
  team_name: string;
  logo_url: string;
  conference: string;
  primary_color?: string;
  secondary_color?: string;
  sagarin_rank?: number;
}

interface FootballTeamGame {
  date: string;
  opponent: string;
  opponent_logo?: string;
  opponent_primary_color?: string;
  location: string;
  status: string;
  sag12_win_prob?: number;
  team_conf?: string;
  team_conf_catg?: string;
}

interface AllScheduleGame {
  team: string;
  opponent: string;
  opponent_primary_color?: string;
  sag12_win_prob: number;
  team_conf: string;
  team_conf_catg: string;
  status: string;
}

interface TeamData {
  team_info: {
    team_name: string;
    logo_url: string;
    conference: string;
    primary_color?: string;
    secondary_color?: string;
    sagarin_rank?: number;
  };
  schedule: FootballTeamGame[];
  all_schedule_data: AllScheduleGame[];
}

interface SelectedTeam {
  teamName: string;
  teamLogo: string;
  teamColor: string;
  teamConference: string;
  teamConfCategory?: string;
  games: {
    date: string;
    opponent: string;
    opponentLogo?: string;
    opponentColor: string;
    winProb: number;
    status: string;
  }[];
  allScheduleData: {
    team: string;
    opponent: string;
    opponentColor: string;
    winProb: number;
    teamConference: string;
    teamConfCategory?: string;
    status: string;
  }[];
}

const MAX_SELECTED_TEAMS = 12;

export default function FootballComparePage() {
  const [availableConferences, setAvailableConferences] = useState<string[]>(
    []
  );
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<SelectedTeam[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [teamDataCache, setTeamDataCache] = useState<{
    [key: string]: TeamData;
  }>({});
  const [isScreenshotModalOpen, setIsScreenshotModalOpen] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState<Set<string>>(new Set());

  const loadTeamData = useCallback(
    async (teamName: string): Promise<TeamData | null> => {
      if (teamDataCache[teamName]) {
        return teamDataCache[teamName];
      }

      try {
        const response = await fetch(
          `/api/proxy/football_team/${encodeURIComponent(teamName)}`
        );
        const data = await response.json();
        setTeamDataCache((prev) => ({ ...prev, [teamName]: data }));
        return data;
      } catch (error) {
        console.error("Error loading team data:", error);
        return null;
      }
    },
    [teamDataCache]
  );

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const response = await fetch("/api/proxy/football_teams");
        const data = await response.json();

        if (data.data) {
          setAllTeams(data.data);
          const conferences = [
            ...new Set(data.data.map((team: Team) => team.conference)),
          ] as string[];
          const sortedConferences = conferences
            .filter((conf) => conf !== "FCS")
            .sort();
          setAvailableConferences(sortedConferences);
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
      } finally {
        setIsLoadingInitial(false);
      }
    };

    loadInitialData();
  }, []);

  const handleTeamClick = async (team: Team) => {
    const isSelected = selectedTeams.some((t) => t.teamName === team.team_name);

    if (isSelected) {
      setSelectedTeams((prev) =>
        prev.filter((t) => t.teamName !== team.team_name)
      );
      return;
    }

    if (selectedTeams.length >= MAX_SELECTED_TEAMS) {
      return;
    }

    setLoadingTeams((prev) => new Set([...prev, team.team_name]));

    const teamData = await loadTeamData(team.team_name);
    setLoadingTeams((prev) => {
      const next = new Set(prev);
      next.delete(team.team_name);
      return next;
    });

    if (!teamData) return;

    const newTeam: SelectedTeam = {
      teamName: teamData.team_info.team_name,
      teamLogo: teamData.team_info.logo_url,
      teamColor: teamData.team_info.primary_color || "#000000",
      teamConference: teamData.team_info.conference,
      games: teamData.schedule.map((game) => ({
        date: game.date,
        opponent: game.opponent,
        opponentLogo: game.opponent_logo,
        opponentColor: game.opponent_primary_color || "#9ca3af",
        winProb: game.sag12_win_prob || 0.5,
        status: game.status,
      })),
      allScheduleData: teamData.all_schedule_data.map((game) => ({
        team: game.team,
        opponent: game.opponent,
        opponentColor: game.opponent_primary_color || "#9ca3af",
        winProb: game.sag12_win_prob,
        teamConference: game.team_conf,
        teamConfCategory: game.team_conf_catg,
        status: game.status,
      })),
    };

    setSelectedTeams((prev) => [...prev, newTeam]);
  };

  const removeTeam = (teamName: string) => {
    setSelectedTeams((prev) => prev.filter((t) => t.teamName !== teamName));
  };

  const clearAllTeams = () => {
    setSelectedTeams([]);
  };

  const selectedTeamNames = new Set(selectedTeams.map((t) => t.teamName));

  if (isLoadingInitial) {
    return (
      <PageLayoutWrapper title="Compare Schedules" isLoading={true}>
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      </PageLayoutWrapper>
    );
  }

  return (
    <PageLayoutWrapper title="Compare Schedules" isLoading={false}>
      <ErrorBoundary level="page">
        <div className="space-y-6 p-4">
          {/* Team Selection Grid */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-6">Select Teams</h2>

            {/* Horizontally scrollable conference sections */}
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-12 min-w-max">
                {availableConferences.map((conference) => {
                  const teamsInConf = allTeams
                    .filter((team) => team.conference === conference)
                    .sort((a, b) => a.team_name.localeCompare(b.team_name));

                  return (
                    <div
                      key={conference}
                      className="flex flex-col items-center"
                    >
                      {/* Conference Label */}
                      <div className="text-sm font-semibold text-gray-700 mb-3 text-center h-10 flex items-center">
                        {conference}
                      </div>

                      {/* Teams Grid - 3 across with minimal gap */}
                      <div className="grid grid-cols-3 gap-1 border border-gray-300 p-2 bg-gray-50">
                        {teamsInConf.map((team) => (
                          <button
                            key={team.team_name}
                            onClick={() => handleTeamClick(team)}
                            disabled={
                              selectedTeams.length >= MAX_SELECTED_TEAMS &&
                              !selectedTeamNames.has(team.team_name)
                            }
                            className={`relative flex items-center justify-center h-10 w-10 border border-gray-400 transition-all ${
                              selectedTeamNames.has(team.team_name)
                                ? "ring-2 ring-blue-500 border-blue-500"
                                : "bg-white hover:bg-gray-100"
                            } ${
                              selectedTeams.length >= MAX_SELECTED_TEAMS &&
                              !selectedTeamNames.has(team.team_name)
                                ? "opacity-40 cursor-not-allowed"
                                : "cursor-pointer"
                            }`}
                            title={team.team_name}
                          >
                            <img
                              src={team.logo_url}
                              alt={team.team_name}
                              className="h-8 w-8 object-contain"
                            />
                            {loadingTeams.has(team.team_name) && (
                              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-60">
                                <div className="w-2 h-2 border border-blue-600 border-t-transparent rounded-full animate-spin" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Selected Teams Section */}
          {selectedTeams.length > 0 && (
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">
                  Selected Teams ({selectedTeams.length}/{MAX_SELECTED_TEAMS})
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsScreenshotModalOpen(true)}
                    className="px-4 py-2 text-sm bg-gray-700 text-white rounded-md hover:bg-gray-800 flex items-center gap-2 transition-colors"
                    title="Download comparison"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    onClick={clearAllTeams}
                    className="px-4 py-2 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Selected Teams List */}
              <div className="flex flex-wrap gap-2">
                {selectedTeams.map((team, index) => (
                  <div
                    key={team.teamName}
                    className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border-2 border-blue-600 shadow-sm"
                  >
                    <span className="text-xs font-bold text-blue-600 w-5 h-5 flex items-center justify-center bg-blue-100 rounded-full">
                      {index + 1}
                    </span>
                    <img
                      src={team.teamLogo}
                      alt={team.teamName}
                      className="h-6 w-6 object-contain"
                    />
                    <span className="text-sm font-medium">{team.teamName}</span>
                    <button
                      onClick={() => removeTeam(team.teamName)}
                      className="text-gray-400 hover:text-red-600 font-bold ml-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Schedule Comparison Chart */}
          {selectedTeams.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-auto">
              <FootballCompareSchedulesChart teams={selectedTeams} />
            </div>
          )}
        </div>

        {/* Screenshot Modal */}
        <CompareScreenshotModal
          isOpen={isScreenshotModalOpen}
          onClose={() => setIsScreenshotModalOpen(false)}
          visibleTeams={selectedTeams.map((t) => t.teamName)}
        />
      </ErrorBoundary>
    </PageLayoutWrapper>
  );
}
