// src/components/features/football/FootballConfDataTable.tsx
"use client";

import { useResponsive } from "@/hooks/useResponsive";
import { getCellColor } from "@/lib/color-utils";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { memo, ReactNode, useMemo } from "react";
import styles from "./FootballConfDataTable.module.css";

interface FootballConferenceData {
  conference_name: string;
  logo_url: string;
  average_bids: number;
  bid_distribution: Record<string, number>;
}

interface FootballConfDataTableProps {
  confData: FootballConferenceData[];
  className?: string;
  /** Optional element (e.g. conference selector) rendered on the right of the title row. */
  headerRight?: ReactNode;
}

function FootballConfDataTable({
  confData,
  className,
  headerRight,
}: FootballConfDataTableProps) {
  const { isMobile } = useResponsive();

  const { maxBids, displayData } = useMemo(() => {
    // Filter out FCS and sort by average bids (highest first)
    const filtered = confData
      .filter((conf) => conf.conference_name !== "FCS")
      .sort((a, b) => b.average_bids - a.average_bids);

    // Find max bids across filtered conferences
    let max = 0;
    filtered.forEach((conf) => {
      if (conf.bid_distribution) {
        const keys = Object.keys(conf.bid_distribution);
        if (keys.length > 0) {
          const maxKey = Math.max(...keys.map(Number));
          max = Math.max(max, maxKey);
        }
      }
    });

    return { maxBids: max, displayData: filtered };
  }, [confData]);

  // Generate bid columns from 0 to maxBids
  const bidColumns = Array.from({ length: maxBids + 1 }, (_, i) => i);

  // Calculate percentage from bid distribution
  const calculatePercentage = (
    distribution: Record<string, number>,
    bidCount: number
  ) => {
    if (!distribution) return 0;
    const totalScenarios = Object.values(distribution).reduce(
      (sum, count) => sum + count,
      0
    );
    const count = distribution[bidCount] || 0;
    return totalScenarios > 0 ? (count / totalScenarios) * 100 : 0;
  };

  // Responsive dimensions
  const confColWidth = isMobile ? 120 : 180;
  const bidColWidth = isMobile ? 30 : 40;
  const avgColWidth = isMobile ? 40 : 50;
  const cellHeight = isMobile ? 24 : 28;
  const headerHeight = isMobile ? 40 : 48;

  if (!confData || confData.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-300">
        No conference data available
      </div>
    );
  }

  return (
    <div className={cn(styles.card, "conf-data-table", className)}>
      <div className={styles.cardHeader}>
        <div className={styles.titleGroup} data-screenshot-hide="true">
          <h2 className={styles.title}>Conference CFP Bid Projections</h2>
        </div>
        {headerRight && <div data-screenshot-hide="true">{headerRight}</div>}
      </div>

      <div className={styles.scrollViewport}>
        <table className={styles.table}>
          <thead>
            <tr>
              {/* Conference Column */}
              <th
                className={cn(
                  styles.headerCell,
                  styles.stickyCell,
                  isMobile ? "text-xs" : "text-sm",
                )}
                style={{
                  width: confColWidth,
                  minWidth: confColWidth,
                  maxWidth: confColWidth,
                  height: headerHeight,
                  textAlign: "left",
                  paddingLeft: "0.5rem",
                  left: 0,
                }}
              >
                Conference
              </th>

              {/* Bid Number Columns */}
              {bidColumns.map((bid) => (
                <th
                  key={`bid-${bid}`}
                  className={cn(styles.headerCell, isMobile ? "text-xs" : "text-sm")}
                  style={{
                    width: bidColWidth,
                    minWidth: bidColWidth,
                    maxWidth: bidColWidth,
                    height: headerHeight,
                  }}
                >
                  {bid}
                </th>
              ))}

              {/* Average Column */}
              <th
                className={cn(styles.headerCell, isMobile ? "text-xs" : "text-sm")}
                style={{
                  width: avgColWidth,
                  minWidth: avgColWidth,
                  maxWidth: avgColWidth,
                  height: headerHeight,
                }}
              >
                Avg
              </th>
            </tr>
          </thead>
          <tbody>
            {displayData.map((conf, index) => (
              <tr key={`${conf.conference_name}-${index}`}>
                {/* Conference Cell */}
                <td
                  className={cn(
                    styles.confCell,
                    styles.stickyBodyCell,
                    isMobile ? "text-xs" : "text-sm",
                  )}
                  style={{
                    width: confColWidth,
                    minWidth: confColWidth,
                    maxWidth: confColWidth,
                    height: cellHeight,
                    paddingLeft: "0.5rem",
                    left: 0,
                  }}
                >
                  <div className="flex items-center gap-2">
                    {conf.logo_url && (
                      <div className="flex items-center justify-center bg-white rounded-full border-2 border-white flex-shrink-0" style={{ width: 36, height: 36 }}>
                        <Image
                          src={conf.logo_url}
                          alt={`${conf.conference_name} logo`}
                          width={28}
                          height={28}
                          className="object-contain"
                        />
                      </div>
                    )}
                    <span className="truncate text-[0.88rem] font-semibold">
                      {conf.conference_name}
                    </span>
                  </div>
                </td>

                {/* Bid Cells */}
                {bidColumns.map((bid) => {
                  const percentage = calculatePercentage(
                    conf.bid_distribution,
                    bid
                  );

                  return (
                    <td
                      key={`${conf.conference_name}-bid-${bid}`}
                      style={{
                        height: cellHeight,
                        width: bidColWidth,
                        minWidth: bidColWidth,
                        maxWidth: bidColWidth,
                        padding: 0,
                      }}
                    >
                      <div
                        className={cn(styles.heatTile, isMobile ? "text-xs" : "text-sm")}
                        style={getCellColor(percentage)}
                      >
                        {percentage > 0 ? `${Math.round(percentage)}%` : ""}
                      </div>
                    </td>
                  );
                })}

                {/* Average Cell */}
                <td
                  className={cn(styles.avgCell, isMobile ? "text-xs" : "text-sm")}
                  style={{
                    height: cellHeight,
                    width: avgColWidth,
                    minWidth: avgColWidth,
                    maxWidth: avgColWidth,
                  }}
                >
                  {conf.average_bids.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default memo(FootballConfDataTable);
