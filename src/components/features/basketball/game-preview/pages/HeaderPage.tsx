"use client";

// Page 1 of the preview (and of its PDF): header, head-to-head table, and each
// team's narrative and schedule strip.

import TeamLogo from "@/components/ui/TeamLogo";
import { type ComputedMetrics, type TeamDataResponse, type UpcomingGame } from "@/types/gamePreview";
import { buildHeadToHeadNarrative } from "../narratives/headToHead";
import { buildTeamNarrative } from "../narratives/team";
import { HeadToHeadComparison } from "../sections/HeadToHeadComparison";
import { ThreeColumnSchedule } from "../sections/ThreeColumnSchedule";
import { sectionDescStyle } from "../sections/styles";

interface HeaderPageProps {
  selectedGame: UpcomingGame;
  selectedGameDate: string;
  awayTeamData: TeamDataResponse;
  homeTeamData: TeamDataResponse;
  awayMetrics: ComputedMetrics;
  homeMetrics: ComputedMetrics;
  isMobile: boolean;
  twoColGrid: React.CSSProperties;
}

export default function HeaderPage({
  selectedGame,
  selectedGameDate,
  awayTeamData,
  homeTeamData,
  awayMetrics,
  homeMetrics,
  isMobile,
  twoColGrid,
}: HeaderPageProps) {
  return (
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
  );
}
