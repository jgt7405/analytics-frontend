"use client";

// Below the chart: current and projected record, legend, and notes.

import type { ConfChampData } from "./types";

interface ChartFooterProps {
  chartHeight: number;
  confChampData: ConfChampData | null;
  primaryColor: string;
}

export default function ChartFooter({ chartHeight, confChampData, primaryColor }: ChartFooterProps) {
  return (
    <>
      {confChampData && (
        <g>
          <text x={-53} y={chartHeight + 15} fontSize="13" fill="#6b7280" fontWeight="500">
            Current Record:
          </text>
          <text x={-53} y={chartHeight + 28} fontSize="13" fill={primaryColor} fontWeight="bold">
            {confChampData.actual_total_wins || 0}-
            {confChampData.actual_total_losses || 0}
          </text>

          <text x={65} y={chartHeight + 15} fontSize="13" fill="#6b7280" fontWeight="500">
            Proj Final Record:
          </text>
          <text x={65} y={chartHeight + 28} fontSize="13" fill={primaryColor} fontWeight="bold">
            {(confChampData.season_total_proj_wins_avg || 0).toFixed(1)}-
            {(confChampData.proj_losses || 0).toFixed(1)}
          </text>
        </g>
      )}

      <g>
        <rect
          x={-80}
          y={chartHeight + 35}
          width={12}
          height={12}
          fill={primaryColor}
          stroke="#000"
          strokeWidth={1}
        />
        <text x={-65} y={chartHeight + 44} fontSize="11" fill="#374151" fontWeight="500">
          - wins to date
        </text>

        <rect
          x={10}
          y={chartHeight + 35}
          width={12}
          height={12}
          fill="none"
          stroke="#000"
          strokeWidth={1}
          strokeDasharray="2,2"
        />
        <text x={26} y={chartHeight + 44} fontSize="11" fill="#374151" fontWeight="500">
          - future games
        </text>

        <image
          x={110}
          y={chartHeight + 33}
          width={16}
          height={16}
          href="/images/favicon-16x16.png"
          opacity={0.9}
        />
        <text x={128} y={chartHeight + 44} fontSize="11" fill="#374151" fontWeight="500">
          - JThom proj wins
        </text>
      </g>

      <text x={-80} y={chartHeight + 70} fontSize="9" fill="#374151">
        <tspan fontWeight="500">Win Prob</tspan>
        <tspan> = probability team would win vs opponent;</tspan>
      </text>
      <text x={-80} y={chartHeight + 80} fontSize="9" fill="#374151">
        <tspan fontWeight="500">Loc</tspan>
        <tspan> = location of the game (H=Home, A=Away, N=Neutral)</tspan>
      </text>

      <text x={-80} y={chartHeight + 90} fontSize="9" fill="#374151">
        <tspan fontWeight="500">Game</tspan>
        <tspan>
          {" "}
          = current wins and count of potential remaining games;{" "}
        </tspan>
        <tspan fontWeight="500">Opp</tspan>
        <tspan> = Opponent;</tspan>
      </text>
      <text x={-80} y={chartHeight + 100} fontSize="9" fill="#374151">
        <tspan fontWeight="500">NCAA Seed</tspan>
        <tspan> = expected seed by wins</tspan>
      </text>

      <text
        x={-80}
        y={chartHeight + 112}
        fontSize="8"
        fill="#4b5563"
        fontWeight="400"
        fontStyle="italic"
      >
        <tspan>
          Projected seed range for team based on number of victories.
        </tspan>
        <tspan x={-80} dy="10">
          Schedule strength factors into range that is identified.
        </tspan>
        <tspan x={-80} dy="10">
          Proj Wins is average total wins in regular season and conference
        </tspan>
        <tspan x={-80} dy="10">
          tournament by team based on 1,000 season simulations using
          composite
        </tspan>
        <tspan x={-80} dy="10">
          ratings based on kenpom, barttorvik and evanmiya.
        </tspan>
      </text>
    </>
  );
}
