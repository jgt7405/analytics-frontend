"use client";

// Basketball Game Preview: pick an upcoming game to compare the two teams, see
// what a win or loss does to each, and their schedules. Parts are in this
// folder; data comes from @/services/game-preview and the team API.

import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { logger } from "@/lib/logger";
import { api } from "@/services/api";
import {
  fetchConfChampDataForTeam,
  fetchConferenceStandings,
  fetchNextGameImpact,
  fetchUpcomingGames,
} from "@/services/game-preview";
import type {
  ConfChampData,
  ConferenceStandingsTeam,
  NextGameImpactData,
  TeamDataResponse,
  UpcomingGame,
} from "@/types/gamePreview";
import { Download } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGameInUrl, useIsMobile } from "./hooks";
import { computeConfPosition, computeMetrics } from "./metrics";
import { generatePDF } from "./pdf";
import HeaderPage from "./pages/HeaderPage";
import ImpactPage from "./pages/ImpactPage";
import SchedulePage from "./pages/SchedulePage";

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function GamePreviewPageContent() {
  const [upcomingGames, setUpcomingGames] = useState<UpcomingGame[]>([]);
  const [conferences, setConferences] = useState<string[]>([]);
  const [selectedGame, setSelectedGame] = useState<UpcomingGame | null>(null);
  const [conferenceFilter, setConferenceFilter] = useState<string>("All");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [awayTeamData, setAwayTeamData] = useState<TeamDataResponse | null>(
    null,
  );
  const [homeTeamData, setHomeTeamData] = useState<TeamDataResponse | null>(
    null,
  );
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [awayConfStandings, setAwayConfStandings] = useState<
    ConferenceStandingsTeam[]
  >([]);
  const [homeConfStandings, setHomeConfStandings] = useState<
    ConferenceStandingsTeam[]
  >([]);
  const [awayImpactData, setAwayImpactData] =
    useState<NextGameImpactData | null>(null);
  const [homeImpactData, setHomeImpactData] =
    useState<NextGameImpactData | null>(null);
  const [awayConfChampData, setAwayConfChampData] =
    useState<ConfChampData | null>(null);
  const [homeConfChampData, setHomeConfChampData] =
    useState<ConfChampData | null>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const twoColGrid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
    gap: isMobile ? 12 : 16,
    alignItems: "start",
  };

  useEffect(() => {
    const loadGames = async () => {
      setIsLoading(true);
      try {
        const data = await fetchUpcomingGames();
        setUpcomingGames(data.games || []);
        setConferences(data.conferences || []);
      } catch (err) {
        logger.error("Failed to load upcoming games:", err);
        setError("Failed to load upcoming games. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    loadGames();
  }, []);

  useGameInUrl(upcomingGames, selectedGame, setSelectedGame);

  useEffect(() => {
    if (!selectedGame) {
      setAwayTeamData(null);
      setHomeTeamData(null);
      setAwayConfStandings([]);
      setHomeConfStandings([]);
      setAwayImpactData(null);
      setHomeImpactData(null);
      return;
    }
    const loadPreview = async () => {
      setIsLoadingPreview(true);
      setAwayTeamData(null);
      setHomeTeamData(null);
      setAwayConfStandings([]);
      setHomeConfStandings([]);
      setAwayImpactData(null);
      setHomeImpactData(null);
      setAwayConfChampData(null);
      setHomeConfChampData(null);
      setError(null);
      try {
        // Stage 1: Load team data (required for initial render)
        const [awayResp, homeResp] = await Promise.all([
          api.getTeamData(selectedGame.away_team),
          api.getTeamData(selectedGame.home_team),
        ]);
        setAwayTeamData(awayResp as unknown as TeamDataResponse);
        setHomeTeamData(homeResp as unknown as TeamDataResponse);
        setIsLoadingPreview(false);

        // Stage 2: Load standings + impact data in background (non-blocking)
        const awayConf = (awayResp as unknown as TeamDataResponse).team_info
          .conference;
        const homeConf = (homeResp as unknown as TeamDataResponse).team_info
          .conference;
        const awayTeamId = (awayResp as unknown as TeamDataResponse).team_info
          .team_id;
        const homeTeamId = (homeResp as unknown as TeamDataResponse).team_info
          .team_id;

        // Fire all background fetches in parallel
        const [
          awayStandings,
          homeStandings,
          awayImpact,
          homeImpact,
          awayConfChamp,
          homeConfChamp,
        ] = await Promise.all([
          fetchConferenceStandings(awayConf),
          fetchConferenceStandings(homeConf),
          fetchNextGameImpact(awayConf, awayTeamId),
          fetchNextGameImpact(homeConf, homeTeamId),
          fetchConfChampDataForTeam(
            awayConf,
            (awayResp as unknown as TeamDataResponse).team_info.team_name,
          ),
          fetchConfChampDataForTeam(
            homeConf,
            (homeResp as unknown as TeamDataResponse).team_info.team_name,
          ),
        ]);
        setAwayConfStandings(awayStandings);
        setHomeConfStandings(homeStandings);
        setAwayImpactData(awayImpact);
        setHomeImpactData(homeImpact);
        setAwayConfChampData(awayConfChamp);
        setHomeConfChampData(homeConfChamp);
      } catch (err) {
        logger.error("Error loading preview:", err);
        setError("Failed to load team preview data.");
        setIsLoadingPreview(false);
      }
    };
    loadPreview();
  }, [selectedGame]);

  const filteredGames = useMemo(() => {
    // Only show games that are the next game for BOTH participating teams
    let games = upcomingGames.filter((g) => g.is_next_game_for_both);
    if (conferenceFilter !== "All")
      games = games.filter(
        (g) =>
          g.home_team_conference === conferenceFilter ||
          g.away_team_conference === conferenceFilter,
      );
    return games;
  }, [upcomingGames, conferenceFilter]);

  const availableConferences = useMemo(
    () => ["All", ...conferences.filter((c) => c && c !== "FCS")],
    [conferences],
  );

  const awayConfPosition = useMemo(
    () =>
      awayTeamData
        ? computeConfPosition(
            awayTeamData.team_info.team_name,
            awayConfStandings,
          )
        : "—",
    [awayTeamData, awayConfStandings],
  );
  const homeConfPosition = useMemo(
    () =>
      homeTeamData
        ? computeConfPosition(
            homeTeamData.team_info.team_name,
            homeConfStandings,
          )
        : "—",
    [homeTeamData, homeConfStandings],
  );

  const awayMetrics = useMemo(
    () =>
      awayTeamData
        ? computeMetrics(
            awayTeamData.schedule,
            awayTeamData.team_info,
            awayConfPosition,
          )
        : null,
    [awayTeamData, awayConfPosition],
  );
  const homeMetrics = useMemo(
    () =>
      homeTeamData
        ? computeMetrics(
            homeTeamData.schedule,
            homeTeamData.team_info,
            homeConfPosition,
          )
        : null,
    [homeTeamData, homeConfPosition],
  );

  const handlePDF = useCallback(async () => {
    if (!selectedGame) return;
    setIsPdfGenerating(true);
    try {
      await generatePDF(pdfContainerRef, selectedGame.label);
    } finally {
      setIsPdfGenerating(false);
    }
  }, [selectedGame]);

  const selectedGameDate = selectedGame?.date_sort || "";

  return (
    <PageLayoutWrapper title="Game Preview" isLoading={isLoading}>
      <ErrorBoundary>
        <div style={{ maxWidth: 960 }}>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-5">
            Select an upcoming game to view a head-to-head comparison, win/loss
            impact, and schedule analysis.
          </p>

          {error && upcomingGames.length === 0 ? (
            <div className="text-center py-12 text-red-500">{error}</div>
          ) : (
            <>
              {/* Conference + Game Selector (single row) */}
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginBottom: 20,
                  flexWrap: "wrap",
                  alignItems: "flex-end",
                }}
              >
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 3 }}
                >
                  <label
                    style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}
                  >
                    Conference
                  </label>
                  <select
                    value={conferenceFilter}
                    onChange={(e) => setConferenceFilter(e.target.value)}
                    style={{
                      padding: "6px 10px",
                      border: "1px solid #d1d5db",
                      borderRadius: 6,
                      fontSize: 13,
                      minWidth: 160,
                      backgroundColor: "white",
                    }}
                  >
                    {availableConferences.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                    flex: 1,
                    minWidth: 240,
                  }}
                >
                  <label
                    style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}
                  >
                    Select Game ({filteredGames.length} upcoming)
                  </label>
                  <select
                    value={selectedGame ? selectedGame.game_id : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        setSelectedGame(null);
                        return;
                      }
                      setSelectedGame(
                        filteredGames.find((g) => g.game_id === val) || null,
                      );
                    }}
                    style={{
                      padding: "6px 10px",
                      border: "1px solid #d1d5db",
                      borderRadius: 6,
                      fontSize: 13,
                      width: "100%",
                      backgroundColor: "white",
                      cursor: "pointer",
                    }}
                  >
                    <option value="">— Choose an upcoming game —</option>
                    {filteredGames.map((g) => (
                      <option key={g.game_id} value={g.game_id}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ── Game Preview Content ─────────────────────── */}
              {selectedGame && (
                <>
                  {isLoadingPreview ? (
                    <div style={{ padding: "40px 20px" }}>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 16,
                        }}
                      >
                        <LoadingSpinner />
                        <span style={{ fontSize: 13, color: "#6b7280" }}>
                          Loading team data...
                        </span>
                      </div>
                      {/* Skeleton preview */}
                      <div style={{ marginTop: 24, opacity: 0.4 }}>
                        <div
                          style={{
                            height: 12,
                            width: "60%",
                            backgroundColor: "#e5e7eb",
                            borderRadius: 4,
                            margin: "0 auto 16px",
                          }}
                        />
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr auto 1fr",
                            gap: 12,
                            alignItems: "center",
                          }}
                        >
                          <div
                            style={{
                              height: 120,
                              backgroundColor: "#f3f4f6",
                              borderRadius: 8,
                            }}
                          />
                          <div style={{ fontSize: 11, color: "#d1d5db" }}>
                            @
                          </div>
                          <div
                            style={{
                              height: 120,
                              backgroundColor: "#f3f4f6",
                              borderRadius: 8,
                            }}
                          />
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 12,
                            marginTop: 16,
                          }}
                        >
                          <div
                            style={{
                              height: 200,
                              backgroundColor: "#f3f4f6",
                              borderRadius: 8,
                            }}
                          />
                          <div
                            style={{
                              height: 200,
                              backgroundColor: "#f3f4f6",
                              borderRadius: 8,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : awayTeamData &&
                    homeTeamData &&
                    awayMetrics &&
                    homeMetrics ? (
                    <>
                      {/* PDF Download */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          marginBottom: 12,
                        }}
                      >
                        <button
                          onClick={handlePDF}
                          disabled={isPdfGenerating}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "7px 14px",
                            backgroundColor: isPdfGenerating
                              ? "#9ca3af"
                              : "#18627b",
                            color: "white",
                            border: "none",
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 500,
                            cursor: isPdfGenerating ? "not-allowed" : "pointer",
                          }}
                        >
                          <Download size={14} />
                          {isPdfGenerating ? "Generating..." : "Download PDF"}
                        </button>
                      </div>

                      {/* ═══ All Content (pdfContainerRef wraps everything for PDF) ═══ */}
                      <div ref={pdfContainerRef}>
                        <HeaderPage
                          selectedGame={selectedGame}
                          selectedGameDate={selectedGameDate}
                          awayTeamData={awayTeamData}
                          homeTeamData={homeTeamData}
                          awayMetrics={awayMetrics}
                          homeMetrics={homeMetrics}
                          isMobile={isMobile}
                          twoColGrid={twoColGrid}
                        />

                        <ImpactPage
                          selectedGame={selectedGame}
                          awayTeamData={awayTeamData}
                          homeTeamData={homeTeamData}
                          awayImpactData={awayImpactData}
                          homeImpactData={homeImpactData}
                          isMobile={isMobile}
                          twoColGrid={twoColGrid}
                        />

                        <SchedulePage
                          selectedGame={selectedGame}
                          awayTeamData={awayTeamData}
                          homeTeamData={homeTeamData}
                          awayConfChampData={awayConfChampData}
                          homeConfChampData={homeConfChampData}
                          isMobile={isMobile}
                          twoColGrid={twoColGrid}
                        />
                      </div>
                      {/* ═══ End PDF Container ═══ */}
                    </>
                  ) : error ? (
                    <div className="text-center py-8 text-red-500 text-sm">
                      {error}
                    </div>
                  ) : null}
                </>
              )}
            </>
          )}
        </div>
      </ErrorBoundary>
    </PageLayoutWrapper>
  );
}
