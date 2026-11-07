"use client";

// A conference row (with the expand toggle; TWV per team) and a team row.

import TeamLogo from "@/components/ui/TeamLogo";
import { logger } from "@/lib/logger";
import { ChevronDown, ChevronRight } from "lucide-react";
import Image from "next/image";
import { COLUMNS, conferenceTwv, twvColor, winPctColor } from "./data";
import SectionCells from "./SectionCells";
import type { ColorRanges, Conference, TableSizes, Team } from "./types";

interface ConferenceRowProps {
  row: Conference;
  isExpanded: boolean;
  onToggle: () => void;
  ranges: ColorRanges;
  sizes: TableSizes;
}

export function ConferenceRow({ row, isExpanded, onToggle, ranges, sizes }: ConferenceRowProps) {
  const { isMobile, expandColWidth, confColWidth, cellHeight } = sizes;
  return (
    <tr
      style={{
        backgroundColor: "#ffffff",
        borderBottom: "1px solid var(--border-color)",
      }}
    >
      {/* Expand Carrot */}
      <td
        style={{
          width: expandColWidth,
          minWidth: expandColWidth,
          height: cellHeight,
          position: "sticky",
          left: 0,
          zIndex: 21,
          overflow: "hidden",
          backgroundColor: "#ffffff",
          border: "1px solid var(--border-color)",
          borderTop: "none",
          boxShadow: "inset -2px 0 0 0 var(--border-color)",
          textAlign: "center",
          verticalAlign: "middle",
          cursor: "pointer",
        }}
        onClick={onToggle}
      >
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </td>
      {/* Conference Logo with Name */}
      <td
        style={{
          width: confColWidth,
          minWidth: confColWidth,
          height: cellHeight,
          position: "sticky",
          left: expandColWidth,
          zIndex: 21,
          overflow: "hidden",
          backgroundColor: "#ffffff",
          border: "1px solid var(--border-color)",
          borderTop: "none",
          borderLeft: "none",
          boxShadow: "inset -2px 0 0 0 var(--border-color)",
          paddingLeft: isMobile ? "4px" : "8px",
          paddingRight: "4px",
          textAlign: "left",
          verticalAlign: "middle",
          fontSize: isMobile ? "0.75rem" : "0.875rem",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        {row.conf_logo_url && (
          <Image
            src={row.conf_logo_url}
            alt={row.team_conf}
            width={isMobile ? 24 : 32}
            height={isMobile ? 16 : 20}
            style={{
              maxWidth: "100%",
              height: "auto",
              objectFit: "contain",
              flexShrink: 0,
            }}
            onError={(e) => {
              logger.warn(`Failed to load conference logo: ${row.conf_logo_url}`);
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        {!isMobile && (
          <span
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {row.team_conf}
          </span>
        )}
      </td>

      {COLUMNS.map((column) => {
        const { twv, winPct } = ranges.conf[column];
        const perTeamTwv = conferenceTwv(row, column);
        return (
          <SectionCells
            key={column}
            record={row[`${column}_record`]}
            winPct={row[`${column}_win_pct`]}
            twv={perTeamTwv}
            expectedTwv={row[`${column}_twv_50`]}
            winPctColors={winPctColor(row[`${column}_win_pct`], winPct.min, winPct.max)}
            twvColors={twvColor(perTeamTwv, twv.min, twv.max)}
            isTeamRow={false}
            sizes={sizes}
          />
        );
      })}
    </tr>
  );
}

interface TeamRowProps {
  team: Team;
  ranges: ColorRanges;
  sizes: TableSizes;
}

export function TeamRow({ team, ranges, sizes }: TeamRowProps) {
  const { isMobile, expandColWidth, confColWidth, cellHeight } = sizes;
  return (
    <tr
      style={{
        backgroundColor: "#ffffff",
        borderBottom: "1px solid var(--border-color)",
      }}
    >
      <td
        style={{
          width: expandColWidth,
          minWidth: expandColWidth,
          height: cellHeight,
          position: "sticky",
          left: 0,
          zIndex: 20,
          overflow: "hidden",
          backgroundColor: "#ffffff",
          border: "1px solid var(--border-color)",
          borderTop: "none",
          borderRight: "2px solid var(--border-color)",
        }}
      ></td>
      <td
        style={{
          width: confColWidth,
          minWidth: confColWidth,
          height: cellHeight,
          position: "sticky",
          left: expandColWidth,
          zIndex: 20,
          overflow: "hidden",
          backgroundColor: "#ffffff",
          border: "1px solid var(--border-color)",
          borderTop: "none",
          borderLeft: "none",
          borderRight: "2px solid var(--border-color)",
          paddingLeft: isMobile ? "4px" : "28px",
          paddingRight: "4px",
          textAlign: "left",
          verticalAlign: "middle",
          fontSize: isMobile ? "0.75rem" : "0.875rem",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        {team.logo_url && (
          <TeamLogo logoUrl={team.logo_url} teamName={team.team_name} size={isMobile ? 16 : 20} />
        )}
        {!isMobile && (
          <span
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {team.team_name}
          </span>
        )}
      </td>

      {COLUMNS.map((column) => {
        const { twv, winPct } = ranges.team[column];
        return (
          <SectionCells
            key={column}
            record={team[`${column}_record`]}
            winPct={team[`${column}_win_pct`]}
            twv={team[`${column}_twv_50`]}
            expectedTwv={team[`${column}_twv_50`]}
            winPctColors={winPctColor(team[`${column}_win_pct`], winPct.min, winPct.max)}
            twvColors={twvColor(team[`${column}_twv_50`], twv.min, twv.max)}
            isTeamRow
            sizes={sizes}
          />
        );
      })}
    </tr>
  );
}
