"use client";

import {
  useBasketballSeedWinsData,
  type SeedWinsTeam,
} from "@/hooks/useBasketballSeedWinsData";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface ConfChampData extends SeedWinsTeam {
  wins_probabilities?: Record<string, number>;
}

interface SeedWinRequirement {
  team_id: string;
  team_name: string;
  logo_url: string;
  winsRequired: number;
  totalWinsPossible: number;
  isPossible: boolean;
  actual_total_wins: number;
  actual_total_losses: number;
}

interface SeedProbabilityTeam {
  team_id: string;
  team_name: string;
  logo_url: string;
  actual_total_wins: number;
  actual_total_losses: number;
  probability: number;
  winsRequired: number;
  gamesRemaining: number;
}

type SeedLevel =
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "11"
  | "bubble";

type ProbabilityCategory =
  | "Already Met"
  | "100%"
  | "85-100%"
  | "60-85%"
  | "40-60%"
  | "15-40%"
  | "0-15%"
  | "0%"
  | "Not Possible";

const seedLevels: { label: string; value: SeedLevel }[] = [
  { label: "1 Seed", value: "1" },
  { label: "2 Seed", value: "2" },
  { label: "3 Seed", value: "3" },
  { label: "4 Seed", value: "4" },
  { label: "5 Seed", value: "5" },
  { label: "6 Seed", value: "6" },
  { label: "7 Seed", value: "7" },
  { label: "8 Seed", value: "8" },
  { label: "9 Seed", value: "9" },
  { label: "10 Seed", value: "10" },
  { label: "11 Seed", value: "11" },
  { label: "Bubble Conversation", value: "bubble" },
];

const probabilityCategories: ProbabilityCategory[] = [
  "Already Met",
  "100%",
  "85-100%",
  "60-85%",
  "40-60%",
  "15-40%",
  "0-15%",
  "0%",
  "Not Possible",
];

const getTWVColorForCategory = (
  category: ProbabilityCategory,
  maxTWV: number = 1.0,
  minTWV: number = -1.0,
): { backgroundColor: string; color: string } => {
  const categoryToValue: Record<ProbabilityCategory, number> = {
    "Already Met": 1.0,
    "100%": 0.9,
    "85-100%": 0.7,
    "60-85%": 0.5,
    "40-60%": 0.0,
    "15-40%": -0.5,
    "0-15%": -0.7,
    "0%": -0.9,
    "Not Possible": -1.0,
  };

  const twvValue = categoryToValue[category];
  const blue = [24, 98, 123];
  const white = [255, 255, 255];
  const yellow = [255, 230, 113];

  let r: number, g: number, b: number;

  if (twvValue > 0) {
    const ratio = Math.min(Math.abs(twvValue / maxTWV), 1);
    r = Math.round(white[0] + (blue[0] - white[0]) * ratio);
    g = Math.round(white[1] + (blue[1] - white[1]) * ratio);
    b = Math.round(white[2] + (blue[2] - white[2]) * ratio);
  } else if (twvValue < 0) {
    const ratio = Math.min(Math.abs(twvValue / minTWV), 1);
    r = Math.round(white[0] + (yellow[0] - white[0]) * ratio);
    g = Math.round(white[1] + (yellow[1] - white[1]) * ratio);
    b = Math.round(white[2] + (yellow[2] - white[2]) * ratio);
  } else {
    [r, g, b] = white;
  }

  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  const textColor = brightness > 140 ? "#000000" : "#ffffff";

  return {
    backgroundColor: `rgb(${r}, ${g}, ${b})`,
    color: textColor,
  };
};

const getProbabilityCategory = (probability: number): ProbabilityCategory => {
  if (probability === 100) return "100%";
  if (probability >= 85) return "85-100%";
  if (probability >= 60) return "60-85%";
  if (probability >= 40) return "40-60%";
  if (probability >= 15) return "15-40%";
  if (probability > 0) return "0-15%";
  if (probability === 0) return "0%";
  return "Not Possible";
};

interface BballSeedWinsAndProbabilityProps {
  conference: string | null;
  _maxHeight?: number;
}

export default function BballSeedWinsAndProbability({
  conference,
  _maxHeight = 800,
}: BballSeedWinsAndProbabilityProps) {
  void _maxHeight;

  const [isMobile, setIsMobile] = useState(false);
  const [selectedSeed, setSelectedSeed] = useState<SeedLevel>("11");
  const router = useRouter();

  const {
    data: seedWinsResponse,
    isLoading,
    error,
  } = useBasketballSeedWinsData(conference);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const logoSize = isMobile ? 24 : 28;
  const gapBetweenLogos = 2;
  const maxLogosPerRow = isMobile ? 3 : 6;
  const labelWidth = isMobile ? 45 : 55;
  const paddingHorizontal = isMobile ? 4 : 6;
  const chartGap = 24;

  const getWinsField = (seed: SeedLevel): keyof ConfChampData => {
    if (seed === "bubble") return "wins_for_bubble";
    return `wins_for_${seed}_seed` as keyof ConfChampData;
  };

  const confChampData = useMemo(
    () => (seedWinsResponse?.data as ConfChampData[]) || [],
    [seedWinsResponse],
  );

  const processedData = useMemo(() => {
    const winsGrouped: Record<number | string, SeedWinRequirement[]> = {
      "Not Possible": [],
    };
    const probGrouped: Record<ProbabilityCategory, SeedProbabilityTeam[]> = {
      "Already Met": [],
      "100%": [],
      "85-100%": [],
      "60-85%": [],
      "40-60%": [],
      "15-40%": [],
      "0-15%": [],
      "0%": [],
      "Not Possible": [],
    };

    if (!confChampData || confChampData.length === 0) {
      console.log("DEBUG: confChampData is empty");
      return { winsGrouped, probGrouped };
    }

    console.log(
      `DEBUG: Processing ${confChampData.length} teams, selectedSeed=${selectedSeed}`,
    );

    // Debug: Log South Carolina's raw data if it exists
    const southCarolina = confChampData.find(
      (team: ConfChampData) => team.team_name === "South Carolina",
    );
    if (southCarolina) {
      console.log(
        "DEBUG: South Carolina raw data from backend:",
        southCarolina,
      );
      console.log(
        "DEBUG: South Carolina wins_probabilities:",
        southCarolina.wins_probabilities,
      );
      console.log(
        "DEBUG: South Carolina wins_for_11_seed:",
        southCarolina.wins_for_11_seed,
      );
    }

    confChampData.forEach((team: ConfChampData) => {
      const winsField = getWinsField(selectedSeed);
      const winsTarget = Math.ceil((team[winsField] as number) || 0);
      const gamesRemaining =
        team.total_possible_pre_ncaa_games -
        (team.actual_total_wins + team.actual_total_losses);
      const winsRequired = winsTarget - team.actual_total_wins;

      // Check if team has already met the requirement
      const alreadyMet = winsRequired <= 0;
      // Only "Not Possible" if physically impossible AND not already met
      const isPossible =
        alreadyMet || (winsRequired <= gamesRemaining && winsRequired > 0);

      // DEBUG
      if (team.team_name === "Arizona" || team.team_name === "TCU") {
        console.log(
          `DEBUG ${team.team_name}: winsField=${winsField}, winsTarget=${winsTarget}, actual_wins=${team.actual_total_wins}, winsRequired=${winsRequired}, alreadyMet=${alreadyMet}, isPossible=${isPossible}`,
        );
      }

      const winsData: SeedWinRequirement = {
        team_id: team.team_id,
        team_name: team.team_name,
        logo_url: team.logo_url,
        winsRequired: Math.max(0, winsRequired),
        totalWinsPossible: gamesRemaining,
        isPossible,
        actual_total_wins: team.actual_total_wins,
        actual_total_losses: team.actual_total_losses,
      };

      if (!isPossible) {
        winsGrouped["Not Possible"].push(winsData);
      } else {
        const winsKey = winsData.winsRequired;
        if (!winsGrouped[winsKey]) {
          winsGrouped[winsKey] = [];
        }
        winsGrouped[winsKey].push(winsData);
      }

      let probability: number;
      let probCategory: ProbabilityCategory;

      // Check if it's physically impossible to achieve this seed
      if (winsRequired > gamesRemaining) {
        probability = 0;
        probCategory = "Not Possible";
      } else if (winsRequired <= 0) {
        // Already achieved
        probability = 100;
        probCategory = "Already Met";
      } else {
        // Get probability directly from backend calculation
        const teamData = team as unknown as ConfChampData;
        const backendProbs = teamData.wins_probabilities || {};
        const probValue = backendProbs[selectedSeed];

        // If the value is an object or array, something is wrong with the data structure
        if (typeof probValue === "object") {
          console.warn(
            `WARNING: ${team.team_name} has object value for seed ${selectedSeed}:`,
            probValue,
          );
          probability = 0;
        } else {
          probability = Number(probValue) || 0;
        }

        probCategory = getProbabilityCategory(probability);
      }

      // DEBUG - Enhanced logging for debugging
      if (
        team.team_name === "Arizona" ||
        team.team_name === "TCU" ||
        team.team_name === "South Carolina"
      ) {
        const teamData = team as unknown as ConfChampData;
        console.log(
          `DEBUG ${team.team_name}: selectedSeed=${selectedSeed}, probability=${probability}, probCategory=${probCategory}`,
        );
        console.log(
          `DEBUG ${team.team_name}: winsRequired=${winsRequired}, gamesRemaining=${gamesRemaining}`,
        );
        console.log(
          `DEBUG ${team.team_name}: winsField=${getWinsField(selectedSeed)}, winsTarget=${Math.ceil((team[getWinsField(selectedSeed)] as number) || 0)}`,
        );
        console.log(
          `DEBUG ${team.team_name}: actual_wins=${team.actual_total_wins}, actual_losses=${team.actual_total_losses}`,
        );
        const backendProbs = teamData.wins_probabilities || {};
        console.log(
          `DEBUG ${team.team_name}: backendProbs object keys:`,
          Object.keys(backendProbs),
        );
        console.log(
          `DEBUG ${team.team_name}: backendProbs[${selectedSeed}] =`,
          backendProbs[selectedSeed],
        );
        console.log(
          `DEBUG ${team.team_name}: typeof backendProbs[${selectedSeed}] =`,
          typeof backendProbs[selectedSeed],
        );
        console.log(
          `DEBUG ${team.team_name}: Full wins_probabilities object:`,
          teamData.wins_probabilities,
        );
        console.log(`DEBUG ${team.team_name}: Full team object=`, teamData);
      }

      const probData: SeedProbabilityTeam = {
        team_id: team.team_id,
        team_name: team.team_name,
        logo_url: team.logo_url,
        actual_total_wins: team.actual_total_wins,
        actual_total_losses: team.actual_total_losses,
        probability,
        winsRequired,
        gamesRemaining,
      };

      probGrouped[probCategory].push(probData);
    });

    Object.keys(probGrouped).forEach((category) => {
      probGrouped[category as ProbabilityCategory].sort((a, b) => {
        // First sort by games remaining (ascending - fewest games first)
        if (a.gamesRemaining !== b.gamesRemaining) {
          return a.gamesRemaining - b.gamesRemaining;
        }
        // Then by probability (descending - highest probability first)
        if (a.probability !== b.probability) {
          return b.probability - a.probability;
        }
        // Then by current wins (descending - most wins first)
        if (a.actual_total_wins !== b.actual_total_wins) {
          return b.actual_total_wins - a.actual_total_wins;
        }
        // Finally alphabetically by team name
        return a.team_name.localeCompare(b.team_name);
      });
    });

    // Sort wins groups by wins required (ascending: fewer wins needed first) within each group
    Object.keys(winsGrouped).forEach((key) => {
      winsGrouped[key].sort((a, b) => a.winsRequired - b.winsRequired);
    });

    return { winsGrouped, probGrouped };
  }, [confChampData, selectedSeed]);

  const sortedWinsLevels = useMemo(() => {
    const levels = Object.keys(processedData.winsGrouped)
      .filter((key) => key !== "Not Possible")
      .map((key) => parseInt(key))
      .sort((a, b) => a - b);
    return levels;
  }, [processedData.winsGrouped]);

  const renderWinsTeams = (winsTeams: SeedWinRequirement[]) => {
    const winsTeamWidth = logoSize + gapBetweenLogos;
    const winsMaxTeamsWidth =
      Math.min(winsTeams.length, maxLogosPerRow) * winsTeamWidth +
      gapBetweenLogos;

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "flex-start",
          gap: gapBetweenLogos,
          flexWrap: "wrap",
          boxSizing: "border-box",
          maxWidth: winsMaxTeamsWidth,
        }}
      >
        {winsTeams.map((team) => (
          <div
            key={`wins-team-${team.team_id}`}
            style={{
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            {team.logo_url && (
              <Image
                src={team.logo_url}
                alt={team.team_name}
                width={logoSize}
                height={logoSize}
                style={{
                  width: logoSize,
                  height: logoSize,
                  objectFit: "contain",
                  borderRadius: 2,
                  cursor: "pointer",
                }}
                onClick={() => {
                  router.push(
                    `/basketball/team/${encodeURIComponent(team.team_name)}`,
                  );
                }}
                title={`${team.team_name}: ${team.winsRequired} more wins needed, up to ${team.totalWinsPossible} games remaining`}
              />
            )}
            <div
              style={{
                fontSize: isMobile ? "9px" : "10px",
                fontWeight: "400",
                color: "#6b7280",
                textAlign: "center",
                minWidth: logoSize,
                cursor: "pointer",
              }}
              onClick={() => {
                router.push(
                  `/basketball/team/${encodeURIComponent(team.team_name)}`,
                );
              }}
              title={`${team.team_name}: ${team.winsRequired} wins needed`}
            >
              {team.actual_total_wins}-{team.actual_total_losses}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderProbTeams = (probTeams: SeedProbabilityTeam[]) => {
    const probTeamWidth = logoSize + gapBetweenLogos;
    const probMaxTeamsWidth =
      Math.min(probTeams.length, maxLogosPerRow) * probTeamWidth +
      gapBetweenLogos;

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "flex-start",
          gap: gapBetweenLogos,
          flexWrap: "wrap",
          boxSizing: "border-box",
          maxWidth: probMaxTeamsWidth,
        }}
      >
        {probTeams.map((team) => (
          <div
            key={`prob-team-${team.team_id}`}
            style={{
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            {team.logo_url && (
              <Image
                src={team.logo_url}
                alt={team.team_name}
                width={logoSize}
                height={logoSize}
                style={{
                  width: logoSize,
                  height: logoSize,
                  objectFit: "contain",
                  borderRadius: 2,
                  cursor: "pointer",
                }}
                onClick={() => {
                  router.push(
                    `/basketball/team/${encodeURIComponent(team.team_name)}`,
                  );
                }}
                title={`${team.team_name}: ${team.probability}% probability`}
              />
            )}
            <div
              style={{
                fontSize: isMobile ? "9px" : "10px",
                fontWeight: "400",
                color: "#6b7280",
                textAlign: "center",
                minWidth: logoSize,
                cursor: "pointer",
              }}
              onClick={() => {
                router.push(
                  `/basketball/team/${encodeURIComponent(team.team_name)}`,
                );
              }}
              title={`${team.team_name}: ${team.probability}%`}
            >
              {team.actual_total_wins}-{team.actual_total_losses}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div
        data-component-type="bball-seed-wins-and-probability"
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 300,
        }}
      >
        <div style={{ color: "#9ca3af", fontSize: "14px" }}>
          Loading data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-component-type="bball-seed-wins-and-probability"
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 300,
        }}
      >
        <div style={{ color: "#dc2626", fontSize: "14px" }}>
          Error loading data
        </div>
      </div>
    );
  }

  return (
    <div
      data-component-type="bball-seed-wins-and-probability"
      data-selected-seed={selectedSeed}
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          paddingLeft: paddingHorizontal,
          paddingRight: paddingHorizontal,
          paddingTop: 4,
          paddingBottom: 4,
          boxSizing: "border-box",
          flexShrink: 0,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <label
          style={{
            fontSize: isMobile ? "12px" : "13px",
            fontWeight: "400",
            color: "#374151",
            whiteSpace: "nowrap",
          }}
        >
          Select Seed Target:
        </label>

        <select
          value={selectedSeed}
          onChange={(e) => setSelectedSeed(e.target.value as SeedLevel)}
          style={{
            width: isMobile ? "140px" : "170px",
            padding: "6px 8px",
            fontSize: isMobile ? "12px" : "13px",
            fontWeight: "400",
            color: "#374151",
            backgroundColor: "#ffffff",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            cursor: "pointer",
            boxSizing: "border-box",
          }}
        >
          {seedLevels.map((seed) => (
            <option key={seed.value} value={seed.value}>
              {seed.label}
            </option>
          ))}
        </select>
      </div>

      {/* Target Seed display for screenshots - hidden from normal view */}
      <div
        style={{
          paddingLeft: paddingHorizontal,
          paddingRight: paddingHorizontal,
          paddingTop: 6,
          paddingBottom: 2,
          boxSizing: "border-box",
          flexShrink: 0,
          display: "none",
          fontSize: isMobile ? "13px" : "14px",
          fontWeight: "400",
          color: "#1f2937",
        }}
        className="seed-target-display"
      >
        Target Seed:{" "}
        {seedLevels.find((s) => s.value === selectedSeed)?.label ||
          selectedSeed}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 4,
          flex: 1,
          boxSizing: "border-box",
          overflow: "auto",
          paddingLeft: paddingHorizontal,
          paddingRight: paddingHorizontal,
        }}
      >
        {/* LEFT CHART: WINS REQUIRED */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            boxSizing: "border-box",
            borderRight: `2px solid #d1d5db`,
            paddingRight: chartGap / 2,
            maxWidth: "320px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: 12,
              paddingLeft: paddingHorizontal,
              paddingRight: paddingHorizontal,
              paddingTop: 6,
              paddingBottom: 4,
              borderBottom: "2px solid #d1d5db",
              boxSizing: "border-box",
              flexShrink: 0,
              alignItems: "flex-end",
            }}
          >
            <div
              style={{
                width: labelWidth,
                flexShrink: 0,
                fontSize: isMobile ? "12px" : "13px",
                fontWeight: "400",
                color: "#374151",
                textAlign: "left",
                boxSizing: "border-box",
              }}
            >
              Wins Required
            </div>

            <div
              style={{
                fontSize: isMobile ? "12px" : "13px",
                fontWeight: "400",
                color: "#374151",
                flex: 1,
              }}
            >
              Teams
            </div>
          </div>

          <div style={{ flex: 1, overflow: "auto" }}>
            {sortedWinsLevels.map((winsLevel) => {
              const winsTeams = processedData.winsGrouped[winsLevel] || [];
              const isZeroWins = winsLevel === 0;
              return (
                <div
                  key={`wins-${winsLevel}`}
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingLeft: paddingHorizontal,
                    paddingRight: paddingHorizontal,
                    paddingTop: 2,
                    paddingBottom: 2,
                    borderBottom: "1px solid #f3f4f6",
                    backgroundColor: isZeroWins ? "#f0fdf4" : "transparent",
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{
                      width: labelWidth,
                      flexShrink: 0,
                      fontSize: isMobile ? "11px" : "12px",
                      fontWeight: "400",
                      color: isZeroWins ? "#166534" : "#1f2937",
                      textAlign: "left",
                      boxSizing: "border-box",
                    }}
                  >
                    {winsLevel}
                  </div>
                  {renderWinsTeams(winsTeams)}
                </div>
              );
            })}
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingLeft: paddingHorizontal,
                paddingRight: paddingHorizontal,
                paddingTop: 2,
                paddingBottom: 2,
                borderBottom: "1px solid #f3f4f6",
                backgroundColor: "#fef2f2",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  width: labelWidth,
                  flexShrink: 0,
                  fontSize: isMobile ? "11px" : "12px",
                  fontWeight: "400",
                  color: "#991b1b",
                  textAlign: "left",
                  boxSizing: "border-box",
                  lineHeight: "1.2",
                }}
              >
                Not
                <br />
                Possible
              </div>
              {renderWinsTeams(processedData.winsGrouped["Not Possible"] || [])}
            </div>
          </div>
        </div>

        {/* RIGHT CHART: PROBABILITY */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            boxSizing: "border-box",
            paddingLeft: 0,
            maxWidth: "320px",
            marginTop: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: 12,
              paddingLeft: 0,
              paddingRight: paddingHorizontal,
              paddingTop: 6,
              paddingBottom: 4,
              borderBottom: "2px solid #d1d5db",
              boxSizing: "border-box",
              flexShrink: 0,
              alignItems: "flex-end",
            }}
          >
            <div
              style={{
                width: labelWidth,
                flexShrink: 0,
                fontSize: isMobile ? "12px" : "13px",
                fontWeight: "400",
                color: "#374151",
                textAlign: "left",
                boxSizing: "border-box",
              }}
            >
              Probability
            </div>

            <div
              style={{
                fontSize: isMobile ? "12px" : "13px",
                fontWeight: "400",
                color: "#374151",
                flex: 1,
              }}
            >
              Teams
            </div>
          </div>

          <div style={{ flex: 1, overflow: "auto" }}>
            {probabilityCategories.map((probCategory) => {
              const probTeams = processedData.probGrouped[probCategory] || [];

              return (
                <div
                  key={`prob-${probCategory}`}
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "stretch",
                    gap: 12,
                    paddingLeft: 0,
                    paddingRight: paddingHorizontal,
                    paddingTop: 0,
                    paddingBottom: 0,
                    borderBottom: "1px solid #f3f4f6",
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{
                      width: labelWidth,
                      flexShrink: 0,
                      fontSize: isMobile ? "11px" : "12px",
                      fontWeight: "400",
                      paddingTop: 4,
                      paddingBottom: 4,
                      paddingLeft: 4,
                      paddingRight: 4,
                      textAlign: "left",
                      boxSizing: "border-box",
                      borderRadius: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      ...getTWVColorForCategory(probCategory),
                    }}
                  >
                    {probCategory}
                  </div>
                  {renderProbTeams(probTeams)}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          marginLeft: paddingHorizontal,
          marginRight: paddingHorizontal,
          marginBottom: 12,
          fontSize: isMobile ? "10px" : "11px",
          color: "#6b7280",
          lineHeight: "1.5",
          boxSizing: "border-box",
          flexShrink: 0,
        }}
      >
        <div style={{ marginBottom: 6 }}>
          Wins Required: Additional wins required to reach the selected seed
          threshold.
        </div>
        <div style={{ marginBottom: 6 }}>
          Probability: Likelihood of achieving the minimum wins required based
          on 1,000 simulations using composite ratings based on kenpom,
          barttorvik and evanmiya
        </div>
      </div>
    </div>
  );
}
