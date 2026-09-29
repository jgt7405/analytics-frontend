"use client";

// Side-by-side comparison of the two teams.

import TeamLogo from "@/components/ui/TeamLogo";
import { type ComputedMetrics, type TeamInfo } from "@/types/gamePreview";

// ─── Head-to-Head Comparison ─────────────────────────────────────────────────

export function HeadToHeadComparison({
  awayTeam,
  homeTeam,
  awayMetrics,
  homeMetrics,
  awayInfo,
  homeInfo,
  winProb,
}: {
  awayTeam: string;
  homeTeam: string;
  awayMetrics: ComputedMetrics;
  homeMetrics: ComputedMetrics;
  awayInfo: TeamInfo;
  homeInfo: TeamInfo;
  winProb: number | null;
}) {
  const homeWinPct =
    winProb !== null ? (winProb > 1 ? winProb : winProb * 100) : null;
  const awayWinPct = homeWinPct !== null ? 100 - homeWinPct : null;

  const metrics: {
    label: string;
    awayValue: string;
    homeValue: string;
    isStreak?: boolean;
  }[] = [
    {
      label: "Record",
      awayValue: awayMetrics.overallRecord,
      homeValue: homeMetrics.overallRecord,
    },
    {
      label: "Conf Record",
      awayValue: awayMetrics.conferenceRecord,
      homeValue: homeMetrics.conferenceRecord,
    },
    {
      label: "Conf Position",
      awayValue: awayMetrics.confPosition,
      homeValue: homeMetrics.confPosition,
    },
    {
      label: "Composite Rating",
      awayValue: awayMetrics.kenpomRank ? `#${awayMetrics.kenpomRank}` : "N/A",
      homeValue: homeMetrics.kenpomRank ? `#${homeMetrics.kenpomRank}` : "N/A",
    },
    {
      label: "Win Probability",
      awayValue: awayWinPct !== null ? `${Math.round(awayWinPct)}%` : "N/A",
      homeValue: homeWinPct !== null ? `${Math.round(homeWinPct)}%` : "N/A",
    },
    {
      label: "Current Streak",
      awayValue: awayMetrics.currentStreak,
      homeValue: homeMetrics.currentStreak,
      isStreak: true,
    },
    {
      label: "Last 5",
      awayValue: awayMetrics.last5,
      homeValue: homeMetrics.last5,
    },
    {
      label: "Last 10",
      awayValue: awayMetrics.last10,
      homeValue: homeMetrics.last10,
    },
  ];
  const streakColor = (val: string) => {
    if (val.startsWith("W")) return "#16a34a";
    if (val.startsWith("L")) return "#dc2626";
    return "#6b7280";
  };

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        overflow: "hidden",
        backgroundColor: "white",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "8px 8px",
            gap: 6,
            backgroundColor: awayInfo.primary_color
              ? `${awayInfo.primary_color}0D`
              : "#f9fafb",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <TeamLogo
            logoUrl={awayInfo.logo_url || ""}
            teamName={awayTeam}
            size={28}
          />
          <span style={{ fontWeight: 600, fontSize: 13, color: "#374151" }}>
            {awayTeam}
          </span>
        </div>
        <div
          style={{
            padding: "4px 10px",
            backgroundColor: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 110,
          }}
        >
          <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600 }}>
            @
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "8px 8px",
            gap: 6,
            backgroundColor: homeInfo.primary_color
              ? `${homeInfo.primary_color}0D`
              : "#f9fafb",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <TeamLogo
            logoUrl={homeInfo.logo_url || ""}
            teamName={homeTeam}
            size={28}
          />
          <span style={{ fontWeight: 600, fontSize: 13, color: "#374151" }}>
            {homeTeam}
          </span>
        </div>
      </div>
      {metrics.map((m, idx) => (
        <div
          key={m.label}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            borderBottom:
              idx < metrics.length - 1 ? "1px solid #f3f4f6" : "none",
          }}
        >
          <div
            style={{
              textAlign: "center",
              padding: "7px 8px",
              fontWeight: 400,
              fontSize: 13,
              color: m.isStreak ? streakColor(m.awayValue) : "#6b7280",
              backgroundColor: idx % 2 === 0 ? "white" : "#fafbfc",
            }}
          >
            {m.awayValue}
          </div>
          <div
            style={{
              textAlign: "center",
              padding: "7px 10px",
              fontSize: 11,
              color: "#9ca3af",
              fontWeight: 500,
              minWidth: 110,
              borderLeft: "1px solid #f3f4f6",
              borderRight: "1px solid #f3f4f6",
              backgroundColor: "white",
            }}
          >
            {m.label}
          </div>
          <div
            style={{
              textAlign: "center",
              padding: "7px 8px",
              fontWeight: 400,
              fontSize: 13,
              color: m.isStreak ? streakColor(m.homeValue) : "#6b7280",
              backgroundColor: idx % 2 === 0 ? "white" : "#fafbfc",
            }}
          >
            {m.homeValue}
          </div>
        </div>
      ))}
    </div>
  );
}
