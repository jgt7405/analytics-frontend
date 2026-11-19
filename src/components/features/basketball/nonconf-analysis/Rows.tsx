"use client";

// A conference row (with the expand toggle) and a team row. The caller
// passes each column group's values (data.ts builds them for each table).

import TeamLogo from "@/components/ui/TeamLogo";
import { logger } from "@/lib/logger";
import { ChevronDown, ChevronRight } from "lucide-react";
import Image from "next/image";
import type { CSSProperties } from "react";
import SectionCells from "./SectionCells";
import type { Conference, SectionValues, TableSizes, Team } from "./types";

/** The name cell's content row, sized to the column so long names ellipsize. */
function nameCellInner(colWidth: number, paddingLeft: number): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    width: colWidth - paddingLeft - 4,
    overflow: "hidden",
  };
}

interface ConferenceRowProps {
  row: Pick<Conference, "team_conf" | "conf_logo_url">;
  isExpanded: boolean;
  onToggle: () => void;
  sections: readonly SectionValues[];
  sizes: TableSizes;
}

export function ConferenceRow({ row, isExpanded, onToggle, sections, sizes }: ConferenceRowProps) {
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
          left: -1, // as in the header: covers the collapsed left border too
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
          // 2px over the expand column, so no sliver of scrolled cells shows between them
          left: expandColWidth - 2,
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
        }}
      >
        {/* Flex lives on this div, not the <td>: a display:flex cell stops
            being a table cell, and Safari then doesn't keep it sticky. */}
        <div style={nameCellInner(confColWidth, isMobile ? 4 : 8)}>
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
        </div>
      </td>

      {sections.map(({ key, ...section }) => (
        <SectionCells key={key} {...section} isTeamRow={false} sizes={sizes} />
      ))}
    </tr>
  );
}

interface TeamRowProps {
  team: Pick<Team, "team_name" | "logo_url">;
  sections: readonly SectionValues[];
  sizes: TableSizes;
}

export function TeamRow({ team, sections, sizes }: TeamRowProps) {
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
          left: -1, // as in the header: covers the collapsed left border too
          zIndex: 20,
          overflow: "hidden",
          backgroundColor: "#ffffff",
          border: "1px solid var(--border-color)",
          borderTop: "none",
          boxShadow: "inset -2px 0 0 0 var(--border-color)",
        }}
      ></td>
      <td
        style={{
          width: confColWidth,
          minWidth: confColWidth,
          height: cellHeight,
          position: "sticky",
          // 2px over the expand column, so no sliver of scrolled cells shows between them
          left: expandColWidth - 2,
          zIndex: 20,
          overflow: "hidden",
          backgroundColor: "#ffffff",
          border: "1px solid var(--border-color)",
          borderTop: "none",
          borderLeft: "none",
          boxShadow: "inset -2px 0 0 0 var(--border-color)",
          paddingLeft: isMobile ? "4px" : "28px",
          paddingRight: "4px",
          textAlign: "left",
          verticalAlign: "middle",
          fontSize: isMobile ? "0.75rem" : "0.875rem",
        }}
      >
        <div style={nameCellInner(confColWidth, isMobile ? 4 : 28)}>
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
        </div>
      </td>

      {sections.map(({ key, ...section }) => (
        <SectionCells key={key} {...section} isTeamRow sizes={sizes} />
      ))}
    </tr>
  );
}
