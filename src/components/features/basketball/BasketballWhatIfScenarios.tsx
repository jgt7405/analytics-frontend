"use client";

import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { useBasketballConfData } from "@/hooks/useBasketballConfData";
import {
  useBasketballWhatIf,
  type WhatIfResponse,
} from "@/hooks/useBasketballWhatIf";
import { useEffect, useMemo, useState } from "react";
import RawProbabilityScheduleViewer from "./RawProbabilityScheduleViewer";

export default function BasketballWhatIfScenarios() {
  const [selectedConference, setSelectedConference] = useState<string | null>(
    null,
  );
  const { data: confData } = useBasketballConfData();

  const conferences = useMemo(() => {
    if (!confData?.conferenceData?.data) return [];
    return confData.conferenceData.data
      .map((conf: { conference_name: string }) => conf.conference_name)
      .sort();
  }, [confData]);

  useEffect(() => {
    if (conferences.length > 0 && !selectedConference) {
      setSelectedConference("Big 12");
    }
  }, [conferences, selectedConference]);

  const { mutate: fetchWhatIf, isPending: isCalculating } =
    useBasketballWhatIf();

  const [whatIfData, setWhatIfData] = useState<WhatIfResponse | null>(null);

  const handleFetchWhatIf = (conference: string) => {
    fetchWhatIf(
      { conference, selections: [] },
      {
        onSuccess: (data: WhatIfResponse) => {
          setWhatIfData(data);
        },
        onError: (err: Error) => {
          console.error("WhatIf calculation failed", err.message);
        },
      },
    );
  };

  // Group scenarios by game
  const gamesByOutcome = useMemo(() => {
    if (!whatIfData?.scenario_results) return {};

    const games: {
      [gameId: number]: Array<{
        scenario: number;
        winner: string;
        away: string;
        home: string;
      }>;
    } = {};

    // Iterate through first 10 scenarios
    whatIfData.scenario_results.slice(0, 10).forEach((scenario: any) => {
      if (scenario.games) {
        scenario.games.forEach((game: any) => {
          if (!games[game.game_id]) {
            games[game.game_id] = [];
          }
          games[game.game_id].push({
            scenario: scenario.scenario_num,
            winner: game.winner,
            away: game.away_team,
            home: game.home_team,
          });
        });
      }
    });

    return games;
  }, [whatIfData]);

  // Type for game outcomes
  interface GameOutcomes {
    [gameId: number]: Array<{
      scenario: number;
      winner: string;
      away: string;
      home: string;
    }>;
  }

  // Get sorted game IDs
  const sortedGameIds = useMemo(() => {
    return Object.keys(gamesByOutcome)
      .map((id) => parseInt(id))
      .sort((a, b) => a - b);
  }, [gamesByOutcome]);

  return (
    <PageLayoutWrapper
      title="What If Calculator - DEBUG MODE"
      isLoading={false}
    >
      <div style={{ padding: "20px" }}>
        {/* Raw Probability Schedule Viewer */}
        <RawProbabilityScheduleViewer />

        {/* Existing What-If Content */}
        <h1
          style={{
            fontSize: "24px",
            fontWeight: "bold",
            marginBottom: "20px",
            color: "#333",
            marginTop: "30px",
          }}
        >
          🏀 What If Scenario Calculator
        </h1>

        {isCalculating && (
          <div
            style={{
              marginBottom: "20px",
              padding: "16px",
              backgroundColor: "#fff3cd",
              border: "1px solid #ffc107",
              borderRadius: "4px",
            }}
          >
            Loading scenarios...
          </div>
        )}

        {whatIfData?.scenario_results &&
        whatIfData.scenario_results.length > 0 ? (
          <div>
            <div
              style={{
                marginBottom: "20px",
                padding: "12px",
                backgroundColor: "#d4edda",
                border: "1px solid #28a745",
                borderRadius: "4px",
              }}
            >
              ✅ Loaded {whatIfData.scenario_results.length} total scenarios |
              Showing first 10
            </div>

            {sortedGameIds.map((gameId) => {
              const outcomes = gamesByOutcome[gameId];
              if (!outcomes || outcomes.length === 0) return null;

              const firstOutcome = outcomes[0];
              const uniqueWinners = new Set(outcomes.map((o) => o.winner));
              const hasVariation = uniqueWinners.size > 1;

              return (
                <div
                  key={gameId}
                  style={{
                    marginBottom: "24px",
                    padding: "16px",
                    backgroundColor: hasVariation ? "#f0fff4" : "#fff5f5",
                    border: `2px solid ${hasVariation ? "#28a745" : "#ff6b6b"}`,
                    borderRadius: "8px",
                  }}
                >
                  {/* Game Header */}
                  <div
                    style={{
                      fontWeight: "bold",
                      fontSize: "16px",
                      marginBottom: "12px",
                      color: hasVariation ? "#28a745" : "#ff0000",
                      paddingBottom: "8px",
                      borderBottom: `2px solid ${hasVariation ? "#28a745" : "#ff6b6b"}`,
                    }}
                  >
                    🎮 GAME {gameId}: {firstOutcome.away} @ {firstOutcome.home}
                    <span
                      style={{
                        marginLeft: "16px",
                        fontSize: "12px",
                        color: "#666",
                      }}
                    >
                      {hasVariation ? "✓ VARIATION" : "✗ SAME WINNER"}
                    </span>
                  </div>

                  {/* Outcomes by Scenario */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(120px, 1fr))",
                      gap: "8px",
                    }}
                  >
                    {outcomes.map((outcome) => (
                      <div
                        key={`${gameId}-${outcome.scenario}`}
                        style={{
                          padding: "12px",
                          backgroundColor: "white",
                          borderRadius: "6px",
                          border: "1px solid #e0e0e0",
                          textAlign: "center",
                          fontFamily: "monospace",
                          fontSize: "12px",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: "bold",
                            marginBottom: "4px",
                            color: "#666",
                          }}
                        >
                          Scenario {outcome.scenario}
                        </div>
                        <div
                          style={{
                            fontWeight: "bold",
                            color:
                              outcome.winner === firstOutcome.away
                                ? "#0066cc"
                                : "#cc6600",
                            padding: "4px",
                            backgroundColor:
                              outcome.winner === firstOutcome.away
                                ? "#f0f8ff"
                                : "#fff5f0",
                            borderRadius: "4px",
                          }}
                        >
                          {outcome.winner}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary */}
                  <div
                    style={{
                      marginTop: "12px",
                      paddingTop: "12px",
                      borderTop: "1px solid #e0e0e0",
                      fontSize: "12px",
                      color: "#666",
                    }}
                  >
                    Winners: {Array.from(uniqueWinners).join(" vs ")}
                  </div>
                </div>
              );
            })}

            {/* Summary Stats */}
            <div
              style={{
                marginTop: "32px",
                padding: "16px",
                backgroundColor: "#fff3cd",
                border: "2px solid #ffc107",
                borderRadius: "8px",
              }}
            >
              <div style={{ fontWeight: "bold", marginBottom: "12px" }}>
                📊 Summary:
              </div>
              <div style={{ lineHeight: "1.8" }}>
                <p>
                  ✓ Total scenarios analyzed:{" "}
                  {whatIfData.scenario_results.length}
                </p>
                <p>✓ Showing first 10 scenarios</p>
                <p>✓ Total unique games: {sortedGameIds.length}</p>
                <p>
                  ✓ Games with variation:{" "}
                  <span style={{ fontWeight: "bold", color: "#28a745" }}>
                    {
                      sortedGameIds.filter(
                        (id) =>
                          new Set(gamesByOutcome[id].map((o) => o.winner))
                            .size > 1,
                      ).length
                    }
                  </span>
                </p>
                <p>
                  ✓ Games with same winner:{" "}
                  <span style={{ fontWeight: "bold", color: "#ff0000" }}>
                    {
                      sortedGameIds.filter(
                        (id) =>
                          new Set(gamesByOutcome[id].map((o) => o.winner))
                            .size === 1,
                      ).length
                    }
                  </span>
                </p>
              </div>
            </div>
          </div>
        ) : !isCalculating ? (
          <div
            style={{
              padding: "32px",
              textAlign: "center",
              backgroundColor: "#f8f9fa",
              border: "2px dashed #ccc",
              borderRadius: "8px",
            }}
          >
            <p
              style={{ fontSize: "16px", color: "#666", marginBottom: "16px" }}
            >
              Select a conference and click Calculate to load scenario data
            </p>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ marginRight: "16px" }}>
                Conference:{" "}
                <select
                  value={selectedConference || ""}
                  onChange={(e) => setSelectedConference(e.target.value)}
                  style={{ padding: "8px", marginLeft: "8px" }}
                >
                  <option value="">-- Select --</option>
                  {conferences.map((conf: string) => (
                    <option key={conf} value={conf}>
                      {conf}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              onClick={() => handleFetchWhatIf(selectedConference || "Big 12")}
              disabled={isCalculating}
              style={{
                padding: "12px 24px",
                backgroundColor: "#0066cc",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              {isCalculating ? "Calculating..." : "Calculate"}
            </button>
          </div>
        ) : null}
      </div>
    </PageLayoutWrapper>
  );
}
