"use client";

// One game in the picker: away team, "@" (or "vs" at a neutral site), home
// team. Tapping a team picks it as the winner; tapping again clears it.

import type { WhatIfGame } from "@/types/football";
import Image from "next/image";
import { TEAL_COLOR } from "./data";

interface TeamPickProps {
  teamName: string;
  logo?: string;
  probability: number;
  isPicked: boolean;
  isDark: boolean;
  onPick: () => void;
  /** The away button sets marginRight, the home button marginLeft (both 0). */
  side: "away" | "home";
}

function TeamPick({ teamName, logo, probability, isPicked, isDark, onPick, side }: TeamPickProps) {
  return (
    <button
      onClick={onPick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
        transition: "all 0.2s",
        background: "none",
        border: "none",
        padding: "0",
        cursor: "pointer",
        ...(side === "away" ? { marginRight: "0" } : { marginLeft: "0" }),
      }}
    >
      <div
        style={{
          transition: "border 0.2s",
          border: isPicked ? `3px solid ${TEAL_COLOR}` : "2px solid transparent",
          borderRadius: "8px",
          display: "inline-block",
          lineHeight: 0,
          padding: "2px",
        }}
      >
        <div
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            backgroundColor: isDark ? "white" : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {logo ? (
            <Image src={logo} alt={teamName} width={24} height={24} className="object-contain" />
          ) : (
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px",
                fontWeight: "bold",
                color: isDark ? "#9ca3af" : "#374151",
              }}
            >
              {teamName.substring(0, 2).toUpperCase()}
            </div>
          )}
        </div>
      </div>
      <span
        style={{
          fontSize: "10px",
          fontWeight: "bold",
          color: isDark ? "#d1d5db" : "#4b5563",
        }}
      >
        {(probability * 100).toFixed(0)}%
      </span>
    </button>
  );
}

interface GameTileProps {
  game: WhatIfGame;
  /** Picked winner's team id, if any. */
  selectedTeam: string | undefined;
  isDark: boolean;
  onPick: (gameId: number, teamId: string) => void;
}

export default function GameTile({ game, selectedTeam, isDark, onPick }: GameTileProps) {
  const isNeutral = Boolean(game.neutral_site);
  const separator = isNeutral ? "vs" : "@";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "4px",
        padding: "4px 2px",
        borderRadius: "12px",
        border: `${selectedTeam ? "3px" : "2px"} solid ${selectedTeam ? TEAL_COLOR : isDark ? "#374151" : "#d1d5db"}`,
        backgroundColor: isDark ? "#1a1f2e" : "#ffffff",
        transition: "all 0.2s",
      }}
      title={`Game ${game.game_id}: selected=${selectedTeam}`}
    >
      <TeamPick
        teamName={game.away_team}
        logo={game.away_team_logo}
        probability={game.away_probability}
        isPicked={selectedTeam === String(game.away_team_id)}
        isDark={isDark}
        onPick={() => onPick(game.game_id, String(game.away_team_id))}
        side="away"
      />

      <div
        style={{
          fontSize: "11px",
          fontWeight: 800,
          color: isDark ? "#d1d5db" : "#4b5563",
        }}
      >
        {separator}
      </div>

      <TeamPick
        teamName={game.home_team}
        logo={game.home_team_logo}
        probability={game.home_probability}
        isPicked={selectedTeam === String(game.home_team_id)}
        isDark={isDark}
        onPick={() => onPick(game.game_id, String(game.home_team_id))}
        side="home"
      />
    </div>
  );
}
