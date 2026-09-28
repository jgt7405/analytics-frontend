"use client";

// Below the chart: record and forecast summary, legend, and how many games
// were compared.

import type { TeamStats } from "./types";

interface StatsSummaryProps {
  teamStats: TeamStats;
  teamColor: string;
  chartedGames: number;
  comparisonGames: number;
}

export default function StatsSummary({
  teamStats,
  teamColor,
  chartedGames,
  comparisonGames,
}: StatsSummaryProps) {
  return (
    <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
      {/* Team Stats Summary - MOVED TO TOP */}
      <div className="text-center mt-0 -pt-1 border-b border-gray-300 dark:border-gray-600 text-xs">
        <div className="grid grid-cols-5 gap-4 justify-center px-2">
          <div>
            <div className="font-medium text-gray-700 dark:text-gray-300">Record:</div>
            <div style={{ color: teamColor }}>
              {teamStats.wins}-{teamStats.losses}
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-700 dark:text-gray-300">#50 Fcst:</div>
            <div>
              {teamStats.expectedWins.toFixed(1)}-
              {teamStats.expectedLosses.toFixed(1)}
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-700 dark:text-gray-300">Act Win %:</div>
            <div style={{ color: teamColor }}>
              {teamStats.actualWinPct.toFixed(0)}%
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-700 dark:text-gray-300">#50 Fcst %:</div>
            <div>{teamStats.forecastWinPct.toFixed(0)}%</div>
          </div>
          <div>
            <div className="font-medium text-gray-700 dark:text-gray-300">TWV:</div>
            <div
              style={{
                color:
                  teamStats.twv_50 > 0
                    ? "#10b981"
                    : teamStats.twv_50 < 0
                      ? "#ef4444"
                      : "#6b7280",
              }}
            >
              {teamStats.twv_50 > 0 ? "+" : ""}
              {teamStats.twv_50.toFixed(1)}
            </div>
          </div>
        </div>
      </div>

      {/* Legend - MOVED ABOVE COMPARISON */}
      <div className="flex flex-wrap gap-4 justify-center mt-2 pb-2 border-b border-gray-300 dark:border-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>Win</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>Loss</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-gray-50 dark:bg-slate-8000"></div>
          <span>Future Game</span>
        </div>
      </div>

      {/* Comparison text - AT BOTTOM */}
      <div className="text-center -mt-1">
        Comparing {chartedGames.toLocaleString()} games vs{" "}
        {comparisonGames.toLocaleString()} total &lt;95% games in
        dataset
        <br />
      </div>
    </div>
  );
}
