"use client";

// Page 3: schedule difficulty and season wins breakdown, for each team.

import BasketballTeamScheduleDifficulty from "@/components/features/basketball/team-schedule-difficulty";
import BasketballTeamWinsBreakdown from "@/components/features/basketball/team-wins-breakdown";
import TeamLogo from "@/components/ui/TeamLogo";
import { type AllScheduleGame, type ConfChampData, type TeamDataResponse, type UpcomingGame } from "@/types/gamePreview";
import { TEAL } from "../metrics";
import { buildScheduleDifficultyNarrative } from "../narratives/scheduleDifficulty";
import { buildWinsBreakdownNarrative } from "../narratives/winsBreakdown";

interface SchedulePageProps {
  selectedGame: UpcomingGame;
  awayTeamData: TeamDataResponse;
  homeTeamData: TeamDataResponse;
  awayConfChampData: ConfChampData | null;
  homeConfChampData: ConfChampData | null;
  isMobile: boolean;
  twoColGrid: React.CSSProperties;
}

export default function SchedulePage({
  selectedGame,
  awayTeamData,
  homeTeamData,
  awayConfChampData,
  homeConfChampData,
  isMobile,
  twoColGrid,
}: SchedulePageProps) {
  return (
    <div
      data-pdf-page="3"
      style={{
        backgroundColor: "white",
        padding: isMobile ? 10 : 20,
        marginTop: 20,
      }}
    >
      {/* 5. Schedule Difficulty */}
      <div>
        <h3
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#374151",
            marginBottom: 4,
            paddingBottom: 5,
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          Schedule Difficulty
        </h3>
        {(() => {
          const full = buildScheduleDifficultyNarrative(
            selectedGame.away_team,
            selectedGame.home_team,
            awayTeamData.schedule,
            homeTeamData.schedule,
          );
          const [awayNarr, homeNarr] = full.split("\n\n");
          const narrStyle: React.CSSProperties = {
            fontSize: 11,
            color: "#6b7280",
            lineHeight: 1.5,
            marginBottom: 12,
          };
          return isMobile ? (
            <div style={twoColGrid}>
              {/* Away Team: Commentary + Component */}
              <div>
                <p style={narrStyle}>{awayNarr}</p>
                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 12,
                    backgroundColor: "white",
                    overflowX: "auto",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 10,
                      gap: 6,
                    }}
                  >
                    <TeamLogo
                      logoUrl={
                        awayTeamData.team_info.logo_url ||
                        ""
                      }
                      teamName={selectedGame.away_team}
                      size={24}
                    />
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        color: "#374151",
                      }}
                    >
                      {selectedGame.away_team}
                    </span>
                  </div>
                  <BasketballTeamScheduleDifficulty
                    schedule={awayTeamData.schedule}
                    allScheduleData={
                      (awayTeamData.all_schedule_data as
                        | AllScheduleGame[]
                        | undefined) || []
                    }
                    teamConference={
                      awayTeamData.team_info.conference
                    }
                    teamColor={
                      awayTeamData.team_info
                        .primary_color || TEAL
                    }
                    teamName={selectedGame.away_team}
                  />
                </div>
              </div>
              {/* Home Team: Commentary + Component */}
              <div>
                <p style={narrStyle}>{homeNarr}</p>
                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 12,
                    backgroundColor: "white",
                    overflowX: "auto",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 10,
                      gap: 6,
                    }}
                  >
                    <TeamLogo
                      logoUrl={
                        homeTeamData.team_info.logo_url ||
                        ""
                      }
                      teamName={selectedGame.home_team}
                      size={24}
                    />
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        color: "#374151",
                      }}
                    >
                      {selectedGame.home_team}
                    </span>
                  </div>
                  <BasketballTeamScheduleDifficulty
                    schedule={homeTeamData.schedule}
                    allScheduleData={
                      (homeTeamData.all_schedule_data as
                        | AllScheduleGame[]
                        | undefined) || []
                    }
                    teamConference={
                      homeTeamData.team_info.conference
                    }
                    teamColor={
                      homeTeamData.team_info
                        .primary_color || TEAL
                    }
                    teamName={selectedGame.home_team}
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop: Row 1: Paragraphs */}
              <div style={twoColGrid}>
                <p style={narrStyle}>{awayNarr}</p>
                <p style={narrStyle}>{homeNarr}</p>
              </div>
              {/* Desktop: Row 2: Components */}
              <div style={twoColGrid}>
                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 12,
                    backgroundColor: "white",
                    overflowX: "auto",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 10,
                      gap: 6,
                    }}
                  >
                    <TeamLogo
                      logoUrl={
                        awayTeamData.team_info.logo_url ||
                        ""
                      }
                      teamName={selectedGame.away_team}
                      size={24}
                    />
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        color: "#374151",
                      }}
                    >
                      {selectedGame.away_team}
                    </span>
                  </div>
                  <BasketballTeamScheduleDifficulty
                    schedule={awayTeamData.schedule}
                    allScheduleData={
                      (awayTeamData.all_schedule_data as
                        | AllScheduleGame[]
                        | undefined) || []
                    }
                    teamConference={
                      awayTeamData.team_info.conference
                    }
                    teamColor={
                      awayTeamData.team_info
                        .primary_color || TEAL
                    }
                    teamName={selectedGame.away_team}
                  />
                </div>
                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 12,
                    backgroundColor: "white",
                    overflowX: "auto",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 10,
                      gap: 6,
                    }}
                  >
                    <TeamLogo
                      logoUrl={
                        homeTeamData.team_info.logo_url ||
                        ""
                      }
                      teamName={selectedGame.home_team}
                      size={24}
                    />
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        color: "#374151",
                      }}
                    >
                      {selectedGame.home_team}
                    </span>
                  </div>
                  <BasketballTeamScheduleDifficulty
                    schedule={homeTeamData.schedule}
                    allScheduleData={
                      (homeTeamData.all_schedule_data as
                        | AllScheduleGame[]
                        | undefined) || []
                    }
                    teamConference={
                      homeTeamData.team_info.conference
                    }
                    teamColor={
                      homeTeamData.team_info
                        .primary_color || TEAL
                    }
                    teamName={selectedGame.home_team}
                  />
                </div>
              </div>
            </>
          );
        })()}
      </div>

      {/* 6. Season Wins Breakdown */}
      <div style={{ marginTop: 20 }}>
        <h3
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#374151",
            marginBottom: 4,
            paddingBottom: 5,
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          Season Wins Breakdown
        </h3>
        {(() => {
          const full = buildWinsBreakdownNarrative(
            selectedGame.away_team,
            selectedGame.home_team,
            awayTeamData.schedule,
            homeTeamData.schedule,
            awayTeamData.team_info,
            homeTeamData.team_info,
            awayConfChampData,
            homeConfChampData,
          );
          const [awayNarr, homeNarr] = full.split("\n\n");
          const narrStyle: React.CSSProperties = {
            fontSize: 11,
            color: "#6b7280",
            lineHeight: 1.5,
            marginBottom: 12,
          };
          return isMobile ? (
            <div style={twoColGrid}>
              {/* Away Team: Commentary + Component */}
              <div>
                <p style={narrStyle}>{awayNarr}</p>
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 10,
                      gap: 6,
                    }}
                  >
                    <TeamLogo
                      logoUrl={
                        awayTeamData.team_info.logo_url ||
                        ""
                      }
                      teamName={selectedGame.away_team}
                      size={24}
                    />
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        color: "#374151",
                      }}
                    >
                      {selectedGame.away_team}
                    </span>
                  </div>
                  <BasketballTeamWinsBreakdown
                    schedule={awayTeamData.schedule}
                    teamName={selectedGame.away_team}
                    conference={
                      awayTeamData.team_info.conference
                    }
                    primaryColor={
                      awayTeamData.team_info
                        .primary_color || "#18627b"
                    }
                    secondaryColor={
                      awayTeamData.team_info.secondary_color
                    }
                    logoUrl={
                      awayTeamData.team_info.logo_url || ""
                    }
                  />
                </div>
              </div>
              {/* Home Team: Commentary + Component */}
              <div>
                <p style={narrStyle}>{homeNarr}</p>
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 10,
                      gap: 6,
                    }}
                  >
                    <TeamLogo
                      logoUrl={
                        homeTeamData.team_info.logo_url ||
                        ""
                      }
                      teamName={selectedGame.home_team}
                      size={24}
                    />
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        color: "#374151",
                      }}
                    >
                      {selectedGame.home_team}
                    </span>
                  </div>
                  <BasketballTeamWinsBreakdown
                    schedule={homeTeamData.schedule}
                    teamName={selectedGame.home_team}
                    conference={
                      homeTeamData.team_info.conference
                    }
                    primaryColor={
                      homeTeamData.team_info
                        .primary_color || "#18627b"
                    }
                    secondaryColor={
                      homeTeamData.team_info.secondary_color
                    }
                    logoUrl={
                      homeTeamData.team_info.logo_url || ""
                    }
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop: Row 1: Paragraphs */}
              <div style={twoColGrid}>
                <p style={narrStyle}>{awayNarr}</p>
                <p style={narrStyle}>{homeNarr}</p>
              </div>
              {/* Desktop: Row 2: Components */}
              <div style={twoColGrid}>
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 10,
                      gap: 6,
                    }}
                  >
                    <TeamLogo
                      logoUrl={
                        awayTeamData.team_info.logo_url ||
                        ""
                      }
                      teamName={selectedGame.away_team}
                      size={24}
                    />
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        color: "#374151",
                      }}
                    >
                      {selectedGame.away_team}
                    </span>
                  </div>
                  <BasketballTeamWinsBreakdown
                    schedule={awayTeamData.schedule}
                    teamName={selectedGame.away_team}
                    conference={
                      awayTeamData.team_info.conference
                    }
                    primaryColor={
                      awayTeamData.team_info
                        .primary_color || "#18627b"
                    }
                    secondaryColor={
                      awayTeamData.team_info.secondary_color
                    }
                    logoUrl={
                      awayTeamData.team_info.logo_url || ""
                    }
                  />
                </div>
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 10,
                      gap: 6,
                    }}
                  >
                    <TeamLogo
                      logoUrl={
                        homeTeamData.team_info.logo_url ||
                        ""
                      }
                      teamName={selectedGame.home_team}
                      size={24}
                    />
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        color: "#374151",
                      }}
                    >
                      {selectedGame.home_team}
                    </span>
                  </div>
                  <BasketballTeamWinsBreakdown
                    schedule={homeTeamData.schedule}
                    teamName={selectedGame.home_team}
                    conference={
                      homeTeamData.team_info.conference
                    }
                    primaryColor={
                      homeTeamData.team_info
                        .primary_color || "#18627b"
                    }
                    secondaryColor={
                      homeTeamData.team_info.secondary_color
                    }
                    logoUrl={
                      homeTeamData.team_info.logo_url || ""
                    }
                  />
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
