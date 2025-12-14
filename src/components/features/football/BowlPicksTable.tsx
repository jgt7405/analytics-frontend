// src/components/features/football/BowlPicksTable.tsx
"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useQuery } from "@tanstack/react-query";
import { memo, useMemo, useState } from "react";

interface BowlGame {
  "#": string;
  "Bowl Name": string;
  "Team 1": string;
  "Team 2": string;
  Date: string;
  Time: string;
  "TV Station": string;
  [key: string]: string;
}

function BowlPicksTable() {
  const [sortColumn, setSortColumn] = useState<string | null>(null);

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
    const games = [...bowlData.games];

    if (sortColumn === "date") {
      return games.sort(
        (a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime()
      );
    } else if (sortColumn === "completed") {
      return games.sort(
        (a, b) => (b.is_completed ? 1 : 0) - (a.is_completed ? 1 : 0)
      );
    }
    return games;
  }, [bowlData, sortColumn]);

  // Calculate min/max points for coloring - cap max at 40
  const pointsRange = useMemo(() => {
    if (!sortedGames || sortedGames.length === 0) {
      return { min: 0, max: 40 };
    }

    let minPoints = Infinity;
    let maxPoints = 0;

    sortedGames.forEach((game) => {
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
    const teamData = logoData.data.find((t: any) => t.team_name === team);
    return teamData?.logo_url || "/images/team_logos/default.png";
  };

  const formatDate = (dateStr: string) => {
    // Remove day of week (e.g., "Saturday Dec 13" -> "Dec 13")
    return dateStr.replace(/^[A-Za-z]+\s+/, "");
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
    <div style={{ padding: "16px" }}>
      {/* Controls */}
      <div style={{ marginBottom: "16px", display: "flex", gap: "12px" }}>
        <button
          onClick={() => setSortColumn(sortColumn === "date" ? null : "date")}
          style={{
            padding: "8px 16px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            backgroundColor: sortColumn === "date" ? "#3b82f6" : "#f3f4f6",
            color: sortColumn === "date" ? "white" : "black",
            cursor: "pointer",
          }}
        >
          Sort by Date
        </button>
        <button
          onClick={() =>
            setSortColumn(sortColumn === "completed" ? null : "completed")
          }
          style={{
            padding: "8px 16px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            backgroundColor: sortColumn === "completed" ? "#3b82f6" : "#f3f4f6",
            color: sortColumn === "completed" ? "white" : "black",
            cursor: "pointer",
          }}
        >
          Sort by Status
        </button>
      </div>

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
              {/* # - Frozen */}
              <th
                style={{
                  border: "1px solid #e5e7eb",
                  padding: "8px 12px",
                  textAlign: "center",
                  fontWeight: "600",
                  fontSize: "14px",
                  position: "sticky",
                  left: 0,
                  backgroundColor: "#f3f4f6",
                  zIndex: 41,
                }}
              >
                #
              </th>

              {/* Bowl Name - Frozen */}
              <th
                style={{
                  border: "1px solid #e5e7eb",
                  padding: "8px 12px",
                  textAlign: "left",
                  fontWeight: "600",
                  fontSize: "14px",
                  position: "sticky",
                  left: "50px",
                  backgroundColor: "#f3f4f6",
                  zIndex: 41,
                }}
              >
                Bowl Name
              </th>

              {/* Teams - Frozen */}
              <th
                style={{
                  border: "1px solid #e5e7eb",
                  padding: "8px 12px",
                  textAlign: "center",
                  fontWeight: "600",
                  fontSize: "14px",
                  position: "sticky",
                  left: "170px",
                  backgroundColor: "#f3f4f6",
                  zIndex: 41,
                }}
              >
                Teams
              </th>

              {/* Scrollable columns */}
              <th
                style={{
                  border: "1px solid #e5e7eb",
                  padding: "8px 12px",
                  textAlign: "center",
                  fontWeight: "600",
                  fontSize: "14px",
                }}
              >
                Date
              </th>
              <th
                style={{
                  border: "1px solid #e5e7eb",
                  padding: "8px 12px",
                  textAlign: "center",
                  fontWeight: "600",
                  fontSize: "14px",
                }}
              >
                Time
              </th>
              <th
                style={{
                  border: "1px solid #e5e7eb",
                  padding: "8px 12px",
                  textAlign: "center",
                  fontWeight: "600",
                  fontSize: "14px",
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
                    padding: "8px 12px",
                    textAlign: "center",
                    fontWeight: "600",
                    fontSize: "14px",
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
                    padding: "8px 6px",
                    textAlign: "center",
                    fontWeight: "600",
                    fontSize: "12px",
                    whiteSpace: "normal",
                    lineHeight: "1.3",
                    width: "50px",
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
              <tr key={game["#"]} style={{ height: "32px" }}>
                {/* # - Frozen */}
                <td
                  style={{
                    border: "1px solid #e5e7eb",
                    padding: "8px 12px",
                    textAlign: "center",
                    fontSize: "13px",
                    position: "sticky",
                    left: 0,
                    backgroundColor: "white",
                    zIndex: 20,
                  }}
                >
                  {game["#"]}
                </td>

                {/* Bowl Name - Frozen */}
                <td
                  style={{
                    border: "1px solid #e5e7eb",
                    padding: "8px 12px",
                    textAlign: "left",
                    fontSize: "13px",
                    maxWidth: "120px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    position: "sticky",
                    left: "50px",
                    backgroundColor: "white",
                    zIndex: 20,
                  }}
                  title={game["Bowl Name"]}
                >
                  {game["Bowl Name"]}
                </td>

                {/* Teams - Frozen */}
                <td
                  style={{
                    border: "1px solid #e5e7eb",
                    padding: "8px 12px",
                    textAlign: "center",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                    position: "sticky",
                    left: "170px",
                    backgroundColor: "white",
                    zIndex: 20,
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

                {/* Scrollable columns */}
                <td
                  style={{
                    border: "1px solid #e5e7eb",
                    padding: "8px 12px",
                    textAlign: "center",
                    fontSize: "13px",
                  }}
                >
                  {formatDate(game.Date)}
                </td>
                <td
                  style={{
                    border: "1px solid #e5e7eb",
                    padding: "8px 12px",
                    textAlign: "center",
                    fontSize: "13px",
                  }}
                >
                  {game.Time}
                </td>
                <td
                  style={{
                    border: "1px solid #e5e7eb",
                    padding: "8px 12px",
                    textAlign: "center",
                    fontSize: "13px",
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
                      padding: "8px 12px",
                      textAlign: "center",
                      fontSize: "13px",
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
                  const colorStyle = getPointsColor(points);
                  return (
                    <td
                      key={`${game["#"]}-${person}-points`}
                      style={{
                        border: "1px solid #e5e7eb",
                        padding: "8px 12px",
                        textAlign: "center",
                        fontSize: "13px",
                        fontWeight: "500",
                        ...colorStyle,
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
