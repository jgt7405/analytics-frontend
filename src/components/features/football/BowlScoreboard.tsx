// src/components/features/football/BowlScoreboard.tsx
"use client";

import { cn } from "@/lib/utils";
import tableStyles from "@/styles/components/tables.module.css";
import { useQuery } from "@tanstack/react-query";
import { memo, useMemo, useState } from "react";

interface BowlScoreboardProps {
  className?: string;
  showDetails?: boolean;
}

function BowlScoreboard({
  className,
  showDetails = true,
}: BowlScoreboardProps) {
  const [sortBy, setSortBy] = useState<
    "pct_points" | "pct_right" | "actual_points"
  >("pct_points");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Fetch scoreboard data
  const {
    data: scoreboardData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["bowl-scoreboard"],
    queryFn: async () => {
      const res = await fetch("/api/football/bowl-scoreboard");
      if (!res.ok) throw new Error("Failed to fetch bowl scoreboard");
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Sort users
  const sortedUsers = useMemo(() => {
    if (!scoreboardData?.scoreboard) return [];

    const users = [...scoreboardData.scoreboard];

    switch (sortBy) {
      case "pct_points":
        return users.sort(
          (a, b) => (b.pct_points as number) - (a.pct_points as number)
        );
      case "pct_right":
        return users.sort(
          (a, b) => (b.pct_right as number) - (a.pct_right as number)
        );
      case "actual_points":
        return users.sort(
          (a, b) => (b.actual_points as number) - (a.actual_points as number)
        );
      default:
        return users;
    }
  }, [scoreboardData, sortBy]);

  // Get rank for a user
  const getRank = (index: number): number => {
    return index + 1;
  };

  // Get medal emoji
  const getMedalEmoji = (rank: number): string => {
    switch (rank) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return "";
    }
  };

  // Calculate color based on percentage
  const getPercentageColor = (percentage: number): string => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 70) return "text-blue-600";
    if (percentage >= 60) return "text-amber-600";
    if (percentage >= 50) return "text-orange-600";
    return "text-red-600";
  };

  // Calculate progress bar color
  const getProgressBarColor = (percentage: number): string => {
    if (percentage >= 80) return "bg-green-600";
    if (percentage >= 70) return "bg-blue-600";
    if (percentage >= 60) return "bg-amber-600";
    if (percentage >= 50) return "bg-orange-600";
    return "bg-red-600";
  };

  if (isLoading) {
    return (
      <div
        className={cn(
          tableStyles.tableContainer,
          "flex items-center justify-center py-12",
          className
        )}
      >
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
          <p className="text-gray-600">Loading scoreboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          tableStyles.tableContainer,
          "flex items-center justify-center py-12",
          className
        )}
      >
        <div className="text-center">
          <p className="text-red-600">Error loading scoreboard</p>
          <p className="mt-2 text-sm text-gray-500">Please try refreshing</p>
        </div>
      </div>
    );
  }

  if (!sortedUsers || sortedUsers.length === 0) {
    return (
      <div
        className={cn(
          tableStyles.tableContainer,
          "flex items-center justify-center py-12",
          className
        )}
      >
        <p className="text-gray-600">No scoreboard data available</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with Sort Options */}
      <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Scoreboard</h2>
          <p className="text-sm text-gray-600">
            {(sortedUsers[0]?.completed_games as number) || 0} of{" "}
            {(sortedUsers[0]?.total_games as number) || 0} games completed
          </p>
        </div>

        {/* Sort Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSortBy("pct_points")}
            className={cn(
              "rounded px-3 py-1 text-sm font-medium transition",
              sortBy === "pct_points"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            Sort by Points %
          </button>
          <button
            onClick={() => setSortBy("pct_right")}
            className={cn(
              "rounded px-3 py-1 text-sm font-medium transition",
              sortBy === "pct_right"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            Sort by Win %
          </button>
          <button
            onClick={() => setSortBy("actual_points")}
            className={cn(
              "rounded px-3 py-1 text-sm font-medium transition",
              sortBy === "actual_points"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            Sort by Points
          </button>
        </div>
      </div>

      {/* Main Scoreboard Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {sortedUsers.map((user, index) => {
          const rank = getRank(index);
          const medal = getMedalEmoji(rank);
          const pointsPercentColor = getPercentageColor(
            (user.pct_points as number) || 0
          );
          const rightPercentColor = getPercentageColor(
            (user.pct_right as number) || 0
          );
          const pointsProgressColor = getProgressBarColor(
            (user.pct_points as number) || 0
          );
          const rightProgressColor = getProgressBarColor(
            (user.pct_right as number) || 0
          );

          return (
            <div
              key={user.username as string}
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            >
              {/* Rank and Username */}
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{medal}</span>
                    <div>
                      <div className="text-sm text-gray-600">Rank #{rank}</div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {user.username as string}
                      </h3>
                    </div>
                  </div>
                </div>
              </div>

              {/* Games Record */}
              <div className="mb-4 rounded bg-gray-50 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Record</span>
                  <span className="font-bold text-gray-900">
                    {user.games_correct as number}/
                    {user.completed_games as number}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={`h-full ${rightProgressColor}`}
                    style={{
                      width: `${
                        (user.completed_games as number) > 0
                          ? ((user.games_correct as number) /
                              (user.completed_games as number)) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <div
                  className={cn(
                    "mt-1 text-xs font-semibold",
                    rightPercentColor
                  )}
                >
                  {((user.pct_right as number) || 0).toFixed(1)}%
                </div>
              </div>

              {/* Points */}
              <div className="mb-4 rounded bg-gray-50 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Points Earned</span>
                  <span className="font-bold text-gray-900">
                    {user.actual_points as number}/
                    {user.actual_points_complete as number}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={`h-full ${pointsProgressColor}`}
                    style={{
                      width: `${
                        (user.actual_points_complete as number) > 0
                          ? ((user.actual_points as number) /
                              (user.actual_points_complete as number)) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <div
                  className={cn(
                    "mt-1 text-xs font-semibold",
                    pointsPercentColor
                  )}
                >
                  {((user.pct_points as number) || 0).toFixed(1)}%
                </div>
              </div>

              {/* Potential Score */}
              <div className="mb-4 rounded bg-blue-50 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Potential Score</span>
                  <span className="font-bold text-blue-600">
                    {user.total_possible_points as number}
                    <span className="text-xs text-gray-600"> pts</span>
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-cyan-600"
                    style={{
                      width: `${
                        (user.actual_points_complete as number) +
                          (user.points_remaining as number) >
                        0
                          ? ((user.total_possible_points as number) /
                              ((user.actual_points_complete as number) +
                                (user.points_remaining as number))) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <div className="mt-1 text-xs text-blue-600">
                  {((user.total_possible_pct as number) || 0).toFixed(1)}% if
                  all remaining games won
                </div>
              </div>

              {/* Expandable Details */}
              {showDetails && (
                <>
                  <button
                    onClick={() =>
                      setExpandedUser(
                        expandedUser === (user.username as string)
                          ? null
                          : (user.username as string)
                      )
                    }
                    className="w-full rounded bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
                  >
                    {expandedUser === (user.username as string)
                      ? "Hide Details"
                      : "Show Details"}
                  </button>

                  {expandedUser === (user.username as string) && (
                    <div className="mt-4 space-y-3 border-t border-gray-200 pt-4">
                      {/* Completed Games */}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Games Completed</span>
                          <div className="text-lg font-bold text-blue-600">
                            {user.completed_games as number}/
                            {user.total_games as number}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Games Remaining</span>
                          <div className="text-lg font-bold text-amber-600">
                            {(user.total_games as number) -
                              (user.completed_games as number)}
                          </div>
                        </div>
                      </div>

                      {/* Points Breakdown */}
                      <div className="rounded bg-gray-50 p-3 text-sm">
                        <div className="mb-2 font-semibold text-gray-900">
                          Points Breakdown
                        </div>
                        <div className="space-y-1 text-xs text-gray-600">
                          <div className="flex justify-between">
                            <span>Points on Completed Games</span>
                            <span>{user.actual_points_complete as number}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Points Earned</span>
                            <span className="font-semibold text-green-600">
                              +{user.actual_points as number}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Points on Remaining Games</span>
                            <span>{user.points_remaining as number}</span>
                          </div>
                          <div className="border-t border-gray-200 pt-1">
                            <div className="flex justify-between font-semibold text-gray-900">
                              <span>Best Possible Score</span>
                              <span className="text-blue-600">
                                {user.total_possible_points as number}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Record vs Expected */}
                      <div className="rounded bg-gray-50 p-3 text-sm">
                        <div className="mb-2 font-semibold text-gray-900">
                          Record Analysis
                        </div>
                        <div className="space-y-2 text-xs text-gray-600">
                          <div className="flex justify-between">
                            <span>Wins</span>
                            <span className="text-gray-900">
                              {user.games_correct as number}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Losses</span>
                            <span className="text-gray-900">
                              {(user.completed_games as number) -
                                (user.games_correct as number)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Win Percentage</span>
                            <span
                              className={cn("font-semibold", rightPercentColor)}
                            >
                              {((user.pct_right as number) || 0).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h4 className="mb-3 font-semibold text-gray-900">Performance Legend</h4>
        <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-600"></div>
            <span className="text-gray-600">≥80%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-600"></div>
            <span className="text-gray-600">70-79%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-amber-600"></div>
            <span className="text-gray-600">60-69%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-600"></div>
            <span className="text-gray-600">&lt;60%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(BowlScoreboard);
