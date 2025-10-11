// src/app/basketball/compare/page.tsx
"use client";

import CompareScreenshotModal from "@/components/common/CompareScreenshotModal";
import BasketballTeamRankHistory from "@/components/features/basketball/BasketballTeamRankHistory";
import BasketballTeamScheduleDifficulty from "@/components/features/basketball/BasketballTeamScheduleDifficulty";
import BasketballTeamStandingsHistory from "@/components/features/basketball/BasketballTeamStandingsHistory";
import BasketballTeamTournamentBidHistory from "@/components/features/basketball/BasketballTeamTournamentBidHistory";
import BasketballTeamWinHistory from "@/components/features/basketball/BasketballTeamWinHistory";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Download } from "@/components/ui/icons";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import TeamLogo from "@/components/ui/TeamLogo";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface Team {
  team_name: string;
  logo_url: string;
  conference: string;
  primary_color?: string;
  secondary_color?: string;
  kenpom_rank?: number;
}

interface BasketballTeamGame {
  date: string;
  opponent: string;
  opponent_logo?: string;
  location: string;
  status: string;
  cwv?: number;
  team_conf?: string;
}

interface AllScheduleGame {
  team: string;
  opponent: string;
  kenpom_win_prob: number;
  team_conf: string;
  status: string;
}

interface TeamData {
  team_info: {
    team_name: string;
    logo_url: string;
    conference: string;
    primary_color?: string;
    secondary_color?: string;
    kenpom_rank?: number;
  };
  schedule: BasketballTeamGame[];
  all_schedule_data: AllScheduleGame[];
}

interface TeamColumn {
  id: string;
  selectedConference: string;
  selectedTeam: string | null;
  teamData: TeamData | null;
  isLoading: boolean;
}

const MAX_TEAMS = 4;

export default function BasketballComparePage() {
  const router = useRouter();
  const [availableConferences, setAvailableConferences] = useState<string[]>(
    []
  );
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [columns, setColumns] = useState<TeamColumn[]>([]);
  const [nextColumnId, setNextColumnId] = useState(1);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isScreenshotModalOpen, setIsScreenshotModalOpen] = useState(false);

  const navigateToTeamPage = (teamName: string) => {
    router.push(`/basketball/team/${encodeURIComponent(teamName)}`);
  };

  const loadTeamData = useCallback(
    async (teamName: string): Promise<TeamData | null> => {
      try {
        const response = await fetch(
          `/api/proxy/team/${encodeURIComponent(teamName)}`
        );
        return await response.json();
      } catch (error) {
        console.error("Error loading team data:", error);
        return null;
      }
    },
    []
  );

  const addColumn = useCallback(() => {
    if (columns.length >= MAX_TEAMS) return;

    const newColumn: TeamColumn = {
      id: `column-${nextColumnId}`,
      selectedConference: "All Teams",
      selectedTeam: null,
      teamData: null,
      isLoading: false,
    };
    setColumns((prev) => [...prev, newColumn]);
    setNextColumnId((prev) => prev + 1);
  }, [columns.length, nextColumnId]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const response = await fetch("/api/proxy/basketball_teams");
        const data = await response.json();

        if (data.data) {
          setAllTeams(data.data);
          const conferences = [
            ...new Set(data.data.map((team: Team) => team.conference)),
          ] as string[];
          setAvailableConferences(["All Teams", ...conferences]);
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
      } finally {
        setIsLoadingInitial(false);
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    if (isLoadingInitial || availableConferences.length === 0) return;
    addColumn();
  }, [isLoadingInitial, availableConferences, addColumn]);

  const removeColumn = (columnId: string) => {
    setColumns((prev) => prev.filter((col) => col.id !== columnId));
  };

  const clearAllColumns = () => {
    setColumns([]);
    setNextColumnId(1);
  };

  const handleConferenceChange = (columnId: string, conference: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId
          ? {
              ...col,
              selectedConference: conference,
              selectedTeam: null,
              teamData: null,
            }
          : col
      )
    );
  };

  const handleTeamChange = async (columnId: string, teamName: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId
          ? { ...col, selectedTeam: teamName, isLoading: true }
          : col
      )
    );

    const teamData = await loadTeamData(teamName);
    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId ? { ...col, teamData, isLoading: false } : col
      )
    );
  };

  // Get visible team names for the screenshot modal
  const visibleTeamNames = columns
    .filter((col) => col.teamData)
    .map((col) => col.teamData!.team_info.team_name);

  const renderTeamControls = (column: TeamColumn, index: number) => {
    const teams =
      column.selectedConference === "All Teams"
        ? allTeams
        : allTeams.filter(
            (team) => team.conference === column.selectedConference
          );

    const sortedTeams = teams.sort((a, b) =>
      a.team_name.localeCompare(b.team_name)
    );

    return (
      <div
        key={column.id}
        className="flex-shrink-0 w-80 bg-white rounded-lg border border-gray-300 p-3"
      >
        <div className="flex items-center justify-between mb-0">
          <h3 className="text-lg font-semibold">Team {index + 1}</h3>
          <button
            onClick={() => removeColumn(column.id)}
            className="text-gray-500 hover:text-gray-700 text-lg bg-transparent border-none p-0 m-0"
            title="Remove column"
          >
            ✕
          </button>
        </div>

        <div className="mb-2">
          <label className="block text-sm font-medium mb-1">Conference</label>
          <select
            value={column.selectedConference}
            onChange={(e) => handleConferenceChange(column.id, e.target.value)}
            className="px-3 py-1.5 border rounded-md bg-white min-w-[200px] transition-colors text-xs border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:ring-2 focus:outline-none w-full"
          >
            {availableConferences
              .slice()
              .sort((a, b) => {
                if (a === "All Teams") return -1;
                if (b === "All Teams") return 1;
                return a.localeCompare(b);
              })
              .map((conference) => (
                <option key={conference} value={conference} className="text-xs">
                  {conference}
                </option>
              ))}
          </select>
        </div>

        <div className="mb-2">
          <label className="block text-sm font-medium mb-1">Team</label>
          <select
            value={column.selectedTeam || ""}
            onChange={(e) => handleTeamChange(column.id, e.target.value)}
            className="px-3 py-1.5 border rounded-md bg-white min-w-[200px] transition-colors text-xs border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:ring-2 focus:outline-none w-full"
            disabled={sortedTeams.length === 0}
          >
            <option value="" className="text-xs">
              Select a team...
            </option>
            {sortedTeams.map((team) => (
              <option
                key={team.team_name}
                value={team.team_name}
                className="text-xs"
              >
                {team.team_name}
              </option>
            ))}
          </select>
        </div>

        {column.isLoading && (
          <div className="flex justify-center py-4">
            <LoadingSpinner />
          </div>
        )}
      </div>
    );
  };

  const renderTeamHeader = (column: TeamColumn) => {
    if (!column.teamData || column.isLoading) {
      return <div className="flex-shrink-0 w-80" />;
    }

    return (
      <div className="flex-shrink-0 w-80">
        <div className="flex items-center gap-3 p-1 border border-gray-300 rounded-lg bg-white shadow-sm">
          <TeamLogo
            logoUrl={column.teamData.team_info.logo_url}
            teamName={column.teamData.team_info.team_name}
            size={40}
            onClick={() =>
              navigateToTeamPage(column.teamData!.team_info.team_name)
            }
          />
          <div>
            <h4
              className="font-semibold text-lg cursor-pointer hover:text-blue-600 transition-colors"
              style={{ color: column.teamData.team_info.primary_color }}
              onClick={() =>
                navigateToTeamPage(column.teamData!.team_info.team_name)
              }
            >
              {column.teamData.team_info.team_name}
              {column.teamData.team_info.kenpom_rank &&
                column.teamData.team_info.kenpom_rank !== 999 && (
                  <span
                    className="ml-2"
                    style={{ color: column.teamData.team_info.primary_color }}
                  >
                    #{column.teamData.team_info.kenpom_rank}
                  </span>
                )}
            </h4>
          </div>
        </div>
      </div>
    );
  };

  const renderTeamContent = (column: TeamColumn) => {
    if (!column.teamData || column.isLoading) {
      return <div className="flex-shrink-0 w-80" />;
    }

    return (
      <div
        className="flex-shrink-0 w-80 space-y-2"
        data-team-name={column.teamData.team_info.team_name}
      >
        {column.teamData.all_schedule_data && (
          <div className="border border-gray-300 rounded-lg p-3">
            <h5 className="text-sm font-semibold mb-2">Schedule Difficulty</h5>
            <div
              data-component="schedule-difficulty"
              style={{
                width: "400px",
                height: "525px",
                overflow: "visible",
                transform: "scale(0.8)",
                transformOrigin: "top left",
              }}
            >
              <BasketballTeamScheduleDifficulty
                schedule={column.teamData.schedule}
                allScheduleData={column.teamData.all_schedule_data}
                teamConference={column.teamData.team_info.conference}
                logoUrl={column.teamData.team_info.logo_url}
              />
            </div>
          </div>
        )}

        <div className="border border-gray-300 rounded-lg p-3">
          <h5 className="text-sm font-semibold mb-2">KenPom Rank History</h5>
          <div data-component="rank-history">
            <BasketballTeamRankHistory
              teamName={column.teamData.team_info.team_name}
              primaryColor={column.teamData.team_info.primary_color}
              secondaryColor={column.teamData.team_info.secondary_color}
              logoUrl={column.teamData.team_info.logo_url}
            />
          </div>
        </div>

        <div className="border border-gray-300 rounded-lg p-3">
          <h5 className="text-sm font-semibold mb-2">Projected Wins History</h5>
          <div data-component="win-history">
            <BasketballTeamWinHistory
              teamName={column.teamData.team_info.team_name}
              primaryColor={column.teamData.team_info.primary_color}
              secondaryColor={column.teamData.team_info.secondary_color}
              logoUrl={column.teamData.team_info.logo_url}
            />
          </div>
        </div>

        <div className="border border-gray-300 rounded-lg p-3">
          <h5 className="text-sm font-semibold mb-2">
            Projected Standings History
          </h5>
          <div data-component="standings-history">
            <BasketballTeamStandingsHistory
              teamName={column.teamData.team_info.team_name}
              primaryColor={column.teamData.team_info.primary_color}
              secondaryColor={column.teamData.team_info.secondary_color}
              logoUrl={column.teamData.team_info.logo_url}
            />
          </div>
        </div>

        <div className="border border-gray-300 rounded-lg p-3">
          <h5 className="text-sm font-semibold mb-2">
            NCAA Tournament Bid History
          </h5>
          <div data-component="tournament-bid-history">
            <BasketballTeamTournamentBidHistory
              teamName={column.teamData.team_info.team_name}
              primaryColor={column.teamData.team_info.primary_color}
              secondaryColor={column.teamData.team_info.secondary_color}
            />
          </div>
        </div>
      </div>
    );
  };

  if (isLoadingInitial) {
    return (
      <PageLayoutWrapper title="Compare Teams" isLoading={true}>
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      </PageLayoutWrapper>
    );
  }

  return (
    <PageLayoutWrapper title="Compare Teams" isLoading={false}>
      <ErrorBoundary level="page">
        <div className="h-screen flex flex-col">
          {/* Button section at top */}
          {columns.length > 0 && (
            <div className="flex justify-end gap-3 px-4 py-2 bg-white border-b border-gray-200 -mt-6">
              <button
                onClick={() => setIsScreenshotModalOpen(true)}
                disabled={visibleTeamNames.length === 0}
                className="px-4 py-2 text-xs bg-gray-700 text-white rounded-md hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 transition-colors border border-gray-700"
                title={
                  visibleTeamNames.length === 0
                    ? "Select teams to enable download"
                    : "Download comparison"
                }
              >
                <Download className="w-3 h-3" />
                Download
              </button>
              <button
                onClick={clearAllColumns}
                className="px-4 py-2 text-xs bg-gray-500 text-white rounded-md hover:bg-gray-800 transition-colors"
              >
                Clear All
              </button>
            </div>
          )}

          <div className="flex-shrink-0 p-4">
            {columns.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">
                  No teams selected for comparison
                </p>
                <button
                  onClick={addColumn}
                  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Add First Team
                </button>
              </div>
            )}
          </div>

          {columns.length > 0 && (
            <div className="flex-1 overflow-auto px-4">
              <div
                className="flex flex-col gap-4"
                style={{ minWidth: `${columns.length * 20}rem` }}
              >
                <div className="flex gap-4">
                  {columns.map((column, index) => (
                    <div key={column.id}>
                      {renderTeamControls(column, index)}
                    </div>
                  ))}
                </div>

                <div className="flex gap-4 sticky top-0 bg-white z-40 py-1 -mx-4 px-4 shadow-sm">
                  {columns.map((column) => (
                    <div key={`header-${column.id}`}>
                      {renderTeamHeader(column)}
                    </div>
                  ))}
                </div>

                <div className="flex gap-4">
                  {columns.map((column) => (
                    <div key={`content-${column.id}`}>
                      {renderTeamContent(column)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Screenshot Modal */}
        <CompareScreenshotModal
          isOpen={isScreenshotModalOpen}
          onClose={() => setIsScreenshotModalOpen(false)}
          visibleTeams={visibleTeamNames}
        />
      </ErrorBoundary>
    </PageLayoutWrapper>
  );
}
