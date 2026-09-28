"use client";

// The picked winners, listed above the results.

import { type WhatIfGame } from "@/hooks/useBasketballWhatIf";
import { TEAL_COLOR } from "./helpers";
import { TeamLogo } from "./icons";

// Change 2: always-visible selections (no dropdown/collapsible)
// Change 3: decreased height with py-0.5 instead of py-1
// Change 4: rounded (rectangle) instead of rounded-full (oval) for selection borders
export function SelectionLegend({
  games,
  selections,
}: {
  games: WhatIfGame[];
  selections: Map<number, number>;
}) {
  if (selections.size === 0) return null;

  const items = Array.from(selections.entries())
    .map(([gid, wid]) => {
      const g = games.find((x) => x.game_id === gid);
      return g ? { game: g, wid } : null;
    })
    .filter(Boolean) as Array<{ game: WhatIfGame; wid: number }>;

  return (
    <div className="mb-3">
      <p className="text-[11px] text-gray-500 dark:text-gray-300 mb-1">
        Selections: {selections.size} game
        {selections.size !== 1 ? "s" : ""}
      </p>
      <div className="flex flex-wrap gap-1">
        {items.map(({ game, wid }) => {
          const awayWins = wid === game.away_team_id;
          return (
            <div
              key={game.game_id}
              className="flex items-center gap-0.5 bg-white dark:bg-slate-900 rounded"
              style={{ border: "1px solid #d1d5db", padding: "1px 2px" }}
            >
              <span
                className="rounded"
                style={{
                  border: awayWins
                    ? `2px solid ${TEAL_COLOR}`
                    : "2px solid transparent",
                  padding: "1px",
                  lineHeight: 0,
                }}
              >
                <TeamLogo
                  src={game.away_logo_url}
                  alt={game.away_team}
                  size={12}
                />
              </span>
              <span className="text-[8px] text-gray-300">
                {game.neutral_site ? "vs" : "@"}
              </span>
              <span
                className="rounded"
                style={{
                  border: !awayWins
                    ? `2px solid ${TEAL_COLOR}`
                    : "2px solid transparent",
                  padding: "1px",
                  lineHeight: 0,
                }}
              >
                <TeamLogo
                  src={game.home_logo_url}
                  alt={game.home_team}
                  size={12}
                />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
