"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { NCAATeam, useNCAAProjections } from "@/hooks/useNCAAProjections";
import { useResponsive } from "@/hooks/useResponsive";
import { cn } from "@/lib/utils";
import tableStyles from "@/styles/components/tables.module.css";
import { useMemo } from "react";

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
  const columnWidth = isMobile ? 85 : 110;
  const borderColor = "#e5e7eb";

  // Find max number of teams in any conference (for grid height)
  const maxTeams = Math.max(...multiBidConferences.map((c) => c.teams.length));

  return (
    <div className={tableClassName}>
      {/* Grid Container */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${multiBidConferences.length}, ${columnWidth}px)`,
          gap: "0",
          overflowX: "auto",
          border: `1px solid ${borderColor}`,
          backgroundColor: "#ffffff",
        }}
      >
        {/* Conference Headers and Teams */}
        {multiBidConferences.map((confInfo) => {
          // Sort teams by seed then TWV
          const sortedTeams = [...confInfo.teams].sort((a, b) => {
            const seedA = a.seed ? parseInt(a.seed, 10) : 999;
            const seedB = b.seed ? parseInt(b.seed, 10) : 999;
            if (seedA !== seedB) {
              return seedA - seedB;
            }
            return b.post_conf_tourney_twv - a.post_conf_tourney_twv;
          });

          return (
            <div
              key={confInfo.conference}
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
                {/* Conference Logo */}
                {confInfo.confLogoUrl ? (
                  <TeamLogo
                    logoUrl={confInfo.confLogoUrl}
                    teamName={confInfo.conference}
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
                {/* Team Count */}
                <div
                  style={{
                    fontSize: isMobile ? "12px" : "14px",
                    fontWeight: "400",
                    color: "#374151",
                  }}
                >
                  {confInfo.teams.length} teams
                </div>
              </div>

              {/* Teams in Conference */}
              {sortedTeams.map((team, idx) => (
                <div
                  key={`${team.teamid}-${idx}`}
                  style={{
                    height: teamRowHeight,
                    borderBottom: `1px solid ${borderColor}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    padding: "4px 8px",
                    backgroundColor: "#ffffff",
                  }}
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

              {/* Empty cells to fill grid if this conference has fewer teams than max */}
              {sortedTeams.length < maxTeams &&
                Array.from({ length: maxTeams - sortedTeams.length }).map(
                  (_, idx) => (
                    <div
                      key={`empty-${idx}`}
                      style={{
                        height: teamRowHeight,
                        borderBottom: `1px solid ${borderColor}`,
                        backgroundColor: "#ffffff",
                      }}
                    />
                  )
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MultiBidLeagues;
