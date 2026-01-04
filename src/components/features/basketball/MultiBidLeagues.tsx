"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { NCAATeam, useNCAAProjections } from "@/hooks/useNCAAProjections";
import { useResponsive } from "@/hooks/useResponsive";
import { cn } from "@/lib/utils";
import tableStyles from "@/styles/components/tables.module.css";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";

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
}

function MultiBidLeagues({ className }: MultiBidLeaguesProps) {
  const { isMobile } = useResponsive();
  const { data, loading, error } = useNCAAProjections();
  const router = useRouter();

  // Navigation handler for team clicks
  const navigateToTeam = useCallback(
    (teamName: string) => {
      router.push(`/basketball/team/${encodeURIComponent(teamName)}`);
    },
    [router]
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

    // Sort by tournament team count descending, then by conference name
    return Array.from(confMap.entries())
      .sort((a, b) => {
        const countDiff =
          b[1].tournamentTeams.length - a[1].tournamentTeams.length;
        return countDiff !== 0 ? countDiff : a[0].localeCompare(b[0]);
      })
      .map(([name, data]) => ({ name, ...data }));
  }, [multiBidConferences, outTeamsByConference, data]);

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
      <div className="p-4 text-center text-gray-500">
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
      <div className="p-4 text-center text-gray-500">No data available</div>
    );
  }

  if (multiBidConferences.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No multi-bid conferences
      </div>
    );
  }

  const tableClassName = cn(
    tableStyles.tableContainer,
    "multibid-leagues-table",
    className
  );

  // Responsive sizing
  const confHeaderHeight = isMobile ? 60 : 75;
  const teamRowHeight = isMobile ? 36 : 44;
  const confLogoSize = isMobile ? 28 : 36;
  const teamLogoSize = isMobile ? 24 : 28;
  const columnWidth = isMobile ? 70 : 90;
  const borderColor = "#e5e7eb";

  return (
    <div className={tableClassName}>
      {/* Single Scrolling Container for both sections */}
      <div
        style={{
          overflowX: "auto",
          overflowY: "hidden",
        }}
      >
        {/* Tournament Section */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${numColumns}, ${columnWidth}px)`,
            gap: "0",
            border: `1px solid ${borderColor}`,
            backgroundColor: "#ffffff",
          }}
        >
          {/* Conference Headers and Tournament Teams */}
          {allConferencesWithOutTeams.map((confData) => {
            const confName = confData.name;
            const tournamentTeams = confData.tournamentTeams;
            const confLogoUrl = confData.confLogoUrl;

            // Sort tournament teams by seed then TWV
            const sortedTeams = [...tournamentTeams].sort((a, b) => {
              const seedA = a.seed ? parseInt(a.seed, 10) : 999;
              const seedB = b.seed ? parseInt(b.seed, 10) : 999;
              if (seedA !== seedB) {
                return seedA - seedB;
              }
              return b.post_conf_tourney_twv - a.post_conf_tourney_twv;
            });

            return (
              <div
                key={confName}
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
                    justifyContent: "center",
                    gap: "8px",
                    padding: "8px",
                    backgroundColor: "#f9fafb",
                  }}
                >
                  {/* Conference Logo - Clickable */}
                  <div
                    onClick={() => {
                      if (sortedTeams.length > 0) {
                        navigateToTeam(sortedTeams[0].team_name);
                      }
                    }}
                    style={{
                      cursor: sortedTeams.length > 0 ? "pointer" : "default",
                    }}
                    title={
                      sortedTeams.length > 0
                        ? `View ${sortedTeams[0].team_name}`
                        : undefined
                    }
                  >
                    {confLogoUrl ? (
                      <TeamLogo
                        logoUrl={confLogoUrl}
                        teamName={confName}
                        size={confLogoSize}
                      />
                    ) : (
                      <div
                        style={{
                          width: confLogoSize,
                          height: confLogoSize,
                          backgroundColor: "#e5e7eb",
                          borderRadius: "4px",
                        }}
                      />
                    )}
                  </div>
                  {/* Team Count - only count tournament teams */}
                  <div
                    style={{
                      fontSize: isMobile ? "12px" : "14px",
                      fontWeight: "400",
                      color: "#374151",
                    }}
                  >
                    {sortedTeams.length} team
                    {sortedTeams.length !== 1 ? "s" : ""}
                  </div>
                </div>

                {/* Tournament Teams in Conference */}
                {sortedTeams.map((team, idx) => (
                  <div
                    key={`${team.teamid}-${idx}`}
                    onClick={() => navigateToTeam(team.team_name)}
                    style={{
                      height: teamRowHeight,
                      borderBottom: `1px solid ${borderColor}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      gap: "4px",
                      padding: "4px 4px 4px 12px",
                      backgroundColor: "#ffffff",
                      cursor: "pointer",
                    }}
                    title={`View ${team.team_name}`}
                  >
                    {/* Team Logo */}
                    <TeamLogo
                      logoUrl={team.logo_url}
                      teamName={team.team_name}
                      size={teamLogoSize}
                    />
                    {/* Seed */}
                    <div
                      style={{
                        fontSize: isMobile ? "12px" : "14px",
                        fontWeight: "400",
                        color: "#374151",
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
                      style={{
                        height: teamRowHeight,
                        borderBottom: `1px solid ${borderColor}`,
                        backgroundColor: "#f3f4f6",
                      }}
                    />
                  ))}
              </div>
            );
          })}
        </div>

        {/* Global Black Separator Line */}
        <div
          style={{
            height: "3px",
            backgroundColor: "#000000",
            width: `${numColumns * columnWidth}px`,
          }}
        />

        {/* Out-of-Tournament Section */}
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
          {/* F4O and N4O Teams */}
          {allConferencesWithOutTeams.map((confData) => {
            const confName = confData.name;
            const outTeamsForConf =
              outTeamsByConference.get(confName)?.teams || [];

            return (
              <div
                key={`out-${confName}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  borderRight: `1px solid ${borderColor}`,
                }}
              >
                {/* F4O and N4O Teams for this Conference */}
                {outTeamsForConf.map(
                  (team: NCAATeamWithConfLogo, idx: number) => {
                    // Determine if this is F4O or N4O
                    const isF4O = (
                      data.first_four_out as NCAATeamWithConfLogo[]
                    )?.some((t) => t.teamid === team.teamid);
                    const category = isF4O ? "F4O" : "N4O";

                    return (
                      <div
                        key={`out-${team.teamid}-${idx}`}
                        onClick={() => navigateToTeam(team.team_name)}
                        style={{
                          height: teamRowHeight,
                          borderBottom: `1px solid ${borderColor}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-start",
                          gap: "4px",
                          padding: "4px 4px 4px 12px",
                          backgroundColor: "#ffffff",
                          cursor: "pointer",
                        }}
                        title={`View ${team.team_name}`}
                      >
                        {/* Team Logo */}
                        <TeamLogo
                          logoUrl={team.logo_url}
                          teamName={team.team_name}
                          size={teamLogoSize}
                        />
                        {/* Category Badge */}
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
                    );
                  }
                )}

                {/* Empty cells for alignment */}
                {outTeamsForConf.length < maxRowsPerSection.maxOutRows &&
                  Array.from({
                    length:
                      maxRowsPerSection.maxOutRows - outTeamsForConf.length,
                  }).map((_, idx) => (
                    <div
                      key={`empty-out-${idx}`}
                      style={{
                        height: teamRowHeight,
                        borderBottom: `1px solid ${borderColor}`,
                        backgroundColor: "#f3f4f6",
                      }}
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
