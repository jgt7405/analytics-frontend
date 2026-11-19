"use client";

// Performance vs Power 5 Conferences (basketball conference data page): each
// conference's record, win %, expected win % and TWV against each power
// conference and against all of them combined, expandable to its teams,
// sortable by any column. Power conferences are rows too, so they can be
// compared with each other. Like the table above, games between two teams of
// the same conference are left out unless the Include option is chosen (then
// a power conference's own column fills in). Uses the non-conference
// analysis data's `vs_power` breakdowns (data.ts).

import TableActionButtons from "@/components/common/TableActionButtons";
import {
  useBasketballConfData,
  useBasketballNonconfWithSameConf,
} from "@/hooks/useBasketballConfData";
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
import TableOptions from "./TableOptions";
import type {
  BasketballConfDataResponseWithNonconf,
  NonconfResponse,
  SortOrder,
  TableSizes,
} from "./types";

/**
 * A power conference's logo in the column header, sized so every logo
 * covers about the same area: a wide one (ACC) is drawn wider and shorter, a
 * round one (SEC) narrower and taller, within a maximum width and height.
 * Fitting them all to one box instead made Big 12 twice the size of ACC.
 */
function HeaderLogo({ src, name, isMobile }: { src: string; name: string; isMobile: boolean }) {
  // Width / height of the image, known once it loads (assume 2:1 until then)
  const [aspect, setAspect] = useState(2);
  const area = isMobile ? 420 : 760;
  const maxWidth = isMobile ? 40 : 54;
  const maxHeight = isMobile ? 22 : 28;
  const scale = Math.min(1, maxWidth / Math.sqrt(area * aspect), maxHeight / Math.sqrt(area / aspect));
  const width = Math.round(Math.sqrt(area * aspect) * scale);
  const height = Math.round(Math.sqrt(area / aspect) * scale);
  return (
    <span className="inline-flex items-center justify-center" title={name}>
      <Image
        src={src}
        alt={name}
        width={width}
        height={height}
        style={{ width, height, objectFit: "contain" }}
        // The image export squares header logos to 24px; these keep their size
        data-screenshot-keep-size="true"
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalWidth && img.naturalHeight) setAspect(img.naturalWidth / img.naturalHeight);
        }}
        onError={() => logger.warn(`Failed to load conference logo: ${src}`)}
      />
    </span>
  );
}

interface PowerConfTableProps {
  /** Conferences to show (the page's top-12 / all filter); all when omitted. */
  conferences?: readonly string[];
  /** Count games between two teams of the same conference (left out by default). */
  includeSameConf?: boolean;
  /** Show the Exp Win % and TWV 50 columns (default true). */
  showTwv?: boolean;
}

function PowerConfTable({ conferences, includeSameConf = false, showTwv = true }: PowerConfTableProps) {
  const { isMobile } = useResponsive();
  const { data } = useBasketballConfData();
  const withSameConf = useBasketballNonconfWithSameConf(undefined, includeSameConf);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const { opps, rows, logos } = useMemo(() => {
    const all =
      (includeSameConf
        ? (withSameConf.data as NonconfResponse | undefined)?.data
        : (data as BasketballConfDataResponseWithNonconf | undefined)?.nonconfData?.data) ?? [];
    const shown = conferences ? new Set(conferences) : undefined;
    return {
      opps: powerConferences(all),
      rows: all.filter((row) => !shown || shown.has(row.team_conf)),
      logos: new Map(all.map((row) => [row.team_conf, row.conf_logo_url])),
    };
  }, [data, withSameConf.data, includeSameConf, conferences]);

  // One column group per power conference, then the total against all of them
  const columns = useMemo(() => [...opps, POWER_TOTAL], [opps]);
  const ranges = useMemo(() => computePowerRanges(rows, columns), [rows, columns]);

  if (includeSameConf && withSameConf.isLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }
  if (includeSameConf && withSameConf.error) {
    return (
      <div className="p-8 text-center text-red-600">Error: {withSameConf.error.message}</div>
    );
  }
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
      // Logo only (its name is the alt text and hover title); the name
      // only when there is no logo
      title: logo ? <HeaderLogo src={logo} name={opp} isMobile={isMobile} /> : opp,
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
              showTwv={showTwv}
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
                  showTwv={showTwv}
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
                        showTwv={showTwv}
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
  // Off by default, as in the non-conference table above (its own setting)
  const [includeSameConf, setIncludeSameConf] = useState(false);
  const [showTwv, setShowTwv] = useState(true);
  return (
    <div className="mb-8">
      <h3 className={titleClassName}>Performance vs Power 5 Conferences</h3>
      <TableOptions
        includeSameConf={includeSameConf}
        onIncludeSameConfChange={setIncludeSameConf}
        showTwv={showTwv}
        onShowTwvChange={setShowTwv}
      />
      <div className="power-conf-table">
        <MemoPowerConfTable
          conferences={conferences}
          includeSameConf={includeSameConf}
          showTwv={showTwv}
        />
      </div>
      <div className="mt-6">
        <div className="flex flex-row items-start gap-4">
          <div className="flex-1 text-xs text-gray-600 dark:text-gray-300 max-w-none pr-4">
            <div className="power-conf-explainer" style={{ lineHeight: "1.3" }}>
              <div>
                Non-conference results of each conference&apos;s teams against each Power 5
                conference, and against all five combined. Expanded conferences list only teams
                that have played a Power 5 opponent.
              </div>
              {showTwv && (
                <div style={{ marginTop: "6px" }}>
                  Exp Win % is the projected win % of the #50 rated team vs the same games; TWV
                  50 is the # of wins above or below that. For conferences, TWV 50 is the
                  average for the conference&apos;s teams.
                </div>
              )}
              <div style={{ marginTop: "6px" }}>
                {includeSameConf
                  ? "Includes games vs same-conference opponents, so a Power 5 conference's own column shows its non-conference games against its own members."
                  : "Excludes games vs same-conference opponents."}
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
