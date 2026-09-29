"use client";

// Basketball Game Preview: pick an upcoming game to compare the two teams, see
// what a win or loss does to each, and their schedules. Parts are in this
// folder; data comes from @/services/game-preview and the team API.

import TeamWinValues from "@/components/features/basketball/TeamWinValues";
import BasketballTeamScheduleDifficulty from "@/components/features/basketball/team-schedule-difficulty";
import BasketballTeamWinsBreakdown from "@/components/features/basketball/team-wins-breakdown";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import TeamLogo from "@/components/ui/TeamLogo";
import { logger } from "@/lib/logger";
import { api } from "@/services/api";
import {
  fetchConfChampDataForTeam,
  fetchConferenceStandings,
  fetchNextGameImpact,
  fetchUpcomingGames,
} from "@/services/game-preview";
import type {
  AllScheduleGame,
  ConfChampData,
  ConferenceStandingsTeam,
  NextGameImpactData,
  TeamDataResponse,
  UpcomingGame,
} from "@/types/gamePreview";
import { Download } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIsMobile } from "./hooks";
import { TEAL, computeConfPosition, computeMetrics } from "./metrics";
import { buildHeadToHeadNarrative } from "./narratives/headToHead";
import { buildNextGameImpactNarrative } from "./narratives/nextGameImpact";
import { buildScheduleDifficultyNarrative } from "./narratives/scheduleDifficulty";
import { buildTeamNarrative } from "./narratives/team";
import { buildWinValuesNarrative } from "./narratives/winValues";
import { buildWinsBreakdownNarrative } from "./narratives/winsBreakdown";
import { generatePDF } from "./pdf";
import { HeadToHeadComparison } from "./sections/HeadToHeadComparison";
import { NextGameImpactInline } from "./sections/NextGameImpactInline";
import { ThreeColumnSchedule } from "./sections/ThreeColumnSchedule";
import { sectionDescStyle } from "./sections/styles";

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
  const searchParams = useSearchParams();

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

  // Auto-select game from URL query parameter
  useEffect(() => {
    if (upcomingGames.length === 0) return;
    const gameParam = searchParams.get("game");
    if (gameParam && !selectedGame) {
      const match = upcomingGames.find((g) => g.game_id === gameParam);
      if (match) {
        setSelectedGame(match);
      }
    }
  }, [upcomingGames, searchParams, selectedGame]);

  // Sync selected game to URL for shareability (only after games have loaded)
  useEffect(() => {
    if (upcomingGames.length === 0) return; // Don't touch URL until games are loaded
    const params = new URLSearchParams(searchParams.toString());
    if (selectedGame) {
      params.set("game", selectedGame.game_id);
    } else {
      params.delete("game");
    }
    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    window.history.replaceState({}, "", newUrl);
  }, [selectedGame, searchParams, upcomingGames]);

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
                        {/* ═══ PDF Page 1: Header + Head-to-Head + Team Narratives ═══ */}
                        <div
                          data-pdf-page="1"
                          style={{
                            backgroundColor: "white",
                            padding: isMobile ? 10 : 20,
                          }}
                        >
                          {/* Header Banner */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 12,
                              paddingBottom: 8,
                              borderBottom: "2px solid #e5e7eb",
                            }}
                          >
                            <div>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src="/images/JThom_Logo.png"
                                alt="Logo"
                                style={{ height: 24 }}
                              />
                            </div>
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color: "#374151",
                                textAlign: "center",
                                flex: 1,
                                padding: "0 12px",
                              }}
                            >
                              Game Preview — {selectedGame.date}
                            </div>
                            <div style={{ fontSize: 10, color: "#9ca3af" }}>
                              {new Date().toLocaleDateString()}
                            </div>
                          </div>

                          {/* 1. Head-to-Head Comparison */}
                          <p style={sectionDescStyle}>
                            {buildHeadToHeadNarrative(
                              selectedGame.away_team,
                              selectedGame.home_team,
                              awayMetrics,
                              homeMetrics,
                              awayTeamData.team_info,
                              homeTeamData.team_info,
                              selectedGame.win_prob,
                            )}
                          </p>
                          <HeadToHeadComparison
                            awayTeam={selectedGame.away_team}
                            homeTeam={selectedGame.home_team}
                            awayMetrics={awayMetrics}
                            homeMetrics={homeMetrics}
                            awayInfo={awayTeamData.team_info}
                            homeInfo={homeTeamData.team_info}
                            winProb={selectedGame.win_prob}
                          />

                          {/* 2. Team Narratives + 3-Column Schedule */}
                          <div style={{ marginTop: 16, ...twoColGrid }}>
                            <div
                              style={{
                                padding: 10,
                                backgroundColor: "#f9fafb",
                                borderRadius: 8,
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  marginBottom: 6,
                                }}
                              >
                                <TeamLogo
                                  logoUrl={
                                    awayTeamData.team_info.logo_url || ""
                                  }
                                  teamName={selectedGame.away_team}
                                  size={18}
                                />
                                <span
                                  style={{
                                    fontWeight: 600,
                                    fontSize: 12,
                                    color: "#374151",
                                  }}
                                >
                                  {selectedGame.away_team}
                                </span>
                              </div>
                              <p
                                style={{
                                  fontSize: 11,
                                  color: "#4b5563",
                                  lineHeight: 1.55,
                                  margin: "0 0 8px 0",
                                }}
                              >
                                {buildTeamNarrative(
                                  selectedGame.away_team,
                                  awayMetrics,
                                  awayTeamData.team_info,
                                  false,
                                  selectedGame.home_team,
                                  selectedGameDate,
                                  awayTeamData.schedule,
                                )}
                              </p>
                              <div style={{ marginTop: 8 }}>
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: "#9ca3af",
                                    display: "block",
                                    marginBottom: 3,
                                  }}
                                >
                                  Season Schedule (by difficulty)
                                </span>
                                <ThreeColumnSchedule
                                  schedule={awayTeamData.schedule}
                                  upcomingOpponent={selectedGame.home_team}
                                  upcomingDate={selectedGameDate}
                                />
                              </div>
                            </div>
                            <div
                              style={{
                                padding: 10,
                                backgroundColor: "#f9fafb",
                                borderRadius: 8,
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  marginBottom: 6,
                                }}
                              >
                                <TeamLogo
                                  logoUrl={
                                    homeTeamData.team_info.logo_url || ""
                                  }
                                  teamName={selectedGame.home_team}
                                  size={18}
                                />
                                <span
                                  style={{
                                    fontWeight: 600,
                                    fontSize: 12,
                                    color: "#374151",
                                  }}
                                >
                                  {selectedGame.home_team}
                                </span>
                              </div>
                              <p
                                style={{
                                  fontSize: 11,
                                  color: "#4b5563",
                                  lineHeight: 1.55,
                                  margin: "0 0 8px 0",
                                }}
                              >
                                {buildTeamNarrative(
                                  selectedGame.home_team,
                                  homeMetrics,
                                  homeTeamData.team_info,
                                  true,
                                  selectedGame.away_team,
                                  selectedGameDate,
                                  homeTeamData.schedule,
                                )}
                              </p>
                              <div style={{ marginTop: 8 }}>
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: "#9ca3af",
                                    display: "block",
                                    marginBottom: 3,
                                  }}
                                >
                                  Season Schedule (by difficulty)
                                </span>
                                <ThreeColumnSchedule
                                  schedule={homeTeamData.schedule}
                                  upcomingOpponent={selectedGame.away_team}
                                  upcomingDate={selectedGameDate}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* ═══ PDF Page 2: Next Game Impact + Win Values ═══ */}
                        <div
                          data-pdf-page="2"
                          style={{
                            backgroundColor: "white",
                            padding: isMobile ? 10 : 20,
                            marginTop: 20,
                          }}
                        >
                          {/* 3. Next Game Win/Loss Impact */}
                          <div>
                            <h3
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: "#374151",
                                marginBottom: 4,
                                paddingBottom: 5,
                                borderBottom: "1px solid #e5e7eb",
                              }}
                            >
                              Next Game Win/Loss Impact
                            </h3>
                            {(() => {
                              const full = buildNextGameImpactNarrative(
                                selectedGame.away_team,
                                selectedGame.home_team,
                                awayTeamData.team_info,
                                homeTeamData.team_info,
                                awayImpactData,
                                homeImpactData,
                              );
                              const [awayNarr, homeNarr] = full.split("\n\n");
                              const narrStyle: React.CSSProperties = {
                                fontSize: 11,
                                color: "#6b7280",
                                lineHeight: 1.5,
                                marginBottom: 12,
                              };
                              return isMobile ? (
                                <div style={twoColGrid}>
                                  {/* Away Team: Commentary + Component */}
                                  <div>
                                    <p style={narrStyle}>{awayNarr}</p>
                                    <div
                                      style={{
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 8,
                                        padding: 10,
                                        backgroundColor: "white",
                                      }}
                                    >
                                      <NextGameImpactInline
                                        teamId={awayTeamData.team_info.team_id}
                                        conference={
                                          awayTeamData.team_info.conference
                                        }
                                        teamInfo={awayTeamData.team_info}
                                        impactData={awayImpactData}
                                      />
                                    </div>
                                  </div>
                                  {/* Home Team: Commentary + Component */}
                                  <div>
                                    <p style={narrStyle}>{homeNarr}</p>
                                    <div
                                      style={{
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 8,
                                        padding: 10,
                                        backgroundColor: "white",
                                      }}
                                    >
                                      <NextGameImpactInline
                                        teamId={homeTeamData.team_info.team_id}
                                        conference={
                                          homeTeamData.team_info.conference
                                        }
                                        teamInfo={homeTeamData.team_info}
                                        impactData={homeImpactData}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {/* Desktop: Row 1: Paragraphs */}
                                  <div style={twoColGrid}>
                                    <p style={narrStyle}>{awayNarr}</p>
                                    <p style={narrStyle}>{homeNarr}</p>
                                  </div>
                                  {/* Desktop: Row 2: Components */}
                                  <div style={twoColGrid}>
                                    <div
                                      style={{
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 8,
                                        padding: 10,
                                        backgroundColor: "white",
                                      }}
                                    >
                                      <NextGameImpactInline
                                        teamId={awayTeamData.team_info.team_id}
                                        conference={
                                          awayTeamData.team_info.conference
                                        }
                                        teamInfo={awayTeamData.team_info}
                                        impactData={awayImpactData}
                                      />
                                    </div>
                                    <div
                                      style={{
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 8,
                                        padding: 10,
                                        backgroundColor: "white",
                                      }}
                                    >
                                      <NextGameImpactInline
                                        teamId={homeTeamData.team_info.team_id}
                                        conference={
                                          homeTeamData.team_info.conference
                                        }
                                        teamInfo={homeTeamData.team_info}
                                        impactData={homeImpactData}
                                      />
                                    </div>
                                  </div>
                                </>
                              );
                            })()}
                          </div>

                          {/* 4. Win Values Over Time */}
                          <div style={{ marginTop: 20 }}>
                            <h3
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: "#374151",
                                marginBottom: 4,
                                paddingBottom: 5,
                                borderBottom: "1px solid #e5e7eb",
                              }}
                            >
                              Win Values Over Time
                            </h3>
                            {(() => {
                              const full = buildWinValuesNarrative(
                                selectedGame.away_team,
                                selectedGame.home_team,
                                awayTeamData.schedule,
                                homeTeamData.schedule,
                              );
                              const [awayNarr, homeNarr] = full.split("\n\n");
                              const narrStyle: React.CSSProperties = {
                                fontSize: 11,
                                color: "#6b7280",
                                lineHeight: 1.5,
                                marginBottom: 12,
                              };
                              return isMobile ? (
                                <div style={twoColGrid}>
                                  {/* Away Team: Commentary + Component */}
                                  <div>
                                    <p style={narrStyle}>{awayNarr}</p>
                                    <div
                                      style={{
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 8,
                                        padding: 8,
                                        backgroundColor: "white",
                                        overflowX: "auto",
                                        overflowY: "hidden",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          marginBottom: 8,
                                          gap: 6,
                                        }}
                                      >
                                        <TeamLogo
                                          logoUrl={
                                            awayTeamData.team_info.logo_url ||
                                            ""
                                          }
                                          teamName={selectedGame.away_team}
                                          size={20}
                                        />
                                        <span
                                          style={{
                                            fontWeight: 600,
                                            fontSize: 12,
                                            color: "#374151",
                                          }}
                                        >
                                          {selectedGame.away_team}
                                        </span>
                                      </div>
                                      <TeamWinValues
                                        schedule={awayTeamData.schedule}
                                        logoUrl={
                                          awayTeamData.team_info.logo_url || ""
                                        }
                                        primaryColor={
                                          awayTeamData.team_info.primary_color
                                        }
                                      />
                                    </div>
                                  </div>
                                  {/* Home Team: Commentary + Component */}
                                  <div>
                                    <p style={narrStyle}>{homeNarr}</p>
                                    <div
                                      style={{
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 8,
                                        padding: 8,
                                        backgroundColor: "white",
                                        overflowX: "auto",
                                        overflowY: "hidden",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          marginBottom: 8,
                                          gap: 6,
                                        }}
                                      >
                                        <TeamLogo
                                          logoUrl={
                                            homeTeamData.team_info.logo_url ||
                                            ""
                                          }
                                          teamName={selectedGame.home_team}
                                          size={20}
                                        />
                                        <span
                                          style={{
                                            fontWeight: 600,
                                            fontSize: 12,
                                            color: "#374151",
                                          }}
                                        >
                                          {selectedGame.home_team}
                                        </span>
                                      </div>
                                      <TeamWinValues
                                        schedule={homeTeamData.schedule}
                                        logoUrl={
                                          homeTeamData.team_info.logo_url || ""
                                        }
                                        primaryColor={
                                          homeTeamData.team_info.primary_color
                                        }
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {/* Desktop: Row 1: Paragraphs */}
                                  <div style={twoColGrid}>
                                    <p style={narrStyle}>{awayNarr}</p>
                                    <p style={narrStyle}>{homeNarr}</p>
                                  </div>
                                  {/* Desktop: Row 2: Components */}
                                  <div style={twoColGrid}>
                                    <div
                                      style={{
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 8,
                                        padding: 8,
                                        backgroundColor: "white",
                                        overflowX: "auto",
                                        overflowY: "hidden",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          marginBottom: 8,
                                          gap: 6,
                                        }}
                                      >
                                        <TeamLogo
                                          logoUrl={
                                            awayTeamData.team_info.logo_url ||
                                            ""
                                          }
                                          teamName={selectedGame.away_team}
                                          size={20}
                                        />
                                        <span
                                          style={{
                                            fontWeight: 600,
                                            fontSize: 12,
                                            color: "#374151",
                                          }}
                                        >
                                          {selectedGame.away_team}
                                        </span>
                                      </div>
                                      <TeamWinValues
                                        schedule={awayTeamData.schedule}
                                        logoUrl={
                                          awayTeamData.team_info.logo_url || ""
                                        }
                                        primaryColor={
                                          awayTeamData.team_info.primary_color
                                        }
                                      />
                                    </div>
                                    <div
                                      style={{
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 8,
                                        padding: 8,
                                        backgroundColor: "white",
                                        overflowX: "auto",
                                        overflowY: "hidden",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          marginBottom: 8,
                                          gap: 6,
                                        }}
                                      >
                                        <TeamLogo
                                          logoUrl={
                                            homeTeamData.team_info.logo_url ||
                                            ""
                                          }
                                          teamName={selectedGame.home_team}
                                          size={20}
                                        />
                                        <span
                                          style={{
                                            fontWeight: 600,
                                            fontSize: 12,
                                            color: "#374151",
                                          }}
                                        >
                                          {selectedGame.home_team}
                                        </span>
                                      </div>
                                      <TeamWinValues
                                        schedule={homeTeamData.schedule}
                                        logoUrl={
                                          homeTeamData.team_info.logo_url || ""
                                        }
                                        primaryColor={
                                          homeTeamData.team_info.primary_color
                                        }
                                      />
                                    </div>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>

                        {/* ═══ PDF Page 3: Schedule Difficulty + Wins Breakdown ═══ */}
                        <div
                          data-pdf-page="3"
                          style={{
                            backgroundColor: "white",
                            padding: isMobile ? 10 : 20,
                            marginTop: 20,
                          }}
                        >
                          {/* 5. Schedule Difficulty */}
                          <div>
                            <h3
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: "#374151",
                                marginBottom: 4,
                                paddingBottom: 5,
                                borderBottom: "1px solid #e5e7eb",
                              }}
                            >
                              Schedule Difficulty
                            </h3>
                            {(() => {
                              const full = buildScheduleDifficultyNarrative(
                                selectedGame.away_team,
                                selectedGame.home_team,
                                awayTeamData.schedule,
                                homeTeamData.schedule,
                              );
                              const [awayNarr, homeNarr] = full.split("\n\n");
                              const narrStyle: React.CSSProperties = {
                                fontSize: 11,
                                color: "#6b7280",
                                lineHeight: 1.5,
                                marginBottom: 12,
                              };
                              return isMobile ? (
                                <div style={twoColGrid}>
                                  {/* Away Team: Commentary + Component */}
                                  <div>
                                    <p style={narrStyle}>{awayNarr}</p>
                                    <div
                                      style={{
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 8,
                                        padding: 12,
                                        backgroundColor: "white",
                                        overflowX: "auto",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          marginBottom: 10,
                                          gap: 6,
                                        }}
                                      >
                                        <TeamLogo
                                          logoUrl={
                                            awayTeamData.team_info.logo_url ||
                                            ""
                                          }
                                          teamName={selectedGame.away_team}
                                          size={24}
                                        />
                                        <span
                                          style={{
                                            fontWeight: 600,
                                            fontSize: 13,
                                            color: "#374151",
                                          }}
                                        >
                                          {selectedGame.away_team}
                                        </span>
                                      </div>
                                      <BasketballTeamScheduleDifficulty
                                        schedule={awayTeamData.schedule}
                                        allScheduleData={
                                          (awayTeamData.all_schedule_data as
                                            | AllScheduleGame[]
                                            | undefined) || []
                                        }
                                        teamConference={
                                          awayTeamData.team_info.conference
                                        }
                                        teamColor={
                                          awayTeamData.team_info
                                            .primary_color || TEAL
                                        }
                                        teamName={selectedGame.away_team}
                                      />
                                    </div>
                                  </div>
                                  {/* Home Team: Commentary + Component */}
                                  <div>
                                    <p style={narrStyle}>{homeNarr}</p>
                                    <div
                                      style={{
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 8,
                                        padding: 12,
                                        backgroundColor: "white",
                                        overflowX: "auto",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          marginBottom: 10,
                                          gap: 6,
                                        }}
                                      >
                                        <TeamLogo
                                          logoUrl={
                                            homeTeamData.team_info.logo_url ||
                                            ""
                                          }
                                          teamName={selectedGame.home_team}
                                          size={24}
                                        />
                                        <span
                                          style={{
                                            fontWeight: 600,
                                            fontSize: 13,
                                            color: "#374151",
                                          }}
                                        >
                                          {selectedGame.home_team}
                                        </span>
                                      </div>
                                      <BasketballTeamScheduleDifficulty
                                        schedule={homeTeamData.schedule}
                                        allScheduleData={
                                          (homeTeamData.all_schedule_data as
                                            | AllScheduleGame[]
                                            | undefined) || []
                                        }
                                        teamConference={
                                          homeTeamData.team_info.conference
                                        }
                                        teamColor={
                                          homeTeamData.team_info
                                            .primary_color || TEAL
                                        }
                                        teamName={selectedGame.home_team}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {/* Desktop: Row 1: Paragraphs */}
                                  <div style={twoColGrid}>
                                    <p style={narrStyle}>{awayNarr}</p>
                                    <p style={narrStyle}>{homeNarr}</p>
                                  </div>
                                  {/* Desktop: Row 2: Components */}
                                  <div style={twoColGrid}>
                                    <div
                                      style={{
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 8,
                                        padding: 12,
                                        backgroundColor: "white",
                                        overflowX: "auto",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          marginBottom: 10,
                                          gap: 6,
                                        }}
                                      >
                                        <TeamLogo
                                          logoUrl={
                                            awayTeamData.team_info.logo_url ||
                                            ""
                                          }
                                          teamName={selectedGame.away_team}
                                          size={24}
                                        />
                                        <span
                                          style={{
                                            fontWeight: 600,
                                            fontSize: 13,
                                            color: "#374151",
                                          }}
                                        >
                                          {selectedGame.away_team}
                                        </span>
                                      </div>
                                      <BasketballTeamScheduleDifficulty
                                        schedule={awayTeamData.schedule}
                                        allScheduleData={
                                          (awayTeamData.all_schedule_data as
                                            | AllScheduleGame[]
                                            | undefined) || []
                                        }
                                        teamConference={
                                          awayTeamData.team_info.conference
                                        }
                                        teamColor={
                                          awayTeamData.team_info
                                            .primary_color || TEAL
                                        }
                                        teamName={selectedGame.away_team}
                                      />
                                    </div>
                                    <div
                                      style={{
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 8,
                                        padding: 12,
                                        backgroundColor: "white",
                                        overflowX: "auto",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          marginBottom: 10,
                                          gap: 6,
                                        }}
                                      >
                                        <TeamLogo
                                          logoUrl={
                                            homeTeamData.team_info.logo_url ||
                                            ""
                                          }
                                          teamName={selectedGame.home_team}
                                          size={24}
                                        />
                                        <span
                                          style={{
                                            fontWeight: 600,
                                            fontSize: 13,
                                            color: "#374151",
                                          }}
                                        >
                                          {selectedGame.home_team}
                                        </span>
                                      </div>
                                      <BasketballTeamScheduleDifficulty
                                        schedule={homeTeamData.schedule}
                                        allScheduleData={
                                          (homeTeamData.all_schedule_data as
                                            | AllScheduleGame[]
                                            | undefined) || []
                                        }
                                        teamConference={
                                          homeTeamData.team_info.conference
                                        }
                                        teamColor={
                                          homeTeamData.team_info
                                            .primary_color || TEAL
                                        }
                                        teamName={selectedGame.home_team}
                                      />
                                    </div>
                                  </div>
                                </>
                              );
                            })()}
                          </div>

                          {/* 6. Season Wins Breakdown */}
                          <div style={{ marginTop: 20 }}>
                            <h3
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: "#374151",
                                marginBottom: 4,
                                paddingBottom: 5,
                                borderBottom: "1px solid #e5e7eb",
                              }}
                            >
                              Season Wins Breakdown
                            </h3>
                            {(() => {
                              const full = buildWinsBreakdownNarrative(
                                selectedGame.away_team,
                                selectedGame.home_team,
                                awayTeamData.schedule,
                                homeTeamData.schedule,
                                awayTeamData.team_info,
                                homeTeamData.team_info,
                                awayConfChampData,
                                homeConfChampData,
                              );
                              const [awayNarr, homeNarr] = full.split("\n\n");
                              const narrStyle: React.CSSProperties = {
                                fontSize: 11,
                                color: "#6b7280",
                                lineHeight: 1.5,
                                marginBottom: 12,
                              };
                              return isMobile ? (
                                <div style={twoColGrid}>
                                  {/* Away Team: Commentary + Component */}
                                  <div>
                                    <p style={narrStyle}>{awayNarr}</p>
                                    <div>
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          marginBottom: 10,
                                          gap: 6,
                                        }}
                                      >
                                        <TeamLogo
                                          logoUrl={
                                            awayTeamData.team_info.logo_url ||
                                            ""
                                          }
                                          teamName={selectedGame.away_team}
                                          size={24}
                                        />
                                        <span
                                          style={{
                                            fontWeight: 600,
                                            fontSize: 13,
                                            color: "#374151",
                                          }}
                                        >
                                          {selectedGame.away_team}
                                        </span>
                                      </div>
                                      <BasketballTeamWinsBreakdown
                                        schedule={awayTeamData.schedule}
                                        teamName={selectedGame.away_team}
                                        conference={
                                          awayTeamData.team_info.conference
                                        }
                                        primaryColor={
                                          awayTeamData.team_info
                                            .primary_color || "#18627b"
                                        }
                                        secondaryColor={
                                          awayTeamData.team_info.secondary_color
                                        }
                                        logoUrl={
                                          awayTeamData.team_info.logo_url || ""
                                        }
                                      />
                                    </div>
                                  </div>
                                  {/* Home Team: Commentary + Component */}
                                  <div>
                                    <p style={narrStyle}>{homeNarr}</p>
                                    <div>
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          marginBottom: 10,
                                          gap: 6,
                                        }}
                                      >
                                        <TeamLogo
                                          logoUrl={
                                            homeTeamData.team_info.logo_url ||
                                            ""
                                          }
                                          teamName={selectedGame.home_team}
                                          size={24}
                                        />
                                        <span
                                          style={{
                                            fontWeight: 600,
                                            fontSize: 13,
                                            color: "#374151",
                                          }}
                                        >
                                          {selectedGame.home_team}
                                        </span>
                                      </div>
                                      <BasketballTeamWinsBreakdown
                                        schedule={homeTeamData.schedule}
                                        teamName={selectedGame.home_team}
                                        conference={
                                          homeTeamData.team_info.conference
                                        }
                                        primaryColor={
                                          homeTeamData.team_info
                                            .primary_color || "#18627b"
                                        }
                                        secondaryColor={
                                          homeTeamData.team_info.secondary_color
                                        }
                                        logoUrl={
                                          homeTeamData.team_info.logo_url || ""
                                        }
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {/* Desktop: Row 1: Paragraphs */}
                                  <div style={twoColGrid}>
                                    <p style={narrStyle}>{awayNarr}</p>
                                    <p style={narrStyle}>{homeNarr}</p>
                                  </div>
                                  {/* Desktop: Row 2: Components */}
                                  <div style={twoColGrid}>
                                    <div>
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          marginBottom: 10,
                                          gap: 6,
                                        }}
                                      >
                                        <TeamLogo
                                          logoUrl={
                                            awayTeamData.team_info.logo_url ||
                                            ""
                                          }
                                          teamName={selectedGame.away_team}
                                          size={24}
                                        />
                                        <span
                                          style={{
                                            fontWeight: 600,
                                            fontSize: 13,
                                            color: "#374151",
                                          }}
                                        >
                                          {selectedGame.away_team}
                                        </span>
                                      </div>
                                      <BasketballTeamWinsBreakdown
                                        schedule={awayTeamData.schedule}
                                        teamName={selectedGame.away_team}
                                        conference={
                                          awayTeamData.team_info.conference
                                        }
                                        primaryColor={
                                          awayTeamData.team_info
                                            .primary_color || "#18627b"
                                        }
                                        secondaryColor={
                                          awayTeamData.team_info.secondary_color
                                        }
                                        logoUrl={
                                          awayTeamData.team_info.logo_url || ""
                                        }
                                      />
                                    </div>
                                    <div>
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          marginBottom: 10,
                                          gap: 6,
                                        }}
                                      >
                                        <TeamLogo
                                          logoUrl={
                                            homeTeamData.team_info.logo_url ||
                                            ""
                                          }
                                          teamName={selectedGame.home_team}
                                          size={24}
                                        />
                                        <span
                                          style={{
                                            fontWeight: 600,
                                            fontSize: 13,
                                            color: "#374151",
                                          }}
                                        >
                                          {selectedGame.home_team}
                                        </span>
                                      </div>
                                      <BasketballTeamWinsBreakdown
                                        schedule={homeTeamData.schedule}
                                        teamName={selectedGame.home_team}
                                        conference={
                                          homeTeamData.team_info.conference
                                        }
                                        primaryColor={
                                          homeTeamData.team_info
                                            .primary_color || "#18627b"
                                        }
                                        secondaryColor={
                                          homeTeamData.team_info.secondary_color
                                        }
                                        logoUrl={
                                          homeTeamData.team_info.logo_url || ""
                                        }
                                      />
                                    </div>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
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
