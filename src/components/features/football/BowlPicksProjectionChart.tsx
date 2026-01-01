// src/components/features/football/BowlPicksProjectionChart.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { memo, useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ChartDataPoint {
  gameNumber: number;
  [key: string]: number;
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

function BowlPicksProjectionChart() {
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

  // Custom tooltip component
  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{
      name: string;
      value: number;
      color: string;
      payload: { gameNumber: number };
    }>;
  }) => {
    if (active && payload && payload.length) {
      // Sort by value descending
      const sorted = [...payload].sort((a, b) => b.value - a.value);

      return (
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "4px",
            padding: "8px",
          }}
        >
          <p style={{ margin: "0 0 4px 0", fontWeight: "bold" }}>
            Game {payload[0].payload.gameNumber}
          </p>
          {sorted.map((entry, index: number) => (
            <p
              key={index}
              style={{
                margin: "2px 0",
                fontSize: "12px",
                color: entry.color,
              }}
            >
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom tooltip component for above/below average
  const CustomTooltipAboveAverage = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{
      name: string;
      value: number;
      color: string;
      payload: { gameNumber: number };
    }>;
  }) => {
    if (active && payload && payload.length) {
      // Sort by value descending
      const sorted = [...payload].sort((a, b) => b.value - a.value);

      return (
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "4px",
            padding: "8px",
          }}
        >
          <p style={{ margin: "0 0 4px 0", fontWeight: "bold" }}>
            Game {payload[0].payload.gameNumber}
          </p>
          {sorted.map((entry, index: number) => (
            <p
              key={index}
              style={{
                margin: "2px 0",
                fontSize: "12px",
                color: entry.color,
              }}
            >
              {entry.name}: {entry.value > 0 ? "+" : ""}
              {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Color palette for different people
  const colors = [
    "#1f2937", // Dark gray
    "#dc2626", // Red
    "#ea580c", // Orange
    "#d97706", // Amber
    "#16a34a", // Green
    "#0284c7", // Sky Blue
    "#6366f1", // Indigo
    "#9333ea", // Purple
    "#db2777", // Pink
  ];

  // Calculate projection data
  const chartData = useMemo(() => {
    if (!bowlData?.games || !Array.isArray(bowlData.games)) return [];

    const firstGame = bowlData.games[0];
    if (!firstGame) return [];

    // Extract person names
    const people: string[] = [];
    Object.keys(firstGame).forEach((key) => {
      if (key.endsWith(" Winner")) {
        const personName = key.replace(" Winner", "");
        people.push(personName);
      }
    });

    // Helper function to calculate projected points for remaining games
    const calculateProjectionForGames = (
      startIndex: number,
      endIndex: number,
      completedThroughGame: number = -1
    ) => {
      const projections: { [key: string]: number } = {};
      people.forEach((person) => {
        projections[person] = 0;
      });

      for (let i = startIndex; i <= endIndex; i++) {
        const game = bowlData.games[i];
        const gameNumber = i + 1;
        const gamePoints: { [key: string]: number } = {};

        people.forEach((person) => {
          gamePoints[person] = parseInt(game[`${person} Points`] || "0", 10);
        });

        // Game is incomplete - use consensus allocation
        const teamCounts: { [team: string]: number } = {};
        const teamChoosers: { [team: string]: string[] } = {};

        people.forEach((person) => {
          const predictedWinner = game[`${person} Winner`];

          // Check if this person is eliminated for this future game due to past results
          if (completedThroughGame >= 0) {
            const isEliminated = isPredictionCorrectWithCascade(
              gameNumber,
              predictedWinner,
              "", // No winner yet for this future game
              bowlData.games
            );
            // If eliminated (isEliminated === false), skip them
            if (isEliminated === false) {
              return; // Skip this person for this game
            }
          }

          if (predictedWinner && predictedWinner.trim()) {
            teamCounts[predictedWinner] =
              (teamCounts[predictedWinner] || 0) + 1;
            if (!teamChoosers[predictedWinner]) {
              teamChoosers[predictedWinner] = [];
            }
            teamChoosers[predictedWinner].push(person);
          }
        });

        // Allocate points based on consensus
        Object.keys(teamCounts).forEach((team) => {
          const consensusPercentage = teamCounts[team] / people.length;
          teamChoosers[team].forEach((person) => {
            const pointsAllocated = gamePoints[person] * consensusPercentage;
            projections[person] += pointsAllocated;
          });
        });
      }

      return projections;
    };

    // Build chart data
    const data: ChartDataPoint[] = [];

    // Point 0: Projection for all 46 games
    const dataPoint0: ChartDataPoint = { gameNumber: 0 };
    const allProjections = calculateProjectionForGames(0, 45, -1);
    people.forEach((person) => {
      dataPoint0[person] = Math.round(allProjections[person] * 10) / 10;
    });
    data.push(dataPoint0);

    // Points 1 through last completed: Actuals + projections
    const actualCumulative: { [key: string]: number } = {};
    people.forEach((person) => {
      actualCumulative[person] = 0;
    });

    bowlData.games.forEach((game: BowlGameData, index: number) => {
      const gameNumber = index + 1;
      const actualWinner = game["Winner"];
      const gamePoints: { [key: string]: number } = {};

      people.forEach((person) => {
        gamePoints[person] = parseInt(game[`${person} Points`] || "0", 10);
      });

      // Add actual results for this completed game
      if (actualWinner && actualWinner.trim()) {
        people.forEach((person) => {
          const predictedWinner = game[`${person} Winner`];
          const gameNumber = index + 1;

          // Use cascade validation to check if prediction is correct
          const isCorrect = isPredictionCorrectWithCascade(
            gameNumber,
            predictedWinner,
            actualWinner,
            bowlData.games
          );

          if (isCorrect === true) {
            actualCumulative[person] += gamePoints[person];
          }
        });

        // Calculate projections for remaining games
        const remainingProjections: { [key: string]: number } = {};
        people.forEach((person) => {
          remainingProjections[person] = 0;
        });

        if (index < bowlData.games.length - 1) {
          const futureProjections = calculateProjectionForGames(
            index + 1,
            bowlData.games.length - 1,
            index
          );
          people.forEach((person) => {
            remainingProjections[person] = futureProjections[person];
          });
        }

        // Create data point with actuals + projections
        const dataPoint: ChartDataPoint = { gameNumber };
        people.forEach((person) => {
          dataPoint[person] =
            Math.round(
              (actualCumulative[person] + remainingProjections[person]) * 10
            ) / 10;
        });

        data.push(dataPoint);
      }
    });

    return data;
  }, [bowlData]);

  // Extract people names - memoized to avoid dependency issues
  const people = useMemo(() => {
    if (
      !bowlData?.games ||
      !Array.isArray(bowlData.games) ||
      bowlData.games.length === 0
    ) {
      return [];
    }
    const firstGame = bowlData.games[0];
    const peopleList: string[] = [];
    Object.keys(firstGame).forEach((key) => {
      if (key.endsWith(" Winner")) {
        const personName = key.replace(" Winner", "");
        peopleList.push(personName);
      }
    });
    return peopleList;
  }, [bowlData]);

  // Calculate above/below average data
  const chartDataAboveAverage = useMemo(() => {
    return chartData.map((dataPoint) => {
      const gameNumber = dataPoint.gameNumber;
      const values = people.map((person) => dataPoint[person]);
      const average = values.reduce((a, b) => a + b, 0) / values.length;

      const aboveAveragePoint: ChartDataPoint = { gameNumber };
      people.forEach((person) => {
        const value = dataPoint[person];
        aboveAveragePoint[person] = Math.round((value - average) * 10) / 10;
      });

      return aboveAveragePoint;
    });
  }, [chartData, people]);

  // Calculate Y-axis domain based on data
  const yAxisDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 100];

    let minValue = Infinity;
    let maxValue = -Infinity;

    chartData.forEach((dataPoint) => {
      people.forEach((person) => {
        const value = dataPoint[person];
        minValue = Math.min(minValue, value);
        maxValue = Math.max(maxValue, value);
      });
    });

    // Add 10% padding on both sides
    const padding = (maxValue - minValue) * 0.1;
    const bottom = Math.max(0, minValue - padding);
    const top = maxValue + padding;

    return [Math.floor(bottom), Math.ceil(top)];
  }, [chartData, people]);

  if (isLoading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>Loading...</div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "red" }}>
        Error loading chart data
      </div>
    );
  }

  if (chartData.length === 0) {
    return <div style={{ padding: "20px", textAlign: "center" }}>No data</div>;
  }

  return (
    <div
      style={{
        padding: "16px",
        backgroundColor: "#ffffff",
        borderRadius: "8px",
        border: "1px solid #e5e7eb",
        marginBottom: "24px",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "16px" }}>
        <h2
          style={{ fontSize: "18px", fontWeight: "bold", margin: "0 0 4px 0" }}
        >
          Points Projection
        </h2>
        <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>
          Cumulative points with consensus allocation for incomplete games
        </p>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="gameNumber"
            label={{
              value: "Game #",
              position: "insideBottomRight",
              offset: -5,
            }}
          />
          <YAxis
            domain={yAxisDomain}
            label={{ value: "Points", angle: -90, position: "insideLeft" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {people.map((person, index) => (
            <Line
              key={person}
              type="monotone"
              dataKey={person}
              stroke={colors[index % colors.length]}
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Above/Below Average Chart */}
      <div style={{ marginTop: "32px" }}>
        <h3
          style={{ fontSize: "16px", fontWeight: "bold", margin: "0 0 12px 0" }}
        >
          Above/Below Average
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartDataAboveAverage}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="gameNumber"
              label={{
                value: "Game #",
                position: "insideBottomRight",
                offset: -5,
              }}
            />
            <YAxis
              label={{
                value: "Difference from Average",
                angle: -90,
                position: "insideLeft",
              }}
            />
            <Tooltip content={<CustomTooltipAboveAverage />} />
            <Legend />
            {people.map((person, index) => (
              <Line
                key={person}
                type="monotone"
                dataKey={person}
                stroke={colors[index % colors.length]}
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default memo(BowlPicksProjectionChart);
