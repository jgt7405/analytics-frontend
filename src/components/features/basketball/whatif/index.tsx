"use client";

// Basketball What If Calculator: pick game winners in a conference and see how
// seeding, standings and NCAA bid chances change. Parts are in this folder.

import ConferenceSelector from "@/components/common/ConferenceSelector";
import NextGameImpact from "@/components/features/basketball/NextGameImpact";
import WhatIfTeamSummary from "@/components/features/basketball/WhatIfTeamSummary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useBasketballConfData } from "@/hooks/useBasketballConfData";
import {
  type WhatIfGame,
  type WhatIfResponse,
  fetchBasketballWhatIfBaseline,
  fetchBasketballWhatIfValidationCsv,
  useBasketballWhatIf,
} from "@/hooks/useBasketballWhatIf";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./BasketballWhatIfScenarios.module.css";
import { GameCard } from "./GameCard";
import { TEAL_COLOR, ncaaAllTeamResult } from "./helpers";
import { ResultsPanel } from "./ResultsPanel";
import { TeamFilterDropdown } from "./TeamFilterDropdown";

// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// Main Component
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
export default function BasketballWhatIfScenarios() {
  const [selectedConference, setSelectedConference] = useState<string | null>(
    null,
  );
  const [gameSelections, setGameSelections] = useState<Map<number, number>>(
    new Map(),
  );
  const [whatIfData, setWhatIfData] = useState<WhatIfResponse | null>(null);
  const [hasCalculated, setHasCalculated] = useState(false);
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<number>>(
    new Set(),
  );
  const [selectedDetailTeamId, setSelectedDetailTeamId] = useState<
    number | null
  >(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);

  const [showAllNcaaTeams, setShowAllNcaaTeams] = useState(false);
  const teamFilterInitialized = useRef(false);

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

  // Lightweight baseline fetch – no simulations, just pre-computed data + games
  const [isLoadingBaseline, setIsLoadingBaseline] = useState(false);

  const fetchBaseline = useCallback(async (conf: string) => {
    setIsLoadingBaseline(true);
    try {
      const data = await fetchBasketballWhatIfBaseline(conf);
      setWhatIfData(data);
    } catch (e) {
      logger.error("Baseline fetch error:", e);
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
      // Pending game selections are intentionally kept across conference
      // switches - the user can clear them via the "Reset" button once they
      // get to the new conference.
      setSelectedTeamIds(new Set());
      teamFilterInitialized.current = false;
      setSelectedDetailTeamId(null);
      setShowAllNcaaTeams(false);
      setWhatIfData(null);
      setHasCalculated(false);
      fetchBaseline(c);
    },
    [fetchBaseline],
  );

  // Build sorted team list from loaded data
  const conferenceTeams = useMemo(() => {
    const teams =
      whatIfData?.current_projections_no_ties ?? whatIfData?.data_no_ties ?? [];
    return [...teams].sort(
      (a, b) =>
        (a.avg_conference_standing ?? 99) - (b.avg_conference_standing ?? 99),
    );
  }, [whatIfData?.current_projections_no_ties, whatIfData?.data_no_ties]);

  // Auto-select all teams only on initial conference load (not on user uncheck)
  useEffect(() => {
    if (conferenceTeams.length > 0 && !teamFilterInitialized.current) {
      setSelectedTeamIds(new Set(conferenceTeams.map((t) => t.team_id)));
      teamFilterInitialized.current = true;
    }
  }, [conferenceTeams]);

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
          // Lite responses omit the games list; keep the one already loaded
          // from the baseline so the game cards and legend stay rendered.
          setWhatIfData((prev) =>
            d.games.length === 0 && prev?.games?.length
              ? { ...d, games: prev.games }
              : d,
          );
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
      const blob = await fetchBasketballWhatIfValidationCsv(
        selectedConference,
        selectionsArray,
      );
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `whatif_validation_${selectedConference.replace(/\s+/g, "_").toLowerCase()}.csv`;
      a.click();
    } catch (e) {
      logger.error("CSV download error:", e);
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
          <span style="font-size:9px;color:#d1d5db;">${g.neutral_site ? "vs" : "@"}</span>
          <span style="border:${!awayWins ? "2px solid rgb(0,151,178)" : "2px solid transparent"};border-radius:4px;padding:1px;">
            <img src="${g.home_logo_url}" width="14" height="14" style="display:block;" /></span>
        </span>`;
      })
      .join("");
    return `<div style="font-size:11px;color:#6b7280;margin-bottom:4px;">Selections: ${gameSelections.size} games</div><div style="display:flex;flex-wrap:wrap;gap:4px;">${items}</div>`;
  }, [gameSelections, whatIfData?.games]);

  const gamesByDate = useMemo(() => {
    if (!whatIfData?.games) return {};
    const filtered =
      selectedTeamIds.size > 0
        ? whatIfData.games.filter(
            (g) =>
              selectedTeamIds.has(g.home_team_id) ||
              selectedTeamIds.has(g.away_team_id),
          )
        : whatIfData.games;
    return filtered.reduce(
      (acc, g) => {
        const d = g.date || "Unknown";
        if (!acc[d]) acc[d] = [];
        acc[d].push(g);
        return acc;
      },
      {} as Record<string, WhatIfGame[]>,
    );
  }, [whatIfData?.games, selectedTeamIds]);

  const sortedDates = useMemo(
    () =>
      Object.keys(gamesByDate).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime(),
      ),
    [gamesByDate],
  );

  const numTeams = whatIfData?.data_no_ties?.length ?? 16;

  const displayBaseline = useMemo(
    () => whatIfData?.current_projections_no_ties ?? [],
    [whatIfData?.current_projections_no_ties],
  );
  const displayWhatif = useMemo(
    () => (hasCalculated ? (whatIfData?.data_no_ties ?? []) : displayBaseline),
    [hasCalculated, whatIfData?.data_no_ties, displayBaseline],
  );

  // NCAA table rows: this conference, or every D1 team with a nonzero bid
  // (picks here move at-large bids nationally, like football's CFP table)
  const ncaaAvailable = whatIfData?.ncaa_available ?? false;
  const ncaaRows = useMemo(() => {
    if (!showAllNcaaTeams) {
      return { baseline: displayBaseline, whatif: displayWhatif };
    }
    const all = whatIfData?.ncaa_all_teams ?? [];
    return {
      baseline: all.map((t) => ncaaAllTeamResult(t, "current")),
      whatif: all.map((t) => ncaaAllTeamResult(t, "whatif")),
    };
  }, [showAllNcaaTeams, displayBaseline, displayWhatif, whatIfData?.ncaa_all_teams]);


  if (conferencesLoading || !selectedConference) {
    return (
      <div className="container mx-auto px-4 py-4 md:py-6">
        <h1 className={styles.title}>What If Calculator</h1>
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (conferencesError) {
    return (
      <div className="container mx-auto px-4 py-4 md:py-6">
        <h1 className={styles.title}>What If Calculator</h1>
        <ErrorMessage message={conferencesError.message} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 md:py-6">
      <div className="mb-6" data-screenshot-hide="true">
        <h1 className={styles.title}>What If Calculator</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ▓▓▓ LEFT PANEL ▓▓▓ */}
        <div className="lg:col-span-1 order-1">
          <div className={cn(styles.card, "p-4")}>
            {/* Conference – inline */}
            <div className="mb-4 flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
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

            {/* Team Filter */}
            {conferenceTeams.length > 0 && (
              <div className="mb-3 flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  Teams
                </label>
                <TeamFilterDropdown
                  teams={conferenceTeams}
                  selectedIds={selectedTeamIds}
                  onChange={setSelectedTeamIds}
                  isDark={isDark}
                />
              </div>
            )}

            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-sm font-medium">
                Select Game Winners and Calculate New What If Probabilities
              </h3>
              <span className="text-[11px] text-gray-400">
                {gameSelections.size} selected
              </span>
            </div>

            {whatIfData?.games && whatIfData.games.length > 0 ? (
              <div className="max-h-[30vh] lg:max-h-[50vh] overflow-y-auto pr-1 mb-4">
                {sortedDates.map((date) => (
                  <div key={date} className="mb-3">
                    <p className="text-[11px] text-gray-500 dark:text-gray-300 mb-1.5 sticky top-0 bg-white dark:bg-slate-900 py-0.5 z-10">
                      {date}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {gamesByDate[date].map((g) => (
                        <GameCard
                          key={g.game_id}
                          game={g}
                          selectedWinner={gameSelections.get(g.game_id)}
                          onSelect={handleGameSelection}
                          isDark={isDark}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-300 italic py-4">
                {isCalculating || isLoadingBaseline
                  ? "Loading games..."
                  : "No upcoming conference games found."}
              </p>
            )}

            <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-600">
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
                  className="py-2 px-3 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:bg-slate-800 transition"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Team Detail: Next Game Impact + What If Summary - desktop only */}
          <div className="hidden lg:block">
            {whatIfData?.games &&
              whatIfData.games.length > 0 &&
              whatIfData.data_no_ties && (
                <>
                  <NextGameImpact
                    conference={selectedConference}
                    teams={
                      whatIfData.current_projections_no_ties ??
                      whatIfData.data_no_ties
                    }
                    games={whatIfData.games}
                    selectedTeamId={selectedDetailTeamId}
                    onTeamChange={setSelectedDetailTeamId}
                  />
                  {/* What If Summary renders inside the same card area */}
                  {hasCalculated &&
                    selectedDetailTeamId &&
                    displayBaseline.length > 0 && (
                      <div className={cn(styles.card, "p-4 mt-3")}>
                        <WhatIfTeamSummary
                          baseline={
                            whatIfData?.current_projections_no_ties ?? []
                          }
                          whatif={whatIfData?.data_no_ties ?? []}
                          games={whatIfData.games}
                          selections={gameSelections}
                          hasCalculated={hasCalculated}
                          selectedTeamId={selectedDetailTeamId}
                        />
                      </div>
                    )}
                </>
              )}
          </div>
        </div>

        {/* Team Detail: Next Game Impact + What If Summary - mobile only (after game selection, before conference analysis) */}
        <div className="lg:hidden order-2">
          {whatIfData?.games &&
            whatIfData.games.length > 0 &&
            whatIfData.data_no_ties && (
              <>
                <NextGameImpact
                  conference={selectedConference}
                  teams={
                    whatIfData.current_projections_no_ties ??
                    whatIfData.data_no_ties
                  }
                  games={whatIfData.games}
                  selectedTeamId={selectedDetailTeamId}
                  onTeamChange={setSelectedDetailTeamId}
                />
                {hasCalculated &&
                  selectedDetailTeamId &&
                  displayBaseline.length > 0 && (
                    <div className={cn(styles.card, "p-4 mt-3")}>
                      <WhatIfTeamSummary
                        baseline={whatIfData?.current_projections_no_ties ?? []}
                        whatif={whatIfData?.data_no_ties ?? []}
                        games={whatIfData.games}
                        selections={gameSelections}
                        hasCalculated={hasCalculated}
                        selectedTeamId={selectedDetailTeamId}
                      />
                    </div>
                  )}
              </>
            )}
        </div>

        {/* ▓▓▓ RIGHT PANEL ▓▓▓ */}
        <ResultsPanel
          hasCalculated={hasCalculated}
          whatIfData={whatIfData}
          gameSelections={gameSelections}
          isCalculating={isCalculating}
          isLoadingBaseline={isLoadingBaseline}
          displayBaseline={displayBaseline}
          displayWhatif={displayWhatif}
          ncaaAvailable={ncaaAvailable}
          ncaaRows={ncaaRows}
          showAllNcaaTeams={showAllNcaaTeams}
          onToggleAllNcaaTeams={() => setShowAllNcaaTeams((v) => !v)}
          numTeams={numTeams}
          selectionLegendHtml={selectionLegendHtml}
          isDark={isDark}
          onDownloadCSV={handleDownloadCSV}
          isDownloadingCSV={isDownloadingCSV}
        />
      </div>
    </div>
  );
}
