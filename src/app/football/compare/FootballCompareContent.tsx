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
const PRIORITY_CONFERENCES = [
  "Atlantic Coast",
  "Big 12",
  "Big Ten",
  "Independent",
  "Southeastern",
];

export default function FootballCompareContent() {
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
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);

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
            .sort((a, b) => {
              const aIndex = PRIORITY_CONFERENCES.indexOf(a);
              const bIndex = PRIORITY_CONFERENCES.indexOf(b);

              if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
              if (aIndex !== -1) return -1;
              if (bIndex !== -1) return 1;
              return a.localeCompare(b);
            });

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
        <div className="space-y-0 px-4 pt-0 pb-0 -mt-10">
          {/* Scrollable Conference Cards with Team Logos */}
          <div
            className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-600 p-3 overflow-hidden"
            data-debug="Conference Cards Section"
          >
            <div className="overflow-x-auto pb-1">
              <div className="flex gap-3">
                {availableConferences.map((conference, index) => {
                  const teamsInConf = allTeams
                    .filter((team) => team.conference === conference)
                    .sort((a, b) => a.team_name.localeCompare(b.team_name));

                  return (
                    <div
                      key={conference}
                      className="flex-shrink-0 flex items-start gap-3"
                    >
                      {index > 0 && (
                        <div className="w-px bg-gray-300 flex-shrink-0 self-stretch"></div>
                      )}
                      <div>
                        <h3 className="text-xs text-gray-700 dark:text-gray-200 mb-2 px-1 font-normal border-b border-gray-200 dark:border-gray-600 pb-2 text-center min-w-20">
                          {conference}
                        </h3>
                        <div
                          className="grid gap-1"
                          style={{
                            gridTemplateRows: "repeat(6, minmax(0, 1fr))",
                            gridAutoFlow: "column",
                          }}
                        >
                          {teamsInConf.map((team) => {
                            const isSelected = selectedTeamNames.has(
                              team.team_name,
                            );
                            const isDisabled =
                              !isSelected && selectedTeams.length >= MAX_SELECTED_TEAMS;

                            return (
                              <button
                                key={team.team_name}
                                onClick={() => handleTeamClick(team)}
                                disabled={isDisabled}
                                title={team.team_name}
                                className={`relative w-12 h-12 rounded border-2 transition-all flex-shrink-0 overflow-hidden ${
                                  isSelected
                                    ? "border-[rgb(0,151,178)] shadow-lg ring-2 ring-[rgb(0,151,178)] ring-offset-1"
                                    : isDisabled
                                      ? "bg-gray-100 dark:bg-slate-700 border-gray-200 dark:border-gray-600 cursor-not-allowed opacity-50"
                                      : "bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-600 hover:border-[rgb(0,151,178)] hover:shadow-md"
                                }`}
                              >
                                <div
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    borderRadius: "50%",
                                    backgroundColor: isDark ? "white" : "transparent",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <img
                                    src={team.logo_url}
                                    alt={team.team_name}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                                {isSelected && (
                                  <div className="absolute top-0 right-0 w-3 h-3 bg-[rgb(0,151,178)] rounded-full flex items-center justify-center">
                                    <div className="text-white text-[8px] font-bold">
                                      ✓
                                    </div>
                                  </div>
                                )}
                                {loadingTeams.has(team.team_name) && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-slate-800 bg-opacity-60">
                                    <div className="w-2 h-2 border border-[rgb(0,151,178)] border-t-transparent rounded-full animate-spin" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Selected Teams Summary */}
          {selectedTeams.length > 0 && (
            <div
              className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-600 p-3 -mt-10"
              data-debug="Selected Teams Section"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold">
                  Selected Teams ({selectedTeams.length}/{MAX_SELECTED_TEAMS})
                </h2>
                <button
                  onClick={clearAllTeams}
                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedTeams.map((team) => (
                  <div
                    key={team.teamName}
                    className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded border border-gray-300 text-xs"
                  >
                    <div className="relative w-4 h-4">
                      <img
                        src={team.teamLogo}
                        alt={team.teamName}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className="text-gray-700 dark:text-gray-200">{team.teamName}</span>
                    <button
                      onClick={() => removeTeam(team.teamName)}
                      className="ml-1 text-gray-500 dark:text-gray-300 hover:text-red-600 font-bold"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comparison Chart */}
          {selectedTeams.length > 0 && (
            <>
              <div
                className="-mt-6"
                data-debug="Chart Container"
              >
                <FootballCompareSchedulesChart teams={selectedTeams} />
              </div>

              <div
                className="flex justify-end gap-3"
                data-debug="Download Button Section"
              >
                <button
                  onClick={() => setIsScreenshotModalOpen(true)}
                  className="px-3 py-2 text-xs bg-gray-700 text-white rounded-md hover:bg-gray-800 flex items-center gap-2 transition-colors border border-gray-700"
                >
                  <Download className="w-4 h-4" />
                  Download Chart
                </button>
              </div>
            </>
          )}

          {selectedTeams.length === 0 && (
            <div
              className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-600 rounded-lg p-8 text-center text-sm"
              data-debug="Empty State Section"
            >
              <p className="text-gray-500 dark:text-gray-300">
                Select teams above to compare their schedules
              </p>
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
