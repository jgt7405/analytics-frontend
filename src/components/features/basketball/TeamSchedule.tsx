// src/components/features/basketball/TeamSchedule.tsx
"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { useMemo } from "react";

interface TeamGame {
  date: string;
  opponent: string;
  opponent_logo?: string;
  location: string;
  status: string;
  kenpom_rank?: number;
}

interface TeamScheduleProps {
  schedule: TeamGame[];
  teamName: string;
  navigateToTeam: (teamName: string) => void;
}

type LocationType = "Away" | "Neutral" | "Home";

export default function TeamSchedule({
  schedule,
  navigateToTeam,
}: TeamScheduleProps) {
  const { isMobile } = useResponsive();

  const groupedGames = useMemo(() => {
    const groups: Record<LocationType, TeamGame[]> = {
      Away: [],
      Neutral: [],
      Home: [],
    };
    const records: Record<LocationType, { wins: number; losses: number }> = {
      Away: { wins: 0, losses: 0 },
      Neutral: { wins: 0, losses: 0 },
      Home: { wins: 0, losses: 0 },
    };

    schedule.forEach((game) => {
      const location = game.location as LocationType;
      if (location && groups[location]) {
        groups[location].push(game);

        if (game.status === "W") {
          records[location].wins++;
        } else if (game.status === "L") {
          records[location].losses++;
        }
      }
    });

    // Sort by kenpom rank
    Object.keys(groups).forEach((location) => {
      const loc = location as LocationType;
      groups[loc].sort((a, b) => {
        if (a.kenpom_rank && b.kenpom_rank) {
          return a.kenpom_rank - b.kenpom_rank;
        }
        return a.opponent.localeCompare(b.opponent);
      });
    });

    return { groups, records };
  }, [schedule]);

  const getBorderColor = (status: string) => {
    switch (status) {
      case "W":
        return "#22c55e"; // Green
      case "L":
        return "#ef4444"; // Red
      default:
        return "#e5e7eb"; // Gray
    }
  };

  const boxWidth = isMobile ? 70 : 80;
  const boxHeight = isMobile ? 36 : 40;
  const logoSize = isMobile ? 24 : 28;

  return (
    <div className="flex gap-4 overflow-x-auto">
      {(["Away", "Neutral", "Home"] as const).map((location) => (
        <div key={location} className="flex-shrink-0">
          <div className="text-center mb-3">
            <h3 className="text-sm font-semibold text-gray-600 -mb-1">
              {location}
            </h3>
            <div className="text-xs text-gray-500">
              {groupedGames.records[location].wins}-
              {groupedGames.records[location].losses}
            </div>
          </div>

          <div className="space-y-2">
            {groupedGames.groups[location].length > 0 ? (
              groupedGames.groups[location].map((game, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded bg-white"
                  style={{
                    width: boxWidth,
                    height: boxHeight,
                    border: `2px solid ${getBorderColor(game.status)}`,
                  }}
                >
                  <TeamLogo
                    logoUrl={game.opponent_logo || "/images/default-logo.png"}
                    teamName={game.opponent}
                    size={logoSize}
                    onClick={() => navigateToTeam(game.opponent)}
                  />
                  <span className="text-xs text-gray-600">
                    {game.kenpom_rank ? `#${game.kenpom_rank}` : ""}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-500 text-center">None</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
