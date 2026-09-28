"use client";

// Below the chart: result colors and how many games were compared.

import { GRAY_COLOR } from "./constants";

export default function Legend({ chartedGames, comparisonGames }: { chartedGames: number; comparisonGames: number }) {
  return (
    <div className="mt-4 text-xs text-gray-600 dark:text-gray-300">
      <div className="flex flex-wrap gap-4 justify-center">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>Win</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>Loss</span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: GRAY_COLOR }}
          ></div>
          <span>Future Game</span>
        </div>
      </div>

      <div className="text-center mt-2">
        Comparing {chartedGames} games vs{" "}
        {comparisonGames.toLocaleString()} {"<"}95% total
        games in dataset
      </div>
    </div>
  );
}
