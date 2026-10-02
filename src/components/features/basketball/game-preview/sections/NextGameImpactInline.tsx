"use client";

// Next game win/loss impact on seeding and NCAA chances.

import TeamLogo from "@/components/ui/TeamLogo";
import { getCellColor } from "@/lib/color-utils";
import { type NextGameImpactData, type NextGameMetrics, type TeamInfo } from "@/types/gamePreview";
import { TEAL, getLogoUrl, ordinal } from "../metrics";
import { resizedLogoSrc } from "@/lib/logo-src";

// ─── Next Game Impact Inline Component ───────────────────────────────────────

export function NextGameImpactInline({
  teamInfo,
  impactData: externalImpactData,
}: {
  teamId: string;
  conference: string;
  teamInfo: TeamInfo;
  impactData?: NextGameImpactData | null;
}) {
  // Use pre-fetched data from parent
  const impactData = externalImpactData ?? null;

  if (!impactData) {
    return (
      <div className="flex items-center justify-center py-4">
        <div
          className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: `${TEAL} transparent transparent transparent` }}
        />
        <span className="text-xs text-gray-400 ml-2">
          Calculating impact...
        </span>
      </div>
    );
  }
  if (impactData.error || !impactData.game) return null;

  const game = impactData.game;
  const teamKey = String(impactData.team_id);
  const teamMetrics =
    (impactData.current as Record<string, NextGameMetrics>)?.[teamKey] ?? null;
  const winMetrics =
    (impactData.with_win as Record<string, NextGameMetrics>)?.[teamKey] ?? null;
  const lossMetrics =
    (impactData.with_loss as Record<string, NextGameMetrics>)?.[teamKey] ??
    null;
  if (!teamMetrics || !winMetrics || !lossMetrics) return null;

  const numTeams = teamMetrics.num_teams ?? 16;
  const COL_METRIC = { minWidth: "100px" };
  const COL_DATA = { minWidth: "50px", width: "50px" };

  const summaryMetrics: {
    label: string;
    key: keyof NextGameMetrics;
    isPercent: boolean;
  }[] = [
    { label: "#1 Seed %", key: "first_seed_pct", isPercent: true },
    { label: "Top 4 %", key: "top4_pct", isPercent: true },
    { label: "Top 8 %", key: "top8_pct", isPercent: true },
    { label: "Avg Seed", key: "avg_seed", isPercent: false },
    { label: "Proj Conf Wins", key: "avg_conf_wins", isPercent: false },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-gray-200">
        <TeamLogo
          logoUrl={teamInfo.logo_url || ""}
          teamName={teamInfo.team_name}
          size={16}
        />
        <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
          {teamInfo.team_name}
        </span>
      </div>

      <div className="flex items-center justify-center gap-2 mb-2 py-1 bg-gray-50 rounded">
        <div className="flex items-center gap-0.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resizedLogoSrc(getLogoUrl(game.away_team_logo), 16)}
            alt={game.away_team}
            className="w-4 h-4 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <span className="text-[10px] font-medium">{game.away_team}</span>
        </div>
        <span className="text-[9px] text-gray-400">@</span>
        <div className="flex items-center gap-0.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resizedLogoSrc(getLogoUrl(game.home_team_logo), 16)}
            alt={game.home_team}
            className="w-4 h-4 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <span className="text-[10px] font-medium">{game.home_team}</span>
        </div>
        <span className="text-[8px] text-gray-400 ml-1">{game.date}</span>
      </div>

      <h4 className="text-xs font-medium mb-1.5">
        Conference Tournament Probabilities
      </h4>

      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500 dark:text-gray-300">
            <th className="text-left py-1 px-1 font-normal" style={COL_METRIC}>
              Metric
            </th>
            <th className="text-center py-1 px-1 font-normal" style={COL_DATA}>
              Current
            </th>
            <th
              className="text-center py-1 px-1 font-normal"
              style={{ ...COL_DATA, color: "rgb(40, 167, 69)" }}
            >
              Win
            </th>
            <th
              className="text-center py-1 px-1 font-normal"
              style={{ ...COL_DATA, color: "rgb(220, 53, 69)" }}
            >
              Loss
            </th>
          </tr>
        </thead>
        <tbody>
          {summaryMetrics.map(({ label, key, isPercent }) => {
            const cur = teamMetrics[key] as number;
            const win = winMetrics[key] as number;
            const loss = lossMetrics[key] as number;
            return (
              <tr key={key} className="border-b border-gray-100">
                <td className="py-1 px-1 text-xs">{label}</td>
                <td
                  className="text-center py-1 px-1 tabular-nums"
                  style={isPercent ? getCellColor(cur, "blue") : undefined}
                >
                  {isPercent
                    ? cur > 0
                      ? `${cur.toFixed(1)}%`
                      : ""
                    : cur.toFixed(1)}
                </td>
                <td
                  className="text-center py-1 px-1 tabular-nums"
                  style={isPercent ? getCellColor(win, "blue") : undefined}
                >
                  {isPercent
                    ? win > 0
                      ? `${win.toFixed(1)}%`
                      : ""
                    : win.toFixed(1)}
                </td>
                <td
                  className="text-center py-1 px-1 tabular-nums"
                  style={isPercent ? getCellColor(loss, "blue") : undefined}
                >
                  {isPercent
                    ? loss > 0
                      ? `${loss.toFixed(1)}%`
                      : ""
                    : loss.toFixed(1)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-2">
        <h4 className="text-xs font-medium mb-1.5">Seed Probabilities</h4>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 dark:text-gray-300">
              <th
                className="text-left py-1 px-1 font-normal"
                style={COL_METRIC}
              >
                Seed
              </th>
              <th
                className="text-center py-1 px-1 font-normal"
                style={COL_DATA}
              >
                Current
              </th>
              <th
                className="text-center py-1 px-1 font-normal"
                style={{ ...COL_DATA, color: "rgb(40, 167, 69)" }}
              >
                Win
              </th>
              <th
                className="text-center py-1 px-1 font-normal"
                style={{ ...COL_DATA, color: "rgb(220, 53, 69)" }}
              >
                Loss
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: numTeams }, (_, i) => {
              const seed = i + 1;
              const seedKey = `seed_${seed}_pct` as keyof NextGameMetrics;
              const cur = (teamMetrics[seedKey] as number) ?? 0;
              const win = (winMetrics[seedKey] as number) ?? 0;
              const loss = (lossMetrics[seedKey] as number) ?? 0;
              if (cur === 0 && win === 0 && loss === 0) return null;
              return (
                <tr key={seed} className="border-b border-gray-100">
                  <td className="py-1 px-1 text-xs">{ordinal(seed)}</td>
                  <td
                    className="text-center py-1 px-1 tabular-nums"
                    style={getCellColor(cur, "blue")}
                  >
                    {cur > 0 ? `${cur.toFixed(1)}%` : ""}
                  </td>
                  <td
                    className="text-center py-1 px-1 tabular-nums"
                    style={getCellColor(win, "blue")}
                  >
                    {win > 0 ? `${win.toFixed(1)}%` : ""}
                  </td>
                  <td
                    className="text-center py-1 px-1 tabular-nums"
                    style={getCellColor(loss, "blue")}
                  >
                    {loss > 0 ? `${loss.toFixed(1)}%` : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="my-3 border-t border-gray-300" />

      <h4 className="text-xs font-semibold mb-1">
        NCAA Tournament Probabilities
      </h4>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500 dark:text-gray-300">
            <th className="text-left py-1 px-1 font-normal" style={COL_METRIC}>
              Metric
            </th>
            <th className="text-center py-1 px-1 font-normal" style={COL_DATA}>
              Current
            </th>
            <th
              className="text-center py-1 px-1 font-normal"
              style={{ ...COL_DATA, color: "rgb(40, 167, 69)" }}
            >
              Win
            </th>
            <th
              className="text-center py-1 px-1 font-normal"
              style={{ ...COL_DATA, color: "rgb(220, 53, 69)" }}
            >
              Loss
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-100">
            <td className="py-1 px-1 text-xs">In Tourney Prob</td>
            <td
              className="text-center py-1 px-1 tabular-nums"
              style={getCellColor(
                (teamMetrics.tournament_bid_pct as number) ?? 0,
                "blue",
              )}
            >
              {((teamMetrics.tournament_bid_pct as number) ?? 0) > 0
                ? `${((teamMetrics.tournament_bid_pct as number) ?? 0).toFixed(1)}%`
                : ""}
            </td>
            <td
              className="text-center py-1 px-1 tabular-nums"
              style={getCellColor(
                (winMetrics.tournament_bid_pct as number) ?? 0,
                "blue",
              )}
            >
              {((winMetrics.tournament_bid_pct as number) ?? 0) > 0
                ? `${((winMetrics.tournament_bid_pct as number) ?? 0).toFixed(1)}%`
                : ""}
            </td>
            <td
              className="text-center py-1 px-1 tabular-nums"
              style={getCellColor(
                (lossMetrics.tournament_bid_pct as number) ?? 0,
                "blue",
              )}
            >
              {((lossMetrics.tournament_bid_pct as number) ?? 0) > 0
                ? `${((lossMetrics.tournament_bid_pct as number) ?? 0).toFixed(1)}%`
                : ""}
            </td>
          </tr>
          <tr className="border-b border-gray-100">
            <td className="py-1 px-1 text-xs">Avg NCAA Seed</td>
            <td className="text-center py-1 px-1 tabular-nums">
              {teamMetrics.average_seed != null &&
              (teamMetrics.average_seed as number) > 0
                ? (teamMetrics.average_seed as number).toFixed(1)
                : "\u2014"}
            </td>
            <td className="text-center py-1 px-1 tabular-nums">
              {winMetrics.average_seed != null &&
              (winMetrics.average_seed as number) > 0
                ? (winMetrics.average_seed as number).toFixed(1)
                : "\u2014"}
            </td>
            <td className="text-center py-1 px-1 tabular-nums">
              {lossMetrics.average_seed != null &&
              (lossMetrics.average_seed as number) > 0
                ? (lossMetrics.average_seed as number).toFixed(1)
                : "\u2014"}
            </td>
          </tr>
        </tbody>
      </table>

      {(() => {
        const curDist =
          (teamMetrics.ncaa_seed_distribution as
            | Record<string, number>
            | undefined) ?? {};
        const winDist =
          (winMetrics.ncaa_seed_distribution as
            | Record<string, number>
            | undefined) ?? {};
        const lossDist =
          (lossMetrics.ncaa_seed_distribution as
            | Record<string, number>
            | undefined) ?? {};
        const curBid = (teamMetrics.tournament_bid_pct as number) ?? 0;
        const winBid = (winMetrics.tournament_bid_pct as number) ?? 0;
        const lossBid = (lossMetrics.tournament_bid_pct as number) ?? 0;
        const allSeeds = Array.from(
          new Set([
            ...Object.keys(curDist),
            ...Object.keys(winDist),
            ...Object.keys(lossDist),
          ]),
        )
          .map(Number)
          .filter((n) => !isNaN(n))
          .sort((a, b) => a - b);

        if (
          allSeeds.length === 0 &&
          curBid === 0 &&
          winBid === 0 &&
          lossBid === 0
        )
          return null;

        const curOut = 100 - curBid;
        const winOut = 100 - winBid;
        const lossOut = 100 - lossBid;

        return (
          <div className="mt-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 dark:text-gray-300">
                  <th
                    className="text-left py-1 px-1 font-normal"
                    style={COL_METRIC}
                  >
                    Seed
                  </th>
                  <th
                    className="text-center py-1 px-1 font-normal"
                    style={COL_DATA}
                  >
                    Current
                  </th>
                  <th
                    className="text-center py-1 px-1 font-normal"
                    style={{ ...COL_DATA, color: "rgb(40, 167, 69)" }}
                  >
                    Win
                  </th>
                  <th
                    className="text-center py-1 px-1 font-normal"
                    style={{ ...COL_DATA, color: "rgb(220, 53, 69)" }}
                  >
                    Loss
                  </th>
                </tr>
              </thead>
              <tbody>
                {allSeeds.map((seed) => {
                  const c = curDist[String(seed)] ?? 0;
                  const w = winDist[String(seed)] ?? 0;
                  const l = lossDist[String(seed)] ?? 0;
                  if (c === 0 && w === 0 && l === 0) return null;
                  return (
                    <tr key={seed} className="border-b border-gray-100">
                      <td className="py-1 px-1">{seed}</td>
                      <td
                        className="text-center py-1 px-1 tabular-nums"
                        style={getCellColor(c, "blue")}
                      >
                        {c > 0 ? `${c.toFixed(1)}%` : ""}
                      </td>
                      <td
                        className="text-center py-1 px-1 tabular-nums"
                        style={getCellColor(w, "blue")}
                      >
                        {w > 0 ? `${w.toFixed(1)}%` : ""}
                      </td>
                      <td
                        className="text-center py-1 px-1 tabular-nums"
                        style={getCellColor(l, "blue")}
                      >
                        {l > 0 ? `${l.toFixed(1)}%` : ""}
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-b border-gray-100">
                  <td className="py-1 px-1 text-gray-500 dark:text-gray-300 italic text-[10px]">
                    Out
                  </td>
                  <td
                    className="text-center py-1 px-1 tabular-nums"
                    style={getCellColor(curOut, "yellow")}
                  >
                    {curOut > 0.05 ? `${curOut.toFixed(1)}%` : ""}
                  </td>
                  <td
                    className="text-center py-1 px-1 tabular-nums"
                    style={getCellColor(winOut, "yellow")}
                  >
                    {winOut > 0.05 ? `${winOut.toFixed(1)}%` : ""}
                  </td>
                  <td
                    className="text-center py-1 px-1 tabular-nums"
                    style={getCellColor(lossOut, "yellow")}
                  >
                    {lossOut > 0.05 ? `${lossOut.toFixed(1)}%` : ""}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      })()}

      <p className="text-[8px] text-gray-400 leading-relaxed mt-2 pt-1 border-t border-gray-100">
        Shows projected impact of the team&apos;s next scheduled conference game
        on conference and NCAA tournament probabilities. Win and Loss columns
        show how probabilities change if the team wins or loses that game.
      </p>
    </div>
  );
}
