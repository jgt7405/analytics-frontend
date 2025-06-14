// src/components/features/basketball/TWVTable.tsx
"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { cn } from "@/lib/utils";
import tableStyles from "@/styles/components/tables.module.css";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo } from "react";

interface TWVTeam {
  rank: number;
  team_name: string;
  team_id?: string;
  logo_url: string;
  twv: number;
  actual_record: string;
  expected_record: string;
}

interface TWVTableProps {
  twvData: TWVTeam[];
  className?: string;
}

function TWVTable({ twvData, className }: TWVTableProps) {
  const { isMobile } = useResponsive();
  const router = useRouter();

  const navigateToTeam = useCallback(
    (teamName: string) => {
      router.push(`/basketball/team/${encodeURIComponent(teamName)}`);
    },
    [router]
  );

  // Calculate min/max for color scaling
  const { minTWV, maxTWV } = useMemo(() => {
    const twvValues = twvData.map((team) => team.twv);
    return {
      minTWV: Math.min(...twvValues, -1),
      maxTWV: Math.max(...twvValues, 1),
    };
  }, [twvData]);

  // Color function for TWV values - matches the exact specification
  const getTWVColor = useCallback(
    (twv: number) => {
      const blue = [24, 98, 123]; // Dark blue for positive values
      const white = [255, 255, 255]; // White baseline
      const yellow = [255, 230, 113]; // Yellow for negative values

      let r: number, g: number, b: number;

      if (twv > 0) {
        // Positive values: interpolate from white to dark blue
        const ratio = Math.min(Math.abs(twv / maxTWV), 1);
        r = Math.round(white[0] + (blue[0] - white[0]) * ratio);
        g = Math.round(white[1] + (blue[1] - white[1]) * ratio);
        b = Math.round(white[2] + (blue[2] - white[2]) * ratio);
      } else if (twv < 0) {
        // Negative values: interpolate from white to yellow
        const ratio = Math.min(Math.abs(twv / minTWV), 1);
        r = Math.round(white[0] + (yellow[0] - white[0]) * ratio);
        g = Math.round(white[1] + (yellow[1] - white[1]) * ratio);
        b = Math.round(white[2] + (yellow[2] - white[2]) * ratio);
      } else {
        // Zero values remain white
        [r, g, b] = white;
      }

      // Calculate brightness for text color contrast
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      const textColor = brightness > 140 ? "#000000" : "#ffffff";

      return {
        backgroundColor: `rgb(${r}, ${g}, ${b})`,
        color: textColor,
      };
    },
    [maxTWV, minTWV]
  );

  if (!twvData || twvData.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">No TWV data available</div>
    );
  }

  // Responsive dimensions - Updated mobile widths for record columns
  const rankColWidth = isMobile ? 50 : 60;
  const teamColWidth = isMobile ? 150 : 220;
  const twvColWidth = isMobile ? 70 : 80;
  const recordColWidth = isMobile ? 70 : 120; // Reduced from 90 to 70 on mobile
  const cellHeight = isMobile ? 32 : 36;
  const headerHeight = isMobile ? 40 : 48;

  const tableClassName = cn(tableStyles.tableContainer, "twv-table", className);

  return (
    <div
      className={`${tableClassName} relative`}
      style={{
        overflowX: "auto",
        overflowY: "auto",
        maxHeight: "80vh", // CRITICAL: Must set height for sticky to work
      }}
    >
      <table
        className="border-collapse border-spacing-0"
        style={{
          width: "max-content",
          borderCollapse: "separate",
          borderSpacing: 0,
        }}
      >
        <thead>
          <tr>
            {/* Rank Column */}
            <th
              className={`sticky left-0 z-30 bg-gray-50 text-center font-normal ${isMobile ? "text-xs" : "text-sm"}`}
              style={{
                width: rankColWidth,
                minWidth: rankColWidth,
                maxWidth: rankColWidth,
                height: headerHeight,
                position: "sticky",
                top: 0,
                left: 0,
                border: "1px solid #e5e7eb",
                borderRight: "1px solid #e5e7eb",
              }}
            >
              Rank
            </th>

            {/* Team Column */}
            <th
              className={`sticky z-30 bg-gray-50 text-left font-normal px-2 ${isMobile ? "text-xs" : "text-sm"}`}
              style={{
                width: teamColWidth,
                minWidth: teamColWidth,
                maxWidth: teamColWidth,
                height: headerHeight,
                position: "sticky",
                top: 0,
                left: rankColWidth,
                border: "1px solid #e5e7eb",
                borderLeft: "none",
                borderRight: "2px solid #d1d5db",
              }}
            >
              Team
            </th>

            {/* TWV Column */}
            <th
              className={`sticky bg-gray-50 text-center font-normal z-20 ${isMobile ? "text-xs" : "text-sm"}`}
              style={{
                width: twvColWidth,
                minWidth: twvColWidth,
                maxWidth: twvColWidth,
                height: headerHeight,
                position: "sticky",
                top: 0,
                border: "1px solid #e5e7eb",
                borderLeft: "none",
              }}
            >
              TWV
            </th>

            {/* Actual Record Column - Updated with line breaks for mobile */}
            <th
              className={`sticky bg-gray-50 text-center font-normal z-20 ${isMobile ? "text-xs" : "text-sm"}`}
              style={{
                width: recordColWidth,
                minWidth: recordColWidth,
                maxWidth: recordColWidth,
                height: headerHeight,
                position: "sticky",
                top: 0,
                border: "1px solid #e5e7eb",
                borderLeft: "none",
              }}
            >
              {isMobile ? (
                <>
                  Actual
                  <br />
                  Record
                </>
              ) : (
                "Actual Record"
              )}
            </th>

            {/* Expected Record Column - Updated with line breaks for mobile */}
            <th
              className={`sticky bg-gray-50 text-center font-normal z-20 ${isMobile ? "text-xs" : "text-sm"}`}
              style={{
                width: recordColWidth,
                minWidth: recordColWidth,
                maxWidth: recordColWidth,
                height: headerHeight,
                position: "sticky",
                top: 0,
                border: "1px solid #e5e7eb",
                borderLeft: "none",
              }}
            >
              {isMobile ? (
                <>
                  Expected
                  <br />
                  Record
                </>
              ) : (
                "Expected Record"
              )}
            </th>
          </tr>
        </thead>
        <tbody>
          {twvData.map((team, index) => (
            <tr key={`${team.team_name}-${index}`}>
              {/* Rank Cell */}
              <td
                className={`sticky left-0 z-20 bg-white text-center ${isMobile ? "text-xs" : "text-sm"}`}
                style={{
                  width: rankColWidth,
                  minWidth: rankColWidth,
                  maxWidth: rankColWidth,
                  height: cellHeight,
                  position: "sticky",
                  left: 0,
                  border: "1px solid #e5e7eb",
                  borderTop: "none",
                  borderRight: "1px solid #e5e7eb",
                }}
              >
                {team.rank}
              </td>

              {/* Team Cell */}
              <td
                className={`sticky z-20 bg-white text-left px-2 ${isMobile ? "text-xs" : "text-sm"}`}
                style={{
                  width: teamColWidth,
                  minWidth: teamColWidth,
                  maxWidth: teamColWidth,
                  height: cellHeight,
                  position: "sticky",
                  left: rankColWidth,
                  border: "1px solid #e5e7eb",
                  borderTop: "none",
                  borderLeft: "none",
                  borderRight: "2px solid #d1d5db",
                }}
              >
                <div className="flex items-center gap-2">
                  <TeamLogo
                    logoUrl={team.logo_url}
                    teamName={team.team_name}
                    size={isMobile ? 24 : 28}
                    onClick={() => navigateToTeam(team.team_name)}
                    className="flex-shrink-0"
                  />
                  <span className="truncate">{team.team_name}</span>
                </div>
              </td>

              {/* TWV Cell with exact color specification */}
              <td
                className={`relative p-0`}
                style={{
                  width: twvColWidth,
                  minWidth: twvColWidth,
                  maxWidth: twvColWidth,
                  height: cellHeight,
                  border: "1px solid #e5e7eb",
                  borderTop: "none",
                  borderLeft: "none",
                }}
              >
                <div
                  className={`absolute inset-0 flex items-center justify-center ${isMobile ? "text-xs" : "text-sm"} font-medium`}
                  style={getTWVColor(team.twv)}
                >
                  {team.twv > 0
                    ? `+${team.twv.toFixed(1)}`
                    : team.twv.toFixed(1)}
                </div>
              </td>

              {/* Actual Record Cell */}
              <td
                className={`bg-white text-center ${isMobile ? "text-xs" : "text-sm"}`}
                style={{
                  width: recordColWidth,
                  minWidth: recordColWidth,
                  maxWidth: recordColWidth,
                  height: cellHeight,
                  border: "1px solid #e5e7eb",
                  borderTop: "none",
                  borderLeft: "none",
                  padding: "6px 4px",
                }}
              >
                {team.actual_record}
              </td>

              {/* Expected Record Cell */}
              <td
                className={`bg-white text-center ${isMobile ? "text-xs" : "text-sm"}`}
                style={{
                  width: recordColWidth,
                  minWidth: recordColWidth,
                  maxWidth: recordColWidth,
                  height: cellHeight,
                  border: "1px solid #e5e7eb",
                  borderTop: "none",
                  borderLeft: "none",
                  padding: "6px 4px",
                }}
              >
                {team.expected_record}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default memo(TWVTable);
