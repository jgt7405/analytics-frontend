"use client";

// Below the chart: record and forecast summary, and what was compared.

import type { TeamStats } from "./types";

interface StatsSummaryProps {
  teamStats: TeamStats;
  teamColor?: string;
  teamGameCount: number;
  comparisonGameCount: number;
  filterDescription: string;
}

export default function StatsSummary({
  teamStats,
  teamColor,
  teamGameCount,
  comparisonGameCount,
  filterDescription,
}: StatsSummaryProps) {
  return (
    <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
      {/* Stats summary grid */}
      <div className="text-center mt-0 border-b border-gray-300 dark:border-gray-600 text-xs">
        <div className="grid grid-cols-5 gap-4 justify-center px-2">
          <div>
            <div className="font-bold text-gray-600 dark:text-gray-400">Record:</div>
            <div className="font-bold" style={{ color: teamColor }}>
              {teamStats.wins}-{teamStats.losses}
            </div>
          </div>
          <div>
            <div className="font-bold text-gray-600 dark:text-gray-400">#12 Fcst:</div>
            <div className="font-bold text-gray-600 dark:text-gray-300">
              {teamStats.expectedWins.toFixed(1)}-
              {teamStats.expectedLosses.toFixed(1)}
            </div>
          </div>
          <div>
            <div className="font-bold text-gray-600 dark:text-gray-400">Act Win %:</div>
            <div className="font-bold" style={{ color: teamColor }}>
              {teamStats.actualWinPct.toFixed(0)}%
            </div>
          </div>
          <div>
            <div className="font-bold text-gray-600 dark:text-gray-400">#12 Fcst %:</div>
            <div className="font-bold text-gray-600 dark:text-gray-300">
              {teamStats.forecastWinPct.toFixed(0)}%
            </div>
          </div>
          <div>
            <div className="font-bold text-gray-600 dark:text-gray-400">TWV:</div>
            <div
              className="font-bold"
              style={{
                color:
                  teamStats.twv > 0
                    ? "#10b981"
                    : teamStats.twv < 0
                      ? "#ef4444"
                      : "#6b7280",
              }}
            >
              {teamStats.twv > 0 ? "+" : ""}
              {teamStats.twv.toFixed(1)}
            </div>
          </div>
        </div>
      </div>
      {/* Existing footnote */}
      <div className="mb-2 mt-2 font-bold">
        <span className="font-bold">
          {teamGameCount.toLocaleString()}
        </span>{" "}
        {teamGameCount === 1 ? "game" : "games"} compared to{" "}
        <span className="font-bold">
          {comparisonGameCount.toLocaleString()}
        </span>{" "}
        {comparisonGameCount === 1 ? "game" : "games"} in{" "}
        {filterDescription}
      </div>
      <div className="text-gray-500 dark:text-gray-300">
        Win probabilities based on Sagarin ratings for #12 ranked team
      </div>
    </div>
  );
}
