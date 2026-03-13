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
  wins_required_info?: Record<
    string,
    {
      wins_threshold: number | null;
      wins_additional_needed: number | null;
      max_probability: number;
      category: "Normal" | "Needs Help" | "Not Possible";
    }
  >;
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

  const confChampData = useMemo(
    () => (seedWinsResponse?.data as ConfChampData[]) || [],
    [seedWinsResponse],
  );

  const processedData = useMemo(() => {
    const winsGrouped: Record<number | string, SeedWinRequirement[]> = {
      "Needs Help": [],
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

    confChampData.forEach((team: ConfChampData) => {
      if (!team.wins_required_info) {
        console.warn(`Missing wins_required_info for ${team.team_name}`);
        return;
      }

      const requiredInfo = team.wins_required_info[selectedSeed];

      if (!requiredInfo) {
        console.warn(
          `No wins_required_info for ${team.team_name}, seed ${selectedSeed}`,
        );
        return;
      }

      const { wins_additional_needed, category } = requiredInfo;

      // Get probability from wins_probabilities
      const probability = team.wins_probabilities?.[selectedSeed] || 0;
      // Determine probability category
      let probCategory: ProbabilityCategory;
      if (category === "Not Possible") {
        probCategory = "Not Possible";
      } else if (wins_additional_needed === 0) {
        // Teams that need 0 wins have already met the requirement
        probCategory = "Already Met";
      } else {
        probCategory = getProbabilityCategory(probability);
      }

      // Create wins data
      const winsData: SeedWinRequirement = {
        team_id: team.team_id,
        team_name: team.team_name,
        logo_url: team.logo_url,
        winsRequired: wins_additional_needed ?? 0,
        totalWinsPossible:
          team.total_possible_pre_ncaa_games -
          (team.actual_total_wins + team.actual_total_losses),
        isPossible: category !== "Not Possible",
        actual_total_wins: team.actual_total_wins,
        actual_total_losses: team.actual_total_losses,
      };

      // Group wins required by category
      if (category === "Needs Help") {
        winsGrouped["Needs Help"].push(winsData);
      } else if (category === "Not Possible") {
        winsGrouped["Not Possible"].push(winsData);
      } else if (category === "Normal") {
        // For "Normal", group by wins_additional_needed
        const winsKey = wins_additional_needed ?? 0;
        if (!winsGrouped[winsKey]) {
          winsGrouped[winsKey] = [];
        }
        winsGrouped[winsKey].push(winsData);
      }

      // Create probability data
      const probData: SeedProbabilityTeam = {
        team_id: team.team_id,
        team_name: team.team_name,
        logo_url: team.logo_url,
        actual_total_wins: team.actual_total_wins,
        actual_total_losses: team.actual_total_losses,
        probability,
        winsRequired: wins_additional_needed ?? 0,
        gamesRemaining:
          team.total_possible_pre_ncaa_games -
          (team.actual_total_wins + team.actual_total_losses),
      };

      probGrouped[probCategory].push(probData);
    });

    // Sort probability teams within each category
    Object.keys(probGrouped).forEach((category) => {
      probGrouped[category as ProbabilityCategory].sort((a, b) => {
        if (a.team_name < b.team_name) return -1;
        if (a.team_name > b.team_name) return 1;
        return 0;
      });
    });

    return { winsGrouped, probGrouped };
  }, [confChampData, selectedSeed]);

  const sortedWinsLevels = useMemo(() => {
    const levels: Array<string | number> = Object.keys(
      processedData.winsGrouped,
    )
      .filter((w) => w !== "Not Possible") // Exclude "Not Possible" - it's rendered separately
      .map((w) => {
        if (w === "Needs Help") return { key: w as string | number, sort: 999 };
        return { key: parseInt(w) as string | number, sort: parseInt(w) };
      })
      .sort((a, b) => a.sort - b.sort)
      .map((item) => item.key);
    return levels;
  }, [processedData.winsGrouped]);

  const renderWinsTeams = (teams: SeedWinRequirement[]) => {
    if (teams.length === 0) {
      return (
        <div
          style={{
            fontSize: isMobile ? "11px" : "12px",
            color: "#9ca3af",
            flex: 1,
          }}
        >
          -
        </div>
      );
    }

    const rows: SeedWinRequirement[][] = [];
    for (let i = 0; i < teams.length; i += maxLogosPerRow) {
      rows.push(teams.slice(i, i + maxLogosPerRow));
    }

    return (
      <div
        style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}
      >
        {rows.map((row, rowIdx) => (
          <div
            key={rowIdx}
            style={{
              display: "flex",
              flexDirection: "row",
              gap: gapBetweenLogos,
              flexWrap: "wrap",
            }}
          >
            {row.map((team) => (
              <div
                key={team.team_id}
                style={{ cursor: "pointer" }}
                onClick={() =>
                  router.push(
                    `/basketball/team/${encodeURIComponent(team.team_name)}`,
                  )
                }
                title={team.team_name}
              >
                <Image
                  src={team.logo_url}
                  alt={team.team_name}
                  width={logoSize}
                  height={logoSize}
                  style={{
                    borderRadius: 3,
                    opacity: team.isPossible ? 1 : 0.4,
                  }}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  const renderProbTeams = (teams: SeedProbabilityTeam[]) => {
    if (teams.length === 0) {
      return (
        <div
          style={{
            fontSize: isMobile ? "11px" : "12px",
            color: "#9ca3af",
            flex: 1,
          }}
        >
          -
        </div>
      );
    }

    const rows: SeedProbabilityTeam[][] = [];
    for (let i = 0; i < teams.length; i += maxLogosPerRow) {
      rows.push(teams.slice(i, i + maxLogosPerRow));
    }

    return (
      <div
        style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}
      >
        {rows.map((row, rowIdx) => (
          <div
            key={rowIdx}
            style={{
              display: "flex",
              flexDirection: "row",
              gap: gapBetweenLogos,
              flexWrap: "wrap",
            }}
          >
            {row.map((team) => (
              <div
                key={team.team_id}
                style={{ cursor: "pointer" }}
                onClick={() =>
                  router.push(
                    `/basketball/team/${encodeURIComponent(team.team_name)}`,
                  )
                }
                title={team.team_name}
              >
                <Image
                  src={team.logo_url}
                  alt={team.team_name}
                  width={logoSize}
                  height={logoSize}
                  style={{ borderRadius: 3 }}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "400px",
          fontSize: "14px",
          color: "#6b7280",
        }}
      >
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "400px",
          fontSize: "14px",
          color: "#dc2626",
        }}
      >
        Error loading seed projection data
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* SEED DROPDOWN */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 12,
          paddingLeft: paddingHorizontal,
          paddingRight: paddingHorizontal,
          paddingTop: 12,
          paddingBottom: 12,
          borderBottom: "2px solid #d1d5db",
          boxSizing: "border-box",
          flexShrink: 0,
        }}
      >
        <label
          style={{
            fontSize: isMobile ? "12px" : "13px",
            fontWeight: "500",
            color: "#374151",
            display: "flex",
            alignItems: "center",
          }}
        >
          Selected Seed:
        </label>
        <select
          value={selectedSeed}
          onChange={(e) => setSelectedSeed(e.target.value as SeedLevel)}
          style={{
            padding: "6px 8px",
            borderRadius: "4px",
            border: "1px solid #d1d5db",
            fontSize: isMobile ? "12px" : "13px",
            backgroundColor: "white",
            color: "#1f2937",
            cursor: "pointer",
            fontWeight: "500",
          }}
        >
          {seedLevels.map((seed) => (
            <option key={seed.value} value={seed.value}>
              {seed.label}
            </option>
          ))}
        </select>
      </div>

      {/* CHARTS */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flex: 1,
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
              const isZeroWins =
                typeof winsLevel === "number" && winsLevel === 0;
              const isNeedsHelp =
                typeof winsLevel === "string" && winsLevel === "Needs Help";

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
                    backgroundColor: isNeedsHelp
                      ? "#fef3c7"
                      : isZeroWins
                        ? "#f0fdf4"
                        : "transparent",
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{
                      width: labelWidth,
                      flexShrink: 0,
                      fontSize: isMobile ? "11px" : "12px",
                      fontWeight: "400",
                      color: isNeedsHelp
                        ? "#92400e"
                        : isZeroWins
                          ? "#166534"
                          : "#1f2937",
                      textAlign: "left",
                      boxSizing: "border-box",
                      lineHeight: "1.2",
                    }}
                  >
                    {isNeedsHelp ? "Needs\nHelp" : winsLevel}
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

      {/* FOOTER EXPLANATION */}
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
          Wins Required: Shows teams grouped by additional wins needed to reach
          the selected seed, "Needs Help" if they cannot guarantee it but have a
          chance, or "Not Possible" if it's mathematically impossible.
        </div>
        <div style={{ marginBottom: 6 }}>
          Probability: Likelihood of achieving the selected seed based on 1,000
          simulations using composite ratings from KenPom, BarTorvik, and
          EvanMiya.
        </div>
      </div>
    </div>
  );
}
