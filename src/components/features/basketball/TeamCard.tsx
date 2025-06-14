"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { cn } from "@/lib/utils";
import { memo } from "react";

interface Team {
  team_id: string;
  team_name: string;
  logo_url: string;
  conference: string;
  primary_color?: string;
  secondary_color?: string;
  record?: string;
  tournament_bid_pct?: number;
  average_seed?: number;
  kenpom_rank?: number;
}

interface TeamCardProps {
  team: Team;
  onClick: () => void;
  className?: string;
}

function TeamCard({ team, onClick, className }: TeamCardProps) {
  const { isMobile } = useResponsive();

  const formatTournamentPct = (value?: number) => {
    if (value === null || value === undefined) return null;
    if (value > 0 && value <= 1) return `${Math.round(value * 100)}%`;
    return `${Math.round(value)}%`;
  };

  const formatSeed = (value?: number) => {
    if (value === null || value === undefined) return null;
    return value.toFixed(1);
  };

  return (
    <div
      className={cn(
        "bg-white border border-gray-200 rounded-lg p-3 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-gray-300",
        className
      )}
      onClick={onClick}
      style={{
        minHeight: isMobile ? "120px" : "140px",
      }}
    >
      {/* Team Logo and Name */}
      <div className="flex flex-col items-center mb-3">
        <TeamLogo
          logoUrl={team.logo_url}
          teamName={team.team_name}
          size={isMobile ? 32 : 40}
          className="mb-2"
        />
        <h3
          className={cn(
            "font-medium text-center leading-tight",
            isMobile ? "text-xs" : "text-sm"
          )}
          style={{
            color: team.primary_color || "#374151",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {team.team_name}
        </h3>
      </div>

      {/* Team Stats */}
      <div className="space-y-1">
        {team.record && (
          <div
            className={cn(
              "flex justify-between",
              isMobile ? "text-xs" : "text-sm"
            )}
          >
            <span className="text-gray-600">Record:</span>
            <span className="font-medium">{team.record}</span>
          </div>
        )}

        {team.kenpom_rank && (
          <div
            className={cn(
              "flex justify-between",
              isMobile ? "text-xs" : "text-sm"
            )}
          >
            <span className="text-gray-600">KenPom:</span>
            <span className="font-medium">#{team.kenpom_rank}</span>
          </div>
        )}

        {formatTournamentPct(team.tournament_bid_pct) && (
          <div
            className={cn(
              "flex justify-between",
              isMobile ? "text-xs" : "text-sm"
            )}
          >
            <span className="text-gray-600">Tourney %:</span>
            <span className="font-medium">
              {formatTournamentPct(team.tournament_bid_pct)}
            </span>
          </div>
        )}

        {formatSeed(team.average_seed) && (
          <div
            className={cn(
              "flex justify-between",
              isMobile ? "text-xs" : "text-sm"
            )}
          >
            <span className="text-gray-600">Avg Seed:</span>
            <span className="font-medium">{formatSeed(team.average_seed)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(TeamCard);
