"use client";

// Page 2: next game win/loss impact and win values over time, for each team.

import TeamWinValues from "@/components/features/basketball/TeamWinValues";
import TeamLogo from "@/components/ui/TeamLogo";
import { type NextGameImpactData, type TeamDataResponse, type UpcomingGame } from "@/types/gamePreview";
import { buildNextGameImpactNarrative } from "../narratives/nextGameImpact";
import { buildWinValuesNarrative } from "../narratives/winValues";
import { NextGameImpactInline } from "../sections/NextGameImpactInline";

interface ImpactPageProps {
  selectedGame: UpcomingGame;
  awayTeamData: TeamDataResponse;
  homeTeamData: TeamDataResponse;
  awayImpactData: NextGameImpactData | null;
  homeImpactData: NextGameImpactData | null;
  isMobile: boolean;
  twoColGrid: React.CSSProperties;
}

export default function ImpactPage({
  selectedGame,
  awayTeamData,
  homeTeamData,
  awayImpactData,
  homeImpactData,
  isMobile,
  twoColGrid,
}: ImpactPageProps) {
  return (
    <div
      data-pdf-page="2"
      style={{
        backgroundColor: "white",
        padding: isMobile ? 10 : 20,
        marginTop: 20,
      }}
    >
      {/* 3. Next Game Win/Loss Impact */}
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
          Next Game Win/Loss Impact
        </h3>
        {(() => {
          const full = buildNextGameImpactNarrative(
            selectedGame.away_team,
            selectedGame.home_team,
            awayTeamData.team_info,
            homeTeamData.team_info,
            awayImpactData,
            homeImpactData,
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
                    padding: 10,
                    backgroundColor: "white",
                  }}
                >
                  <NextGameImpactInline
                    teamId={awayTeamData.team_info.team_id}
                    conference={
                      awayTeamData.team_info.conference
                    }
                    teamInfo={awayTeamData.team_info}
                    impactData={awayImpactData}
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
                    padding: 10,
                    backgroundColor: "white",
                  }}
                >
                  <NextGameImpactInline
                    teamId={homeTeamData.team_info.team_id}
                    conference={
                      homeTeamData.team_info.conference
                    }
                    teamInfo={homeTeamData.team_info}
                    impactData={homeImpactData}
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
                    padding: 10,
                    backgroundColor: "white",
                  }}
                >
                  <NextGameImpactInline
                    teamId={awayTeamData.team_info.team_id}
                    conference={
                      awayTeamData.team_info.conference
                    }
                    teamInfo={awayTeamData.team_info}
                    impactData={awayImpactData}
                  />
                </div>
                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 10,
                    backgroundColor: "white",
                  }}
                >
                  <NextGameImpactInline
                    teamId={homeTeamData.team_info.team_id}
                    conference={
                      homeTeamData.team_info.conference
                    }
                    teamInfo={homeTeamData.team_info}
                    impactData={homeImpactData}
                  />
                </div>
              </div>
            </>
          );
        })()}
      </div>

      {/* 4. Win Values Over Time */}
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
          Win Values Over Time
        </h3>
        {(() => {
          const full = buildWinValuesNarrative(
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
                    padding: 8,
                    backgroundColor: "white",
                    overflowX: "auto",
                    overflowY: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 8,
                      gap: 6,
                    }}
                  >
                    <TeamLogo
                      logoUrl={
                        awayTeamData.team_info.logo_url ||
                        ""
                      }
                      teamName={selectedGame.away_team}
                      size={20}
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
                  <TeamWinValues
                    schedule={awayTeamData.schedule}
                    logoUrl={
                      awayTeamData.team_info.logo_url || ""
                    }
                    primaryColor={
                      awayTeamData.team_info.primary_color
                    }
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
                    padding: 8,
                    backgroundColor: "white",
                    overflowX: "auto",
                    overflowY: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 8,
                      gap: 6,
                    }}
                  >
                    <TeamLogo
                      logoUrl={
                        homeTeamData.team_info.logo_url ||
                        ""
                      }
                      teamName={selectedGame.home_team}
                      size={20}
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
                  <TeamWinValues
                    schedule={homeTeamData.schedule}
                    logoUrl={
                      homeTeamData.team_info.logo_url || ""
                    }
                    primaryColor={
                      homeTeamData.team_info.primary_color
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
                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 8,
                    backgroundColor: "white",
                    overflowX: "auto",
                    overflowY: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 8,
                      gap: 6,
                    }}
                  >
                    <TeamLogo
                      logoUrl={
                        awayTeamData.team_info.logo_url ||
                        ""
                      }
                      teamName={selectedGame.away_team}
                      size={20}
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
                  <TeamWinValues
                    schedule={awayTeamData.schedule}
                    logoUrl={
                      awayTeamData.team_info.logo_url || ""
                    }
                    primaryColor={
                      awayTeamData.team_info.primary_color
                    }
                  />
                </div>
                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 8,
                    backgroundColor: "white",
                    overflowX: "auto",
                    overflowY: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 8,
                      gap: 6,
                    }}
                  >
                    <TeamLogo
                      logoUrl={
                        homeTeamData.team_info.logo_url ||
                        ""
                      }
                      teamName={selectedGame.home_team}
                      size={20}
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
                  <TeamWinValues
                    schedule={homeTeamData.schedule}
                    logoUrl={
                      homeTeamData.team_info.logo_url || ""
                    }
                    primaryColor={
                      homeTeamData.team_info.primary_color
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
