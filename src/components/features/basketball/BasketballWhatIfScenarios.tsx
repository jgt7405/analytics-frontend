"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { getCellColor } from "@/lib/color-utils";
import { Camera, ChevronDown, ChevronUp, Download } from "lucide-react";

import { useBasketballConfData } from "@/hooks/useBasketballConfData";
import {
  useBasketballWhatIf,
  type ValidationData,
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
  return { backgroundColor: `rgb(${r}, ${g}, ${b})`, color: brightness > 140 ? "#374151" : "#ffffff" };
}

function getStandingProb(team: WhatIfTeamResult, standing: number): number {
  const key = `standing_${standing}_prob` as keyof WhatIfTeamResult;
  return (team[key] as number) ?? 0;
}

// ── Screenshot helper ──
async function captureScreenshot(
  element: HTMLElement,
  selectionLegendHtml: string | null,
  filename: string,
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
  // Remove any screenshot buttons from clone
  clone.querySelectorAll("[data-no-screenshot]").forEach((el) => el.remove());

  const wrapper = document.createElement("div");
  wrapper.style.cssText = `position:fixed;left:-9999px;top:0;background:#fff;padding:16px 24px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Roboto",sans-serif;width:${element.offsetWidth + 80}px;z-index:-1;overflow:visible;`;

  // Header
  const header = document.createElement("div");
  header.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #e5e7eb;";
  const logo = document.createElement("img");
  logo.src = "/images/JThom_Logo.png";
  logo.style.cssText = "height:40px;width:auto;";
  const date = document.createElement("div");
  date.textContent = new Date().toLocaleDateString();
  date.style.cssText = "font-size:12px;color:#6b7280;";
  header.appendChild(logo);
  header.appendChild(date);
  wrapper.appendChild(header);

  clone.style.cssText = "overflow:visible!important;width:100%!important;";
  wrapper.appendChild(clone);

  // Selection legend at bottom if provided
  if (selectionLegendHtml) {
    const legendDiv = document.createElement("div");
    legendDiv.innerHTML = selectionLegendHtml;
    legendDiv.style.cssText = "margin-top:12px;padding-top:10px;border-top:1px solid #e5e7eb;font-size:11px;color:#6b7280;";
    wrapper.appendChild(legendDiv);
  }

  // Footer
  const footer = document.createElement("div");
  footer.style.cssText = "margin-top:12px;padding-top:8px;border-top:1px solid #e5e7eb;font-size:10px;color:#9ca3af;text-align:center;";
  footer.textContent = "jthomanalytics.com";
  wrapper.appendChild(footer);

  document.body.appendChild(wrapper);
  await new Promise((r) => setTimeout(r, 400));

  const canvas = await html2canvas(wrapper, {
    backgroundColor: "#ffffff", scale: 2, useCORS: true, allowTaint: true, logging: false,
  });
  document.body.removeChild(wrapper);

  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

declare global {
  interface Window {
    html2canvas?: (element: HTMLElement, options?: object) => Promise<HTMLCanvasElement>;
  }
}

// ── CSV ──
function buildValidationCSV(vd: ValidationData, conference: string): string {
  const lines: string[] = [];
  const esc = (v: string | number | boolean | null | undefined) =>
    `"${String(v ?? "").replace(/"/g, '""')}"`;
  const { game_info: games, team_names: teams } = vd;
  const gh = games.map((g) => `Game ${g.game_id}: ${g.away_team} @ ${g.home_team}`);
  const gp = games.map((g) => {
    const a = g.away_probability != null ? (g.away_probability * 100).toFixed(0) + "%" : "";
    const h = g.home_probability != null ? (g.home_probability * 100).toFixed(0) + "%" : "";
    return `${a} / ${h}`;
  });

  const section = (title: string, headers: string[], rowFn: (s: number) => (string | number)[]) => {
    lines.push(esc(`=== ${title} — ${conference} ===`));
    lines.push(headers.map(esc).join(","));
    for (let s = 1; s <= 1000; s++) {
      const row = rowFn(s);
      if (row.length) lines.push(row.map(esc).join(","));
    }
    lines.push("");
  };

  section("SECTION 1: CURRENT WINNERS", ["Scenario", ...gh], (s) => {
    const w = vd.original_winners[s]; return w ? [s, ...w] : [];
  });
  lines.splice(2, 0, ["Probabilities (Away/Home)", ...gp].map(esc).join(","));

  section("SECTION 2: WHAT-IF WINNERS", ["Scenario", ...gh], (s) => {
    const w = vd.whatif_winners[s]; return w ? [s, ...w] : [];
  });
  section("SECTION 3: CONFERENCE WINS — CURRENT", ["Scenario", ...teams], (s) => {
    const w = vd.original_conf_wins[s]; return w ? [s, ...teams.map((t) => w[t] ?? 0)] : [];
  });
  section("SECTION 4: CONFERENCE WINS — WHAT-IF", ["Scenario", ...teams], (s) => {
    const w = vd.whatif_conf_wins[s]; return w ? [s, ...teams.map((t) => w[t] ?? 0)] : [];
  });
  section("SECTION 5: STANDINGS (TIES BROKEN) — CURRENT", ["Scenario", ...teams], (s) => {
    const st = vd.original_standings[s]; return st ? [s, ...teams.map((t) => st[t] ?? "")] : [];
  });
  section("SECTION 6: STANDINGS (TIES BROKEN) — WHAT-IF", ["Scenario", ...teams], (s) => {
    const st = vd.whatif_standings[s]; return st ? [s, ...teams.map((t) => st[t] ?? "")] : [];
  });
  return lines.join("\n");
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

// ── Small Components ──
function TeamLogo({ src, alt, size = 16 }: { src?: string; alt: string; size?: number }) {
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={size} height={size}
      className="object-contain inline-block"
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
  );
}

function Check({ size = 8 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function TeamTile({ logoUrl, teamName, probability, isSelected, onClick }: {
  logoUrl?: string; teamName: string; probability?: number | null;
  isSelected: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className="relative flex flex-col items-center justify-center w-10 h-12 rounded transition-all"
      style={{ border: isSelected ? `2px solid ${TEAL_COLOR}` : "1px solid transparent",
        backgroundColor: isSelected ? "rgba(0,151,178,0.08)" : "white" }}
      title={teamName}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={teamName} className="w-6 h-6 object-contain"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      ) : <span className="text-[8px] font-bold text-gray-500">{teamName.substring(0, 3)}</span>}
      {probability != null && (
        <span className="text-[8px] text-gray-400 mt-0.5">{Math.round(probability * 100)}%</span>
      )}
      {isSelected && (
        <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
          style={{ backgroundColor: TEAL_COLOR }}>
          <Check size={8} />
        </div>
      )}
    </button>
  );
}

function GameCard({ game, selectedWinner, onSelect }: {
  game: WhatIfGame; selectedWinner: number | undefined;
  onSelect: (gid: number, wid: number) => void;
}) {
  const has = selectedWinner !== undefined;
  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded"
      style={{ border: has ? `2px solid ${TEAL_COLOR}` : "1px solid #d1d5db" }}>
      <TeamTile logoUrl={game.away_logo_url} teamName={game.away_team}
        probability={game.away_probability} isSelected={selectedWinner === game.away_team_id}
        onClick={() => onSelect(game.game_id, game.away_team_id)} />
      <span className="text-[8px] text-gray-400">@</span>
      <TeamTile logoUrl={game.home_logo_url} teamName={game.home_team}
        probability={game.home_probability} isSelected={selectedWinner === game.home_team_id}
        onClick={() => onSelect(game.game_id, game.home_team_id)} />
    </div>
  );
}

// ── Collapsible Selection Legend ──
function SelectionLegend({ games, selections }: {
  games: WhatIfGame[]; selections: Map<number, number>;
}) {
  const [expanded, setExpanded] = useState(false);
  if (selections.size === 0) return null;

  const items = Array.from(selections.entries())
    .map(([gid, wid]) => { const g = games.find((x) => x.game_id === gid); return g ? { game: g, wid } : null; })
    .filter(Boolean) as Array<{ game: WhatIfGame; wid: number }>;

  return (
    <div className="mb-3">
      <button onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-700 transition">
        <span className="font-medium">Selections: {selections.size} game{selections.size !== 1 ? "s" : ""}</span>
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {expanded && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {items.map(({ game, wid }) => {
            const awayWins = wid === game.away_team_id;
            return (
              <div key={game.game_id} className="flex items-center gap-1 px-1.5 py-1 bg-white rounded"
                style={{ border: "1px solid #d1d5db" }}>
                <span className="rounded-full p-0.5"
                  style={{ border: awayWins ? `2px solid ${TEAL_COLOR}` : "2px solid transparent" }}>
                  <TeamLogo src={game.away_logo_url} alt={game.away_team} size={14} />
                </span>
                <span className="text-[9px] text-gray-300">@</span>
                <span className="rounded-full p-0.5"
                  style={{ border: !awayWins ? `2px solid ${TEAL_COLOR}` : "2px solid transparent" }}>
                  <TeamLogo src={game.home_logo_url} alt={game.home_team} size={14} />
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Screenshot Button ──
function ScreenshotBtn({ targetRef, filename, selectionHtml }: {
  targetRef: React.RefObject<HTMLDivElement | null>; filename: string; selectionHtml: string | null;
}) {
  const [capturing, setCapturing] = useState(false);
  return (
    <button data-no-screenshot onClick={async () => {
      if (!targetRef.current || capturing) return;
      setCapturing(true);
      try { await captureScreenshot(targetRef.current, selectionHtml, filename); }
      catch (e) { console.error("Screenshot failed:", e); }
      setCapturing(false);
    }}
      className="flex items-center gap-1 px-2 py-1 text-[11px] text-gray-500 border border-gray-200 rounded hover:bg-gray-50 transition"
      title="Download screenshot">
      {capturing ? <span className="animate-spin">⟳</span> : <Camera size={12} />}
      <span className="hidden sm:inline">Screenshot</span>
    </button>
  );
}

// ── Probability Table (reusable for 1st, Top 4, Top 8) ──
function ProbabilityTable({ title, baseline, whatif, probFn, hasCalculated, screenshotRef, screenshotFilename, selectionHtml }: {
  title: string;
  baseline: WhatIfTeamResult[];
  whatif: WhatIfTeamResult[];
  probFn: (t: WhatIfTeamResult) => number;
  hasCalculated: boolean;
  screenshotRef: React.RefObject<HTMLDivElement | null>;
  screenshotFilename: string;
  selectionHtml: string | null;
}) {
  const baselineMap = useMemo(() => new Map(baseline.map((t) => [t.team_id, t])), [baseline]);

  const rows = useMemo(() => {
    const src = hasCalculated ? whatif : baseline;
    return [...src]
      .sort((a, b) => (a.avg_conference_standing ?? 99) - (b.avg_conference_standing ?? 99))
      .map((team) => {
        const bl = baselineMap.get(team.team_id);
        const before = bl ? probFn(bl) : 0;
        const after = probFn(team);
        return { team, before, after, change: after - before };
      });
  }, [baseline, whatif, hasCalculated, baselineMap, probFn]);

  const maxAbs = useMemo(() => Math.max(...rows.map((r) => Math.abs(r.change)), 1), [rows]);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold">{title}</h3>
        <div className="flex items-center gap-2" data-no-screenshot>
          <ScreenshotBtn targetRef={screenshotRef} filename={screenshotFilename} selectionHtml={selectionHtml} />
        </div>
      </div>
      <div ref={screenshotRef}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th className="text-left py-2 px-2 font-medium">Team</th>
              {hasCalculated ? (
                <>
                  <th className="text-right py-2 px-2 font-medium">Before</th>
                  <th className="text-right py-2 px-2 font-medium">After</th>
                  <th className="text-right py-2 px-2 font-medium">Change</th>
                </>
              ) : (
                <th className="text-right py-2 px-2 font-medium">Current %</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ team, before, after, change }) => (
              <tr key={team.team_id} className="border-b border-gray-100">
                <td className="py-1.5 px-2">
                  <div className="flex items-center gap-2">
                    <TeamLogo src={team.logo_url} alt={team.team_name} size={18} />
                    <span className="font-medium text-sm">{team.team_name}</span>
                  </div>
                </td>
                {hasCalculated ? (
                  <>
                    <td className="text-right py-1.5 px-2 tabular-nums" style={getCellColor(before, "blue")}>
                      {before > 0 ? `${before.toFixed(1)}%` : ""}
                    </td>
                    <td className="text-right py-1.5 px-2 tabular-nums font-semibold" style={getCellColor(after, "blue")}>
                      {after > 0 ? `${after.toFixed(1)}%` : ""}
                    </td>
                    <td className="text-right py-1.5 px-2 tabular-nums font-semibold" style={getDeltaColor(change, maxAbs)}>
                      {Math.abs(change) < 0.05 ? <span style={{ color: "#9ca3af" }}>&mdash;</span>
                        : change > 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`}
                    </td>
                  </>
                ) : (
                  <td className="text-right py-1.5 px-2 tabular-nums" style={getCellColor(before, "blue")}>
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

// ── Next Game Implications ──
function NextGameImplications({ games, baseline, conference, fetchWhatIf }: {
  games: WhatIfGame[];
  baseline: WhatIfTeamResult[];
  conference: string;
  fetchWhatIf: (req: { conference: string; selections: Array<{ game_id: number; winner_team_id: number }> },
    opts: { onSuccess: (d: WhatIfResponse) => void }) => void;
}) {
  const [implicationData, setImplicationData] = useState<Map<number, { win1st: number; lose1st: number }>>(new Map());
  const [loading, setLoading] = useState(false);
  const [computed, setComputed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Build team -> next game map
  const teamNextGame = useMemo(() => {
    const map = new Map<number, WhatIfGame>();
    const sorted = [...games].filter((g) => g.conf_game).sort((a, b) => a.date.localeCompare(b.date));
    for (const g of sorted) {
      if (!map.has(g.home_team_id)) map.set(g.home_team_id, g);
      if (!map.has(g.away_team_id)) map.set(g.away_team_id, g);
    }
    return map;
  }, [games]);

  const teams = useMemo(() => {
    return [...baseline].sort(
      (a, b) => (b.standing_1_prob ?? 0) - (a.standing_1_prob ?? 0),
    );
  }, [baseline]);

  // Compute implications: for each unique next game, call API with that team winning, then losing
  const computeImplications = useCallback(async () => {
    if (computed || loading) return;
    setLoading(true);

    // Gather unique next games
    const uniqueGames = new Map<number, WhatIfGame>();
    for (const team of teams) {
      const ng = teamNextGame.get(team.team_id);
      if (ng && !uniqueGames.has(ng.game_id)) uniqueGames.set(ng.game_id, ng);
    }

    const results = new Map<number, { win1st: number; lose1st: number }>();

    // For each unique game, compute home-wins and away-wins scenarios
    for (const [gameId, game] of uniqueGames) {
      try {
        // Home wins
        const homeResult = await new Promise<WhatIfResponse>((resolve) => {
          fetchWhatIf(
            { conference, selections: [{ game_id: gameId, winner_team_id: game.home_team_id }] },
            { onSuccess: resolve },
          );
        });
        // Away wins
        const awayResult = await new Promise<WhatIfResponse>((resolve) => {
          fetchWhatIf(
            { conference, selections: [{ game_id: gameId, winner_team_id: game.away_team_id }] },
            { onSuccess: resolve },
          );
        });

        // Extract 1st place prob (with ties) for each team in this game
        const homeWinData = new Map(
          (homeResult.data_with_ties || []).map((t) => [t.team_id, t.standing_1_prob ?? 0]),
        );
        const awayWinData = new Map(
          (awayResult.data_with_ties || []).map((t) => [t.team_id, t.standing_1_prob ?? 0]),
        );

        // Home team: win = homeWin scenario, lose = awayWin scenario
        results.set(game.home_team_id, {
          win1st: homeWinData.get(game.home_team_id) ?? 0,
          lose1st: awayWinData.get(game.home_team_id) ?? 0,
        });
        // Away team: win = awayWin scenario, lose = homeWin scenario
        results.set(game.away_team_id, {
          win1st: awayWinData.get(game.away_team_id) ?? 0,
          lose1st: homeWinData.get(game.away_team_id) ?? 0,
        });
      } catch (e) {
        console.error(`Failed to compute implications for game ${gameId}:`, e);
      }
    }

    setImplicationData(results);
    setComputed(true);
    setLoading(false);
  }, [computed, loading, teams, teamNextGame, conference, fetchWhatIf]);

  if (!teams.length) return null;

  return (
    <div className="bg-white rounded-lg shadow p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Next Game Implications — 1st Place %</h3>
        {!computed && (
          <button onClick={computeImplications} disabled={loading}
            className="px-3 py-1 text-[11px] font-medium text-white rounded transition disabled:opacity-50"
            style={{ backgroundColor: TEAL_COLOR }}>
            {loading ? "Computing..." : "Compute"}
          </button>
        )}
        {computed && (
          <ScreenshotBtn targetRef={ref} filename="next_game_implications.png" selectionHtml={null} />
        )}
      </div>
      <div ref={ref}>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th className="text-left py-2 px-2 font-medium">Team</th>
              <th className="text-left py-2 px-2 font-medium">Next Game</th>
              <th className="text-center py-2 px-2 font-medium">Current</th>
              <th className="text-center py-2 px-2 font-medium">Win</th>
              <th className="text-center py-2 px-2 font-medium">Loss</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => {
              const ng = teamNextGame.get(team.team_id);
              if (!ng) return null;
              const isHome = team.team_id === ng.home_team_id;
              const oppName = isHome ? ng.away_team : ng.home_team;
              const oppLogo = isHome ? ng.away_logo_url : ng.home_logo_url;
              const current = team.standing_1_prob ?? 0;
              const impl = implicationData.get(team.team_id);

              return (
                <tr key={team.team_id} className="border-b border-gray-100">
                  <td className="py-1.5 px-2">
                    <div className="flex items-center gap-1.5">
                      <TeamLogo src={team.logo_url} alt={team.team_name} size={16} />
                      <span className="font-medium">{team.team_name}</span>
                    </div>
                  </td>
                  <td className="py-1.5 px-2">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400 text-[10px]">vs</span>
                      <TeamLogo src={oppLogo} alt={oppName} size={14} />
                      <span className="text-gray-600">{oppName}</span>
                    </div>
                  </td>
                  <td className="text-center py-1.5 px-2 tabular-nums"
                    style={getCellColor(current, "blue")}>
                    {current > 0 ? `${current.toFixed(1)}%` : ""}
                  </td>
                  <td className="text-center py-1.5 px-2 tabular-nums"
                    style={impl ? getCellColor(impl.win1st, "blue") : {}}>
                    {impl ? (impl.win1st > 0 ? `${impl.win1st.toFixed(1)}%` : "") : (
                      <span className="text-gray-300">&mdash;</span>
                    )}
                  </td>
                  <td className="text-center py-1.5 px-2 tabular-nums"
                    style={impl ? getCellColor(impl.lose1st, "blue") : {}}>
                    {impl ? (impl.lose1st > 0 ? `${impl.lose1st.toFixed(1)}%` : "") : (
                      <span className="text-gray-300">&mdash;</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════
export default function BasketballWhatIfScenarios() {
  const [selectedConference, setSelectedConference] = useState<string | null>(null);
  const [gameSelections, setGameSelections] = useState<Map<number, number>>(new Map());
  const [whatIfData, setWhatIfData] = useState<WhatIfResponse | null>(null);
  const [hasCalculated, setHasCalculated] = useState(false);

  const firstPlaceRef = useRef<HTMLDivElement>(null);
  const top4Ref = useRef<HTMLDivElement>(null);
  const top8Ref = useRef<HTMLDivElement>(null);

  const { data: confData, isLoading: conferencesLoading, error: conferencesError } =
    useBasketballConfData();

  const conferences = useMemo(() => {
    if (!confData?.conferenceData?.data) return [];
    return confData.conferenceData.data
      .map((conf: { conference_name: string }) => conf.conference_name)
      .sort();
  }, [confData]);

  const { mutate: fetchWhatIf, isPending: isCalculating } = useBasketballWhatIf();

  useEffect(() => {
    if (conferences.length > 0 && !selectedConference) {
      const def = conferences.includes("Big 12") ? "Big 12" : conferences[0];
      setSelectedConference(def);
      fetchWhatIf(
        { conference: def, selections: [] },
        { onSuccess: (d: WhatIfResponse) => setWhatIfData(d) },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conferences, selectedConference]);

  const handleConferenceChange = useCallback((c: string) => {
    setSelectedConference(c);
    setGameSelections(new Map());
    setWhatIfData(null);
    setHasCalculated(false);
    fetchWhatIf({ conference: c, selections: [] },
      { onSuccess: (d: WhatIfResponse) => setWhatIfData(d) });
  }, [fetchWhatIf]);

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
    const arr = Array.from(gameSelections.entries()).map(([g, w]) => ({ game_id: g, winner_team_id: w }));
    fetchWhatIf({ conference: selectedConference, selections: arr }, {
      onSuccess: (d: WhatIfResponse) => { setWhatIfData(d); setHasCalculated(true); },
    });
  }, [selectedConference, gameSelections, fetchWhatIf]);

  const handleReset = useCallback(() => {
    setGameSelections(new Map());
    setHasCalculated(false);
    if (selectedConference) {
      fetchWhatIf({ conference: selectedConference, selections: [] },
        { onSuccess: (d: WhatIfResponse) => setWhatIfData(d) });
    }
  }, [selectedConference, fetchWhatIf]);

  const handleDownloadCSV = useCallback(() => {
    if (!whatIfData?.validation_data) return;
    const csv = buildValidationCSV(whatIfData.validation_data, whatIfData.conference || "");
    downloadCSV(csv, `whatif_validation_${(whatIfData.conference || "").replace(/\s+/g, "_").toLowerCase()}.csv`);
  }, [whatIfData]);

  // Build selection legend HTML for screenshots
  const selectionLegendHtml = useMemo(() => {
    if (gameSelections.size === 0 || !whatIfData?.games) return null;
    const items = Array.from(gameSelections.entries())
      .map(([gid, wid]) => {
        const g = whatIfData.games.find((x) => x.game_id === gid);
        if (!g) return "";
        const awayWins = wid === g.away_team_id;
        return `<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 6px;border:1px solid #d1d5db;border-radius:4px;margin:2px;">
          <span style="border:${awayWins ? "2px solid rgb(0,151,178)" : "2px solid transparent"};border-radius:50%;padding:1px;">
            <img src="${g.away_logo_url}" width="14" height="14" style="display:block;" /></span>
          <span style="font-size:9px;color:#d1d5db;">@</span>
          <span style="border:${!awayWins ? "2px solid rgb(0,151,178)" : "2px solid transparent"};border-radius:50%;padding:1px;">
            <img src="${g.home_logo_url}" width="14" height="14" style="display:block;" /></span>
        </span>`;
      }).join("");
    return `<div style="font-size:11px;color:#6b7280;margin-bottom:4px;">Selections: ${gameSelections.size} games</div><div style="display:flex;flex-wrap:wrap;gap:4px;">${items}</div>`;
  }, [gameSelections, whatIfData?.games]);

  const gamesByDate = useMemo(() => {
    if (!whatIfData?.games) return {};
    return whatIfData.games.reduce((acc, g) => {
      const d = g.date || "Unknown";
      if (!acc[d]) acc[d] = [];
      acc[d].push(g);
      return acc;
    }, {} as Record<string, WhatIfGame[]>);
  }, [whatIfData?.games]);

  const sortedDates = useMemo(
    () => Object.keys(gamesByDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime()),
    [gamesByDate],
  );

  const displayBaseline = whatIfData?.current_projections_no_ties ?? [];
  const displayWhatif = hasCalculated ? (whatIfData?.data_no_ties ?? []) : displayBaseline;
  const displayBaselineWT = whatIfData?.current_projections_with_ties ?? [];
  const displayWhatifWT = hasCalculated ? (whatIfData?.data_with_ties ?? []) : displayBaselineWT;

  // Prob functions
  const firstPlaceProb = useCallback((t: WhatIfTeamResult) => t.standing_1_prob ?? 0, []);
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
        <h1 className="text-xl font-normal text-gray-500">What If Calculator</h1>
        <div className="flex justify-center py-20"><LoadingSpinner /></div>
      </div>
    );
  }

  if (conferencesError) {
    return (
      <div className="container mx-auto px-4 py-4">
        <h1 className="text-xl font-normal text-gray-500">What If Calculator</h1>
        <ErrorMessage message={conferencesError.message} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4">
      <h1 className="text-xl font-normal text-gray-500 mb-6">What If Calculator</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ═══ LEFT PANEL ═══ */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4">
            {/* Conference — label + dropdown inline, override absolute positioning */}
            <div className="mb-4 flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Conference</label>
              <div className="[&_.conference-selector]:static [&_.conference-selector]:transform-none">
                <ConferenceSelector conferences={conferences}
                  selectedConference={selectedConference}
                  onChange={handleConferenceChange} loading={conferencesLoading} />
              </div>
            </div>

            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold">Select Games</h3>
              <span className="text-[11px] text-gray-400">{gameSelections.size} selected</span>
            </div>
            <p className="text-[11px] text-gray-400 mb-3">
              Percentage represents probability team will win based on current season statistics.
            </p>

            {whatIfData?.games && whatIfData.games.length > 0 ? (
              <div className="max-h-[50vh] overflow-y-auto pr-1 mb-4">
                {sortedDates.map((date) => (
                  <div key={date} className="mb-3">
                    <p className="text-[11px] font-medium text-gray-500 mb-1.5 sticky top-0 bg-white py-0.5 z-10">{date}</p>
                    <div className="flex flex-wrap gap-1">
                      {gamesByDate[date].map((g) => (
                        <GameCard key={g.game_id} game={g}
                          selectedWinner={gameSelections.get(g.game_id)}
                          onSelect={handleGameSelection} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic py-4">
                {isCalculating ? "Loading games..." : "No upcoming conference games found."}
              </p>
            )}

            <div className="flex gap-2 pt-3 border-t border-gray-200">
              <button onClick={handleCalculate}
                disabled={gameSelections.size === 0 || isCalculating}
                className="flex-1 py-2 px-3 text-sm font-medium text-white rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: TEAL_COLOR }}>
                {isCalculating ? "Calculating..." : `Calculate (${gameSelections.size})`}
              </button>
              {gameSelections.size > 0 && (
                <button onClick={handleReset}
                  className="py-2 px-3 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition">
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Next Game Implications */}
          {displayBaselineWT.length > 0 && whatIfData?.games && selectedConference && (
            <NextGameImplications
              games={whatIfData.games}
              baseline={displayBaselineWT}
              conference={selectedConference}
              fetchWhatIf={fetchWhatIf}
            />
          )}
        </div>

        {/* ═══ RIGHT PANEL ═══ */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">
                {hasCalculated ? "What-If Results" : "Current Standings"}
              </h2>
              {hasCalculated && whatIfData?.validation_data && (
                <button onClick={handleDownloadCSV} data-no-screenshot
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition">
                  <Download size={13} /> Validation CSV
                </button>
              )}
            </div>

            {/* Collapsible selection legend */}
            {whatIfData?.games && (
              <SelectionLegend games={whatIfData.games} selections={gameSelections} />
            )}

            {isCalculating && <div className="flex justify-center py-12"><LoadingSpinner /></div>}

            {!isCalculating && displayBaseline.length > 0 && (
              <>
                <ProbabilityTable
                  title="First Place % (Before → After)"
                  baseline={displayBaseline}
                  whatif={displayWhatif}
                  probFn={firstPlaceProb}
                  hasCalculated={hasCalculated}
                  screenshotRef={firstPlaceRef}
                  screenshotFilename="first_place_pct.png"
                  selectionHtml={selectionLegendHtml}
                />
                <ProbabilityTable
                  title="Top 4 % Probability"
                  baseline={displayBaseline}
                  whatif={displayWhatif}
                  probFn={top4Prob}
                  hasCalculated={hasCalculated}
                  screenshotRef={top4Ref}
                  screenshotFilename="top_4_pct.png"
                  selectionHtml={selectionLegendHtml}
                />
                <ProbabilityTable
                  title="Top 8 % Probability"
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

            {!isCalculating && !displayBaseline.length && (
              <p className="text-gray-500 text-center py-8">No team data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
