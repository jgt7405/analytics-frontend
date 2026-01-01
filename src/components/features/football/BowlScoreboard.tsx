// src/components/features/football/BowlScoreboard.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { memo, useMemo, useState } from "react";

interface ScoreboardUser {
  name: string;
  correctPicks: number;
  completedGames: number;
  actualPoints: number;
  completedPoints: number;
  remainingPoints: number;
  totalPossiblePoints: number;
  totalPointsAtStart: number;
}

interface ColumnRange {
  min: number;
  max: number;
}

interface BowlGameData {
  "#": string;
  "Bowl Name": string;
  "Team 1": string;
  "Team 2": string;
  Winner: string;
  Date: string;
  Time: string;
  "TV Station": string;
  [key: string]: string;
}

// Game dependencies for cascade logic
const GAME_DEPENDENCIES: { [key: number]: number[] } = {
  44: [37, 38],
  45: [32, 39],
  46: [44, 45],
};

/**
 * Resolve a team reference - could be a team name or "Game X Winner"
 */
const resolveTeamReference = (
  reference: string,
  allGames: BowlGameData[]
): string | null => {
  // Check if it's a game reference like "Game 32 Winner"
  const match = reference.match(/Game (\d+) Winner/i);
  if (match) {
    const gameNum = parseInt(match[1], 10);
    const referencedGame = allGames[gameNum - 1];

    if (
      !referencedGame ||
      !referencedGame.Winner ||
      !referencedGame.Winner.trim()
    ) {
      return null; // Game not completed yet
    }

    return referencedGame.Winner;
  }

  // It's a direct team name
  return reference;
};

/**
 * Check if a predicted team advanced through all dependency games (recursive)
 */
const isTeamAdvanced = (
  predictedTeam: string,
  gameNumber: number,
  allGames: BowlGameData[]
): boolean | null => {
  if (!GAME_DEPENDENCIES[gameNumber]) {
    return true; // No dependencies, team is "advanced" for direct games
  }

  const dependencies = GAME_DEPENDENCIES[gameNumber];
  const normalizedPredicted = predictedTeam.toLowerCase().trim();

  // Check each dependency game
  for (const depGameNum of dependencies) {
    const depGame = allGames[depGameNum - 1];
    if (!depGame) continue;

    const team1 = resolveTeamReference(depGame["Team 1"], allGames);
    const team2 = resolveTeamReference(depGame["Team 2"], allGames);
    const winner = depGame.Winner;

    // If dependency game not completed, we can't determine advancement yet
    if (!winner || !winner.trim()) {
      // At least check if team is in this dependency game
      if (team1 && team2) {
        const normalizedTeam1 = team1.toLowerCase().trim();
        const normalizedTeam2 = team2.toLowerCase().trim();

        // Team is in this dependency game, so they could still advance
        if (
          normalizedPredicted === normalizedTeam1 ||
          normalizedPredicted === normalizedTeam2
        ) {
          continue; // Still possible
        } else {
          // Team is NOT in this dependency game
          // Check if they could have advanced through it via THAT game's dependencies
          const couldAdvanceThroughDep = isTeamAdvanced(
            predictedTeam,
            depGameNum,
            allGames
          );
          if (couldAdvanceThroughDep === false) {
            // Team can't advance through this dependency path
            return false;
          }
          // Otherwise continue checking
          continue;
        }
      } else {
        // Dependency game not completed with unresolved teams (game references)
        // Still need to check if team could be eliminated via that chain
        const couldAdvanceThroughDep = isTeamAdvanced(
          predictedTeam,
          depGameNum,
          allGames
        );
        if (couldAdvanceThroughDep === false) {
          // Team eliminated in dependency chain
          return false;
        }
        continue;
      }
    }

    // Dependency game is complete
    if (team1 && team2) {
      const normalizedTeam1 = team1.toLowerCase().trim();
      const normalizedTeam2 = team2.toLowerCase().trim();
      const normalizedWinner = winner.toLowerCase().trim();

      // Check if predicted team was in this dependency game
      if (
        normalizedPredicted === normalizedTeam1 ||
        normalizedPredicted === normalizedTeam2
      ) {
        // Predicted team WAS in this dependency game
        // Did they win?
        if (normalizedWinner !== normalizedPredicted) {
          // Team lost their dependency game - definitely eliminated
          return false;
        }
        // Team won their dependency game, continue checking other dependencies
      } else {
        // Team is NOT directly in this completed dependency game
        // Recursively check if they could have advanced through this game's dependencies
        const couldAdvanceThroughDep = isTeamAdvanced(
          predictedTeam,
          depGameNum,
          allGames
        );
        if (couldAdvanceThroughDep === false) {
          // Team can't advance through this dependency path
          return false;
        }
      }
    }
  }

  // All dependency checks passed or inconclusive
  return true;
};

/**
 * Check if a prediction is correct with full cascade elimination logic
 * Returns:
 *   true = team won
 *   false = team lost OR eliminated by dependency
 *   null = game not completed yet, but team is not eliminated
 */
const isPredictionCorrectWithCascade = (
  gameNumber: number,
  predictedWinner: string,
  actualWinner: string,
  allGames: BowlGameData[]
): boolean | null => {
  const game = allGames[gameNumber - 1];
  if (!game) return null;

  const normalizedPredicted = predictedWinner.toLowerCase().trim();

  // First, check if team is eliminated by a dependency REGARDLESS of whether this game is completed
  const isAdvanced = isTeamAdvanced(predictedWinner, gameNumber, allGames);

  if (isAdvanced === false) {
    // Team is definitely eliminated - they lost in a dependency game
    return false;
  }

  // Game not completed yet
  if (!actualWinner || actualWinner.trim() === "") {
    return null;
  }

  // Game IS completed - check the actual result
  // Resolve team references in Team 1 and Team 2
  const team1 = resolveTeamReference(game["Team 1"], allGames);
  const team2 = resolveTeamReference(game["Team 2"], allGames);

  // Check if predicted team is actually in this game
  if (!team1 || !team2) {
    return null;
  }

  const normalizedTeam1 = team1.toLowerCase().trim();
  const normalizedTeam2 = team2.toLowerCase().trim();

  // Check if predicted team is one of the competing teams
  if (
    normalizedPredicted !== normalizedTeam1 &&
    normalizedPredicted !== normalizedTeam2
  ) {
    // Predicted team is NOT in this game - wrong pick
    return false;
  }

  // Predicted team IS in the game - check if they won
  const normalizedActual = actualWinner.toLowerCase().trim();
  return normalizedActual === normalizedPredicted;
};

type SortKey =
  | "name"
  | "totalPoints"
  | "percentPoints"
  | "totalPossible"
  | "percentPossible"
  | "percentRight"
  | "pointsLeft";

function BowlScoreboard() {
  const [sortKey, setSortKey] = useState<SortKey>("percentPoints");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const {
    data: bowlData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["bowl-picks"],
    queryFn: async () => {
      const res = await fetch("/api/proxy/football/bowl-picks");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  // Calculate scores from CSV data
  const scoreboard = useMemo(() => {
    if (!bowlData?.games || !Array.isArray(bowlData.games)) return [];

    const firstGame = bowlData.games[0];
    if (!firstGame) return [];

    // Calculate total points available at start (sum of all game points) - ONCE
    const totalPointsAtStart = 1140;

    // Extract person names from Winner columns
    const people: string[] = [];
    Object.keys(firstGame).forEach((key) => {
      if (key.endsWith(" Winner")) {
        const personName = key.replace(" Winner", "");
        people.push(personName);
      }
    });

    // Calculate scores for each person
    const scores: ScoreboardUser[] = people.map((person) => {
      let correctPicks = 0;
      let completedGames = 0;
      let actualPoints = 0;
      let completedPoints = 0;
      let remainingPoints = 0;

      bowlData.games.forEach((game: BowlGameData, index: number) => {
        const gameNumber = index + 1;
        const actualWinner = game["Winner"];
        const predictedWinner = game[`${person} Winner`];
        const gamePoints = parseInt(game[`${person} Points`] || "0", 10);

        if (actualWinner && actualWinner.trim()) {
          // Game is completed
          completedGames++;
          completedPoints += gamePoints;

          // Check if prediction is correct with cascade validation
          const isCorrect = isPredictionCorrectWithCascade(
            gameNumber,
            predictedWinner,
            actualWinner,
            bowlData.games
          );

          if (isCorrect === true) {
            correctPicks++;
            actualPoints += gamePoints;
          }
          // If isCorrect is false (including cascade eliminations), no points awarded
        } else {
          // Game is not completed - only count if not cascade eliminated
          const isEliminated = isPredictionCorrectWithCascade(
            gameNumber,
            predictedWinner,
            "", // No winner yet
            bowlData.games
          );

          // Only count in remaining points if not cascade eliminated
          if (isEliminated !== false) {
            remainingPoints += gamePoints;
          }
        }
      });

      return {
        name: person,
        correctPicks,
        completedGames,
        actualPoints,
        completedPoints,
        remainingPoints,
        totalPossiblePoints: actualPoints + remainingPoints,
        totalPointsAtStart,
      };
    });

    // Apply sorting
    const sorted = [...scores].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortKey) {
        case "name":
          aValue = a.name;
          bValue = b.name;
          break;
        case "totalPoints":
          aValue = a.actualPoints;
          bValue = b.actualPoints;
          break;
        case "percentPoints":
          aValue =
            a.completedPoints > 0
              ? (a.actualPoints / a.completedPoints) * 100
              : 0;
          bValue =
            b.completedPoints > 0
              ? (b.actualPoints / b.completedPoints) * 100
              : 0;
          break;
        case "totalPossible":
          aValue = a.totalPossiblePoints;
          bValue = b.totalPossiblePoints;
          break;
        case "percentPossible":
          aValue =
            a.totalPointsAtStart > 0
              ? (a.totalPossiblePoints / a.totalPointsAtStart) * 100
              : 0;
          bValue =
            b.totalPointsAtStart > 0
              ? (b.totalPossiblePoints / b.totalPointsAtStart) * 100
              : 0;
          break;
        case "percentRight":
          aValue =
            a.completedGames > 0
              ? (a.correctPicks / a.completedGames) * 100
              : 0;
          bValue =
            b.completedGames > 0
              ? (b.correctPicks / b.completedGames) * 100
              : 0;
          break;
        case "pointsLeft":
          aValue = a.remainingPoints;
          bValue = b.remainingPoints;
          break;
        default:
          return 0;
      }

      // Compare values
      let comparison = 0;
      if (aValue < bValue) {
        comparison = -1;
      } else if (aValue > bValue) {
        comparison = 1;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [bowlData, sortKey, sortDirection]);

  // Calculate ranges for coloring
  const columnRanges = useMemo((): {
    [key: string]: ColumnRange;
  } => {
    if (scoreboard.length === 0) {
      return {
        totalPoints: { min: 0, max: 100 },
        percentPoints: { min: 0, max: 100 },
        totalPossible: { min: 0, max: 100 },
        percentPossible: { min: 0, max: 100 },
        percentRight: { min: 0, max: 100 },
        pointsLeft: { min: 0, max: 100 },
      };
    }

    return {
      totalPoints: {
        min: Math.min(...scoreboard.map((s) => s.actualPoints)),
        max: Math.max(...scoreboard.map((s) => s.actualPoints)),
      },
      percentPoints: {
        min: Math.min(
          ...scoreboard.map((s) =>
            s.completedPoints > 0
              ? (s.actualPoints / s.completedPoints) * 100
              : 0
          )
        ),
        max: Math.max(
          ...scoreboard.map((s) =>
            s.completedPoints > 0
              ? (s.actualPoints / s.completedPoints) * 100
              : 0
          )
        ),
      },
      totalPossible: {
        min: Math.min(...scoreboard.map((s) => s.totalPossiblePoints)),
        max: Math.max(...scoreboard.map((s) => s.totalPossiblePoints)),
      },
      percentPossible: {
        min: Math.min(
          ...scoreboard.map((s) =>
            s.totalPointsAtStart > 0
              ? (s.totalPossiblePoints / s.totalPointsAtStart) * 100
              : 0
          )
        ),
        max: Math.max(
          ...scoreboard.map((s) =>
            s.totalPointsAtStart > 0
              ? (s.totalPossiblePoints / s.totalPointsAtStart) * 100
              : 0
          )
        ),
      },
      percentRight: {
        min: Math.min(
          ...scoreboard.map((s) =>
            s.completedGames > 0 ? (s.correctPicks / s.completedGames) * 100 : 0
          )
        ),
        max: Math.max(
          ...scoreboard.map((s) =>
            s.completedGames > 0 ? (s.correctPicks / s.completedGames) * 100 : 0
          )
        ),
      },
      pointsLeft: {
        min: Math.min(...scoreboard.map((s) => s.remainingPoints)),
        max: Math.max(...scoreboard.map((s) => s.remainingPoints)),
      },
    };
  }, [scoreboard]);

  // Get color for a value based on range (blue for high, yellow for low)
  const getCellColor = (value: number, range: ColumnRange) => {
    const blue = [24, 98, 123]; // Dark blue for high values
    const white = [255, 255, 255]; // White baseline
    const yellow = [255, 230, 113]; // Yellow for low values

    const rangeSpan = range.max - range.min;

    if (rangeSpan === 0) {
      return { backgroundColor: "rgb(255, 255, 255)", color: "#000000" };
    }

    let r: number, g: number, b: number;

    const midpoint = (range.min + range.max) / 2;

    if (value > midpoint) {
      // Higher values: interpolate to blue
      const ratio = (value - midpoint) / (range.max - midpoint);
      r = Math.round(white[0] + (blue[0] - white[0]) * ratio);
      g = Math.round(white[1] + (blue[1] - white[1]) * ratio);
      b = Math.round(white[2] + (blue[2] - white[2]) * ratio);
    } else {
      // Lower values: interpolate to yellow
      const ratio = (midpoint - value) / (midpoint - range.min);
      r = Math.round(white[0] + (yellow[0] - white[0]) * ratio);
      g = Math.round(white[1] + (yellow[1] - white[1]) * ratio);
      b = Math.round(white[2] + (yellow[2] - white[2]) * ratio);
    }

    // Calculate brightness for text color
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    const textColor = brightness > 140 ? "#000000" : "#ffffff";

    return {
      backgroundColor: `rgb(${r}, ${g}, ${b})`,
      color: textColor,
    };
  };

  // Handle header click to toggle sort
  const handleHeaderClick = (key: SortKey) => {
    if (sortKey === key) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New column, default to descending
      setSortKey(key);
      setSortDirection("desc");
    }
  };

  // Helper to render sort indicator
  const getSortIndicator = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortDirection === "asc" ? " ↑" : " ↓";
  };

  if (isLoading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>Loading...</div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "red" }}>
        Error loading scoreboard
      </div>
    );
  }

  if (scoreboard.length === 0) {
    return <div style={{ padding: "20px", textAlign: "center" }}>No data</div>;
  }

  return (
    <div
      style={{
        padding: "0 0 16px 0",
        marginLeft: "-16px",
        width: "calc(100% + 16px)",
        marginBottom: "24px",
      }}
    >
      {/* Header */}
      <div style={{ paddingLeft: "16px", marginBottom: "12px" }}>
        <h2
          style={{ fontSize: "18px", fontWeight: "bold", margin: "0 0 4px 0" }}
        >
          Scoreboard
        </h2>
      </div>

      {/* Table Container */}
      <div
        style={{
          overflowX: "auto",
          overflowY: "auto",
          paddingLeft: "16px",
          borderLeft: "16px solid white",
        }}
      >
        <table
          style={{
            width: "max-content",
            borderCollapse: "collapse",
            border: "1px solid #e5e7eb",
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: "#f3f4f6",
                position: "sticky",
                top: 0,
                zIndex: 41,
              }}
            >
              <th
                onClick={() => handleHeaderClick("name")}
                style={{
                  border: "1px solid #e5e7eb",
                  padding: "4px 8px",
                  textAlign: "left",
                  fontWeight: "600",
                  fontSize: "12px",
                  minWidth: "100px",
                  position: "sticky",
                  left: "-16px",
                  backgroundColor: "#f3f4f6",
                  zIndex: 42,
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                Name{getSortIndicator("name")}
              </th>
              <th
                onClick={() => handleHeaderClick("totalPoints")}
                style={{
                  border: "1px solid #e5e7eb",
                  padding: "4px 6px",
                  textAlign: "center",
                  fontWeight: "600",
                  fontSize: "11px",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                Total Points{getSortIndicator("totalPoints")}
              </th>
              <th
                onClick={() => handleHeaderClick("percentPoints")}
                style={{
                  border: "1px solid #e5e7eb",
                  padding: "4px 6px",
                  textAlign: "center",
                  fontWeight: "600",
                  fontSize: "11px",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                % of Points{getSortIndicator("percentPoints")}
              </th>
              <th
                onClick={() => handleHeaderClick("totalPossible")}
                style={{
                  border: "1px solid #e5e7eb",
                  padding: "4px 6px",
                  textAlign: "center",
                  fontWeight: "600",
                  fontSize: "11px",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                Total Possible{getSortIndicator("totalPossible")}
              </th>
              <th
                onClick={() => handleHeaderClick("percentPossible")}
                style={{
                  border: "1px solid #e5e7eb",
                  padding: "4px 6px",
                  textAlign: "center",
                  fontWeight: "600",
                  fontSize: "11px",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                % of Possible{getSortIndicator("percentPossible")}
              </th>
              <th
                onClick={() => handleHeaderClick("percentRight")}
                style={{
                  border: "1px solid #e5e7eb",
                  padding: "4px 6px",
                  textAlign: "center",
                  fontWeight: "600",
                  fontSize: "11px",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                % Right{getSortIndicator("percentRight")}
              </th>
              <th
                onClick={() => handleHeaderClick("pointsLeft")}
                style={{
                  border: "1px solid #e5e7eb",
                  padding: "4px 6px",
                  textAlign: "center",
                  fontWeight: "600",
                  fontSize: "11px",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                Points Left{getSortIndicator("pointsLeft")}
              </th>
            </tr>
          </thead>
          <tbody>
            {scoreboard.map((user, index) => {
              const percentPoints =
                user.completedPoints > 0
                  ? (user.actualPoints / user.completedPoints) * 100
                  : 0;
              const percentPossible =
                user.totalPointsAtStart > 0
                  ? (user.totalPossiblePoints / user.totalPointsAtStart) * 100
                  : 0;
              const percentRight =
                user.completedGames > 0
                  ? (user.correctPicks / user.completedGames) * 100
                  : 0;

              return (
                <tr
                  key={user.name}
                  style={{
                    height: "20px",
                    backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9fafb",
                  }}
                >
                  <td
                    style={{
                      border: "1px solid #e5e7eb",
                      padding: "4px 8px",
                      textAlign: "left",
                      fontSize: "12px",
                      fontWeight: "500",
                      color: "#1f2937",
                      position: "sticky",
                      left: "-16px",
                      backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9fafb",
                      zIndex: 40,
                    }}
                  >
                    {user.name}
                  </td>
                  <td
                    style={{
                      border: "1px solid #e5e7eb",
                      padding: "4px 6px",
                      textAlign: "center",
                      fontSize: "12px",
                      fontWeight: "500",
                      ...getCellColor(
                        user.actualPoints,
                        columnRanges.totalPoints
                      ),
                    }}
                  >
                    {user.actualPoints}
                  </td>
                  <td
                    style={{
                      border: "1px solid #e5e7eb",
                      padding: "4px 6px",
                      textAlign: "center",
                      fontSize: "12px",
                      fontWeight: "500",
                      ...getCellColor(
                        percentPoints,
                        columnRanges.percentPoints
                      ),
                    }}
                  >
                    {percentPoints.toFixed(1)}%
                  </td>
                  <td
                    style={{
                      border: "1px solid #e5e7eb",
                      padding: "4px 6px",
                      textAlign: "center",
                      fontSize: "12px",
                      fontWeight: "500",
                      ...getCellColor(
                        user.totalPossiblePoints,
                        columnRanges.totalPossible
                      ),
                    }}
                  >
                    {user.totalPossiblePoints}
                  </td>
                  <td
                    style={{
                      border: "1px solid #e5e7eb",
                      padding: "4px 6px",
                      textAlign: "center",
                      fontSize: "12px",
                      fontWeight: "500",
                      ...getCellColor(
                        percentPossible,
                        columnRanges.percentPossible
                      ),
                    }}
                  >
                    {percentPossible.toFixed(1)}%
                  </td>
                  <td
                    style={{
                      border: "1px solid #e5e7eb",
                      padding: "4px 6px",
                      textAlign: "center",
                      fontSize: "12px",
                      fontWeight: "500",
                      ...getCellColor(percentRight, columnRanges.percentRight),
                    }}
                  >
                    {percentRight.toFixed(1)}%
                  </td>
                  <td
                    style={{
                      border: "1px solid #e5e7eb",
                      padding: "4px 6px",
                      textAlign: "center",
                      fontSize: "12px",
                      fontWeight: "500",
                      ...getCellColor(
                        user.remainingPoints,
                        columnRanges.pointsLeft
                      ),
                    }}
                  >
                    {user.remainingPoints}
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

export default memo(BowlScoreboard);
