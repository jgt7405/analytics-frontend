"use client";

import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import TeamLogo from "@/components/ui/TeamLogo";
import { useFootballConfData } from "@/hooks/useFootballConfData";
import { useFootballPlayoffRankings } from "@/hooks/useFootballPlayoffRankings";
import { useResponsive } from "@/hooks/useResponsive";
import { BubbleTeam, PlayoffTeam } from "@/types/football";
import { useMemo } from "react";

interface ConferenceColumn {
  name: string;
  logoUrl?: string;
  playoffTeams: PlayoffTeam[];
  outTeams: { team: BubbleTeam; category: "F4O" | "N4O" }[];
}

export default function FootballConferenceBidsTable() {
  const { isMobile } = useResponsive();
  const {
    data: confData,
    isLoading: confLoading,
    error: confError,
    refetch,
  } = useFootballConfData();
  const { data: rankings, isLoading: rankingsLoading } =
    useFootballPlayoffRankings();

  // Build one column per conference (every FBS conference from conf data),
  // grouping playoff teams and bubble teams by matching conference name.
  const columns = useMemo<ConferenceColumn[]>(() => {
    if (!confData?.data) return [];

    const playoffTeams = rankings?.playoff_teams ?? [];
    const firstFourOut = rankings?.first_four_out ?? [];
    const nextFourOut = rankings?.next_four_out ?? [];

    const cols = confData.data.map((conf): ConferenceColumn => {
      const name = conf.conference_name;

      const confPlayoff = playoffTeams
        .filter((t) => t.conference === name)
        .sort((a, b) => a.rank - b.rank);

      const confOut = [
        ...firstFourOut
          .filter((t) => t.conference === name)
          .map((team) => ({ team, category: "F4O" as const })),
        ...nextFourOut
          .filter((t) => t.conference === name)
          .map((team) => ({ team, category: "N4O" as const })),
      ];

      return {
        name,
        logoUrl: conf.logo_url,
        playoffTeams: confPlayoff,
        outTeams: confOut,
      };
    });

    // Sort by playoff team count desc, then out team count desc
    return cols.sort((a, b) => {
      const playoffDiff = b.playoffTeams.length - a.playoffTeams.length;
      if (playoffDiff !== 0) return playoffDiff;
      return b.outTeams.length - a.outTeams.length;
    });
  }, [confData, rankings]);

  const { maxPlayoffRows, maxOutRows } = useMemo(() => {
    let maxPlayoff = 0;
    let maxOut = 0;
    columns.forEach((col) => {
      maxPlayoff = Math.max(maxPlayoff, col.playoffTeams.length);
      maxOut = Math.max(maxOut, col.outTeams.length);
    });
    return { maxPlayoffRows: maxPlayoff, maxOutRows: maxOut };
  }, [columns]);

  if (confError) {
    return (
      <ErrorMessage
        message="Failed to load conference CFP data"
        onRetry={() => refetch()}
        retryLabel="Reload"
      />
    );
  }

  if (confLoading || rankingsLoading || !confData?.data) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  // Responsive sizing - matches basketball MultiBidLeagues
  const confHeaderHeight = isMobile ? 60 : 75;
  const teamRowHeight = isMobile ? 36 : 44;
  const confLogoSize = isMobile ? 28 : 36;
  const teamLogoSize = isMobile ? 24 : 28;
  const columnWidth = isMobile ? 70 : 90;
  const borderColor = "#e5e7eb";
  const numColumns = columns.length;

  return (
    <div>
      <div style={{ overflowX: "auto", overflowY: "hidden" }}>
        {/* Playoff Section */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${numColumns}, ${columnWidth}px)`,
            gap: "0",
            border: `1px solid ${borderColor}`,
            backgroundColor: "#ffffff",
          }}
        >
          {columns.map((col) => (
            <div
              key={col.name}
              style={{
                display: "flex",
                flexDirection: "column",
                borderRight: `1px solid ${borderColor}`,
              }}
            >
              {/* Conference Header */}
              <div
                style={{
                  height: confHeaderHeight,
                  borderBottom: `1px solid ${borderColor}`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  gap: "4px",
                  padding: "12px 8px 8px 8px",
                  backgroundColor: "#f9fafb",
                }}
              >
                {col.logoUrl ? (
                  <div style={{ marginTop: "-5px" }}>
                    <TeamLogo
                      logoUrl={col.logoUrl}
                      teamName={col.name}
                      size={confLogoSize}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      width: confLogoSize,
                      height: confLogoSize,
                      backgroundColor: "#e5e7eb",
                      borderRadius: "4px",
                      marginTop: "-5px",
                    }}
                  />
                )}
                <div
                  style={{
                    fontSize: isMobile ? "12px" : "14px",
                    fontWeight: "400",
                    color: "#374151",
                    marginTop: "-10px",
                  }}
                >
                  {col.playoffTeams.length} team
                  {col.playoffTeams.length !== 1 ? "s" : ""}
                </div>
              </div>

              {/* Playoff Teams */}
              {col.playoffTeams.map((team, idx) => (
                <div
                  key={`${col.name}-playoff-${team.rank}-${idx}`}
                  style={{
                    height: teamRowHeight,
                    borderBottom: `1px solid ${borderColor}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: "4px",
                    padding: "4px 4px 4px 12px",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <TeamLogo
                    logoUrl={team.logo_url}
                    teamName={team.team_name}
                    size={teamLogoSize}
                  />
                  <div
                    style={{
                      fontSize: isMobile ? "12px" : "14px",
                      fontWeight: "400",
                      color: "#374151",
                      minWidth: "20px",
                      textAlign: "center",
                    }}
                  >
                    {team.rank}
                  </div>
                </div>
              ))}

              {/* Empty cells for alignment */}
              {col.playoffTeams.length < maxPlayoffRows &&
                Array.from({
                  length: maxPlayoffRows - col.playoffTeams.length,
                }).map((_, idx) => (
                  <div
                    key={`${col.name}-empty-playoff-${idx}`}
                    style={{
                      height: teamRowHeight,
                      borderBottom: `1px solid ${borderColor}`,
                      backgroundColor: "#f3f4f6",
                    }}
                  />
                ))}
            </div>
          ))}
        </div>

        {/* Global Black Separator Line */}
        <div
          style={{
            height: "3px",
            backgroundColor: "#000000",
            width: `${numColumns * columnWidth}px`,
          }}
        />

        {/* Out-of-Playoff Section (First/Next Four Out) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${numColumns}, ${columnWidth}px)`,
            gap: "0",
            border: `1px solid ${borderColor}`,
            borderTop: "none",
            backgroundColor: "#ffffff",
          }}
        >
          {columns.map((col) => (
            <div
              key={`out-${col.name}`}
              style={{
                display: "flex",
                flexDirection: "column",
                borderRight: `1px solid ${borderColor}`,
              }}
            >
              {col.outTeams.map(({ team, category }, idx) => (
                <div
                  key={`${col.name}-out-${team.position}-${idx}`}
                  style={{
                    height: teamRowHeight,
                    borderBottom: `1px solid ${borderColor}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: "4px",
                    padding: "4px 4px 4px 12px",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <TeamLogo
                    logoUrl={team.logo_url}
                    teamName={team.team_name}
                    size={teamLogoSize}
                  />
                  <div
                    style={{
                      fontSize: isMobile ? "12px" : "14px",
                      fontWeight: "400",
                      color: "#374151",
                      minWidth: "20px",
                      textAlign: "center",
                    }}
                  >
                    {category}
                  </div>
                </div>
              ))}

              {/* Empty cells for alignment */}
              {col.outTeams.length < maxOutRows &&
                Array.from({
                  length: maxOutRows - col.outTeams.length,
                }).map((_, idx) => (
                  <div
                    key={`${col.name}-empty-out-${idx}`}
                    style={{
                      height: teamRowHeight,
                      borderBottom: `1px solid ${borderColor}`,
                      backgroundColor: "#f3f4f6",
                    }}
                  />
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
