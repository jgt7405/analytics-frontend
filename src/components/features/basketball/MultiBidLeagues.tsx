"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { NCAATeam, useNCAAProjections } from "@/hooks/useNCAAProjections";
import { useResponsive } from "@/hooks/useResponsive";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import styles from "./MultiBidLeagues.module.css";

interface NCAATeamWithConfLogo extends NCAATeam {
  conf_logo_url?: string;
}

interface ConferenceBidInfo {
  conference: string;
  confLogoUrl?: string;
  teams: NCAATeamWithConfLogo[];
}

interface MultiBidLeaguesProps {
  className?: string;
  season?: string;
}

function MultiBidLeagues({ className, season }: MultiBidLeaguesProps) {
  const { isMobile } = useResponsive();
  const { data, loading, error } = useNCAAProjections(season);
  const router = useRouter();

  // Navigation handler for team clicks
  const navigateToTeam = useCallback(
    (teamName: string) => {
      const path = season
        ? `/basketball/${season}/team/${encodeURIComponent(teamName)}`
        : `/basketball/team/${encodeURIComponent(teamName)}`;
      router.push(path);
    },
    [router, season]
  );

  // Calculate average seed for a set of teams
  const calculateAverageSeed = useCallback(
    (teams: NCAATeamWithConfLogo[]): number => {
      if (teams.length === 0) return 999;
      const seeds = teams
        .map((t) => (t.seed ? parseInt(t.seed, 10) : 999))
        .filter((s) => s !== 999);
      if (seeds.length === 0) return 999;
      return seeds.reduce((a, b) => a + b, 0) / seeds.length;
    },
    []
  );

  // All hooks must be called before any early returns
  const multiBidConferences = useMemo(() => {
    if (!data || !data.tournament_teams) {
      return [];
    }

    const conferenceMap = new Map<string, ConferenceBidInfo>();

    (data.tournament_teams as NCAATeamWithConfLogo[]).forEach((team) => {
      const conf = team.full_conference_name;
      if (!conferenceMap.has(conf)) {
        conferenceMap.set(conf, {
          conference: conf,
          confLogoUrl: team.conf_logo_url,
          teams: [],
        });
      }

      const entry = conferenceMap.get(conf)!;
      entry.teams.push(team);
    });

    // Filter to only conferences with 2+ teams and sort by team count descending
    return Array.from(conferenceMap.values())
      .filter((conf) => conf.teams.length > 1)
      .sort((a, b) => b.teams.length - a.teams.length);
  }, [data]);

  const outTeams = useMemo(() => {
    if (!data) return [];

    const f4o = ((data.first_four_out as NCAATeamWithConfLogo[]) || []).map(
      (team) => ({ team, category: "F4O" as const })
    );
    const n4o = ((data.next_four_out as NCAATeamWithConfLogo[]) || []).map(
      (team) => ({ team, category: "N4O" as const })
    );

    // Sort each by TWV descending
    const sortedF4o = f4o.sort(
      (a, b) => b.team.post_conf_tourney_twv - a.team.post_conf_tourney_twv
    );
    const sortedN4o = n4o.sort(
      (a, b) => b.team.post_conf_tourney_twv - a.team.post_conf_tourney_twv
    );

    return [...sortedF4o, ...sortedN4o];
  }, [data]);

  // Build out-of-tournament teams by conference and get conference logos
  const outTeamsByConference = useMemo(() => {
    const confMap = new Map<
      string,
      { teams: NCAATeamWithConfLogo[]; logoUrl?: string }
    >();

    outTeams.forEach((outTeamInfo) => {
      const conf = outTeamInfo.team.full_conference_name;
      if (!confMap.has(conf)) {
        confMap.set(conf, {
          teams: [],
          logoUrl: outTeamInfo.team.conf_logo_url,
        });
      }
      confMap.get(conf)!.teams.push(outTeamInfo.team);
    });

    return confMap;
  }, [outTeams]);

  // Combine all conferences that have tournament teams or out teams, sorted by tournament team count
  const allConferencesWithOutTeams = useMemo(() => {
    const confMap = new Map<
      string,
      {
        tournamentTeams: NCAATeamWithConfLogo[];
        confLogoUrl?: string;
        outTeamsCount: number;
      }
    >();

    // Add multi-bid conferences
    multiBidConferences.forEach((conf) => {
      confMap.set(conf.conference, {
        tournamentTeams: conf.teams,
        confLogoUrl: conf.confLogoUrl,
        outTeamsCount:
          outTeamsByConference.get(conf.conference)?.teams.length || 0,
      });
    });

    // Add conferences with only out teams, but look for tournament teams from that conference
    outTeamsByConference.forEach((outTeamData, confName) => {
      if (!confMap.has(confName)) {
        // Find if any tournament teams belong to this conference
        const tournamentTeamsInConf =
          (data?.tournament_teams as NCAATeamWithConfLogo[])?.filter(
            (t) => t.full_conference_name === confName
          ) || [];

        confMap.set(confName, {
          tournamentTeams: tournamentTeamsInConf,
          confLogoUrl: outTeamData.logoUrl,
          outTeamsCount: outTeamData.teams.length,
        });
      }
    });

    // Sort by: tournament team count desc, then out teams count desc, then average seed asc
    return Array.from(confMap.entries())
      .sort((a, b) => {
        const tournamentCountDiff =
          b[1].tournamentTeams.length - a[1].tournamentTeams.length;
        if (tournamentCountDiff !== 0) {
          return tournamentCountDiff;
        }

        const outTeamsCountDiff = b[1].outTeamsCount - a[1].outTeamsCount;
        if (outTeamsCountDiff !== 0) {
          return outTeamsCountDiff;
        }

        // If equal in both, sort by average seed (lowest first)
        const avgSeedA = calculateAverageSeed(a[1].tournamentTeams);
        const avgSeedB = calculateAverageSeed(b[1].tournamentTeams);
        return avgSeedA - avgSeedB;
      })
      .map(([name, data]) => ({ name, ...data }));
  }, [multiBidConferences, outTeamsByConference, data, calculateAverageSeed]);

  // Find max number of rows needed (tournament teams + out teams per conference)
  const maxRowsPerSection = useMemo(() => {
    let maxTournamentRows = 0;
    let maxOutRows = 0;

    allConferencesWithOutTeams.forEach((confData) => {
      maxTournamentRows = Math.max(
        maxTournamentRows,
        confData.tournamentTeams.length
      );
      const outTeamsForConf =
        outTeamsByConference.get(confData.name)?.teams.length || 0;
      maxOutRows = Math.max(maxOutRows, outTeamsForConf);
    });

    return { maxTournamentRows, maxOutRows };
  }, [allConferencesWithOutTeams, outTeamsByConference]);

  // Get the number of columns needed
  const numColumns = allConferencesWithOutTeams.length;

  // Early returns after all hooks
  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-300">
        Loading conference data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        Error loading data:{" "}
        {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-300">No data available</div>
    );
  }

  if (multiBidConferences.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-300">
        No multi-bid conferences
      </div>
    );
  }

  // Responsive sizing
  const confHeaderHeight = isMobile ? 60 : 75;
  const teamRowHeight = isMobile ? 36 : 44;
  const confLogoSize = isMobile ? 28 : 36;
  const teamLogoSize = isMobile ? 24 : 28;
  const columnWidth = isMobile ? 70 : 90;
  const columnGap = 4;
  // Full rendered width of a numColumns-wide grid row, including the gaps
  // between columns - the separator bar needs this (not just
  // numColumns * columnWidth) or it comes up short of the grid's right edge.
  const gridWidth =
    numColumns * columnWidth + Math.max(numColumns - 1, 0) * columnGap;

  return (
    <div className={cn(styles.card, className)}>
      <div className={styles.cardHeader}>
        <div className={styles.titleGroup} data-screenshot-hide="true">
          <h2 className={styles.title}>Potential Multi-Bid Conferences</h2>
        </div>
      </div>

      <div className={styles.scrollViewport}>
        {/* Sticky conference-header row: stays pinned to the top of the scroll
            area while the team rows below scroll, so you can always tell which
            column is which conference. */}
        <div
          className={styles.confHeaderRow}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${numColumns}, ${columnWidth}px)`,
            gap: `${columnGap}px`,
          }}
        >
          {allConferencesWithOutTeams.map((confData) => (
            <div
              key={`hdr-${confData.name}`}
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
              {confData.confLogoUrl ? (
                <div
                  className={styles.confLogoWrap}
                  style={{ marginTop: "-5px" }}
                >
                  <TeamLogo
                    logoUrl={confData.confLogoUrl}
                    teamName={confData.name}
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
                {confData.tournamentTeams.length} team
                {confData.tournamentTeams.length !== 1 ? "s" : ""}
              </div>
            </div>
          ))}
        </div>

        {/* Tournament Section */}
        <div
          className={styles.sectionGrid}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${numColumns}, ${columnWidth}px)`,
            gap: `${columnGap}px`,
          }}
        >
          {allConferencesWithOutTeams.map((confData) => {
            // Sort tournament teams by seed then TWV
            const sortedTeams = [...confData.tournamentTeams].sort((a, b) => {
              const seedA = a.seed ? parseInt(a.seed, 10) : 999;
              const seedB = b.seed ? parseInt(b.seed, 10) : 999;
              if (seedA !== seedB) {
                return seedA - seedB;
              }
              return b.post_conf_tourney_twv - a.post_conf_tourney_twv;
            });

            return (
              <div
                key={confData.name}
                style={{ display: "flex", flexDirection: "column", gap: "3px" }}
              >
                {sortedTeams.map((team, idx) => (
                  <div
                    key={`${team.teamid}-${idx}`}
                    onClick={() => navigateToTeam(team.team_name)}
                    className={styles.teamRow}
                    style={{
                      height: teamRowHeight,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      gap: "4px",
                      padding: "4px 4px 4px 12px",
                    }}
                    title={`View ${team.team_name}`}
                  >
                    <span className={styles.teamLogoInner}>
                      <TeamLogo
                        logoUrl={team.logo_url}
                        teamName={team.team_name}
                        size={teamLogoSize}
                      />
                    </span>
                    <div
                      className={styles.teamValue}
                      style={{
                        fontSize: isMobile ? "12px" : "14px",
                        minWidth: "20px",
                        textAlign: "center",
                      }}
                    >
                      {team.seed || "-"}
                    </div>
                  </div>
                ))}

                {/* Empty cells for alignment */}
                {sortedTeams.length < maxRowsPerSection.maxTournamentRows &&
                  Array.from({
                    length:
                      maxRowsPerSection.maxTournamentRows - sortedTeams.length,
                  }).map((_, idx) => (
                    <div
                      key={`empty-tournament-${idx}`}
                      className={styles.emptyCell}
                      style={{ height: teamRowHeight }}
                    />
                  ))}
              </div>
            );
          })}
        </div>

        {/* Group separator */}
        <div
          className={styles.groupSeparator}
          style={{ height: "3px", width: `${gridWidth}px` }}
        />

        {/* Out-of-Tournament Section */}
        <div
          className={styles.sectionGrid}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${numColumns}, ${columnWidth}px)`,
            gap: `${columnGap}px`,
          }}
        >
          {allConferencesWithOutTeams.map((confData) => {
            const outTeamsForConf =
              outTeamsByConference.get(confData.name)?.teams || [];

            return (
              <div
                key={`out-${confData.name}`}
                style={{ display: "flex", flexDirection: "column", gap: "3px" }}
              >
                {outTeamsForConf.map((team, idx) => {
                  const isF4O = (
                    data.first_four_out as NCAATeamWithConfLogo[]
                  )?.some((t) => t.teamid === team.teamid);
                  const category = isF4O ? "F4O" : "N4O";

                  return (
                    <div
                      key={`out-${team.teamid}-${idx}`}
                      onClick={() => navigateToTeam(team.team_name)}
                      className={styles.teamRow}
                      style={{
                        height: teamRowHeight,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-start",
                        gap: "4px",
                        padding: "4px 4px 4px 12px",
                      }}
                      title={`View ${team.team_name}`}
                    >
                      <span className={styles.teamLogoInner}>
                        <TeamLogo
                          logoUrl={team.logo_url}
                          teamName={team.team_name}
                          size={teamLogoSize}
                        />
                      </span>
                      <div
                        className={styles.teamValue}
                        style={{
                          fontSize: isMobile ? "12px" : "14px",
                          minWidth: "20px",
                          textAlign: "center",
                        }}
                      >
                        {category}
                      </div>
                    </div>
                  );
                })}

                {/* Empty cells for alignment */}
                {outTeamsForConf.length < maxRowsPerSection.maxOutRows &&
                  Array.from({
                    length:
                      maxRowsPerSection.maxOutRows - outTeamsForConf.length,
                  }).map((_, idx) => (
                    <div
                      key={`empty-out-${idx}`}
                      className={styles.emptyCell}
                      style={{ height: teamRowHeight }}
                    />
                  ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default MultiBidLeagues;
