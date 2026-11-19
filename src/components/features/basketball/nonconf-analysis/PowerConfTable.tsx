"use client";

// Performance vs Power 5 Conferences (basketball conference data page): each
// conference's record, win %, expected win % and TWV against each power
// conference and against all of them combined, expandable to its teams,
// sortable by any column. Power conferences are rows too, so they can be
// compared with each other (their own column is always a dash). Uses the
// non-conference analysis data's `vs_power` breakdowns (data.ts).

import TableActionButtons from "@/components/common/TableActionButtons";
import { useBasketballConfData } from "@/hooks/useBasketballConfData";
import { useResponsive } from "@/hooks/useResponsive";
import { logger } from "@/lib/logger";
import Image from "next/image";
import { memo, useMemo, useState } from "react";
import {
  computePowerRanges,
  POWER_TOTAL,
  powerConferences,
  powerConferenceSections,
  powerTeamSections,
  sortPowerConferences,
  sortPowerTeams,
} from "./data";
import HeaderRows, { type HeaderGroup } from "./HeaderRows";
import { CARD_CLASS } from "./index";
import { ConferenceRow, TeamRow } from "./Rows";
import type { BasketballConfDataResponseWithNonconf, SortOrder, TableSizes } from "./types";

interface PowerConfTableProps {
  /** Conferences to show (the page's top-12 / all filter); all when omitted. */
  conferences?: readonly string[];
}

function PowerConfTable({ conferences }: PowerConfTableProps) {
  const { isMobile } = useResponsive();
  const { data } = useBasketballConfData();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const { opps, rows, logos } = useMemo(() => {
    const all = (data as BasketballConfDataResponseWithNonconf | undefined)?.nonconfData?.data ?? [];
    const shown = conferences ? new Set(conferences) : undefined;
    return {
      opps: powerConferences(all),
      rows: all.filter((row) => !shown || shown.has(row.team_conf)),
      logos: new Map(all.map((row) => [row.team_conf, row.conf_logo_url])),
    };
  }, [data, conferences]);

  // One column group per power conference, then the total against all of them
  const columns = useMemo(() => [...opps, POWER_TOTAL], [opps]);
  const ranges = useMemo(() => computePowerRanges(rows, columns), [rows, columns]);

  if (opps.length === 0 || rows.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-300">
        No games vs power conferences yet
      </div>
    );
  }

  // Narrower than the table above, so all six column groups fit a desktop
  // screen without scrolling sideways.
  const sizes: TableSizes = {
    isMobile,
    expandColWidth: 32,
    confColWidth: isMobile ? 50 : 140,
    dataColWidth: isMobile ? 50 : 44,
    cellHeight: isMobile ? 32 : 36,
    headerHeight: isMobile ? 40 : 48,
  };

  const groups: HeaderGroup[] = opps.map((opp): HeaderGroup => {
    const logo = logos.get(opp);
    return {
      key: opp,
      title: (
        <span className="inline-flex items-center justify-center gap-1.5">
          {logo && (
            <Image
              src={logo}
              alt=""
              width={isMobile ? 24 : 28}
              height={isMobile ? 16 : 18}
              style={{ height: "auto", objectFit: "contain" }}
              onError={(e) => {
                logger.warn(`Failed to load conference logo: ${logo}`);
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          {opp}
        </span>
      ),
    };
  });
  groups.push({ key: POWER_TOTAL, title: "Total vs Power 5" });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const toggle = (conference: string) => {
    const next = new Set(expanded);
    if (next.has(conference)) next.delete(conference);
    else next.add(conference);
    setExpanded(next);
  };

  return (
    <div className={`${CARD_CLASS} mb-3 p-2`}>
      <div
        role="region"
        aria-label="Performance vs Power 5 conferences. Scroll to see every column."
        tabIndex={0}
        className="focus-visible:outline focus-visible:outline-[3px] focus-visible:-outline-offset-[3px] focus-visible:outline-[rgb(14_116_144/0.35)]"
        style={{
          overflowX: "auto",
          overflowY: "auto",
          maxHeight: "80vh",
          position: "relative",
          borderRadius: "1rem",
        }}
      >
        <table
          style={{
            borderCollapse: "collapse",
            width: "max-content",
            borderSpacing: 0,
            color: "#111827",
          }}
        >
          <thead>
            <HeaderRows
              sizes={sizes}
              groups={groups}
              onSort={handleSort}
              sortIndicator={(field) => (sortField === field ? (sortOrder === "desc" ? " ↓" : " ↑") : null)}
            />
          </thead>
          <tbody>
            {sortPowerConferences(rows, sortField, sortOrder).map((row) => {
              const isExpanded = expanded.has(row.team_conf);
              return [
                <ConferenceRow
                  key={`conf-${row.team_conf}`}
                  row={row}
                  isExpanded={isExpanded}
                  onToggle={() => toggle(row.team_conf)}
                  sections={powerConferenceSections(row, columns, ranges)}
                  sizes={sizes}
                />,
                ...(isExpanded
                  ? sortPowerTeams(
                      // only teams that have played a power conference
                      (row.teams ?? []).filter((team) => (team.vs_power?.length ?? 0) > 0),
                      sortField,
                      sortOrder,
                    ).map((team) => (
                      <TeamRow
                        key={`team-${row.team_conf}-${team.team_name}`}
                        team={team}
                        sections={powerTeamSections(team, columns, ranges)}
                        sizes={sizes}
                      />
                    ))
                  : []),
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const MemoPowerConfTable = memo(PowerConfTable);

interface PowerConfSectionProps extends PowerConfTableProps {
  titleClassName: string;
}

/** The page section: title, table, explainer and export buttons. */
export default function PowerConfSection({ conferences, titleClassName }: PowerConfSectionProps) {
  const { isMobile } = useResponsive();
  return (
    <div className="mb-8">
      <h3 className={titleClassName}>Performance vs Power 5 Conferences</h3>
      <div className="power-conf-table">
        <MemoPowerConfTable conferences={conferences} />
      </div>
      <div className="mt-6">
        <div className="flex flex-row items-start gap-4">
          <div className="flex-1 text-xs text-gray-600 dark:text-gray-300 max-w-none pr-4">
            <div className="power-conf-explainer" style={{ lineHeight: "1.3" }}>
              <div>
                Non-conference results of each conference&apos;s teams against each Power 5
                conference, and against all five combined. A dash means no games against that
                conference yet; a Power 5 conference&apos;s own column is always a dash. Expanded
                conferences list only teams that have played a Power 5 opponent.
              </div>
              <div style={{ marginTop: "6px" }}>
                Exp Win % and TWV 50 are measured against the #50 rated team, as above. For
                conferences, TWV 50 is the average for the conference&apos;s teams.
              </div>
            </div>
          </div>
          <div className={`flex-shrink-0 ${isMobile ? "w-1/3 pr-2" : "w-auto mr-4"}`}>
            <TableActionButtons
              contentSelector=".power-conf-table"
              pageName="power-conf-performance"
              pageTitle="Performance vs Power 5 Conferences"
              shareTitle="Performance vs Power 5 Conferences"
              explainerSelector=".power-conf-explainer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
