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
import styles from "./FootballConferenceBidsTable.module.css";

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
  const numColumns = columns.length;

  return (
    <div className={styles.card}>
      <div className={styles.scrollViewport}>
        {/* Sticky conference-header row: stays pinned to the top of the scroll
            area while the team rows below scroll, so you can always tell which
            column is which conference. Extracted from the playoff grid so it
            persists across the out/other sections too. */}
        <div
          className={styles.confHeaderRow}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${numColumns}, ${columnWidth}px)`,
            gap: "4px",
          }}
        >
          {columns.map((col) => (
            <div
              key={`hdr-${col.name}`}
              className={styles.confHeaderCell}
              style={{
                height: confHeaderHeight,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start",
                gap: "4px",
                padding: "12px 8px 8px 8px",
              }}
            >
              {col.logoUrl ? (
                <div className={styles.confLogoWrap} style={{ marginTop: "-5px" }}>
                  <TeamLogo
                    logoUrl={col.logoUrl}
                    teamName={col.name}
                    size={confLogoSize}
                    showTooltip
                  />
                </div>
              ) : (
                <div
                  style={{
                    width: confLogoSize,
                    height: confLogoSize,
                    backgroundColor: "#e2e8f0",
                    borderRadius: "6px",
                    marginTop: "-5px",
                  }}
                />
              )}
              <div
                className={styles.confTeamCount}
                style={{
                  fontSize: isMobile ? "12px" : "14px",
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
          className={styles.sectionGrid}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${numColumns}, ${columnWidth}px)`,
            gap: "4px",
          }}
        >
          {columns.map((col) => (
            <div key={col.name} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              {/* Playoff Teams */}
              {col.playoffTeams.map((team, idx) => (
                <div
                  key={`${col.name}-playoff-${team.rank}-${idx}`}
                  className={styles.teamRow}
                  style={{
                    height: teamRowHeight,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: "4px",
                    padding: "4px 4px 4px 12px",
                  }}
                >
                  <Link
                    href={`/football/team/${encodeURIComponent(team.team_name)}`}
                    className={styles.teamLogoLink}
                  >
                    <TeamLogo
                      logoUrl={team.logo_url}
                      teamName={team.team_name}
                      size={teamLogoSize}
                      showTooltip
                    />
                  </Link>
                  <div
                    className={styles.teamRank}
                    style={{
                      fontSize: isMobile ? "12px" : "14px",
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
                    className={styles.emptyCell}
                    style={{ height: teamRowHeight }}
                  />
                ))}
            </div>
          ))}
        </div>

        {/* Group separator */}
        <div
          className={styles.groupSeparator}
          style={{ height: "3px", width: `${numColumns * columnWidth}px` }}
        />

        {/* Out-of-Playoff Section (First/Next Four Out) */}
        <div
          className={styles.sectionGrid}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${numColumns}, ${columnWidth}px)`,
            gap: "4px",
          }}
        >
          {columns.map((col) => (
            <div key={`out-${col.name}`} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              {col.outTeams.map(({ team }, idx) => (
                <div
                  key={`${col.name}-out-${team.position}-${idx}`}
                  className={styles.teamRow}
                  style={{
                    height: teamRowHeight,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: "4px",
                    padding: "4px 4px 4px 12px",
                  }}
                >
                  <Link
                    href={`/football/team/${encodeURIComponent(team.team_name)}`}
                    className={styles.teamLogoLink}
                  >
                    <TeamLogo
                      logoUrl={team.logo_url}
                      teamName={team.team_name}
                      size={teamLogoSize}
                      showTooltip
                    />
                  </Link>
                  <div
                    className={styles.teamRank}
                    style={{
                      fontSize: isMobile ? "12px" : "14px",
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
                    className={styles.emptyCell}
                    style={{ height: teamRowHeight }}
                  />
                ))}
            </div>
          ))}
        </div>

        {/* All-Teams Section (always shown; independent of the top toggle) */}
        {maxOtherRows > 0 && (
          <>
            <div
              className={styles.groupSeparator}
              style={{ height: "3px", width: `${numColumns * columnWidth}px` }}
            />

            <div
              className={styles.sectionGrid}
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${numColumns}, ${columnWidth}px)`,
                gap: "4px",
              }}
            >
              {columns.map((col) => (
                <div key={`other-${col.name}`} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  {col.otherTeams.map((team, idx) => (
                    <div
                      key={`${col.name}-other-${team.rank}-${idx}`}
                      className={styles.teamRow}
                      style={{
                        height: teamRowHeight,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-start",
                        gap: "4px",
                        padding: "4px 4px 4px 12px",
                      }}
                    >
                      <TeamLogo
                        logoUrl={team.logo_url}
                        teamName={team.team_name}
                        size={teamLogoSize}
                        showTooltip
                      />
                      <div
                        className={styles.teamRank}
                        style={{
                          fontSize: isMobile ? "12px" : "14px",
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
                        className={styles.emptyCell}
                        style={{ height: teamRowHeight }}
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
