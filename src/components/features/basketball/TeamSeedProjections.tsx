"use client";

import { useResponsive } from "@/hooks/useResponsive";
import { getCellColor } from "@/lib/color-utils";
import { cn } from "@/lib/utils";
import Image from "next/image";
import styles from "./TeamSeedProjections.module.css";

// Define proper types
interface WinSeedCountEntry {
  Wins: number;
  Seed?: string;
  Tournament_Status?: string;
  Count: number;
  Auto_Bid_Pct?: number;
  At_Large_Pct?: number;
}

interface TeamSeedProjectionsProps {
  winSeedCounts: WinSeedCountEntry[];
  logoUrl?: string;
}

interface DistributionData {
  [key: string]: number;
}

interface BidCategoryDistribution {
  "Auto Bid": number;
  "At Large": number;
}

interface RawCounts {
  seedDistribution: DistributionData;
  statusDistribution: DistributionData;
  bidCategoryDistribution: BidCategoryDistribution;
}

interface WinRowData {
  seedDistribution: DistributionData;
  statusDistribution: DistributionData;
  bidCategoryDistribution: BidCategoryDistribution;
  rawCounts: RawCounts;
  total: number;
  percentOfTotal: number;
}

interface WinData {
  [winsValue: string]: WinRowData;
}

interface TotalRowData {
  seedDistribution: DistributionData;
  statusDistribution: DistributionData;
  bidCategoryDistribution: BidCategoryDistribution;
  rawCounts: RawCounts;
  total: number;
}

interface ProcessedData {
  winData: WinData;
  winTotals: string[];
  seeds: string[];
  totalRow: TotalRowData;
  hasNumericSeeds: boolean;
  grandTotal: number;
}

interface ColorStyle {
  backgroundColor?: string;
  color?: string;
}

export default function TeamSeedProjections({
  winSeedCounts,
  logoUrl,
}: TeamSeedProjectionsProps) {
  const { isMobile } = useResponsive();

  const getStatusColor = (
    value: number,
    isOutCategory: boolean
  ): ColorStyle => {
    if (value === 0)
      return { backgroundColor: "var(--bg-primary)", color: "transparent" };

    if (isOutCategory) {
      const white = [255, 255, 255];
      const yellow = [255, 230, 113];

      const ratio = Math.min(value / 100, 1);
      const r = Math.round(white[0] + (yellow[0] - white[0]) * ratio);
      const g = Math.round(white[1] + (yellow[1] - white[1]) * ratio);
      const b = Math.round(white[2] + (yellow[2] - white[2]) * ratio);

      return { backgroundColor: `rgb(${r}, ${g}, ${b})`, color: "black" };
    }

    return getCellColor(value);
  };

  const processData = (): ProcessedData | null => {
    if (!Array.isArray(winSeedCounts) || winSeedCounts.length === 0)
      return null;

    const winTotalsSet = new Set<string>();
    const seedsSet = new Set<string>();

    const grandTotal = winSeedCounts.reduce(
      (sum, entry) => sum + (entry.Count || 0),
      0
    );

    winSeedCounts.forEach((entry) => {
      if (entry.Wins !== undefined) winTotalsSet.add(entry.Wins.toString());

      if (entry.Seed && !isNaN(parseInt(entry.Seed))) {
        seedsSet.add(entry.Seed);
      }
    });

    const hasNumericSeeds = seedsSet.size > 0;
    const winData: WinData = {};
    const winTotals = [...winTotalsSet].sort((a, b) => Number(b) - Number(a));
    const seeds = hasNumericSeeds
      ? [...seedsSet].sort((a, b) => Number(a) - Number(b))
      : [];

    // Initialize winData structure
    winTotals.forEach((winsValue) => {
      winData[winsValue] = {
        seedDistribution: {},
        statusDistribution: {
          "In Tourney %": 0,
          "First Four Out": 0,
          "Next Four Out": 0,
          "Out of Tourney": 0,
        },
        bidCategoryDistribution: {
          "Auto Bid": 0,
          "At Large": 0,
        },
        rawCounts: {
          seedDistribution: {},
          statusDistribution: {},
          bidCategoryDistribution: {
            "Auto Bid": 0,
            "At Large": 0,
          },
        },
        total: 0,
        percentOfTotal: 0,
      };

      seeds.forEach((seed) => {
        winData[winsValue].seedDistribution[seed] = 0;
        winData[winsValue].rawCounts.seedDistribution[seed] = 0;
      });

      Object.keys(winData[winsValue].statusDistribution).forEach((status) => {
        winData[winsValue].rawCounts.statusDistribution[status] = 0;
      });
    });

    // Process each entry to populate the data
    winSeedCounts.forEach((entry) => {
      const winsValue = entry.Wins.toString();
      const status = entry.Tournament_Status || "Out of Tourney";
      const count = entry.Count || 0;
      const autoBidPct = entry.Auto_Bid_Pct || 0;
      const atLargePct = entry.At_Large_Pct || 0;

      if (!winData[winsValue]) return;

      winData[winsValue].total += count;

      if (
        entry.Seed &&
        !isNaN(parseInt(entry.Seed)) &&
        status === "In Tourney"
      ) {
        winData[winsValue].rawCounts.seedDistribution[entry.Seed] =
          (winData[winsValue].rawCounts.seedDistribution[entry.Seed] || 0) +
          count;
      }

      if (status === "In Tourney") {
        winData[winsValue].rawCounts.statusDistribution["In Tourney %"] +=
          count;
      } else if (status === "First Four Out") {
        winData[winsValue].rawCounts.statusDistribution["First Four Out"] +=
          count;
      } else if (status === "Next Four Out") {
        winData[winsValue].rawCounts.statusDistribution["Next Four Out"] +=
          count;
      } else {
        winData[winsValue].rawCounts.statusDistribution["Out of Tourney"] +=
          count;
      }

      if (
        status === "In Tourney" &&
        entry.Seed &&
        !isNaN(parseInt(entry.Seed))
      ) {
        const autoBidCount = (autoBidPct / 100) * count;
        const atLargeCount = (atLargePct / 100) * count;

        winData[winsValue].rawCounts.bidCategoryDistribution["Auto Bid"] +=
          autoBidCount;
        winData[winsValue].rawCounts.bidCategoryDistribution["At Large"] +=
          atLargeCount;
      }
    });

    // Calculate percentages
    winTotals.forEach((winsValue) => {
      const rowData = winData[winsValue];
      rowData.percentOfTotal = (rowData.total / grandTotal) * 100;

      Object.entries(rowData.rawCounts.seedDistribution).forEach(
        ([seed, count]) => {
          rowData.seedDistribution[seed] =
            rowData.total > 0 ? (count / rowData.total) * 100 : 0;
        }
      );

      Object.entries(rowData.rawCounts.statusDistribution).forEach(
        ([status, count]) => {
          if (status === "In Tourney %") {
            // Calculate In Tourney % from raw count
            rowData.statusDistribution[status] =
              rowData.total > 0 ? (count / rowData.total) * 100 : 0;
          } else if (status === "Out of Tourney") {
            // Out of Tourney should be 100% minus In Tourney %
            const inTourneyPct =
              rowData.statusDistribution["In Tourney %"] || 0;
            rowData.statusDistribution[status] = 100 - inTourneyPct;
          } else {
            // First Four Out and Next Four Out calculated from raw counts
            rowData.statusDistribution[status] =
              rowData.total > 0 ? (count / rowData.total) * 100 : 0;
          }
        }
      );

      const autoBidCount =
        rowData.rawCounts.bidCategoryDistribution["Auto Bid"];
      const atLargeCount =
        rowData.rawCounts.bidCategoryDistribution["At Large"];
      const totalBidCount = autoBidCount + atLargeCount;

      rowData.bidCategoryDistribution["Auto Bid"] =
        totalBidCount > 0 ? (autoBidCount / totalBidCount) * 100 : 0;
      rowData.bidCategoryDistribution["At Large"] =
        totalBidCount > 0 ? (atLargeCount / totalBidCount) * 100 : 0;
    });

    // Calculate total row
    const totalRow: TotalRowData = {
      seedDistribution: {},
      statusDistribution: {
        "In Tourney %": 0,
        "First Four Out": 0,
        "Next Four Out": 0,
        "Out of Tourney": 0,
      },
      bidCategoryDistribution: {
        "Auto Bid": 0,
        "At Large": 0,
      },
      rawCounts: {
        seedDistribution: {},
        statusDistribution: {},
        bidCategoryDistribution: {
          "Auto Bid": 0,
          "At Large": 0,
        },
      },
      total: 0,
    };

    seeds.forEach((seed) => {
      totalRow.seedDistribution[seed] = 0;
      totalRow.rawCounts.seedDistribution[seed] = 0;
    });

    Object.keys(totalRow.statusDistribution).forEach((status) => {
      totalRow.rawCounts.statusDistribution[status] = 0;
    });

    Object.entries(winData).forEach(([, data]) => {
      totalRow.total += data.total;

      Object.entries(data.rawCounts.seedDistribution).forEach(
        ([seed, count]) => {
          totalRow.rawCounts.seedDistribution[seed] =
            (totalRow.rawCounts.seedDistribution[seed] || 0) + count;
        }
      );

      Object.entries(data.rawCounts.statusDistribution).forEach(
        ([status, count]) => {
          totalRow.rawCounts.statusDistribution[status] =
            (totalRow.rawCounts.statusDistribution[status] || 0) + count;
        }
      );

      Object.entries(data.rawCounts.bidCategoryDistribution).forEach(
        ([category, count]) => {
          totalRow.rawCounts.bidCategoryDistribution[
            category as keyof BidCategoryDistribution
          ] =
            (totalRow.rawCounts.bidCategoryDistribution[
              category as keyof BidCategoryDistribution
            ] || 0) + count;
        }
      );
    });

    Object.entries(totalRow.rawCounts.seedDistribution).forEach(
      ([seed, count]) => {
        totalRow.seedDistribution[seed] =
          grandTotal > 0 ? (count / grandTotal) * 100 : 0;
      }
    );

    Object.entries(totalRow.rawCounts.statusDistribution).forEach(
      ([status, count]) => {
        if (status === "In Tourney %") {
          totalRow.statusDistribution[status] =
            grandTotal > 0 ? (count / grandTotal) * 100 : 0;
        } else if (status === "Out of Tourney") {
          // Out of Tourney should be 100% minus In Tourney %
          const inTourneyPct = totalRow.statusDistribution["In Tourney %"] || 0;
          totalRow.statusDistribution[status] = 100 - inTourneyPct;
        } else {
          totalRow.statusDistribution[status] =
            grandTotal > 0 ? (count / grandTotal) * 100 : 0;
        }
      }
    );

    // Calculate bid category percentages based only on tournament appearances
    const totalAutoBidCount =
      totalRow.rawCounts.bidCategoryDistribution["Auto Bid"];
    const totalAtLargeCount =
      totalRow.rawCounts.bidCategoryDistribution["At Large"];
    const totalBidCount = totalAutoBidCount + totalAtLargeCount;

    totalRow.bidCategoryDistribution["Auto Bid"] =
      totalBidCount > 0 ? (totalAutoBidCount / totalBidCount) * 100 : 0;
    totalRow.bidCategoryDistribution["At Large"] =
      totalBidCount > 0 ? (totalAtLargeCount / totalBidCount) * 100 : 0;

    return { winData, winTotals, seeds, totalRow, hasNumericSeeds, grandTotal };
  };

  const data = processData();

  if (!data) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "#999" }}>
        No seed projection data available
      </div>
    );
  }

  const statusColumns = [
    "In Tourney %",
    "First Four Out",
    "Next Four Out",
    "Out of Tourney",
  ];
  const bidCategoryColumns: Array<keyof BidCategoryDistribution> = [
    "Auto Bid",
    "At Large",
  ];
  const seedColumns = data.hasNumericSeeds ? data.seeds : [];

  const getCompactHeader = (label: string): string => {
    if (label === "In Tourney %") return "In Tourney %";
    if (label === "First Four Out") return "First\nFour Out";
    if (label === "Next Four Out") return "Next\nFour Out";
    if (label === "Out of Tourney") return "Out of\nTourney";
    if (label === "Auto Bid") return "Auto\nBid";
    if (label === "At Large") return "At\nLarge";
    return label;
  };

  const winsColWidth = isMobile ? 52 : 60;
  const seedColWidth = isMobile ? 33 : 38;
  const statusColWidth = isMobile ? 45 : 60;
  const bidColWidth = isMobile ? 40 : 50;
  const totalColWidth = isMobile ? 35 : 45;
  const row1Height = isMobile ? 24 : 28;
  const row2Height = isMobile ? 34 : 38;
  const cellHeight = isMobile ? 24 : 28;
  const textSize = isMobile ? "text-xs" : "text-sm";

  return (
    <div style={{ position: "relative" }}>
      {logoUrl && (
        <div
          className="absolute z-10"
          style={{
            top: "-30px",
            right: "-10px",
            width: isMobile ? "24px" : "32px",
            height: isMobile ? "24px" : "32px",
          }}
        >
          <Image
            src={logoUrl}
            alt="Team logo"
            width={isMobile ? 24 : 32}
            height={isMobile ? 24 : 32}
            className="object-contain opacity-80"
          />
        </div>
      )}
      <div
        className={styles.scrollViewport}
        role="region"
        aria-label="NCAA tournament seed projections. Scroll to see every column."
        tabIndex={0}
      >
        <table className={styles.table}>
          <thead>
            <tr>
              {/* Wins header - placeholder split from row 2 below since a
                  rowSpan on a sticky-left <th> doesn't reliably stick
                  (PAGE_MODERNIZATION_GUIDE.md §6b). */}
              <th
                className={cn(styles.headerCell, styles.stickyCell, textSize)}
                style={{
                  width: winsColWidth,
                  minWidth: winsColWidth,
                  maxWidth: winsColWidth,
                  height: row1Height,
                  left: 0,
                }}
              >
                Wins
              </th>

              {seedColumns.length > 0 && (
                <th
                  colSpan={seedColumns.length}
                  className={cn(styles.headerCell, textSize)}
                  style={{ height: row1Height }}
                >
                  Seed
                </th>
              )}

              <th
                colSpan={statusColumns.length}
                className={cn(styles.headerCell, textSize)}
                style={{ height: row1Height }}
              >
                NCAA Tourney Status
              </th>

              <th
                colSpan={bidCategoryColumns.length}
                className={cn(styles.headerCell, textSize)}
                style={{ height: row1Height }}
              >
                Bid Category
              </th>

              <th
                rowSpan={2}
                className={cn(styles.headerCell, textSize)}
                style={{
                  width: totalColWidth,
                  minWidth: totalColWidth,
                  maxWidth: totalColWidth,
                }}
              >
                Total
              </th>
            </tr>

            <tr>
              {/* Wins placeholder - see note above. Sticky, pinned right
                  below row 1 (top: row1Height). */}
              <th
                className={styles.stickyCell}
                style={{
                  width: winsColWidth,
                  minWidth: winsColWidth,
                  maxWidth: winsColWidth,
                  height: row2Height,
                  top: row1Height,
                  left: 0,
                }}
              />

              {seedColumns.map((seed) => (
                <th
                  key={`seed-${seed}`}
                  className={cn(styles.colHeaderCell, textSize)}
                  style={{
                    width: seedColWidth,
                    minWidth: seedColWidth,
                    maxWidth: seedColWidth,
                    height: row2Height,
                    top: row1Height,
                  }}
                >
                  {seed}
                </th>
              ))}

              {statusColumns.map((status) => (
                <th
                  key={`status-${status}`}
                  className={styles.colHeaderCell}
                  style={{
                    width: statusColWidth,
                    minWidth: statusColWidth,
                    maxWidth: statusColWidth,
                    height: row2Height,
                    top: row1Height,
                    fontSize: isMobile ? "10px" : "11px",
                  }}
                >
                  {getCompactHeader(status)}
                </th>
              ))}

              {bidCategoryColumns.map((category) => (
                <th
                  key={`bid-${category}`}
                  className={styles.colHeaderCell}
                  style={{
                    width: bidColWidth,
                    minWidth: bidColWidth,
                    maxWidth: bidColWidth,
                    height: row2Height,
                    top: row1Height,
                    fontSize: isMobile ? "10px" : "11px",
                  }}
                >
                  {getCompactHeader(category)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.winTotals.map((winsValue: string) => {
              const rowData = data.winData[winsValue];
              const percentOfTotal = rowData.percentOfTotal;

              return (
                <tr key={`win-${winsValue}`}>
                  <td
                    className={cn(
                      styles.recordCell,
                      styles.stickyBodyCell,
                      textSize,
                    )}
                    style={{
                      width: winsColWidth,
                      minWidth: winsColWidth,
                      maxWidth: winsColWidth,
                      height: cellHeight,
                      left: 0,
                    }}
                  >
                    {winsValue}
                  </td>

                  {seedColumns.map((seed) => {
                    const pct = rowData.seedDistribution[seed] || 0;
                    return (
                      <td
                        key={`win-${winsValue}-seed-${seed}`}
                        style={{
                          height: cellHeight,
                          width: seedColWidth,
                          minWidth: seedColWidth,
                          maxWidth: seedColWidth,
                          padding: 0,
                        }}
                      >
                        <div
                          className={cn(styles.heatTile, textSize)}
                          style={getCellColor(pct)}
                        >
                          {pct > 0 ? `${Math.round(pct)}%` : ""}
                        </div>
                      </td>
                    );
                  })}

                  {statusColumns.map((status) => {
                    const isOutCategory =
                      status === "First Four Out" ||
                      status === "Next Four Out" ||
                      status === "Out of Tourney";
                    const pct = rowData.statusDistribution[status] || 0;
                    return (
                      <td
                        key={`win-${winsValue}-status-${status}`}
                        style={{
                          height: cellHeight,
                          width: statusColWidth,
                          minWidth: statusColWidth,
                          maxWidth: statusColWidth,
                          padding: 0,
                        }}
                      >
                        <div
                          className={cn(styles.heatTile, textSize)}
                          style={getStatusColor(pct, isOutCategory)}
                        >
                          {pct > 0 ? `${Math.round(pct)}%` : ""}
                        </div>
                      </td>
                    );
                  })}

                  {bidCategoryColumns.map((category) => {
                    const pct = rowData.bidCategoryDistribution[category] || 0;
                    return (
                      <td
                        key={`win-${winsValue}-bid-${category}`}
                        style={{
                          height: cellHeight,
                          width: bidColWidth,
                          minWidth: bidColWidth,
                          maxWidth: bidColWidth,
                          padding: 0,
                        }}
                      >
                        <div
                          className={cn(styles.heatTile, textSize)}
                          style={getCellColor(pct)}
                        >
                          {pct > 0 ? `${Math.round(pct)}%` : ""}
                        </div>
                      </td>
                    );
                  })}

                  <td
                    style={{
                      height: cellHeight,
                      width: totalColWidth,
                      minWidth: totalColWidth,
                      maxWidth: totalColWidth,
                      padding: 0,
                    }}
                  >
                    <div
                      className={cn(styles.heatTile, textSize)}
                      style={getCellColor(percentOfTotal)}
                    >
                      {`${Math.round(percentOfTotal)}%`}
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* Totals Row */}
            <tr>
              <td
                className={cn(
                  styles.recordCell,
                  styles.stickyBodyCell,
                  textSize,
                )}
                style={{
                  width: winsColWidth,
                  minWidth: winsColWidth,
                  maxWidth: winsColWidth,
                  height: cellHeight,
                  left: 0,
                }}
              >
                Total
              </td>

              {seedColumns.map((seed) => {
                const pct = data.totalRow.seedDistribution[seed] || 0;
                return (
                  <td
                    key={`total-seed-${seed}`}
                    style={{
                      height: cellHeight,
                      width: seedColWidth,
                      minWidth: seedColWidth,
                      maxWidth: seedColWidth,
                      padding: 0,
                    }}
                  >
                    <div
                      className={cn(styles.heatTile, textSize)}
                      style={getCellColor(pct)}
                    >
                      {pct > 0 ? `${Math.round(pct)}%` : ""}
                    </div>
                  </td>
                );
              })}

              {statusColumns.map((status) => {
                const isOutCategory =
                  status === "First Four Out" ||
                  status === "Next Four Out" ||
                  status === "Out of Tourney";
                const pct = data.totalRow.statusDistribution[status] || 0;
                return (
                  <td
                    key={`total-status-${status}`}
                    style={{
                      height: cellHeight,
                      width: statusColWidth,
                      minWidth: statusColWidth,
                      maxWidth: statusColWidth,
                      padding: 0,
                    }}
                  >
                    <div
                      className={cn(styles.heatTile, textSize)}
                      style={getStatusColor(pct, isOutCategory)}
                    >
                      {pct > 0 ? `${Math.round(pct)}%` : ""}
                    </div>
                  </td>
                );
              })}

              {bidCategoryColumns.map((category) => {
                const pct =
                  data.totalRow.bidCategoryDistribution[category] || 0;
                return (
                  <td
                    key={`total-bid-${category}`}
                    style={{
                      height: cellHeight,
                      width: bidColWidth,
                      minWidth: bidColWidth,
                      maxWidth: bidColWidth,
                      padding: 0,
                    }}
                  >
                    <div
                      className={cn(styles.heatTile, textSize)}
                      style={getCellColor(pct)}
                    >
                      {pct > 0 ? `${Math.round(pct)}%` : ""}
                    </div>
                  </td>
                );
              })}

              <td
                style={{
                  height: cellHeight,
                  width: totalColWidth,
                  minWidth: totalColWidth,
                  maxWidth: totalColWidth,
                  padding: 0,
                }}
              >
                <div className={cn(styles.heatTile, textSize)}>
                  {`${Math.round((data.totalRow.total / data.grandTotal) * 100)}%`}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
