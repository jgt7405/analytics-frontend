import TeamLogo from "@/components/ui/TeamLogo";
import type { ChartArea } from "chart.js";
import type { LogoPosition, TeamInfo } from "./types";

interface EndMarkersProps {
  positions: LogoPosition[];
  chartArea: ChartArea;
  teamData: Record<string, TeamInfo>;
  selectedTeams: Set<string>;
  isDark: boolean;
  isMobile: boolean;
  endLabelClassName: string;
}

// End-of-line dots plus the logo and final value for each team, drawn over
// the canvas at the plot's right edge (PAGE_MODERNIZATION_GUIDE.md §8g).
export default function EndMarkers({
  positions,
  chartArea,
  teamData,
  selectedTeams,
  isDark,
  isMobile,
  endLabelClassName,
}: EndMarkersProps) {
  return (
    <div
      className="pointer-events-none absolute left-0 top-0"
      style={{ width: "100%", height: "100%" }}
    >
      {positions.map(({ team, idealY, adjustedY }) => {
        const isSelected =
          selectedTeams.size === 0 || selectedTeams.has(team.team_name);
        const teamColor = isSelected
          ? team.team_info.primary_color || "#94a3b8"
          : "#d1d5db";

        return (
          <div key={`end-${team.team_name}`}>
            <svg
              className="absolute left-0 top-0"
              style={{
                width: "100%",
                height: "100%",
                pointerEvents: "none",
              }}
            >
              <line
                x1={chartArea.right}
                y1={idealY}
                x2={chartArea.right + 6}
                y2={adjustedY}
                stroke={teamColor}
                strokeWidth="1"
                strokeDasharray="2,2"
                opacity="0.7"
              />
              <circle
                cx={chartArea.right}
                cy={idealY}
                r="8"
                fill={teamColor}
                opacity={isDark ? "0.24" : "0.18"}
              />
              <circle
                cx={chartArea.right}
                cy={idealY}
                r="4.25"
                fill={isDark ? "#0f172a" : "#ffffff"}
                stroke={teamColor}
                strokeWidth="2.5"
                style={{
                  filter: `drop-shadow(0 0 3px ${teamColor})`,
                }}
              />
              <circle
                cx={chartArea.right}
                cy={idealY}
                r="1.75"
                fill={teamColor}
              />
            </svg>
          </div>
        );
      })}

      <div className="absolute inset-0">
        {positions.map(({ team, adjustedY }) => {
          const isSelected =
            selectedTeams.size === 0 || selectedTeams.has(team.team_name);
          const teamDataPoint = teamData[team.team_name];
          const lastPoint = teamDataPoint?.data[teamDataPoint.data.length - 1];

          return (
            <div
              key={`logo-${team.team_name}`}
              className="absolute flex items-center"
              style={{
                left: `${chartArea.right + 8}px`,
                top: `${adjustedY - 10}px`,
                zIndex: 10,
                opacity: isSelected ? 1 : 0.3,
              }}
            >
              <div
                style={{
                  filter: isSelected ? "none" : "grayscale(100%)",
                }}
              >
                <TeamLogo
                  logoUrl={
                    team.team_info.logo_url || "/images/team_logos/default.png"
                  }
                  teamName={team.team_name}
                  size={isMobile ? 18 : 20}
                />
              </div>
              <span
                className={`${endLabelClassName} min-w-[30px] text-left text-xs font-medium leading-none tabular-nums`}
                style={{
                  color: isSelected
                    ? team.team_info.primary_color || "#000000"
                    : "#d1d5db",
                  alignSelf: "stretch",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {lastPoint?.y.toFixed(1) || team.avg_standing.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
