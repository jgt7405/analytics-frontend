"use client";

import { useResponsive } from "@/hooks/useResponsive";
import { useMemo } from "react";

interface FootballSeedProjectionsProps {
  seedDistribution: Record<string, number>;
  cfpBidPct?: number;
}

export default function FootballSeedProjections({
  seedDistribution,
  cfpBidPct = 0,
}: FootballSeedProjectionsProps) {
  const { isMobile } = useResponsive();

  const processedData = useMemo(() => {
    const data = [];

    // Add "Out of CFP" category
    const outOfCFP = Math.max(0, 100 - cfpBidPct);
    if (outOfCFP > 0) {
      data.push({
        seed: "Out",
        percentage: outOfCFP,
        color: "#ef4444",
        label: "Out of CFP",
      });
    }

    // Process seed distribution (seeds 1-12 for CFP)
    for (let seed = 1; seed <= 12; seed++) {
      const seedKey = seed.toString();
      const seedValue = seedDistribution[seedKey];
      // ✅ Fix: Handle both string and number values properly
      const percentage =
        typeof seedValue === "number"
          ? seedValue
          : parseFloat(seedValue || "0");

      if (percentage > 0) {
        data.push({
          seed: seedKey,
          percentage,
          color: seed <= 4 ? "#22c55e" : seed <= 8 ? "#3b82f6" : "#f59e0b",
          label: `${seed} seed`,
        });
      }
    }

    return data.sort((a, b) => {
      if (a.seed === "Out") return 1;
      if (b.seed === "Out") return -1;
      return parseInt(a.seed) - parseInt(b.seed);
    });
  }, [seedDistribution, cfpBidPct]);

  if (processedData.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p className="text-sm">CFP Projections Coming Soon</p>
        <p className="text-xs mt-1">
          College Football Playoff seed projections will appear here.
        </p>
      </div>
    );
  }

  const chartSize = isMobile ? 200 : 280;
  const centerX = chartSize / 2;
  const centerY = chartSize / 2;
  const radius = isMobile ? 80 : 110;

  let currentAngle = -90; // Start at top

  return (
    <div className="flex flex-col items-center">
      <svg width={chartSize} height={chartSize} className="mb-4">
        {processedData.map((item, index) => {
          const angle = (item.percentage / 100) * 360;
          const startAngle = (currentAngle * Math.PI) / 180;
          const endAngle = ((currentAngle + angle) * Math.PI) / 180;

          const x1 = centerX + radius * Math.cos(startAngle);
          const y1 = centerY + radius * Math.sin(startAngle);
          const x2 = centerX + radius * Math.cos(endAngle);
          const y2 = centerY + radius * Math.sin(endAngle);

          const largeArc = angle > 180 ? 1 : 0;

          const pathData = [
            `M ${centerX} ${centerY}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
            "Z",
          ].join(" ");

          currentAngle += angle;

          return (
            <path
              key={index}
              d={pathData}
              fill={item.color}
              stroke="white"
              strokeWidth="2"
              className="hover:opacity-80 transition-opacity"
            />
          );
        })}

        {/* Center circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius * 0.4}
          fill="white"
          stroke="#e5e7eb"
          strokeWidth="2"
        />

        {/* Center text */}
        <text
          x={centerX}
          y={centerY - 5}
          textAnchor="middle"
          fontSize={isMobile ? "14" : "16"}
          fontWeight="bold"
          fill="#1f2937"
        >
          {cfpBidPct.toFixed(0)}%
        </text>
        <text
          x={centerX}
          y={centerY + 12}
          textAnchor="middle"
          fontSize={isMobile ? "10" : "12"}
          fill="#6b7280"
        >
          CFP Bid
        </text>
      </svg>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {processedData.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-gray-700">
              {item.label}: {item.percentage.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
