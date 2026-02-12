"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Check, Download } from "lucide-react";

import { useBasketballConfData } from "@/hooks/useBasketballConfData";
import {
  useBasketballWhatIf,
  type DebugScenario,
  type WhatIfGame,
  type WhatIfResponse,
  type WhatIfTeamResult,
} from "@/hooks/useBasketballWhatIf";
import { useCallback, useEffect, useMemo, useState } from "react";

const TEAL_COLOR = "rgb(0, 151, 178)";

// ────────────────────────────────────────────────────
// Helper: access dynamic standing_N_prob keys
// ────────────────────────────────────────────────────
function getStandingProb(team: WhatIfTeamResult, standing: number): number {
  const key = `standing_${standing}_prob` as keyof WhatIfTeamResult;
  return (team[key] as number) ?? 0;
}

// ────────────────────────────────────────────────────
// CSV Download Builder
// ────────────────────────────────────────────────────
function buildValidationCSV(
  debugScenarios: DebugScenario[],
  games: WhatIfGame[],
  conference: string,
): string {
  const lines: string[] = [];
  const esc = (v: string | number | boolean) =>
    `"${String(v).replace(/"/g, '""')}"`;

  lines.push(esc(`What-If Validation Data - ${conference}`));
  lines.push(esc(`Generated: ${new Date().toISOString()}`));
  lines.push(esc(`Scenarios shown: ${debugScenarios.length} (of 1000)`));
  lines.push("");

  // ── SECTION 1: All remaining conference games ──
  lines.push(esc("=== SECTION 1: REMAINING CONFERENCE GAMES ==="));
  lines.push(
    [
      "Game ID",
      "Date",
      "Away Team",
      "Home Team",
      "Conference Game",
      "Away Prob",
      "Home Prob",
    ]
      .map(esc)
      .join(","),
  );
  for (const g of games) {
    lines.push(
      [
        g.game_id,
        g.date,
        g.away_team,
        g.home_team,
        g.conf_game ? "Yes" : "No",
        g.away_probability != null
          ? (g.away_probability * 100).toFixed(1) + "%"
          : "",
        g.home_probability != null
          ? (g.home_probability * 100).toFixed(1) + "%"
          : "",
      ]
        .map(esc)
        .join(","),
    );
  }
  lines.push("");

  // ── PER-SCENARIO SECTIONS ──
  for (const scenario of debugScenarios) {
    const sn = scenario.scenario_num;
    lines.push(esc(`========================================`));
    lines.push(esc(`SCENARIO ${sn}`));
    lines.push(esc(`========================================`));
    lines.push("");

    // Section 2 & 3: Game winners (original vs what-if)
    lines.push(esc(`--- Scenario ${sn}: Game Winners ---`));
    lines.push(
      [
        "Game ID",
        "Date",
        "Matchup",
        "Conf Game",
        "Original Winner",
        "What-If Winner",
        "Changed",
      ]
        .map(esc)
        .join(","),
    );
    for (const gw of scenario.game_winners) {
      lines.push(
        [
          gw.game_id,
          gw.date,
          gw.matchup,
          gw.conf_game ? "Yes" : "No",
          gw.original_winner,
          gw.whatif_winner,
          gw.changed ? "YES" : "",
        ]
          .map(esc)
          .join(","),
      );
    }
    lines.push("");

    // Section 4 & 5: Team records
    lines.push(esc(`--- Scenario ${sn}: Team Conference Records ---`));
    lines.push(
      [
        "Team",
        "Original Wins",
        "Original Losses",
        "What-If Wins",
        "What-If Losses",
        "Wins Changed",
      ]
        .map(esc)
        .join(","),
    );
    const allTeams = Object.keys(scenario.team_records_original).sort();
    for (const team of allTeams) {
      const orig = scenario.team_records_original[team];
      const wi = scenario.team_records_whatif[team];
      const winsChanged = orig.conf_wins !== wi.conf_wins;
      lines.push(
        [
          team,
          orig.conf_wins,
          orig.conf_losses,
          wi.conf_wins,
          wi.conf_losses,
          winsChanged ? "YES" : "",
        ]
          .map(esc)
          .join(","),
      );
    }
    lines.push("");

    // Section 6 & 7: Standings with ties
    lines.push(esc(`--- Scenario ${sn}: Standings WITH TIES ---`));
    lines.push(
      [
        "Standing",
        "Original Team",
        "Original Wins",
        "What-If Team",
        "What-If Wins",
      ]
        .map(esc)
        .join(","),
    );
    const maxLen = Math.max(
      scenario.standings_with_ties_original.length,
      scenario.standings_with_ties_whatif.length,
    );
    for (let i = 0; i < maxLen; i++) {
      const o = scenario.standings_with_ties_original[i];
      const w = scenario.standings_with_ties_whatif[i];
      lines.push(
        [
          o?.standing ?? w?.standing ?? i + 1,
          o?.team_name ?? "",
          o?.conf_wins ?? "",
          w?.team_name ?? "",
          w?.conf_wins ?? "",
        ]
          .map(esc)
          .join(","),
      );
    }
    lines.push("");

    // Section 8 & 9: Standings no ties
    lines.push(esc(`--- Scenario ${sn}: Standings TIES BROKEN ---`));
    lines.push(
      [
        "Standing",
        "Original Team",
        "Original Wins",
        "What-If Team",
        "What-If Wins",
      ]
        .map(esc)
        .join(","),
    );
    const maxLen2 = Math.max(
      scenario.standings_no_ties_original.length,
      scenario.standings_no_ties_whatif.length,
    );
    for (let i = 0; i < maxLen2; i++) {
      const o = scenario.standings_no_ties_original[i];
      const w = scenario.standings_no_ties_whatif[i];
      lines.push(
        [
          o?.standing ?? w?.standing ?? i + 1,
          o?.team_name ?? "",
          o?.conf_wins ?? "",
          w?.team_name ?? "",
          w?.conf_wins ?? "",
        ]
          .map(esc)
          .join(","),
      );
    }
    lines.push("");
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
// Team Logo (small, inline)
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
        border: isSelected ? `2px solid ${TEAL_COLOR}` : "1px solid #e5e7eb",
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
// Selections Summary (compact game chips with logos)
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
              className="flex items-center gap-1 px-1.5 py-1 bg-white rounded border border-gray-200"
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
// First Place Change Table
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
        {rows.map(({ team, before, after, change }) => (
          <tr
            key={team.team_id}
            className="border-b border-gray-100 hover:bg-gray-50"
          >
            <td className="py-1.5 px-2">
              <div className="flex items-center gap-2">
                <TeamLogo src={team.logo_url} alt={team.team_name} size={18} />
                <span className="font-medium text-sm">{team.team_name}</span>
              </div>
            </td>
            <td className="text-right py-1.5 px-2 tabular-nums text-gray-600">
              {before.toFixed(1)}%
            </td>
            <td className="text-right py-1.5 px-2 tabular-nums font-semibold">
              {after.toFixed(1)}%
            </td>
            <td className="text-right py-1.5 px-2 tabular-nums font-semibold">
              {Math.abs(change) < 0.05 ? (
                <span className="text-gray-400">&mdash;</span>
              ) : change > 0 ? (
                <span className="text-green-600">+{change.toFixed(1)}%</span>
              ) : (
                <span className="text-red-500">{change.toFixed(1)}%</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ────────────────────────────────────────────────────
// Full Standings Comparison Table (all seed probs)
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
                        className={`block text-[9px] font-semibold ${winsChange > 0 ? "text-green-600" : "text-red-500"}`}
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

                    return (
                      <td
                        key={standing}
                        className="text-center py-1.5 px-1 tabular-nums"
                        style={{
                          backgroundColor: hasChange
                            ? delta > 0
                              ? "rgba(40, 167, 69, 0.08)"
                              : "rgba(220, 53, 69, 0.06)"
                            : "transparent",
                        }}
                      >
                        {val > 0 ? `${val.toFixed(1)}` : ""}
                        {hasChange && (
                          <span
                            className={`block text-[8px] font-semibold ${delta > 0 ? "text-green-600" : "text-red-500"}`}
                          >
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

  // Auto-load first conference
  useEffect(() => {
    if (conferences.length > 0 && !selectedConference) {
      const defaultConf = conferences[0];
      setSelectedConference(defaultConf);
      fetchWhatIf(
        { conference: defaultConf, selections: [] },
        {
          onSuccess: (data: WhatIfResponse) => {
            setWhatIfData(data);
          },
        },
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
        {
          onSuccess: (data: WhatIfResponse) => {
            setWhatIfData(data);
          },
        },
      );
    },
    [fetchWhatIf],
  );

  const handleGameSelection = useCallback(
    (gameId: number, winnerId: number) => {
      setGameSelections((prev) => {
        const next = new Map(prev);
        if (next.get(gameId) === winnerId) {
          next.delete(gameId);
        } else {
          next.set(gameId, winnerId);
        }
        return next;
      });
      setHasCalculated(false);
    },
    [],
  );

  const handleCalculate = useCallback(() => {
    if (!selectedConference) return;
    const selectionsArray = Array.from(gameSelections.entries()).map(
      ([gId, wId]) => ({ game_id: gId, winner_team_id: wId }),
    );
    fetchWhatIf(
      { conference: selectedConference, selections: selectionsArray },
      {
        onSuccess: (data: WhatIfResponse) => {
          setWhatIfData(data);
          setHasCalculated(true);
        },
        onError: (err: Error) => console.error("What-if failed:", err.message),
      },
    );
  }, [selectedConference, gameSelections, fetchWhatIf]);

  const handleReset = useCallback(() => {
    setGameSelections(new Map());
    setHasCalculated(false);
    if (selectedConference) {
      fetchWhatIf(
        { conference: selectedConference, selections: [] },
        {
          onSuccess: (data: WhatIfResponse) => {
            setWhatIfData(data);
          },
        },
      );
    }
  }, [selectedConference, fetchWhatIf]);

  const handleDownloadValidation = useCallback(() => {
    if (!whatIfData?.debug_scenarios || !whatIfData.games) return;
    const csv = buildValidationCSV(
      whatIfData.debug_scenarios,
      whatIfData.games,
      whatIfData.conference || selectedConference || "Unknown",
    );
    const confSlug = (whatIfData.conference || "conf")
      .replace(/\s+/g, "_")
      .toLowerCase();
    downloadCSV(csv, `whatif_validation_${confSlug}.csv`);
  }, [whatIfData, selectedConference]);

  // Group games by date
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
            {/* Conference */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Conference
              </label>
              <ConferenceSelector
                conferences={conferences}
                selectedConference={selectedConference}
                onChange={handleConferenceChange}
                loading={conferencesLoading}
              />
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
                      {gamesByDate[date].map((game: WhatIfGame) => {
                        const selected = gameSelections.get(game.game_id);
                        const awaySelected = selected === game.away_team_id;
                        const homeSelected = selected === game.home_team_id;

                        return (
                          <div
                            key={game.game_id}
                            className="flex items-center gap-0.5 p-0.5 rounded border border-gray-200 bg-gray-50"
                          >
                            <TeamTile
                              logoUrl={game.away_logo_url}
                              teamName={game.away_team}
                              probability={game.away_probability}
                              isSelected={awaySelected}
                              onClick={() =>
                                handleGameSelection(
                                  game.game_id,
                                  game.away_team_id,
                                )
                              }
                            />
                            <span className="text-[8px] text-gray-400">@</span>
                            <TeamTile
                              logoUrl={game.home_logo_url}
                              teamName={game.home_team}
                              probability={game.home_probability}
                              isSelected={homeSelected}
                              onClick={() =>
                                handleGameSelection(
                                  game.game_id,
                                  game.home_team_id,
                                )
                              }
                            />
                          </div>
                        );
                      })}
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
          {/* First Place % or Current Standings card */}
          <div className="bg-white rounded-lg shadow p-4">
            {/* Header with download button */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">
                {hasCalculated
                  ? "First Place % (Before \u2192 After)"
                  : "Current Standings"}
              </h2>
              {hasCalculated &&
                whatIfData?.debug_scenarios &&
                whatIfData.debug_scenarios.length > 0 && (
                  <button
                    onClick={handleDownloadValidation}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition"
                    title="Download validation data (first 10 scenarios)"
                  >
                    <Download size={13} />
                    Validation CSV
                  </button>
                )}
            </div>

            {/* Selections summary chips */}
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

            {/* After calculation: First Place % with Before/After/Change */}
            {!isCalculating && hasCalculated && displayBaseline.length > 0 && (
              <FirstPlaceTable
                baseline={displayBaseline}
                whatif={displayWhatif}
              />
            )}

            {/* Before calculation: simple baseline table */}
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

          {/* ═══════════════════════════════════
              FULL STANDINGS TABLES (below)
              ═══════════════════════════════════ */}
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
