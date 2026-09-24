"use client";

import TableActionButtons from "@/components/common/TableActionButtons";
import TeamLogo from "@/components/ui/TeamLogo";
import type { FootballSeasonHighlightGame } from "@/types/football";
import { useMemo, useState } from "react";

const LIMIT_OPTIONS = [10, 20, 50, 100, "All"] as const;

interface FootballSeasonHighlightsTableProps {
  title: string;
  description: string;
  /** Column header for the win-probability value. */
  probLabel: string;
  rows: FootballSeasonHighlightGame[];
  /** Default number of rows shown before the user expands. */
  defaultLimit?: number;
  /** Unique class name used both as the export target and a React key seed. */
  exportClassName: string;
  /** Filename slug for the downloaded image. */
  pageName: string;
}

export default function FootballSeasonHighlightsTable({
  title,
  description,
  probLabel,
  rows,
  defaultLimit = 20,
  exportClassName,
  pageName,
}: FootballSeasonHighlightsTableProps) {
  const [limit, setLimit] = useState<number | "All">(defaultLimit);

  const visibleRows = limit === "All" ? rows : rows.slice(0, limit);

  // Standard competition ranking (1, 1, 3, ...): rows that tie on the
  // displayed win-probability value share a rank, keyed off the rounded
  // percentage actually shown so a display tie always reads as a tie.
  const ranks = useMemo(() => {
    let rank = 0;
    let lastKey: number | null | undefined = undefined;
    return visibleRows.map((row, index) => {
      const key = row.win_prob != null ? Math.round(row.win_prob * 1000) : null;
      if (index === 0 || key !== lastKey) {
        rank = index + 1;
        lastKey = key;
      }
      return rank;
    });
  }, [visibleRows]);

  return (
    <div className="relative border border-slate-200/90 dark:border-slate-700/90 rounded-[1.25rem] bg-gradient-to-br from-white to-[#fbfdff] dark:from-[#111827] dark:to-[#0f172a] shadow-[0_22px_55px_-36px_rgb(15_23_42_/_0.36),0_8px_22px_-18px_rgb(15_23_42_/_0.24)] dark:shadow-[0_24px_58px_-34px_rgb(0_0_0_/_0.82)] p-4 md:p-6">
      <div className={exportClassName}>
        <div className="flex items-start justify-between flex-wrap gap-3 mb-1">
          <div>
            <h2 className="text-[clamp(1.1rem,2vw,1.4rem)] font-bold leading-[1.1] tracking-[-0.035em] text-slate-700 dark:text-slate-300">
              {title}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">
              {description}
            </p>
          </div>
          <div
            className="flex items-center gap-1.5"
            data-screenshot-hide="true"
          >
            <span className="text-xs text-gray-500 dark:text-gray-300 mr-1">
              Show:
            </span>
            {LIMIT_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => setLimit(option)}
                className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                  limit === option
                    ? "bg-[rgb(0,151,178)] text-white border-[rgb(0,151,178)]"
                    : "bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-800"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-300">
            No games found for this chart yet.
          </div>
        ) : (
          <div className="mt-3">
            {/* inline-block + overflow-x-auto: the table hugs its own content
                width instead of stretching to fill the card, but still
                scrolls horizontally on a viewport narrower than the table. */}
            <div className="inline-block max-w-full overflow-x-auto align-top">
              <div className="max-h-[560px] overflow-y-auto rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                <table className="text-sm border-collapse min-w-[640px]">
                  <thead>
                    <tr className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-2 pl-3 pr-2 font-semibold text-slate-600 dark:text-slate-300">
                        #
                      </th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-600 dark:text-slate-300">
                        Team
                      </th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-600 dark:text-slate-300">
                        Opponent
                      </th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-600 dark:text-slate-300">
                        {probLabel}
                      </th>
                      <th className="text-center py-2 px-2 font-semibold text-slate-600 dark:text-slate-300">
                        Score
                      </th>
                      <th className="text-center py-2 px-2 font-semibold text-slate-600 dark:text-slate-300">
                        Date
                      </th>
                      <th className="text-center py-2 pr-3 pl-2 font-semibold text-slate-600 dark:text-slate-300">
                        Location
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row, index) => (
                      <tr
                        key={`${row.team}-${row.opponent}-${row.date}-${index}`}
                        className="border-b border-slate-100 dark:border-slate-800 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      >
                        <td className="py-1.5 pl-3 pr-2 text-slate-500 dark:text-slate-400">
                          {ranks[index]}
                        </td>
                        <td className="py-1.5 px-2">
                          <div className="flex items-center gap-2">
                            <TeamLogo
                              logoUrl={row.team_logo}
                              teamName={row.team}
                              size={22}
                            />
                            <span className="font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                              {row.team}
                            </span>
                          </div>
                        </td>
                        <td className="py-1.5 px-2">
                          <div className="flex items-center gap-2">
                            <TeamLogo
                              logoUrl={row.opponent_logo}
                              teamName={row.opponent}
                              size={22}
                            />
                            <span className="text-slate-700 dark:text-slate-200 whitespace-nowrap">
                              {row.opponent}
                            </span>
                          </div>
                        </td>
                        <td className="py-1.5 px-2 text-right font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                          {row.win_prob != null
                            ? `${(row.win_prob * 100).toFixed(1)}%`
                            : "-"}
                        </td>
                        <td className="py-1.5 px-2 text-center text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {row.team_points != null && row.opp_points != null
                            ? `${Math.max(row.team_points, row.opp_points)}-${Math.min(row.team_points, row.opp_points)}`
                            : "-"}
                        </td>
                        <td className="py-1.5 px-2 text-center text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {row.date || "-"}
                        </td>
                        <td className="py-1.5 pr-3 pl-2 text-center text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {row.location || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end mt-3">
        <div className="w-auto">
          <TableActionButtons
            contentSelector={`.${exportClassName}`}
            pageName={pageName}
            pageTitle={title}
            shareTitle={title}
            disabled={rows.length === 0}
          />
        </div>
      </div>
    </div>
  );
}
