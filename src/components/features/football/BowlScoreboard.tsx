// src/components/features/football/BowlScoreboard.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { memo, useMemo } from "react";

interface ScoreboardUser {
  name: string;
  correctPicks: number;
  completedGames: number;
  actualPoints: number;
  completedPoints: number;
  remainingPoints: number;
  totalPossiblePoints: number;
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

function BowlScoreboard() {
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

      bowlData.games.forEach((game: BowlGameData) => {
        const actualWinner = game["Winner"];
        const predictedWinner = game[`${person} Winner`];
        const gamePoints = parseInt(game[`${person} Points`] || "0", 10);

        if (actualWinner && actualWinner.trim()) {
          // Game is completed
          completedGames++;
          completedPoints += gamePoints;

          // Check if prediction is correct - only add points if right
          if (
            actualWinner.toLowerCase().trim() ===
            predictedWinner.toLowerCase().trim()
          ) {
            correctPicks++;
            actualPoints += gamePoints;
          }
        } else {
          // Game is not completed
          remainingPoints += gamePoints;
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
      };
    });

    // Sort by actualPoints descending
    return scores.sort((a, b) => b.actualPoints - a.actualPoints);
  }, [bowlData]);

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
            s.totalPossiblePoints > 0
              ? (s.actualPoints / s.totalPossiblePoints) * 100
              : 0
          )
        ),
        max: Math.max(
          ...scoreboard.map((s) =>
            s.totalPossiblePoints > 0
              ? (s.actualPoints / s.totalPossiblePoints) * 100
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
                zIndex: 40,
              }}
            >
              <th
                style={{
                  border: "1px solid #e5e7eb",
                  padding: "4px 8px",
                  textAlign: "left",
                  fontWeight: "600",
                  fontSize: "12px",
                  minWidth: "100px",
                }}
              >
                Name
              </th>
              <th
                style={{
                  border: "1px solid #e5e7eb",
                  padding: "4px 6px",
                  textAlign: "center",
                  fontWeight: "600",
                  fontSize: "11px",
                }}
              >
                Total Points
              </th>
              <th
                style={{
                  border: "1px solid #e5e7eb",
                  padding: "4px 6px",
                  textAlign: "center",
                  fontWeight: "600",
                  fontSize: "11px",
                }}
              >
                % of Points
              </th>
              <th
                style={{
                  border: "1px solid #e5e7eb",
                  padding: "4px 6px",
                  textAlign: "center",
                  fontWeight: "600",
                  fontSize: "11px",
                }}
              >
                Total Possible
              </th>
              <th
                style={{
                  border: "1px solid #e5e7eb",
                  padding: "4px 6px",
                  textAlign: "center",
                  fontWeight: "600",
                  fontSize: "11px",
                }}
              >
                % of Possible
              </th>
              <th
                style={{
                  border: "1px solid #e5e7eb",
                  padding: "4px 6px",
                  textAlign: "center",
                  fontWeight: "600",
                  fontSize: "11px",
                }}
              >
                % Right
              </th>
              <th
                style={{
                  border: "1px solid #e5e7eb",
                  padding: "4px 6px",
                  textAlign: "center",
                  fontWeight: "600",
                  fontSize: "11px",
                }}
              >
                Points Left
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
                user.totalPossiblePoints > 0
                  ? (user.actualPoints / user.totalPossiblePoints) * 100
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
