"use client";

import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import TeamLogo from "@/components/ui/TeamLogo";
import { useFootballConfData } from "@/hooks/useFootballConfData";
import {
  PlayoffRankingsMode,
  useFootballPlayoffRankings,
} from "@/hooks/useFootballPlayoffRankings";
import { useResponsive } from "@/hooks/useResponsive";
import { BubbleTeam, OtherTeam, PlayoffTeam } from "@/types/football";
import Link from "next/link";
import { useMemo } from "react";

interface ConferenceColumn {
  name: string;
  logoUrl?: string;
  playoffTeams: PlayoffTeam[];
  outTeams: { team: BubbleTeam; category: "F4O" | "N4O" }[];
  otherTeams: OtherTeam[];
}

export default function FootballConferenceBidsTable({
  mode = "season",
}: {
  mode?: PlayoffRankingsMode;
}) {
  const { isMobile } = useResponsive();
  const {
    data: confData,
    isLoading: confLoading,
    error: confError,
    refetch,
  } = useFootballConfData();
  const { data: rankings, isLoading: rankingsLoading } =
    useFootballPlayoffRankings(undefined, mode);

  // Build one column per conference (every FBS conference from conf data),
  // grouping playoff teams and bubble teams by matching conference name.
  const columns = useMemo<ConferenceColumn[]>(() => {
    if (!confData?.data) return [];

    const playoffTeams = rankings?.playoff_teams ?? [];
    const firstFourOut = rankings?.first_four_out ?? [];
    const nextFourOut = rankings?.next_four_out ?? [];
    const otherTeams = rankings?.other_teams ?? [];

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

      const confOther = otherTeams
        .filter((t) => t.conference === name)
        .sort((a, b) => a.rank - b.rank);

      return {
        name,
        logoUrl: conf.logo_url,
        playoffTeams: confPlayoff,
        outTeams: confOut,
        otherTeams: confOther,
      };
    });

    // Best (lowest) rank of any team in the conference; used as a tiebreaker.
    const topRank = (col: ConferenceColumn) => {
      const ranks = [
        ...col.playoffTeams.map((t) => t.rank),
        ...col.outTeams.map((o) => o.team.rank),
        ...col.otherTeams.map((t) => t.rank),
      ].filter((r): r is number => typeof r === "number");
      return ranks.length ? Math.min(...ranks) : Infinity;
    };

    // Sort by playoff (CFP) team count desc, then by rank of top team asc
    return cols.sort((a, b) => {
      const playoffDiff = b.playoffTeams.length - a.playoffTeams.length;
      if (playoffDiff !== 0) return playoffDiff;
      return topRank(a) - topRank(b);
    });
  }, [confData, rankings]);

  const { maxPlayoffRows, maxOutRows, maxOtherRows } = useMemo(() => {
    let maxPlayoff = 0;
    let maxOut = 0;
    let maxOther = 0;
    columns.forEach((col) => {
      maxPlayoff = Math.max(maxPlayoff, col.playoffTeams.length);
      maxOut = Math.max(maxOut, col.outTeams.length);
      maxOther = Math.max(maxOther, col.otherTeams.length);
    });
    return {
      maxPlayoffRows: maxPlayoff,
      maxOutRows: maxOut,
      maxOtherRows: maxOther,
    };
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
      <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "80vh" }}>
        {/* Sticky conference-header row: stays pinned to the top of the scroll
            area while the team rows below scroll, so you can always tell which
            column is which conference. Extracted from the playoff grid so it
            persists across the out/other sections too. */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${numColumns}, ${columnWidth}px)`,
            gap: "0",
            position: "sticky",
            top: 0,
            zIndex: 30,
            borderLeft: `1px solid ${borderColor}`,
            borderTop: `1px solid ${borderColor}`,
            borderRight: `1px solid ${borderColor}`,
            backgroundColor: "#f9fafb",
          }}
        >
          {columns.map((col) => (
            <div
              key={`hdr-${col.name}`}
              style={{
                height: confHeaderHeight,
                borderRight: `1px solid ${borderColor}`,
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
          ))}
        </div>

        {/* Playoff Section (header is now the sticky row above) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${numColumns}, ${columnWidth}px)`,
            gap: "0",
            borderLeft: `1px solid ${borderColor}`,
            borderRight: `1px solid ${borderColor}`,
            borderBottom: `1px solid ${borderColor}`,
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
                  <Link
                    href={`/football/team/${encodeURIComponent(
                      team.team_name
                    )}`}
                    className="flex-shrink-0"
                  >
                    <TeamLogo
                      logoUrl={team.logo_url}
                      teamName={team.team_name}
                      size={teamLogoSize}
                    />
                  </Link>
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
              {col.outTeams.map(({ team }, idx) => (
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
                  <Link
                    href={`/football/team/${encodeURIComponent(
                      team.team_name
                    )}`}
                    className="flex-shrink-0"
                  >
                    <TeamLogo
                      logoUrl={team.logo_url}
                      teamName={team.team_name}
                      size={teamLogoSize}
                    />
                  </Link>
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

        {/* All-Teams Section (always shown; independent of the top toggle) */}
        {maxOtherRows > 0 && (
          <>
            {/* Global Black Separator Line */}
            <div
              style={{
                height: "3px",
                backgroundColor: "#000000",
                width: `${numColumns * columnWidth}px`,
              }}
            />

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
                  key={`other-${col.name}`}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    borderRight: `1px solid ${borderColor}`,
                  }}
                >
                  {col.otherTeams.map((team, idx) => (
                    <div
                      key={`${col.name}-other-${team.rank}-${idx}`}
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
                  {col.otherTeams.length < maxOtherRows &&
                    Array.from({
                      length: maxOtherRows - col.otherTeams.length,
                    }).map((_, idx) => (
                      <div
                        key={`${col.name}-empty-other-${idx}`}
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
          </>
        )}
      </div>
    </div>
  );
}
