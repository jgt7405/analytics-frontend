"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { useMemo } from "react";

interface FootballTeamGame {
  date: string;
  opponent: string;
  opponent_logo?: string;
  location: string;
  status: string;
  twv?: number;
  cwv?: number;
  sagarin_rank?: number;
}

interface FootballTeamScheduleProps {
  schedule: FootballTeamGame[];
  navigateToTeam: (teamName: string) => void;
  className?: string;
}

type LocationType = "Away" | "Neutral" | "Home";

export default function FootballTeamSchedule({
  schedule,
  navigateToTeam,
  className = "",
}: FootballTeamScheduleProps) {
  const { isMobile } = useResponsive();

  const groupedGames = useMemo(() => {
    const groups: Record<LocationType, FootballTeamGame[]> = {
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

    // Sort by Sagarin rank (ascending - lower numbers = better teams)
    Object.keys(groups).forEach((location) => {
      const loc = location as LocationType;
      groups[loc].sort((a, b) => {
        if (a.sagarin_rank && b.sagarin_rank) {
          return a.sagarin_rank - b.sagarin_rank;
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

  const formatRanking = (sagarin_rank?: number) => {
    if (!sagarin_rank) return "";
    if (sagarin_rank === 999) return "FCS";
    return `#${sagarin_rank}`;
  };

  const formatRankingForTitle = (sagarin_rank?: number) => {
    if (!sagarin_rank) return "Unranked";
    if (sagarin_rank === 999) return "FCS";
    return `#${sagarin_rank}`;
  };

  const isFCSTeam = (sagarin_rank?: number) => {
    return sagarin_rank === 999;
  };

  const boxWidth = isMobile ? 70 : 80;
  const boxHeight = isMobile ? 36 : 40;
  const logoSize = isMobile ? 24 : 28;

  return (
    <div className={`flex gap-4 overflow-x-auto ${className}`}>
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
              groupedGames.groups[location].map((game, idx) => {
                const isClickable = !isFCSTeam(game.sagarin_rank);

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2 rounded bg-white transition-opacity ${
                      isClickable
                        ? "cursor-pointer hover:opacity-80"
                        : "cursor-default"
                    }`}
                    style={{
                      width: boxWidth,
                      height: boxHeight,
                      border: `2px solid ${getBorderColor(game.status)}`,
                    }}
                    onClick={() => isClickable && navigateToTeam(game.opponent)}
                    title={`${game.opponent} (${formatRankingForTitle(game.sagarin_rank)}) - ${game.status === "W" ? "Win" : game.status === "L" ? "Loss" : "Scheduled"}`}
                  >
                    <TeamLogo
                      logoUrl={
                        game.opponent_logo || "/images/team_logos/default.png"
                      }
                      teamName={game.opponent}
                      size={logoSize}
                    />
                    <span className="text-xs text-gray-600 font-medium">
                      {formatRanking(game.sagarin_rank)}
                    </span>
                  </div>
                );
              })
            ) : (
              <div
                className="flex items-center justify-center text-xs text-gray-400"
                style={{
                  width: boxWidth,
                  height: boxHeight,
                  border: "1px dashed #d1d5db",
                  borderRadius: "4px",
                }}
              >
                None
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
