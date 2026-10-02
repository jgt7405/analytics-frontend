"use client";

// One game: pick the winner by tapping a team tile.

import { type WhatIfGame } from "@/hooks/useBasketballWhatIf";
import { TEAL_COLOR } from "./helpers";
import { CheckIcon } from "./icons";
import { resizedLogoSrc } from "@/lib/logo-src";

function TeamTile({
  logoUrl,
  teamName,
  probability,
  isSelected,
  onClick,
  isDark,
}: {
  logoUrl?: string;
  teamName: string;
  probability?: number | null;
  isSelected: boolean;
  onClick: () => void;
  isDark: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-center justify-center w-10 h-10 rounded transition-all"
      style={{
        border: isSelected
          ? `2px solid ${TEAL_COLOR}`
          : "1px solid transparent",
        backgroundColor: isSelected ? "rgba(0,151,178,0.08)" : "white",
      }}
      title={teamName}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          backgroundColor: isDark ? "white" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resizedLogoSrc(logoUrl, 24)}
            alt={teamName}
            className="w-6 h-6 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span className="text-[8px] font-bold text-gray-500 dark:text-gray-300">
            {teamName.substring(0, 3)}
          </span>
        )}
      </div>
      {probability != null && (
        <span className="text-[8px] text-gray-400 mt-0.5">
          {Math.round(probability * 100)}%
        </span>
      )}
      {isSelected && (
        <div
          className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
          style={{ backgroundColor: TEAL_COLOR }}
        >
          <CheckIcon size={8} />
        </div>
      )}
    </button>
  );
}

export function GameCard({
  game,
  selectedWinner,
  onSelect,
  isDark,
}: {
  game: WhatIfGame;
  selectedWinner: number | undefined;
  onSelect: (gid: number, wid: number) => void;
  isDark: boolean;
}) {
  const has = selectedWinner !== undefined;
  return (
    <div
      className="flex items-center gap-0.5 p-0.5 rounded"
      style={{
        border: has ? `2px solid ${TEAL_COLOR}` : "1px solid #d1d5db",
      }}
    >
      <TeamTile
        logoUrl={game.away_logo_url}
        teamName={game.away_team}
        probability={game.away_probability}
        isSelected={selectedWinner === game.away_team_id}
        onClick={() => onSelect(game.game_id, game.away_team_id)}
        isDark={isDark}
      />
      <span className="text-[8px] text-gray-400">
        {game.neutral_site ? "vs" : "@"}
      </span>
      <TeamTile
        logoUrl={game.home_logo_url}
        teamName={game.home_team}
        probability={game.home_probability}
        isSelected={selectedWinner === game.home_team_id}
        onClick={() => onSelect(game.game_id, game.home_team_id)}
        isDark={isDark}
      />
    </div>
  );
}
