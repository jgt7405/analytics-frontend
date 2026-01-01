// src/components/features/football/BowlPicksTable.tsx
"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useQuery } from "@tanstack/react-query";
import { memo, useMemo } from "react";

interface BowlGame {
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

// Map of game numbers to their prerequisite game numbers
// E.g., Game 44 (Fiesta) depends on winners of Games 37 & 38
const GAME_DEPENDENCIES: { [key: number]: number[] } = {
  44: [37, 38], // CFP Semifinal - Fiesta Bowl
  45: [32, 39], // CFP Semifinal - Peach Bowl
  46: [44, 45], // CFP National Championship
};

/**
 * Resolve a team reference - could be a team name or "Game X Winner"
 */
const resolveTeamReference = (
  reference: string,
  allGames: BowlGame[]
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
  allGames: BowlGame[],
  depth: number = 0
): boolean | null => {
  const indent = "  ".repeat(depth);

  if (!GAME_DEPENDENCIES[gameNumber]) {
    console.log(
      `${indent}[ADVANCE Game ${gameNumber}] No dependencies, returning TRUE`
    );
    return true; // No dependencies, team is "advanced" for direct games
  }

  const dependencies = GAME_DEPENDENCIES[gameNumber];
  const normalizedPredicted = predictedTeam.toLowerCase().trim();

  console.log(
    `${indent}[ADVANCE Game ${gameNumber}] Checking "${predictedTeam}" through deps: [${dependencies.join(", ")}]`
  );

  // Check each dependency game
  for (const depGameNum of dependencies) {
    const depGame = allGames[depGameNum - 1];
    if (!depGame) {
      console.log(`${indent}  [DEP ${depGameNum}] Not found, skip`);
      continue;
    }

    const team1 = resolveTeamReference(depGame["Team 1"], allGames);
    const team2 = resolveTeamReference(depGame["Team 2"], allGames);
    const winner = depGame.Winner;

    console.log(
      `${indent}  [DEP ${depGameNum}] ${team1} vs ${team2}, Winner: "${winner}"`
    );

    // If dependency game not completed
    if (!winner || !winner.trim()) {
      if (team1 && team2) {
        const normalizedTeam1 = team1.toLowerCase().trim();
        const normalizedTeam2 = team2.toLowerCase().trim();

        if (
          normalizedPredicted === normalizedTeam1 ||
          normalizedPredicted === normalizedTeam2
        ) {
          console.log(
            `${indent}    "${predictedTeam}" is in this incomplete game`
          );
          continue;
        } else {
          console.log(
            `${indent}    "${predictedTeam}" not in game, checking recursively...`
          );
          const couldAdvanceThroughDep = isTeamAdvanced(
            predictedTeam,
            depGameNum,
            allGames,
            depth + 2
          );
          if (couldAdvanceThroughDep === false) {
            console.log(`${indent}    Recursive returned FALSE`);
            return false;
          }
          continue;
        }
      } else {
        // team1 or team2 are null (couldn't resolve game references)
        // This means the dependency game references other games that aren't complete
        // But we still need to check if our team could be eliminated via that chain
        console.log(
          `${indent}    Teams unresolved (game refs), checking if team could be eliminated...`
        );
        const couldAdvanceThroughDep = isTeamAdvanced(
          predictedTeam,
          depGameNum,
          allGames,
          depth + 2
        );
        if (couldAdvanceThroughDep === false) {
          console.log(`${indent}    Team eliminated in dependency chain`);
          return false;
        }
        // If null or true, continue checking other dependencies
        continue;
      }
    }

    // Dependency game IS complete
    if (team1 && team2) {
      const normalizedTeam1 = team1.toLowerCase().trim();
      const normalizedTeam2 = team2.toLowerCase().trim();
      const normalizedWinner = winner.toLowerCase().trim();

      if (
        normalizedPredicted === normalizedTeam1 ||
        normalizedPredicted === normalizedTeam2
      ) {
        console.log(`${indent}    "${predictedTeam}" was in this game`);
        if (normalizedWinner !== normalizedPredicted) {
          console.log(`${indent}    LOST to ${winner}, ELIMINATING`);
          return false;
        }
        console.log(`${indent}    WON this game`);
      } else {
        console.log(
          `${indent}    "${predictedTeam}" not in game, checking recursively...`
        );
        const couldAdvanceThroughDep = isTeamAdvanced(
          predictedTeam,
          depGameNum,
          allGames,
          depth + 2
        );
        if (couldAdvanceThroughDep === false) {
          console.log(`${indent}    Recursive returned FALSE`);
          return false;
        }
      }
    }
  }

  console.log(
    `${indent}[ADVANCE Game ${gameNumber}] All checks OK, returning TRUE`
  );
  return true;
};

/**
 * Checks if a predicted winner is valid with full cascade logic
 * Returns:
 *   true = team won
 *   false = team lost OR eliminated by dependency
 *   null = game not completed yet, but team is not eliminated
 */
const isPredictionCorrectWithCascade = (
  gameNumber: number,
  predictedWinner: string,
  actualWinner: string,
  allGames: BowlGame[]
): boolean | null => {
  const game = allGames[gameNumber - 1];
  if (!game) return null;

  console.log(
    `[CASCADE CHECK] Game ${gameNumber}: Team1="${game["Team 1"]}", Team2="${game["Team 2"]}", Predicted="${predictedWinner}", Winner="${actualWinner}"`
  );

  const normalizedPredicted = predictedWinner.toLowerCase().trim();

  // First, check if team is eliminated by a dependency REGARDLESS of whether this game is completed
  const isAdvanced = isTeamAdvanced(predictedWinner, gameNumber, allGames);
  console.log(`[CASCADE] isTeamAdvanced result: ${isAdvanced}`);

  if (isAdvanced === false) {
    // Team is definitely eliminated - they lost in a dependency game
    console.log(`[CASCADE] Team ELIMINATED in dependency, returning FALSE`);
    return false;
  }

  // Game not completed yet
  if (!actualWinner || actualWinner.trim() === "") {
    console.log(`[CASCADE] Game not completed yet, returning NULL`);
    return null;
  }

  // Game IS completed - check the actual result
  // Resolve team references in Team 1 and Team 2
  const team1 = resolveTeamReference(game["Team 1"], allGames);
  const team2 = resolveTeamReference(game["Team 2"], allGames);

  console.log(`[CASCADE] After resolve: team1="${team1}", team2="${team2}"`);

  // Check if predicted team is actually in this game
  if (!team1 || !team2) {
    console.log(`[CASCADE] Could not resolve teams`);
    return null;
  }

  const normalizedTeam1 = team1.toLowerCase().trim();
  const normalizedTeam2 = team2.toLowerCase().trim();

  console.log(
    `[CASCADE] Checking if "${normalizedPredicted}" matches "${normalizedTeam1}" or "${normalizedTeam2}"`
  );

  // Check if predicted team is one of the competing teams
  if (
    normalizedPredicted !== normalizedTeam1 &&
    normalizedPredicted !== normalizedTeam2
  ) {
    // Predicted team is NOT in this game - wrong pick
    console.log(`[CASCADE] Team not in this game, returning FALSE`);
    return false;
  }

  // Predicted team IS in the game - check if they won
  const normalizedActual = actualWinner.toLowerCase().trim();
  const result = normalizedActual === normalizedPredicted;
  console.log(`[CASCADE] Team IN game. Did they win? ${result}`);
  return result;
};

function BowlPicksTable() {
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

  const { data: logoData } = useQuery({
    queryKey: ["team-logos"],
    queryFn: async () => {
      const res = await fetch("/api/proxy/football/teams");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  // Extract people names dynamically
  const people = useMemo(() => {
    if (
      !bowlData?.games ||
      !Array.isArray(bowlData.games) ||
      bowlData.games.length === 0
    )
      return [];

    const firstGame = bowlData.games[0];
    const peopleList: string[] = [];

    // Find all "Winner" columns and extract the person name
    Object.keys(firstGame).forEach((key) => {
      if (key.endsWith(" Winner")) {
        const personName = key.replace(" Winner", "");
        peopleList.push(personName);
      }
    });

    return peopleList;
  }, [bowlData]);

  const sortedGames = useMemo(() => {
    if (!bowlData?.games || !Array.isArray(bowlData.games)) return [];
    return bowlData.games;
  }, [bowlData]);

  // Calculate min/max points for coloring - cap max at 40
  const pointsRange = useMemo((): { min: number; max: number } => {
    if (!sortedGames || sortedGames.length === 0) {
      return { min: 0, max: 40 };
    }

    let minPoints = Infinity;
    let maxPoints = 0;

    sortedGames.forEach((game: BowlGame) => {
      people.forEach((person) => {
        const points = parseInt(game[`${person} Points`] || "0", 10);
        minPoints = Math.min(minPoints, points);
        // Cap max at 40
        maxPoints = Math.max(maxPoints, Math.min(points, 40));
      });
    });

    return {
      min: minPoints === Infinity ? 0 : minPoints,
      max: Math.max(maxPoints, 40),
    };
  }, [sortedGames, people]);

  // Color function for points - same as TWV
  const getPointsColor = (points: number) => {
    // Cap points at 40 for coloring
    const cappedPoints = Math.min(points, 40);

    const blue = [24, 98, 123]; // Dark blue for high values
    const white = [255, 255, 255]; // White baseline
    const yellow = [255, 230, 113]; // Yellow for low values

    let r: number, g: number, b: number;
    const range = pointsRange.max - pointsRange.min;

    if (range === 0) {
      // All values are the same
      [r, g, b] = white;
    } else if (cappedPoints > (pointsRange.min + pointsRange.max) / 2) {
      // Higher values: interpolate to blue
      const ratio =
        (cappedPoints - (pointsRange.min + pointsRange.max) / 2) /
        (pointsRange.max - (pointsRange.min + pointsRange.max) / 2);
      r = Math.round(white[0] + (blue[0] - white[0]) * ratio);
      g = Math.round(white[1] + (blue[1] - white[1]) * ratio);
      b = Math.round(white[2] + (blue[2] - white[2]) * ratio);
    } else {
      // Lower values: interpolate to yellow
      const ratio =
        ((pointsRange.min + pointsRange.max) / 2 - cappedPoints) /
        ((pointsRange.min + pointsRange.max) / 2 - pointsRange.min);
      r = Math.round(white[0] + (yellow[0] - white[0]) * ratio);
      g = Math.round(white[1] + (yellow[1] - white[1]) * ratio);
      b = Math.round(white[2] + (yellow[2] - white[2]) * ratio);
    }

    // Calculate brightness for text color contrast
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    const textColor = brightness > 140 ? "#000000" : "#ffffff";

    return {
      backgroundColor: `rgb(${r}, ${g}, ${b})`,
      color: textColor,
    };
  };

  const getLogoUrl = (team: string) => {
    if (!logoData?.data || !Array.isArray(logoData.data))
      return "/images/team_logos/default.png";
    const teamData = logoData.data.find(
      (t: { team_name: string; logo_url: string }) => t.team_name === team
    );
    return teamData?.logo_url || "/images/team_logos/default.png";
  };

  const formatDate = (dateStr: string) => {
    // Remove day of week (e.g., "Saturday Dec 13" -> "Dec 13")
    return dateStr.replace(/^[A-Za-z]+\s+/, "");
  };

  // Get color for prediction result
  const getPredictionColor = (isCorrect: boolean | null) => {
    if (isCorrect === null) {
      // Game not complete - use points coloring
      return null;
    }
    if (isCorrect) {
      // Correct - green
      return {
        backgroundColor: "#dcfce7",
        color: "#166534",
      };
    }
    // Incorrect - red
    return {
      backgroundColor: "#fee2e2",
      color: "#991b1b",
    };
  };

  if (isLoading)
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>Loading...</div>
    );
  if (error)
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "red" }}>
        Error
      </div>
    );

  return (
    <div style={{ padding: "0 0 16px 0", marginBottom: "24px" }}>
      {/* Table Container with scroll */}
      <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "80vh" }}>
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
              {/* Teams - First column */}
              <th
                style={{
                  border: "1px solid #e5e7eb",
                  padding: "4px 6px",
                  textAlign: "center",
                  fontWeight: "600",
                  fontSize: "12px",
                  position: "sticky",
                  left: 0,
                  backgroundColor: "#f3f4f6",
                  zIndex: 41,
                  minWidth: "90px",
                  boxShadow: "8px 0 8px -4px rgba(0, 0, 0, 0.1)",
                }}
              >
                Teams
              </th>

              {/* # - Not frozen */}
              <th
                style={{
                  border: "1px solid #e5e7eb",
                  padding: "4px 6px",
                  textAlign: "center",
                  fontWeight: "600",
                  fontSize: "12px",
                }}
              >
                #
              </th>

              {/* Bowl Name - Not frozen */}
              <th
                style={{
                  border: "1px solid #e5e7eb",
                  padding: "4px 6px",
                  textAlign: "left",
                  fontWeight: "600",
                  fontSize: "12px",
                }}
              >
                Bowl Name
              </th>

              {/* Winner */}
              <th
                style={{
                  border: "1px solid #e5e7eb",
                  padding: "4px 6px",
                  textAlign: "center",
                  fontWeight: "600",
                  fontSize: "12px",
                }}
              >
                Winner
              </th>
              <th
                style={{
                  border: "1px solid #e5e7eb",
                  padding: "4px 6px",
                  textAlign: "center",
                  fontWeight: "600",
                  fontSize: "12px",
                }}
              >
                Date
              </th>
              <th
                style={{
                  border: "1px solid #e5e7eb",
                  padding: "4px 6px",
                  textAlign: "center",
                  fontWeight: "600",
                  fontSize: "12px",
                }}
              >
                Time
              </th>
              <th
                style={{
                  border: "1px solid #e5e7eb",
                  padding: "4px 6px",
                  textAlign: "center",
                  fontWeight: "600",
                  fontSize: "12px",
                }}
              >
                TV
              </th>

              {/* Winners Section */}
              {people.map((person) => (
                <th
                  key={`${person}-winner`}
                  style={{
                    border: "1px solid #e5e7eb",
                    padding: "4px 4px",
                    textAlign: "center",
                    fontWeight: "600",
                    fontSize: "12px",
                  }}
                >
                  {person}
                </th>
              ))}

              {/* Points Section */}
              {people.map((person) => (
                <th
                  key={`${person}-points`}
                  style={{
                    border: "1px solid #e5e7eb",
                    padding: "4px 3px",
                    textAlign: "center",
                    fontWeight: "600",
                    fontSize: "11px",
                    whiteSpace: "normal",
                    lineHeight: "1.2",
                    width: "38px",
                  }}
                >
                  <div>{person}</div>
                  <div>Pts</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedGames.map((game: BowlGame) => (
              <tr key={game["#"]} style={{ height: "20px" }}>
                {/* Teams - First column */}
                <td
                  style={{
                    border: "1px solid #e5e7eb",
                    padding: "4px 6px",
                    textAlign: "center",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                    position: "sticky",
                    left: 0,
                    backgroundColor: "white",
                    zIndex: 30,
                    minWidth: "90px",
                    boxShadow: "8px 0 8px -4px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <div style={{ background: "transparent" }}>
                    <TeamLogo
                      logoUrl={getLogoUrl(game["Team 1"])}
                      teamName={game["Team 1"]}
                      size={24}
                      showTooltip={true}
                    />
                  </div>
                  <div style={{ background: "transparent" }}>
                    <TeamLogo
                      logoUrl={getLogoUrl(game["Team 2"])}
                      teamName={game["Team 2"]}
                      size={24}
                      showTooltip={true}
                    />
                  </div>
                </td>

                {/* # - Not frozen */}
                <td
                  style={{
                    border: "1px solid #e5e7eb",
                    padding: "4px 6px",
                    textAlign: "center",
                    fontSize: "12px",
                  }}
                >
                  {game["#"]}
                </td>

                {/* Bowl Name - Not frozen */}
                <td
                  style={{
                    border: "1px solid #e5e7eb",
                    padding: "4px 6px",
                    textAlign: "left",
                    fontSize: "12px",
                    maxWidth: "90px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={game["Bowl Name"]}
                >
                  {game["Bowl Name"]}
                </td>

                {/* Winner */}
                <td
                  style={{
                    border: "1px solid #e5e7eb",
                    padding: "4px 6px",
                    textAlign: "center",
                    fontSize: "12px",
                  }}
                >
                  {game["Winner"] && game["Winner"].trim() ? (
                    <div style={{ background: "transparent" }}>
                      <TeamLogo
                        logoUrl={getLogoUrl(game["Winner"])}
                        teamName={game["Winner"]}
                        size={24}
                        showTooltip={true}
                      />
                    </div>
                  ) : (
                    <span style={{ color: "#9ca3af", fontSize: "12px" }}>
                      â€”
                    </span>
                  )}
                </td>

                {/* Date */}
                <td
                  style={{
                    border: "1px solid #e5e7eb",
                    padding: "4px 6px",
                    textAlign: "center",
                    fontSize: "12px",
                  }}
                >
                  {formatDate(game.Date)}
                </td>
                <td
                  style={{
                    border: "1px solid #e5e7eb",
                    padding: "4px 6px",
                    textAlign: "center",
                    fontSize: "12px",
                  }}
                >
                  {game.Time}
                </td>
                <td
                  style={{
                    border: "1px solid #e5e7eb",
                    padding: "4px 6px",
                    textAlign: "center",
                    fontSize: "12px",
                  }}
                >
                  {game["TV Station"]}
                </td>

                {/* Winners */}
                {people.map((person) => (
                  <td
                    key={`${game["#"]}-${person}-winner`}
                    style={{
                      border: "1px solid #e5e7eb",
                      padding: "4px 6px",
                      textAlign: "center",
                      fontSize: "12px",
                    }}
                  >
                    <div style={{ background: "transparent" }}>
                      <TeamLogo
                        logoUrl={getLogoUrl(game[`${person} Winner`])}
                        teamName={game[`${person} Winner`]}
                        size={20}
                        showTooltip={true}
                      />
                    </div>
                  </td>
                ))}

                {/* Points with coloring */}
                {people.map((person) => {
                  const points = parseInt(game[`${person} Points`] || "0", 10);
                  const predictedWinner = game[`${person} Winner`];
                  const actualWinner = game["Winner"];
                  const gameNumber = parseInt(game["#"], 10);

                  // Check if game is complete and if prediction is correct (with cascade validation)
                  const isCorrect = isPredictionCorrectWithCascade(
                    gameNumber,
                    predictedWinner,
                    actualWinner,
                    sortedGames
                  );
                  const predictionColorStyle = getPredictionColor(isCorrect);

                  // If game is complete, use prediction coloring, otherwise use points coloring
                  let cellStyle: React.CSSProperties;
                  if (predictionColorStyle) {
                    cellStyle = predictionColorStyle;
                  } else {
                    const colorStyle = getPointsColor(points);
                    cellStyle = colorStyle;
                  }

                  return (
                    <td
                      key={`${game["#"]}-${person}-points`}
                      style={{
                        border: "1px solid #e5e7eb",
                        padding: "4px 6px",
                        textAlign: "center",
                        fontSize: "12px",
                        fontWeight: "500",
                        ...cellStyle,
                      }}
                    >
                      {game[`${person} Points`]}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default memo(BowlPicksTable);
