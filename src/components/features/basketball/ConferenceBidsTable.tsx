"use client";

import { useResponsive } from "@/hooks/useResponsive";
import { getCellColor } from "@/lib/color-utils";
import { cn } from "@/lib/utils";
import tableStyles from "@/styles/components/tables.module.css";
import Image from "next/image";
import { memo, useMemo } from "react";

interface ConferenceData {
  conference_name: string;
  logo_url?: string;
  average_bids: number;
  bid_distribution: Record<string, number>;
}

interface ConferenceBidsTableProps {
  confData: ConferenceData[];
  className?: string;
}

function ConferenceBidsTable({
  confData,
  className,
}: ConferenceBidsTableProps) {
  const { isMobile } = useResponsive();

  const maxBids = useMemo(() => {
    // Find max bids across all conferences
    let max = 0;
    confData.forEach((conf) => {
      if (conf.bid_distribution) {
        const keys = Object.keys(conf.bid_distribution);
        if (keys.length > 0) {
          const maxKey = Math.max(...keys.map(Number));
          max = Math.max(max, maxKey);
        }
      }
    });
    return max;
  }, [confData]);

  // Generate bid columns starting from 1
  const bidColumns = Array.from({ length: maxBids }, (_, i) => i + 1);

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

  const tableClassName = cn(
    tableStyles.tableContainer,
    "conf-bids-table",
    className
  );

  if (!confData || confData.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No conference data available
      </div>
    );
  }

  return (
    <div
      className={`${tableClassName} relative overflow-x-auto max-h-[80vh] overflow-y-auto`}
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
            {/* Conference Column */}
            <th
              className={`sticky left-0 z-30 bg-gray-50 text-left font-normal px-2 ${isMobile ? "text-xs" : "text-sm"}`}
              style={{
                width: confColWidth,
                minWidth: confColWidth,
                maxWidth: confColWidth,
                height: headerHeight,
                position: "sticky",
                top: 0,
                left: 0,
                border: "1px solid #e5e7eb",
                borderRight: "1px solid #e5e7eb",
              }}
            >
              Conference
            </th>

            {/* Bid Number Columns */}
            {bidColumns.map((bid) => (
              <th
                key={`bid-${bid}`}
                className={`sticky bg-gray-50 text-center font-normal z-20 ${isMobile ? "text-xs" : "text-sm"}`}
                style={{
                  width: bidColWidth,
                  minWidth: bidColWidth,
                  maxWidth: bidColWidth,
                  height: headerHeight,
                  position: "sticky",
                  top: 0,
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                }}
              >
                {bid}
              </th>
            ))}

            {/* Average Column */}
            <th
              className={`sticky bg-gray-50 text-center font-normal z-20 ${isMobile ? "text-xs" : "text-sm"}`}
              style={{
                width: avgColWidth,
                minWidth: avgColWidth,
                maxWidth: avgColWidth,
                height: headerHeight,
                position: "sticky",
                top: 0,
                border: "1px solid #e5e7eb",
                borderLeft: "none",
              }}
            >
              Avg
            </th>
          </tr>
        </thead>
        <tbody>
          {confData.map((conf, index) => (
            <tr key={`${conf.conference_name}-${index}`}>
              {/* Conference Cell */}
              <td
                className={`sticky left-0 z-20 bg-white text-left px-2 ${isMobile ? "text-xs" : "text-sm"}`}
                style={{
                  width: confColWidth,
                  minWidth: confColWidth,
                  maxWidth: confColWidth,
                  height: cellHeight,
                  position: "sticky",
                  left: 0,
                  border: "1px solid #e5e7eb",
                  borderTop: "none",
                  borderRight: "1px solid #e5e7eb",
                }}
              >
                <div className="flex items-center gap-2">
                  {conf.logo_url && (
                    <Image
                      src={conf.logo_url}
                      alt={`${conf.conference_name} logo`}
                      width={isMobile ? 20 : 24}
                      height={isMobile ? 20 : 24}
                      className="object-contain flex-shrink-0"
                    />
                  )}
                  <span className="truncate">{conf.conference_name}</span>
                </div>
              </td>

              {/* Bid Cells */}
              {bidColumns.map((bid) => {
                const percentage = calculatePercentage(
                  conf.bid_distribution,
                  bid
                );
                const colorStyle = getCellColor(percentage);

                return (
                  <td
                    key={`${conf.conference_name}-bid-${bid}`}
                    className="relative p-0"
                    style={{
                      height: cellHeight,
                      width: bidColWidth,
                      minWidth: bidColWidth,
                      maxWidth: bidColWidth,
                      border: "1px solid #e5e7eb",
                      borderTop: "none",
                      borderLeft: "none",
                      backgroundColor: colorStyle.backgroundColor,
                      color: colorStyle.color,
                    }}
                  >
                    <div
                      className={`absolute inset-0 flex items-center justify-center ${isMobile ? "text-xs" : "text-sm"}`}
                    >
                      {percentage > 0 ? `${Math.round(percentage)}%` : ""}
                    </div>
                  </td>
                );
              })}

              {/* Average Cell */}
              <td
                className={`bg-white text-center ${isMobile ? "text-xs" : "text-sm"}`}
                style={{
                  height: cellHeight,
                  width: avgColWidth,
                  minWidth: avgColWidth,
                  maxWidth: avgColWidth,
                  border: "1px solid #e5e7eb",
                  borderTop: "none",
                  borderLeft: "none",
                }}
              >
                {conf.average_bids.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default memo(ConferenceBidsTable);
