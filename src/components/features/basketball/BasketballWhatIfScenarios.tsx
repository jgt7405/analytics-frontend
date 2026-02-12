"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Check, Download } from "lucide-react";

import { useBasketballConfData } from "@/hooks/useBasketballConfData";
import {
  useBasketballWhatIf,
  type ValidationData,
  type WhatIfGame,
  type WhatIfResponse,
  type WhatIfTeamResult,
} from "@/hooks/useBasketballWhatIf";
import { useCallback, useEffect, useMemo, useState } from "react";

const TEAL_COLOR = "rgb(0, 151, 178)";

// TWV-style colors: blue for positive, yellow for negative
const COLOR_BLUE = [24, 98, 123]; // Good / positive delta
const COLOR_WHITE = [255, 255, 255];
const COLOR_YELLOW = [255, 230, 113]; // Bad / negative delta

function getDeltaColor(
  delta: number,
  maxAbs: number,
): { backgroundColor: string; color: string } {
  if (Math.abs(delta) < 0.05 || maxAbs === 0) {
    return { backgroundColor: "transparent", color: "#000000" };
  }

  const ratio = Math.min(Math.abs(delta) / maxAbs, 1);
  const target = delta > 0 ? COLOR_BLUE : COLOR_YELLOW;

  const r = Math.round(COLOR_WHITE[0] + (target[0] - COLOR_WHITE[0]) * ratio);
  const g = Math.round(COLOR_WHITE[1] + (target[1] - COLOR_WHITE[1]) * ratio);
  const b = Math.round(COLOR_WHITE[2] + (target[2] - COLOR_WHITE[2]) * ratio);

  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  const textColor = brightness > 140 ? "#000000" : "#ffffff";

  return { backgroundColor: `rgb(${r}, ${g}, ${b})`, color: textColor };
}

// ────────────────────────────────────────────────────
// Helper: access dynamic standing_N_prob keys
// ────────────────────────────────────────────────────
function getStandingProb(team: WhatIfTeamResult, standing: number): number {
  const key = `standing_${standing}_prob` as keyof WhatIfTeamResult;
  return (team[key] as number) ?? 0;
}

// ────────────────────────────────────────────────────
// CSV Download Builder — 6 sections, all 1000 scenarios
// ────────────────────────────────────────────────────
function buildValidationCSV(vd: ValidationData, conference: string): string {
  const lines: string[] = [];
  const esc = (v: string | number | boolean | null | undefined) =>
    `"${String(v ?? "").replace(/"/g, '""')}"`;

  const games = vd.game_info;
  const teams = vd.team_names;

  // Header row for game columns
  const gameHeaders = games.map(
    (g) => `Game ${g.game_id}: ${g.away_team} @ ${g.home_team}`,
  );
  const gameProbRow = games.map((g) => {
    const ap = g.away_probability != null ? (g.away_probability * 100).toFixed(0) + "%" : "";
    const hp = g.home_probability != null ? (g.home_probability * 100).toFixed(0) + "%" : "";
    return `${ap} / ${hp}`;
  });

  // --- SECTION 1: Current Winners ---
  lines.push(esc(`=== SECTION 1: CURRENT WINNERS — ${conference} ===`));
  lines.push(["Scenario", ...gameHeaders].map(esc).join(","));
  lines.push(["Probabilities (Away/Home)", ...gameProbRow].map(esc).join(","));
  for (let s = 1; s <= 1000; s++) {
    const winners = vd.original_winners[s];
    if (!winners) continue;
    lines.push([s, ...winners].map(esc).join(","));
  }
  lines.push("");

  // --- SECTION 2: Updated Winners ---
  lines.push(esc(`=== SECTION 2: WHAT-IF WINNERS — ${conference} ===`));
  lines.push(["Scenario", ...gameHeaders].map(esc).join(","));
  for (let s = 1; s <= 1000; s++) {
    const winners = vd.whatif_winners[s];
    if (!winners) continue;
    lines.push([s, ...winners].map(esc).join(","));
  }
  lines.push("");

  // --- SECTION 3: Conference Wins Current ---
  lines.push(esc(`=== SECTION 3: CONFERENCE WINS — CURRENT — ${conference} ===`));
  lines.push(["Scenario", ...teams].map(esc).join(","));
  for (let s = 1; s <= 1000; s++) {
    const wins = vd.original_conf_wins[s];
    if (!wins) continue;
    lines.push([s, ...teams.map((t) => wins[t] ?? 0)].map(esc).join(","));
  }
  lines.push("");

  // --- SECTION 4: Conference Wins What-If ---
  lines.push(esc(`=== SECTION 4: CONFERENCE WINS — WHAT-IF — ${conference} ===`));
  lines.push(["Scenario", ...teams].map(esc).join(","));
  for (let s = 1; s <= 1000; s++) {
    const wins = vd.whatif_conf_wins[s];
    if (!wins) continue;
    lines.push([s, ...teams.map((t) => wins[t] ?? 0)].map(esc).join(","));
  }
  lines.push("");

  // --- SECTION 5: Standings Current (Ties Broken) ---
  lines.push(esc(`=== SECTION 5: STANDINGS (TIES BROKEN) — CURRENT — ${conference} ===`));
  lines.push(["Scenario", ...teams].map(esc).join(","));
  for (let s = 1; s <= 1000; s++) {
    const standings = vd.original_standings[s];
    if (!standings) continue;
    lines.push([s, ...teams.map((t) => standings[t] ?? "")].map(esc).join(","));
  }
  lines.push("");

  // --- SECTION 6: Standings What-If (Ties Broken) ---
  lines.push(esc(`=== SECTION 6: STANDINGS (TIES BROKEN) — WHAT-IF — ${conference} ===`));
  lines.push(["Scenario", ...teams].map(esc).join(","));
  for (let s = 1; s <= 1000; s++) {
    const standings = vd.whatif_standings[s];
    if (!standings) continue;
    lines.push([s, ...teams.map((t) => standings[t] ?? "")].map(esc).join(","));
  }

  return lines.join("\n");
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ────────────────────────────────────────────────────
// Team Logo
// ────────────────────────────────────────────────────
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

// ────────────────────────────────────────────────────
// Team Tile (clickable logo for game selection)
// ────────────────────────────────────────────────────
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
  const probDisplay =
    probability != null ? `${Math.round(probability * 100)}%` : "";

  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-center justify-center w-10 h-12 rounded transition-all"
      style={{
        border: isSelected ? `2px solid ${TEAL_COLOR}` : "1px solid transparent",
        backgroundColor: isSelected ? "rgba(0, 151, 178, 0.08)" : "white",
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
        <span className="text-[8px] font-bold text-gray-500 leading-tight">
          {teamName.substring(0, 3)}
        </span>
      )}
      {probDisplay && (
        <span className="text-[8px] text-gray-400 leading-tight mt-0.5">
          {probDisplay}
        </span>
      )}
      {isSelected && (
        <div
          className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
          style={{ backgroundColor: TEAL_COLOR }}
        >
          <Check size={8} className="text-white" strokeWidth={3} />
        </div>
      )}
    </button>
  );
}

// ────────────────────────────────────────────────────
// Game Card (pair of team tiles with border)
// ────────────────────────────────────────────────────
function GameCard({
  game,
  selectedWinner,
  onSelect,
}: {
  game: WhatIfGame;
  selectedWinner: number | undefined;
  onSelect: (gameId: number, winnerId: number) => void;
}) {
  const hasSelection = selectedWinner !== undefined;
  const awaySelected = selectedWinner === game.away_team_id;
  const homeSelected = selectedWinner === game.home_team_id;

  return (
    <div
      className="flex items-center gap-0.5 p-0.5 rounded"
      style={{
        border: hasSelection
          ? `2px solid ${TEAL_COLOR}`
          : "1px solid #d1d5db",
      }}
    >
      <TeamTile
        logoUrl={game.away_logo_url}
        teamName={game.away_team}
        probability={game.away_probability}
        isSelected={awaySelected}
        onClick={() => onSelect(game.game_id, game.away_team_id)}
      />
      <span className="text-[8px] text-gray-400">@</span>
      <TeamTile
        logoUrl={game.home_logo_url}
        teamName={game.home_team}
        probability={game.home_probability}
        isSelected={homeSelected}
        onClick={() => onSelect(game.game_id, game.home_team_id)}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────
// Selections Summary (compact game chips)
// ────────────────────────────────────────────────────
function SelectionsSummary({
  games,
  selections,
}: {
  games: WhatIfGame[];
  selections: Map<number, number>;
}) {
  if (selections.size === 0) return null;

  const selectedGames = Array.from(selections.entries())
    .map(([gameId, winnerId]) => {
      const game = games.find((g) => g.game_id === gameId);
      if (!game) return null;
      return { game, winnerId };
    })
    .filter(Boolean) as Array<{ game: WhatIfGame; winnerId: number }>;

  return (
    <div className="mb-4 px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-200">
      <p className="text-[11px] text-gray-500 mb-1.5">
        Selections: {selections.size} game{selections.size !== 1 ? "s" : ""}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {selectedGames.map(({ game, winnerId }) => {
          const awayWins = winnerId === game.away_team_id;
          return (
            <div
              key={game.game_id}
              className="flex items-center gap-1 px-1.5 py-1 bg-white rounded"
              style={{ border: "1px solid #d1d5db" }}
            >
              <span style={{ opacity: awayWins ? 1 : 0.35 }}>
                <TeamLogo
                  src={game.away_logo_url}
                  alt={game.away_team}
                  size={14}
                />
              </span>
              <span className="text-[9px] text-gray-300">@</span>
              <span style={{ opacity: !awayWins ? 1 : 0.35 }}>
                <TeamLogo
                  src={game.home_logo_url}
                  alt={game.home_team}
                  size={14}
                />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────
// First Place Change Table (TWV coloring)
// ────────────────────────────────────────────────────
function FirstPlaceTable({
  baseline,
  whatif,
}: {
  baseline: WhatIfTeamResult[];
  whatif: WhatIfTeamResult[];
}) {
  if (!baseline.length || !whatif.length) return null;

  const baselineMap = new Map(baseline.map((t) => [t.team_id, t]));

  const rows = [...whatif]
    .sort(
      (a, b) =>
        (a.avg_conference_standing ?? 99) - (b.avg_conference_standing ?? 99),
    )
    .map((team) => {
      const bl = baselineMap.get(team.team_id);
      const before = bl?.standing_1_prob ?? 0;
      const after = team.standing_1_prob ?? 0;
      const change = after - before;
      return { team, before, after, change };
    });

  const maxAbsChange = Math.max(...rows.map((r) => Math.abs(r.change)), 1);

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-gray-500">
          <th className="text-left py-2 px-2 font-medium">Team</th>
          <th className="text-right py-2 px-2 font-medium">Before</th>
          <th className="text-right py-2 px-2 font-medium">After</th>
          <th className="text-right py-2 px-2 font-medium">Change</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ team, before, after, change }) => {
          const cellStyle = getDeltaColor(change, maxAbsChange);
          return (
            <tr
              key={team.team_id}
              className="border-b border-gray-100"
            >
              <td className="py-1.5 px-2">
                <div className="flex items-center gap-2">
                  <TeamLogo
                    src={team.logo_url}
                    alt={team.team_name}
                    size={18}
                  />
                  <span className="font-medium text-sm">{team.team_name}</span>
                </div>
              </td>
              <td className="text-right py-1.5 px-2 tabular-nums text-gray-600">
                {before.toFixed(1)}%
              </td>
              <td className="text-right py-1.5 px-2 tabular-nums font-semibold">
                {after.toFixed(1)}%
              </td>
              <td
                className="text-right py-1.5 px-2 tabular-nums font-semibold"
                style={cellStyle}
              >
                {Math.abs(change) < 0.05 ? (
                  <span style={{ color: "#9ca3af" }}>&mdash;</span>
                ) : change > 0 ? (
                  `+${change.toFixed(1)}%`
                ) : (
                  `${change.toFixed(1)}%`
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ────────────────────────────────────────────────────
// Full Standings Comparison Table
// ────────────────────────────────────────────────────
function FullStandingsTable({
  baseline,
  whatif,
  numTeams,
  label,
}: {
  baseline: WhatIfTeamResult[];
  whatif: WhatIfTeamResult[];
  numTeams: number;
  label: string;
}) {
  if (!baseline.length || !whatif.length) return null;

  const baselineMap = new Map(baseline.map((t) => [t.team_id, t]));
  const maxStandings = Math.min(numTeams, 16);

  const sortedTeams = [...whatif].sort(
    (a, b) =>
      (a.avg_conference_standing ?? 99) - (b.avg_conference_standing ?? 99),
  );

  // Find max absolute delta for color scaling
  let maxAbsDelta = 1;
  for (const team of sortedTeams) {
    const bl = baselineMap.get(team.team_id);
    if (!bl) continue;
    for (let i = 1; i <= maxStandings; i++) {
      const delta = getStandingProb(team, i) - getStandingProb(bl, i);
      maxAbsDelta = Math.max(maxAbsDelta, Math.abs(delta));
    }
  }

  return (
    <div className="mb-6">
      <h3 className="text-base font-semibold mb-3">{label}</h3>
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500">
              <th className="text-left py-2 px-2 font-medium sticky left-0 bg-gray-50 z-10">
                Team
              </th>
              <th className="text-center py-2 px-2 font-medium">Wins</th>
              <th className="text-center py-2 px-2 font-medium">Avg</th>
              {Array.from({ length: maxStandings }, (_, i) => (
                <th key={i} className="text-center py-2 px-1.5 font-medium">
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
                  <td className="py-1.5 px-2 sticky left-0 bg-white z-10">
                    <div className="flex items-center gap-1.5">
                      <TeamLogo
                        src={team.logo_url}
                        alt={team.team_name}
                        size={16}
                      />
                      <span className="font-medium whitespace-nowrap">
                        {team.team_name}
                      </span>
                    </div>
                  </td>
                  <td className="text-center py-1.5 px-2 tabular-nums">
                    {(team.avg_projected_conf_wins ?? 0).toFixed(1)}
                    {Math.abs(winsChange) > 0.01 && (
                      <span
                        className="block text-[9px] font-semibold"
                        style={{
                          color:
                            winsChange > 0
                              ? `rgb(${COLOR_BLUE.join(",")})`
                              : `rgb(200, 160, 40)`,
                        }}
                      >
                        {winsChange > 0 ? "+" : ""}
                        {winsChange.toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td className="text-center py-1.5 px-2 tabular-nums">
                    {(team.avg_conference_standing ?? 0).toFixed(1)}
                  </td>
                  {Array.from({ length: maxStandings }, (_, i) => {
                    const standing = i + 1;
                    const val = getStandingProb(team, standing);
                    const blVal = bl ? getStandingProb(bl, standing) : val;
                    const delta = val - blVal;
                    const hasChange = Math.abs(delta) > 0.05;
                    const cellStyle = hasChange
                      ? getDeltaColor(delta, maxAbsDelta)
                      : { backgroundColor: "transparent", color: "#000000" };

                    return (
                      <td
                        key={standing}
                        className="text-center py-1.5 px-1 tabular-nums"
                        style={cellStyle}
                      >
                        {val > 0 ? `${val.toFixed(1)}` : ""}
                        {hasChange && (
                          <span className="block text-[8px] font-semibold">
                            {delta > 0 ? "+" : ""}
                            {delta.toFixed(1)}
                          </span>
                        )}
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
  );
}

// ════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════
export default function BasketballWhatIfScenarios() {
  const [selectedConference, setSelectedConference] = useState<string | null>(
    null,
  );
  const [gameSelections, setGameSelections] = useState<Map<number, number>>(
    new Map(),
  );
  const [whatIfData, setWhatIfData] = useState<WhatIfResponse | null>(null);
  const [hasCalculated, setHasCalculated] = useState(false);

  const {
    data: confData,
    isLoading: conferencesLoading,
    error: conferencesError,
  } = useBasketballConfData();

  const conferences = useMemo(() => {
    if (!confData?.conferenceData?.data) return [];
    return confData.conferenceData.data.map(
      (conf: { conference_name: string }) => conf.conference_name,
    );
  }, [confData]);

  const { mutate: fetchWhatIf, isPending: isCalculating } =
    useBasketballWhatIf();

  useEffect(() => {
    if (conferences.length > 0 && !selectedConference) {
      const defaultConf = conferences[0];
      setSelectedConference(defaultConf);
      fetchWhatIf(
        { conference: defaultConf, selections: [] },
        { onSuccess: (data: WhatIfResponse) => setWhatIfData(data) },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conferences, selectedConference]);

  const handleConferenceChange = useCallback(
    (newConference: string) => {
      setSelectedConference(newConference);
      setGameSelections(new Map());
      setWhatIfData(null);
      setHasCalculated(false);
      fetchWhatIf(
        { conference: newConference, selections: [] },
        { onSuccess: (data: WhatIfResponse) => setWhatIfData(data) },
      );
    },
    [fetchWhatIf],
  );

  const handleGameSelection = useCallback(
    (gameId: number, winnerId: number) => {
      setGameSelections((prev) => {
        const next = new Map(prev);
        if (next.get(gameId) === winnerId) next.delete(gameId);
        else next.set(gameId, winnerId);
        return next;
      });
      setHasCalculated(false);
    },
    [],
  );

  const handleCalculate = useCallback(() => {
    if (!selectedConference) return;
    const arr = Array.from(gameSelections.entries()).map(([gId, wId]) => ({
      game_id: gId,
      winner_team_id: wId,
    }));
    fetchWhatIf(
      { conference: selectedConference, selections: arr },
      {
        onSuccess: (data: WhatIfResponse) => {
          setWhatIfData(data);
          setHasCalculated(true);
        },
        onError: (err: Error) =>
          console.error("What-if failed:", err.message),
      },
    );
  }, [selectedConference, gameSelections, fetchWhatIf]);

  const handleReset = useCallback(() => {
    setGameSelections(new Map());
    setHasCalculated(false);
    if (selectedConference) {
      fetchWhatIf(
        { conference: selectedConference, selections: [] },
        { onSuccess: (data: WhatIfResponse) => setWhatIfData(data) },
      );
    }
  }, [selectedConference, fetchWhatIf]);

  const handleDownloadValidation = useCallback(() => {
    if (!whatIfData?.validation_data) return;
    const csv = buildValidationCSV(
      whatIfData.validation_data,
      whatIfData.conference || selectedConference || "Unknown",
    );
    const slug = (whatIfData.conference || "conf")
      .replace(/\s+/g, "_")
      .toLowerCase();
    downloadCSV(csv, `whatif_validation_${slug}.csv`);
  }, [whatIfData, selectedConference]);

  const gamesByDate = useMemo(() => {
    if (!whatIfData?.games) return {};
    return whatIfData.games.reduce(
      (acc, game) => {
        const date = game.date || "Unknown";
        if (!acc[date]) acc[date] = [];
        acc[date].push(game);
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

  // ─── Loading / Error ───
  if (conferencesLoading || !selectedConference) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">What If Calculator</h1>
        <p className="text-gray-600 mb-8">
          See how game outcomes impact conference standings.
        </p>
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (conferencesError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">What If Calculator</h1>
        <ErrorMessage
          message={`Failed to load conferences: ${conferencesError.message}`}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">What If Calculator</h1>
      <p className="text-gray-600 mb-6 text-sm">
        See how game outcomes impact conference standings.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ═══════════════════════════════════
            LEFT PANEL — Conference + Games
            ═══════════════════════════════════ */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4">
            {/* Conference selector — positioned left, above games */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Conference
              </label>
              <div className="max-w-[220px]">
                <ConferenceSelector
                  conferences={conferences}
                  selectedConference={selectedConference}
                  onChange={handleConferenceChange}
                  loading={conferencesLoading}
                />
              </div>
            </div>

            {/* Select Games header */}
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold">Select Games</h3>
              <span className="text-[11px] text-gray-400">
                {gameSelections.size} selected
              </span>
            </div>

            <p className="text-[11px] text-gray-400 mb-3">
              Percentage represents probability team will win based on current
              season statistics.
            </p>

            {/* Games list */}
            {whatIfData?.games && whatIfData.games.length > 0 ? (
              <div className="max-h-[50vh] overflow-y-auto pr-1 mb-4">
                {sortedDates.map((date) => (
                  <div key={date} className="mb-3">
                    <p className="text-[11px] font-medium text-gray-500 mb-1.5 sticky top-0 bg-white py-0.5 z-10">
                      {date}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {gamesByDate[date].map((game: WhatIfGame) => (
                        <GameCard
                          key={game.game_id}
                          game={game}
                          selectedWinner={gameSelections.get(game.game_id)}
                          onSelect={handleGameSelection}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic py-4">
                {isCalculating
                  ? "Loading games..."
                  : "No upcoming conference games found."}
              </p>
            )}

            {/* Action Buttons */}
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

        {/* ═══════════════════════════════════
            RIGHT PANEL — Results
            ═══════════════════════════════════ */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-4">
            {/* Header with download */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">
                {hasCalculated
                  ? "First Place % (Before \u2192 After)"
                  : "Current Standings"}
              </h2>
              {hasCalculated && whatIfData?.validation_data && (
                <button
                  onClick={handleDownloadValidation}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition"
                  title="Download all 1000 scenarios as CSV"
                >
                  <Download size={13} />
                  Validation CSV
                </button>
              )}
            </div>

            {/* Selections summary */}
            {whatIfData?.games && (
              <SelectionsSummary
                games={whatIfData.games}
                selections={gameSelections}
              />
            )}

            {isCalculating && (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            )}

            {/* After calculation: First Place % */}
            {!isCalculating && hasCalculated && displayBaseline.length > 0 && (
              <FirstPlaceTable
                baseline={displayBaseline}
                whatif={displayWhatif}
              />
            )}

            {/* Before calculation: baseline table */}
            {!isCalculating && !hasCalculated && displayBaseline.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500">
                      <th className="text-left py-2 px-2 font-medium">Team</th>
                      <th className="text-right py-2 px-2 font-medium">
                        Proj. Wins
                      </th>
                      <th className="text-right py-2 px-2 font-medium">
                        Avg Standing
                      </th>
                      <th className="text-right py-2 px-2 font-medium">
                        1st Place %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...displayBaseline]
                      .sort(
                        (a, b) =>
                          (a.avg_conference_standing ?? 99) -
                          (b.avg_conference_standing ?? 99),
                      )
                      .map((team) => (
                        <tr
                          key={team.team_id}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="py-1.5 px-2">
                            <div className="flex items-center gap-2">
                              <TeamLogo
                                src={team.logo_url}
                                alt={team.team_name}
                                size={18}
                              />
                              <span className="font-medium text-sm">
                                {team.team_name}
                              </span>
                            </div>
                          </td>
                          <td className="text-right py-1.5 px-2 tabular-nums">
                            {(team.avg_projected_conf_wins ?? 0).toFixed(1)}
                          </td>
                          <td className="text-right py-1.5 px-2 tabular-nums">
                            {(team.avg_conference_standing ?? 0).toFixed(1)}
                          </td>
                          <td className="text-right py-1.5 px-2 tabular-nums">
                            {(team.standing_1_prob ?? 0).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {!isCalculating &&
              !whatIfData?.current_projections_no_ties?.length && (
                <p className="text-gray-500 text-center py-8">
                  No team data available
                </p>
              )}
          </div>

          {/* Full standings tables */}
          {hasCalculated && displayBaseline.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4 mt-6">
              <FullStandingsTable
                baseline={whatIfData?.current_projections_no_ties ?? []}
                whatif={whatIfData?.data_no_ties ?? []}
                numTeams={numTeams}
                label="Projected Standings (Tiebreakers Applied)"
              />
              <FullStandingsTable
                baseline={whatIfData?.current_projections_with_ties ?? []}
                whatif={whatIfData?.data_with_ties ?? []}
                numTeams={numTeams}
                label="Projected Standings (With Ties)"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
