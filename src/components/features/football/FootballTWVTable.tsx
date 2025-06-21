// src/components/features/football/FootballTWVTable.tsx
"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { cn } from "@/lib/utils";
import tableStyles from "@/styles/components/tables.module.css";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo } from "react";

interface FootballTWVTeam {
  rank: number;
  team_name: string;
  team_id?: string;
  logo_url: string;
  twv: number;
  actual_record: string;
  expected_record: string;
}

interface FootballTWVTableProps {
  twvData: FootballTWVTeam[];
  className?: string;
}

function FootballTWVTable({ twvData, className }: FootballTWVTableProps) {
  const { isMobile } = useResponsive();
  const router = useRouter();

  const navigateToTeam = useCallback(
    (teamName: string) => {
      router.push(`/football/team/${encodeURIComponent(teamName)}`);
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

  // Color function for TWV values - same as basketball
  const getTWVColor = useCallback(
    (twv: number) => {
      const blue = [24, 98, 123]; // Dark blue for positive values
      const white = [255, 255, 255]; // White baseline
      const yellow = [255, 230, 113]; // Yellow for negative values

      let r: number, g: number, b: number;

      if (twv > 0) {
        const ratio = Math.min(Math.abs(twv / maxTWV), 1);
        r = Math.round(white[0] + (blue[0] - white[0]) * ratio);
        g = Math.round(white[1] + (blue[1] - white[1]) * ratio);
        b = Math.round(white[2] + (blue[2] - white[2]) * ratio);
      } else if (twv < 0) {
        const ratio = Math.min(Math.abs(twv / minTWV), 1);
        r = Math.round(white[0] + (yellow[0] - white[0]) * ratio);
        g = Math.round(white[1] + (yellow[1] - white[1]) * ratio);
        b = Math.round(white[2] + (yellow[2] - white[2]) * ratio);
      } else {
        [r, g, b] = white;
      }

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

  // Responsive dimensions
  const rankColWidth = isMobile ? "40px" : "50px";
  const logoColWidth = isMobile ? "35px" : "45px";
  const teamColWidth = isMobile ? "120px" : "180px";
  const twvColWidth = isMobile ? "60px" : "80px";
  const recordColWidth = isMobile ? "70px" : "90px";

  // Logo size as number (fixed the TypeScript error)
  const logoSize = isMobile ? 20 : 28;

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className={cn(tableStyles.table, "w-full")}>
        <thead>
          <tr className="bg-gray-100">
            <th
              className="text-center font-semibold p-2"
              style={{ width: rankColWidth, minWidth: rankColWidth }}
            >
              Rank
            </th>
            <th
              className="text-center font-semibold p-2"
              style={{ width: logoColWidth, minWidth: logoColWidth }}
            >
              {/* Logo column */}
            </th>
            <th
              className="text-left font-semibold p-2"
              style={{ width: teamColWidth, minWidth: teamColWidth }}
            >
              Team
            </th>
            <th
              className="text-center font-semibold p-2"
              style={{ width: twvColWidth, minWidth: twvColWidth }}
            >
              TWV
            </th>
            <th
              className="text-center font-semibold p-2"
              style={{ width: recordColWidth, minWidth: recordColWidth }}
            >
              Actual
            </th>
            <th
              className="text-center font-semibold p-2"
              style={{ width: recordColWidth, minWidth: recordColWidth }}
            >
              Expected
            </th>
          </tr>
        </thead>
        <tbody>
          {twvData.map((team) => (
            <tr
              key={team.team_name}
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => navigateToTeam(team.team_name)}
            >
              <td
                className="text-center p-2"
                style={{ width: rankColWidth, minWidth: rankColWidth }}
              >
                {team.rank}
              </td>
              <td
                className="text-center p-2"
                style={{ width: logoColWidth, minWidth: logoColWidth }}
              >
                <TeamLogo
                  logoUrl={team.logo_url}
                  teamName={team.team_name}
                  size={logoSize}
                />
              </td>
              <td
                className="text-left p-2 font-medium"
                style={{ width: teamColWidth, minWidth: teamColWidth }}
              >
                {team.team_name}
              </td>
              <td
                className="text-center p-2 font-bold"
                style={{
                  width: twvColWidth,
                  minWidth: twvColWidth,
                  ...getTWVColor(team.twv),
                }}
              >
                {team.twv >= 0 ? "+" : ""}
                {team.twv.toFixed(1)}
              </td>
              <td
                className="text-center p-2"
                style={{ width: recordColWidth, minWidth: recordColWidth }}
              >
                {team.actual_record}
              </td>
              <td
                className="text-center p-2"
                style={{ width: recordColWidth, minWidth: recordColWidth }}
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

export default memo(FootballTWVTable);
