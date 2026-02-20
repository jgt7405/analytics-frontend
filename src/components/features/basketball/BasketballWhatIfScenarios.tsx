"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { getCellColor } from "@/lib/color-utils";
import { ArrowDown, ArrowUp, Camera, Download, Loader } from "lucide-react";

import { useBasketballConfData } from "@/hooks/useBasketballConfData";
import {
  useBasketballWhatIf,
  type WhatIfGame,
  type WhatIfResponse,
  type WhatIfTeamResult,
} from "@/hooks/useBasketballWhatIf";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const TEAL_COLOR = "rgb(0, 151, 178)";

// TWV delta colors
const TWV_BLUE = [24, 98, 123];
const TWV_WHITE = [255, 255, 255];
const TWV_YELLOW = [255, 230, 113];

function getDeltaColor(delta: number, maxAbs: number) {
  if (Math.abs(delta) < 0.05 || maxAbs === 0)
    return { backgroundColor: "transparent", color: "#000000" };
  const ratio = Math.min(Math.abs(delta) / maxAbs, 1);
  const t = delta > 0 ? TWV_BLUE : TWV_YELLOW;
  const r = Math.round(TWV_WHITE[0] + (t[0] - TWV_WHITE[0]) * ratio);
  const g = Math.round(TWV_WHITE[1] + (t[1] - TWV_WHITE[1]) * ratio);
  const b = Math.round(TWV_WHITE[2] + (t[2] - TWV_WHITE[2]) * ratio);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return {
    backgroundColor: `rgb(${r}, ${g}, ${b})`,
    color: brightness > 140 ? "#374151" : "#ffffff",
  };
}

function getStandingProb(team: WhatIfTeamResult, standing: number): number {
  const key = `standing_${standing}_prob` as keyof WhatIfTeamResult;
  return (team[key] as number) ?? 0;
}

// â”€â”€ Screenshot helper â”€â”€
async function captureScreenshot(
  element: HTMLElement,
  selectionLegendHtml: string | null,
  filename: string,
  chartTitle?: string,
) {
  if (typeof window === "undefined") return;
  let html2canvas = window.html2canvas;
  if (!html2canvas) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://html2canvas.hertzen.com/dist/html2canvas.min.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load html2canvas"));
      document.body.appendChild(s);
    });
    html2canvas = window.html2canvas;
  }
  if (!html2canvas) return;

  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("[data-no-screenshot]").forEach((el) => el.remove());

  // Measure actual content width for tighter screenshots
  const contentWidth = Math.min(
    element.scrollWidth + 48,
    element.offsetWidth + 48,
  );

  const wrapper = document.createElement("div");
  wrapper.style.cssText = `position:fixed;left:-9999px;top:0;background:#fff;padding:16px 24px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Roboto",sans-serif;width:${contentWidth}px;z-index:-1;overflow:visible;`;

  const header = document.createElement("div");
  header.style.cssText =
    "display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:10px;border-bottom:2px solid #e5e7eb;";
  const logo = document.createElement("img");
  logo.src = "/images/JThom_Logo.png";
  logo.style.cssText = "height:40px;width:auto;";

  const titleSpan = document.createElement("div");
  titleSpan.textContent = chartTitle || "";
  titleSpan.style.cssText =
    "font-size:13px;font-weight:500;color:#374151;text-align:center;flex:1;padding:0 12px;";

  const date = document.createElement("div");
  date.textContent = new Date().toLocaleDateString();
  date.style.cssText = "font-size:12px;color:#6b7280;";
  header.appendChild(logo);
  header.appendChild(titleSpan);
  header.appendChild(date);
  wrapper.appendChild(header);

  clone.style.cssText = "overflow:visible!important;width:100%!important;";
  wrapper.appendChild(clone);

  if (selectionLegendHtml) {
    const legendDiv = document.createElement("div");
    legendDiv.innerHTML = selectionLegendHtml;
    legendDiv.style.cssText =
      "margin-top:12px;padding-top:10px;border-top:1px solid #e5e7eb;font-size:11px;color:#6b7280;";
    wrapper.appendChild(legendDiv);
  }

  // Explainer text at bottom of every screenshot
  const explainer = document.createElement("div");
  explainer.style.cssText =
    "margin-top:10px;padding-top:8px;border-top:1px solid #e5e7eb;font-size:9px;color:#9ca3af;line-height:1.4;";
  explainer.innerHTML =
    "Current reflects current probabilities; what if reflects updated probabilities with game results selected.<br/>Change is the difference between current and what if.<br/>Ties broken based on Big 12 tiebreaker rules (future update to include individual conference tiebreakers).";
  wrapper.appendChild(explainer);

  document.body.appendChild(wrapper);
  await new Promise((r) => setTimeout(r, 400));

  const canvas = await html2canvas(wrapper, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
  });
  document.body.removeChild(wrapper);

  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

declare global {
  interface Window {
    html2canvas?: (
      element: HTMLElement,
      options?: object,
    ) => Promise<HTMLCanvasElement>;
  }
}

// â”€â”€ CSV â”€â”€
// CSV is generated server-side via /basketball/whatif/validation-csv endpoint

// â”€â”€ Small Components â”€â”€
function TeamLogo({
  src,
  alt,
  size = 16,
}: {
  src?: string;
  alt: string;
  size?: number;
}) {
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="object-contain inline-block"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = "none";
      }}
    />
  );
}

// Change 1: white check mark
function CheckIcon({ size = 8 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#ffffff"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function TeamTile({
  logoUrl,
  teamName,
  probability,
  isSelected,
  onClick,
}: {
  logoUrl?: string;
  teamName: string;
  probability?: number | null;
  isSelected: boolean;
  onClick: () => void;
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
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={teamName}
          className="w-6 h-6 object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <span className="text-[8px] font-bold text-gray-500">
          {teamName.substring(0, 3)}
        </span>
      )}
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

function GameCard({
  game,
  selectedWinner,
  onSelect,
}: {
  game: WhatIfGame;
  selectedWinner: number | undefined;
  onSelect: (gid: number, wid: number) => void;
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
      />
      <span className="text-[8px] text-gray-400">@</span>
      <TeamTile
        logoUrl={game.home_logo_url}
        teamName={game.home_team}
        probability={game.home_probability}
        isSelected={selectedWinner === game.home_team_id}
        onClick={() => onSelect(game.game_id, game.home_team_id)}
      />
    </div>
  );
}

// Change 2: always-visible selections (no dropdown/collapsible)
// Change 3: decreased height with py-0.5 instead of py-1
// Change 4: rounded (rectangle) instead of rounded-full (oval) for selection borders
function SelectionLegend({
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
      <p className="text-[11px] text-gray-500 mb-1">
        Selections: {selections.size} game
        {selections.size !== 1 ? "s" : ""}
      </p>
      <div className="flex flex-wrap gap-1">
        {items.map(({ game, wid }) => {
          const awayWins = wid === game.away_team_id;
          return (
            <div
              key={game.game_id}
              className="flex items-center gap-0.5 bg-white rounded"
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
              <span className="text-[8px] text-gray-300">@</span>
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

// â”€â”€ Screenshot Button â”€â”€
function ScreenshotBtn({
  targetRef,
  filename,
  selectionHtml,
  chartTitle,
}: {
  targetRef: React.RefObject<HTMLDivElement>;
  filename: string;
  selectionHtml: string | null;
  chartTitle?: string;
}) {
  const [capturing, setCapturing] = useState(false);
  return (
    <button
      data-no-screenshot
      onClick={async () => {
        if (!targetRef.current || capturing) return;
        setCapturing(true);
        try {
          await captureScreenshot(
            targetRef.current,
            selectionHtml,
            filename,
            chartTitle,
          );
        } catch (e) {
          console.error("Screenshot failed:", e);
        }
        setCapturing(false);
      }}
      className="flex items-center gap-1 px-2 py-1 text-[11px] text-gray-500 border border-gray-200 rounded hover:bg-gray-50 transition"
      title="Download screenshot"
    >
      {capturing ? (
        <Loader size={12} className="animate-spin" />
      ) : (
        <Camera size={12} />
      )}
      <span className="hidden sm:inline">Screenshot</span>
    </button>
  );
}

// â”€â”€ Probability Table (reusable for 1st, Top 4, Top 8) â”€â”€
// Change 5: sortable column headers
// Change 6: "After" â†’ "What If"
// Change 9: no bold in data cells
type SortCol = "before" | "after" | "change" | null;
type SortDir = "asc" | "desc";

function ProbabilityTable({
  title,
  baseline,
  whatif,
  probFn,
  hasCalculated,
  screenshotRef,
  screenshotFilename,
  selectionHtml,
}: {
  title: string;
  baseline: WhatIfTeamResult[];
  whatif: WhatIfTeamResult[];
  probFn: (t: WhatIfTeamResult) => number;
  hasCalculated: boolean;
  screenshotRef: React.RefObject<HTMLDivElement>;
  screenshotFilename: string;
  selectionHtml: string | null;
}) {
  const [sortCol, setSortCol] = useState<SortCol>("after");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const baselineMap = useMemo(
    () => new Map(baseline.map((t) => [t.team_id, t])),
    [baseline],
  );

  const rows = useMemo(() => {
    const src = hasCalculated ? whatif : baseline;
    return [...src]
      .sort(
        (a, b) =>
          (a.avg_conference_standing ?? 99) - (b.avg_conference_standing ?? 99),
      )
      .map((team) => {
        const bl = baselineMap.get(team.team_id);
        const before = bl ? probFn(bl) : 0;
        const after = probFn(team);
        return { team, before, after, change: after - before };
      });
  }, [baseline, whatif, hasCalculated, baselineMap, probFn]);

  const sortedRows = useMemo(() => {
    if (!sortCol) return rows;
    return [...rows].sort((a, b) => {
      const aVal = a[sortCol];
      const bVal = b[sortCol];
      return sortDir === "desc" ? bVal - aVal : aVal - bVal;
    });
  }, [rows, sortCol, sortDir]);

  const maxAbs = useMemo(
    () => Math.max(...rows.map((r) => Math.abs(r.change)), 1),
    [rows],
  );

  const handleSort = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
  };

  const sortIndicator = (col: SortCol) =>
    sortCol === col ? (
      <span className="ml-0.5 inline">
        {sortDir === "desc" ? (
          <ArrowDown size={12} className="inline" />
        ) : (
          <ArrowUp size={12} className="inline" />
        )}
      </span>
    ) : null;

  const thClass =
    "text-center py-2 px-2 font-normal cursor-pointer hover:text-gray-800 select-none";

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-medium">{title}</h3>
        <div className="flex items-center gap-2" data-no-screenshot>
          <ScreenshotBtn
            targetRef={screenshotRef}
            filename={screenshotFilename}
            selectionHtml={selectionHtml}
            chartTitle={title}
          />
        </div>
      </div>
      <div ref={screenshotRef}>
        <table className="text-sm" style={{ width: "auto", minWidth: "320px" }}>
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th
                className="text-left py-2 px-2 font-normal"
                style={{ minWidth: "140px" }}
              >
                Team
              </th>
              {hasCalculated ? (
                <>
                  <th
                    className={thClass}
                    style={{ minWidth: "70px" }}
                    onClick={() => handleSort("before")}
                  >
                    Current{sortIndicator("before")}
                  </th>
                  <th
                    className={thClass}
                    style={{ minWidth: "70px" }}
                    onClick={() => handleSort("after")}
                  >
                    What If{sortIndicator("after")}
                  </th>
                  <th
                    className={thClass}
                    style={{ minWidth: "70px" }}
                    onClick={() => handleSort("change")}
                  >
                    Change{sortIndicator("change")}
                  </th>
                </>
              ) : (
                <th className="text-center py-2 px-2 font-normal">Current %</th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(({ team, before, after, change }) => (
              <tr key={team.team_id} className="border-b border-gray-100">
                <td className="py-1.5 px-2">
                  <div className="flex items-center gap-2">
                    <TeamLogo
                      src={team.logo_url}
                      alt={team.team_name}
                      size={18}
                    />
                    <span className="text-sm">{team.team_name}</span>
                  </div>
                </td>
                {hasCalculated ? (
                  <>
                    <td
                      className="text-center py-1.5 px-2 tabular-nums"
                      style={getCellColor(before, "blue")}
                    >
                      {before > 0 ? `${before.toFixed(1)}%` : ""}
                    </td>
                    <td
                      className="text-center py-1.5 px-2 tabular-nums"
                      style={getCellColor(after, "blue")}
                    >
                      {after > 0 ? `${after.toFixed(1)}%` : ""}
                    </td>
                    <td
                      className="text-center py-1.5 px-2 tabular-nums"
                      style={getDeltaColor(change, maxAbs)}
                    >
                      {Math.abs(change) < 0.05 ? (
                        <span style={{ color: "#9ca3af" }}>&mdash;</span>
                      ) : change > 0 ? (
                        `+${change.toFixed(1)}%`
                      ) : (
                        `${change.toFixed(1)}%`
                      )}
                    </td>
                  </>
                ) : (
                  <td
                    className="text-center py-1.5 px-2 tabular-nums"
                    style={getCellColor(before, "blue")}
                  >
                    {before > 0 ? `${before.toFixed(1)}%` : ""}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// â”€â”€ Full Standings Comparison Table (restored â€” Change 8) â”€â”€
function FullStandingsTable({
  baseline,
  whatif,
  numTeams,
  label,
  screenshotRef,
  selectionHtml,
}: {
  baseline: WhatIfTeamResult[];
  whatif: WhatIfTeamResult[];
  numTeams: number;
  label: string;
  screenshotRef: React.RefObject<HTMLDivElement>;
  selectionHtml: string | null;
}) {
  if (!baseline.length || !whatif.length) return null;

  const baselineMap = new Map(baseline.map((t) => [t.team_id, t]));
  const maxStandings = numTeams;

  const sortedTeams = [...whatif].sort(
    (a, b) =>
      (a.avg_conference_standing ?? 99) - (b.avg_conference_standing ?? 99),
  );

  const getProb = (team: WhatIfTeamResult, standing: number): number => {
    const key = `standing_${standing}_prob`;
    return ((team as unknown as Record<string, unknown>)[key] as number) ?? 0;
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-medium">{label}</h3>
        <div data-no-screenshot>
          <ScreenshotBtn
            targetRef={screenshotRef}
            filename={`${label.replace(/\s+/g, "_").toLowerCase()}.png`}
            selectionHtml={selectionHtml}
            chartTitle={label}
          />
        </div>
      </div>
      <div ref={screenshotRef}>
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="text-xs" style={{ width: "auto" }}>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500">
                <th className="text-left py-2 px-2 font-normal sticky left-0 bg-gray-50 z-10">
                  Team
                </th>
                <th className="text-center py-2 px-2 font-normal">Wins</th>
                <th className="text-center py-2 px-2 font-normal">Avg</th>
                {Array.from({ length: maxStandings }, (_, i) => (
                  <th key={i} className="text-center py-2 px-1.5 font-normal">
                    {i + 1}
                    {i === 0 ? "st" : i === 1 ? "nd" : i === 2 ? "rd" : "th"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedTeams.map((team, idx) => {
                const bl = baselineMap.get(team.team_id);
                const winsChange = bl
                  ? (team.avg_projected_conf_wins ?? 0) -
                    (bl.avg_projected_conf_wins ?? 0)
                  : 0;

                return (
                  <tr
                    key={team.team_id}
                    className={`border-b border-gray-100 ${idx % 2 === 1 ? "bg-gray-50/50" : ""}`}
                  >
                    <td className="py-0.5 px-2 sticky left-0 bg-white z-10">
                      <div className="flex items-center gap-1.5">
                        <TeamLogo
                          src={team.logo_url}
                          alt={team.team_name}
                          size={16}
                        />
                        <span className="whitespace-nowrap">
                          {team.team_name}
                        </span>
                      </div>
                    </td>
                    <td className="text-center py-0.5 px-2 tabular-nums">
                      {(team.avg_projected_conf_wins ?? 0).toFixed(1)}
                      <span
                        className={`block text-[9px] ${Math.abs(winsChange) > 0.01 ? (winsChange > 0 ? "text-green-600" : "text-red-500") : "invisible"}`}
                      >
                        {Math.abs(winsChange) > 0.01
                          ? `${winsChange > 0 ? "+" : ""}${winsChange.toFixed(2)}`
                          : "\u00A0"}
                      </span>
                    </td>
                    <td className="text-center py-0.5 px-2 tabular-nums">
                      {(team.avg_conference_standing ?? 0).toFixed(1)}
                      {(() => {
                        const avgChange = bl
                          ? (team.avg_conference_standing ?? 0) -
                            (bl.avg_conference_standing ?? 0)
                          : 0;
                        const hasAvgChange = Math.abs(avgChange) > 0.01;
                        return (
                          <span
                            className={`block text-[9px] ${hasAvgChange ? (avgChange < 0 ? "text-green-600" : "text-red-500") : "invisible"}`}
                          >
                            {hasAvgChange
                              ? `${avgChange > 0 ? "+" : ""}${avgChange.toFixed(2)}`
                              : "\u00A0"}
                          </span>
                        );
                      })()}
                    </td>
                    {Array.from({ length: maxStandings }, (_, i) => {
                      const standing = i + 1;
                      const val = getProb(team, standing);
                      const blVal = bl ? getProb(bl, standing) : val;
                      const delta = val - blVal;
                      const hasChange = Math.abs(delta) > 0.05;

                      return (
                        <td
                          key={standing}
                          className="text-center py-0.5 px-1 tabular-nums"
                          style={{
                            backgroundColor: hasChange
                              ? delta > 0
                                ? "rgba(40, 167, 69, 0.08)"
                                : "rgba(220, 53, 69, 0.06)"
                              : "transparent",
                          }}
                        >
                          {val > 0 ? `${val.toFixed(1)}` : "\u00A0"}
                          <span
                            className={`block text-[8px] ${hasChange ? (delta > 0 ? "text-green-600" : "text-red-500") : "invisible"}`}
                          >
                            {hasChange
                              ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)}`
                              : "\u00A0"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Main Component
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export default function BasketballWhatIfScenarios() {
  const [selectedConference, setSelectedConference] = useState<string | null>(
    null,
  );
  const [gameSelections, setGameSelections] = useState<Map<number, number>>(
    new Map(),
  );
  const [whatIfData, setWhatIfData] = useState<WhatIfResponse | null>(null);
  const [hasCalculated, setHasCalculated] = useState(false);

  const firstPlaceRef = useRef<HTMLDivElement>(null);
  const top4Ref = useRef<HTMLDivElement>(null);
  const top8Ref = useRef<HTMLDivElement>(null);
  const standingsNoTiesRef = useRef<HTMLDivElement>(null);
  const standingsWithTiesRef = useRef<HTMLDivElement>(null);

  const {
    data: confData,
    isLoading: conferencesLoading,
    error: conferencesError,
  } = useBasketballConfData();

  const conferences = useMemo(() => {
    if (!confData?.conferenceData?.data) return [];
    return confData.conferenceData.data
      .map((conf: { conference_name: string }) => conf.conference_name)
      .sort();
  }, [confData]);

  const { mutate: fetchWhatIf, isPending: isCalculating } =
    useBasketballWhatIf();

  // Lightweight baseline fetch â€” no simulations, just pre-computed data + games
  const [isLoadingBaseline, setIsLoadingBaseline] = useState(false);

  const fetchBaseline = useCallback(async (conf: string) => {
    setIsLoadingBaseline(true);
    try {
      const res = await fetch("/api/proxy/basketball/whatif/baseline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conference: conf }),
      });
      if (!res.ok) throw new Error(`Baseline fetch failed: ${res.status}`);
      const data = await res.json();

      // Map game logos (backend returns filenames, frontend needs /images/team_logos/ paths)
      const getLogoUrl = (filename?: string): string | undefined => {
        if (!filename) return undefined;
        if (filename.startsWith("http") || filename.startsWith("/"))
          return filename;
        return `/images/team_logos/${filename}`;
      };
      if (data.games) {
        data.games = data.games.map((g: Record<string, unknown>) => ({
          ...g,
          home_logo_url: getLogoUrl(
            (g.home_team_logo || g.home_logo_url) as string | undefined,
          ),
          away_logo_url: getLogoUrl(
            (g.away_team_logo || g.away_logo_url) as string | undefined,
          ),
        }));
      }
      // Map team_id from teamid if needed
      const mapTeams = (teams: Record<string, unknown>[]) =>
        teams?.map((t) => ({ ...t, team_id: t.team_id || t.teamid || 0 })) ??
        [];
      data.data_with_ties = mapTeams(data.data_with_ties);
      data.data_no_ties = mapTeams(data.data_no_ties);
      data.current_projections_with_ties = mapTeams(
        data.current_projections_with_ties,
      );
      data.current_projections_no_ties = mapTeams(
        data.current_projections_no_ties,
      );

      setWhatIfData(data as WhatIfResponse);
    } catch (e) {
      console.error("Baseline fetch error:", e);
    } finally {
      setIsLoadingBaseline(false);
    }
  }, []);

  useEffect(() => {
    if (conferences.length > 0 && !selectedConference) {
      const def = conferences.includes("Big 12") ? "Big 12" : conferences[0];
      setSelectedConference(def);
      fetchBaseline(def);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conferences, selectedConference]);

  const handleConferenceChange = useCallback(
    (c: string) => {
      setSelectedConference(c);
      setGameSelections(new Map());
      setWhatIfData(null);
      setHasCalculated(false);
      fetchBaseline(c);
    },
    [fetchBaseline],
  );

  const handleGameSelection = useCallback((gid: number, wid: number) => {
    setGameSelections((prev) => {
      const next = new Map(prev);
      if (next.get(gid) === wid) next.delete(gid);
      else next.set(gid, wid);
      return next;
    });
    setHasCalculated(false);
  }, []);

  const handleCalculate = useCallback(() => {
    if (!selectedConference) return;
    const arr = Array.from(gameSelections.entries()).map(([g, w]) => ({
      game_id: g,
      winner_team_id: w,
    }));
    fetchWhatIf(
      { conference: selectedConference, selections: arr },
      {
        onSuccess: (d: WhatIfResponse) => {
          setWhatIfData(d);
          setHasCalculated(true);
        },
      },
    );
  }, [selectedConference, gameSelections, fetchWhatIf]);

  const handleReset = useCallback(() => {
    setGameSelections(new Map());
    setHasCalculated(false);
    if (selectedConference) {
      fetchBaseline(selectedConference);
    }
  }, [selectedConference, fetchBaseline]);

  const [isDownloadingCSV, setIsDownloadingCSV] = useState(false);

  const handleDownloadCSV = useCallback(async () => {
    if (!selectedConference) return;
    setIsDownloadingCSV(true);
    try {
      const selectionsArray = Array.from(gameSelections.entries()).map(
        ([game_id, winner_team_id]) => ({ game_id, winner_team_id }),
      );
      const res = await fetch("/api/proxy/basketball/whatif/validation-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conference: selectedConference,
          selections: selectionsArray,
        }),
      });
      if (!res.ok) throw new Error(`CSV download failed: ${res.status}`);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `whatif_validation_${selectedConference.replace(/\s+/g, "_").toLowerCase()}.csv`;
      a.click();
    } catch (e) {
      console.error("CSV download error:", e);
    } finally {
      setIsDownloadingCSV(false);
    }
  }, [selectedConference, gameSelections]);

  // Build selection legend HTML for screenshots
  const selectionLegendHtml = useMemo(() => {
    if (gameSelections.size === 0 || !whatIfData?.games) return null;
    const items = Array.from(gameSelections.entries())
      .map(([gid, wid]) => {
        const g = whatIfData.games.find((x) => x.game_id === gid);
        if (!g) return "";
        const awayWins = wid === g.away_team_id;
        return `<span style="display:inline-flex;align-items:center;gap:2px;padding:1px 2px;border:1px solid #d1d5db;border-radius:4px;margin:2px;">
          <span style="border:${awayWins ? "2px solid rgb(0,151,178)" : "2px solid transparent"};border-radius:4px;padding:1px;">
            <img src="${g.away_logo_url}" width="14" height="14" style="display:block;" /></span>
          <span style="font-size:9px;color:#d1d5db;">@</span>
          <span style="border:${!awayWins ? "2px solid rgb(0,151,178)" : "2px solid transparent"};border-radius:4px;padding:1px;">
            <img src="${g.home_logo_url}" width="14" height="14" style="display:block;" /></span>
        </span>`;
      })
      .join("");
    return `<div style="font-size:11px;color:#6b7280;margin-bottom:4px;">Selections: ${gameSelections.size} games</div><div style="display:flex;flex-wrap:wrap;gap:4px;">${items}</div>`;
  }, [gameSelections, whatIfData?.games]);

  const gamesByDate = useMemo(() => {
    if (!whatIfData?.games) return {};
    return whatIfData.games.reduce(
      (acc, g) => {
        const d = g.date || "Unknown";
        if (!acc[d]) acc[d] = [];
        acc[d].push(g);
        return acc;
      },
      {} as Record<string, WhatIfGame[]>,
    );
  }, [whatIfData?.games]);

  const sortedDates = useMemo(
    () =>
      Object.keys(gamesByDate).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime(),
      ),
    [gamesByDate],
  );

  const numTeams = whatIfData?.data_no_ties?.length ?? 16;

  const displayBaseline = whatIfData?.current_projections_no_ties ?? [];
  const displayWhatif = hasCalculated
    ? (whatIfData?.data_no_ties ?? [])
    : displayBaseline;

  // Prob functions
  const firstPlaceProb = useCallback(
    (t: WhatIfTeamResult) => t.standing_1_prob ?? 0,
    [],
  );
  const top4Prob = useCallback((t: WhatIfTeamResult) => {
    let sum = 0;
    for (let i = 1; i <= 4; i++) sum += getStandingProb(t, i);
    return sum;
  }, []);
  const top8Prob = useCallback((t: WhatIfTeamResult) => {
    let sum = 0;
    for (let i = 1; i <= 8; i++) sum += getStandingProb(t, i);
    return sum;
  }, []);

  if (conferencesLoading || !selectedConference) {
    return (
      <div className="container mx-auto px-4 py-4">
        <h1 className="text-xl font-normal text-gray-500">
          What If Calculator
        </h1>
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (conferencesError) {
    return (
      <div className="container mx-auto px-4 py-4">
        <h1 className="text-xl font-normal text-gray-500">
          What If Calculator
        </h1>
        <ErrorMessage message={conferencesError.message} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4">
      <h1 className="text-xl font-normal text-gray-500 mb-6">
        What If Calculator
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* â•â•â• LEFT PANEL â•â•â• */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4">
            {/* Conference â€” inline */}
            <div className="mb-4 flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Conference
              </label>
              <div className="[&_.conference-selector]:static [&_.conference-selector]:transform-none">
                <ConferenceSelector
                  conferences={conferences}
                  selectedConference={selectedConference}
                  onChange={handleConferenceChange}
                  loading={conferencesLoading}
                />
              </div>
            </div>

            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-sm font-medium">
                Select Game Winners and Calculate New What If Probabilities
              </h3>
              <span className="text-[11px] text-gray-400">
                {gameSelections.size} selected
              </span>
            </div>

            {whatIfData?.games && whatIfData.games.length > 0 ? (
              <div className="max-h-[50vh] overflow-y-auto pr-1 mb-4">
                {sortedDates.map((date) => (
                  <div key={date} className="mb-3">
                    <p className="text-[11px] text-gray-500 mb-1.5 sticky top-0 bg-white py-0.5 z-10">
                      {date}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {gamesByDate[date].map((g) => (
                        <GameCard
                          key={g.game_id}
                          game={g}
                          selectedWinner={gameSelections.get(g.game_id)}
                          onSelect={handleGameSelection}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic py-4">
                {isCalculating || isLoadingBaseline
                  ? "Loading games..."
                  : "No upcoming conference games found."}
              </p>
            )}

            <div className="flex gap-2 pt-3 border-t border-gray-200">
              <button
                onClick={handleCalculate}
                disabled={gameSelections.size === 0 || isCalculating}
                className="flex-1 py-2 px-3 text-sm font-medium text-white rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: TEAL_COLOR }}
              >
                {isCalculating
                  ? "Calculating..."
                  : `Calculate (${gameSelections.size})`}
              </button>
              {gameSelections.size > 0 && (
                <button
                  onClick={handleReset}
                  className="py-2 px-3 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* â•â•â• RIGHT PANEL â•â•â• */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-medium">
                {hasCalculated ? "What-If Results" : "Current Standings"}
              </h2>
              {hasCalculated && <span />}
            </div>

            {/* Always-visible selection legend */}
            {whatIfData?.games && (
              <SelectionLegend
                games={whatIfData.games}
                selections={gameSelections}
              />
            )}

            {(isCalculating || isLoadingBaseline) && (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            )}

            {!isCalculating &&
              !isLoadingBaseline &&
              displayBaseline.length > 0 && (
                <>
                  <ProbabilityTable
                    title="What If Probabilities - 1st Seed in Conference"
                    baseline={displayBaseline}
                    whatif={displayWhatif}
                    probFn={firstPlaceProb}
                    hasCalculated={hasCalculated}
                    screenshotRef={firstPlaceRef}
                    screenshotFilename="first_place_pct.png"
                    selectionHtml={selectionLegendHtml}
                  />
                  <ProbabilityTable
                    title="What If Probabilities - Top 4 Seed in Conference"
                    baseline={displayBaseline}
                    whatif={displayWhatif}
                    probFn={top4Prob}
                    hasCalculated={hasCalculated}
                    screenshotRef={top4Ref}
                    screenshotFilename="top_4_pct.png"
                    selectionHtml={selectionLegendHtml}
                  />
                  <ProbabilityTable
                    title="What If Probabilities - Top 8 Seed in Conference"
                    baseline={displayBaseline}
                    whatif={displayWhatif}
                    probFn={top8Prob}
                    hasCalculated={hasCalculated}
                    screenshotRef={top8Ref}
                    screenshotFilename="top_8_pct.png"
                    selectionHtml={selectionLegendHtml}
                  />
                </>
              )}

            {!isCalculating &&
              !isLoadingBaseline &&
              !displayBaseline.length && (
                <p className="text-gray-500 text-center py-8">
                  No team data available
                </p>
              )}
          </div>

          {/* â•â•â• FULL STANDINGS TABLES (restored â€” Change 8) â•â•â• */}
          {hasCalculated && displayBaseline.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4 mt-6">
              <FullStandingsTable
                baseline={whatIfData?.current_projections_no_ties ?? []}
                whatif={whatIfData?.data_no_ties ?? []}
                numTeams={numTeams}
                label="What If Probabilities - Projected Seeding (Tiebreakers Applied)"
                screenshotRef={standingsNoTiesRef}
                selectionHtml={selectionLegendHtml}
              />

              <FullStandingsTable
                baseline={whatIfData?.current_projections_with_ties ?? []}
                whatif={whatIfData?.data_with_ties ?? []}
                numTeams={numTeams}
                label="What If Probabilities - Projected Standings (No Tiebreakers)"
                screenshotRef={standingsWithTiesRef}
                selectionHtml={selectionLegendHtml}
              />
            </div>
          )}

          {/* Explainer text */}
          {!isCalculating &&
            !isLoadingBaseline &&
            displayBaseline.length > 0 && (
              <div className="mt-4 px-1">
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  Current reflects current probabilities; what if reflects
                  updated probabilities with game results selected. Change is
                  the difference between current and what if. Ties broken based
                  on Big 12 tiebreaker rules (future update to include
                  individual conference tiebreakers).
                </p>
              </div>
            )}

          {/* Validation CSV download */}
          {hasCalculated && (
            <div className="mt-3 px-1" data-no-screenshot>
              <button
                onClick={handleDownloadCSV}
                disabled={isDownloadingCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded hover:bg-gray-50 transition disabled:opacity-50"
              >
                <Download size={13} />
                {isDownloadingCSV
                  ? "Generating CSV..."
                  : "Download Validation CSV"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
