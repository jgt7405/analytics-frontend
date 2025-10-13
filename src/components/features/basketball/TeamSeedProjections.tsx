"use client";

import { useResponsive } from "@/hooks/useResponsive";
import { getCellColor } from "@/lib/color-utils";
import Image from "next/image";
import { useEffect, useState } from "react";

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

interface StylesConfig {
  container: React.CSSProperties;
  table: React.CSSProperties;
  thead: React.CSSProperties;
  headerCell: React.CSSProperties;
  stickyHeaderCell: React.CSSProperties;
  dataCell: React.CSSProperties;
  stickyCell: React.CSSProperties;
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
  const [styles, setStyles] = useState<StylesConfig>({
    container: {},
    table: {},
    thead: {},
    headerCell: {},
    stickyHeaderCell: {},
    dataCell: {},
    stickyCell: {},
  });

  useEffect(() => {
    setStyles({
      container: {
        overflowX: "auto",
        position: "relative",
        border: "1px solid #dee2e6",
        width: isMobile ? "100%" : "fit-content",
        maxWidth: "100%",
      },
      table: {
        borderCollapse: "separate",
        borderSpacing: 0,
        width: "auto",
        fontSize: isMobile ? "12px" : "14px",
      },
      thead: {
        position: "sticky",
        top: 0,
        zIndex: 2,
      },
      headerCell: {
        padding: isMobile ? "4px 2px" : "6px 4px",
        textAlign: "center",
        border: "1px solid #dee2e6",
        backgroundColor: "white",
        position: "sticky",
        top: 0,
        zIndex: 2,
        fontWeight: "normal",
      },
      stickyHeaderCell: {
        position: "sticky",
        top: 0,
        left: 0,
        zIndex: 3,
        backgroundColor: "white",
      },
      dataCell: {
        padding: isMobile ? "3px 2px" : "4px 3px",
        textAlign: "center",
        border: "1px solid #dee2e6",
      },
      stickyCell: {
        position: "sticky",
        left: 0,
        zIndex: 1,
        backgroundColor: "white",
      },
    });
  }, [isMobile]);

  const getStatusColor = (
    value: number,
    isOutCategory: boolean
  ): ColorStyle => {
    if (value === 0) return { backgroundColor: "white", color: "transparent" };

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

    Object.entries(totalRow.rawCounts.bidCategoryDistribution).forEach(
      ([category, count]) => {
        totalRow.bidCategoryDistribution[
          category as keyof BidCategoryDistribution
        ] = grandTotal > 0 ? (count / grandTotal) * 100 : 0;
      }
    );

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

  const winsColWidth = "40px";
  const seedColWidth = isMobile ? "33px" : "38px";
  const statusColWidth = isMobile ? "45px" : "60px";
  const bidColWidth = isMobile ? "40px" : "50px";
  const totalColWidth = isMobile ? "35px" : "45px";

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
      <div style={styles.container}>
        <table style={styles.table}>
          {/* Rest of table code remains exactly the same */}
          <thead style={styles.thead}>
            <tr>
              <th
                rowSpan={2}
                style={{
                  ...styles.headerCell,
                  ...styles.stickyHeaderCell,
                  width: winsColWidth,
                  minWidth: winsColWidth,
                  maxWidth: winsColWidth,
                }}
              >
                Wins
              </th>

              {seedColumns.length > 0 && (
                <th colSpan={seedColumns.length} style={styles.headerCell}>
                  Seed
                </th>
              )}

              <th colSpan={statusColumns.length} style={styles.headerCell}>
                NCAA Tourney Status
              </th>

              <th colSpan={bidCategoryColumns.length} style={styles.headerCell}>
                Bid Category
              </th>

              <th
                rowSpan={2}
                style={{
                  ...styles.headerCell,
                  width: totalColWidth,
                  minWidth: totalColWidth,
                  maxWidth: totalColWidth,
                }}
              >
                Total
              </th>
            </tr>

            <tr>
              {seedColumns.map((seed) => (
                <th
                  key={`seed-${seed}`}
                  style={{
                    ...styles.headerCell,
                    width: seedColWidth,
                    minWidth: seedColWidth,
                    maxWidth: seedColWidth,
                  }}
                >
                  {seed}
                </th>
              ))}

              {statusColumns.map((status) => (
                <th
                  key={`status-${status}`}
                  style={{
                    ...styles.headerCell,
                    width: statusColWidth,
                    minWidth: statusColWidth,
                    maxWidth: statusColWidth,
                    whiteSpace: "normal",
                    fontSize: isMobile ? "10px" : "11px",
                    lineHeight: "1.1",
                  }}
                >
                  {getCompactHeader(status)}
                </th>
              ))}

              {bidCategoryColumns.map((category) => (
                <th
                  key={`bid-${category}`}
                  style={{
                    ...styles.headerCell,
                    width: bidColWidth,
                    minWidth: bidColWidth,
                    maxWidth: bidColWidth,
                    whiteSpace: "normal",
                    fontSize: isMobile ? "10px" : "11px",
                    lineHeight: "1.1",
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
              const totalColorStyle = getCellColor(percentOfTotal);

              return (
                <tr key={`win-${winsValue}`}>
                  <td
                    style={{
                      ...styles.dataCell,
                      ...styles.stickyCell,
                      width: winsColWidth,
                      minWidth: winsColWidth,
                      maxWidth: winsColWidth,
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
                          ...styles.dataCell,
                          ...getCellColor(pct),
                          width: seedColWidth,
                          minWidth: seedColWidth,
                          maxWidth: seedColWidth,
                        }}
                      >
                        {pct > 0 ? `${Math.round(pct)}%` : ""}
                      </td>
                    );
                  })}

                  {statusColumns.map((status) => {
                    const pct = rowData.statusDistribution[status] || 0;
                    const isOutCategory =
                      status === "Out of Tourney" ||
                      status === "First Four Out" ||
                      status === "Next Four Out";
                    const colorStyle = getStatusColor(pct, isOutCategory);

                    return (
                      <td
                        key={`win-${winsValue}-status-${status}`}
                        style={{
                          ...styles.dataCell,
                          ...colorStyle,
                          width: statusColWidth,
                          minWidth: statusColWidth,
                          maxWidth: statusColWidth,
                        }}
                      >
                        {pct > 0 ? `${Math.round(pct)}%` : ""}
                      </td>
                    );
                  })}

                  {bidCategoryColumns.map((category) => {
                    const pct = rowData.bidCategoryDistribution[category] || 0;
                    return (
                      <td
                        key={`win-${winsValue}-bid-${category}`}
                        style={{
                          ...styles.dataCell,
                          ...getCellColor(pct),
                          width: bidColWidth,
                          minWidth: bidColWidth,
                          maxWidth: bidColWidth,
                        }}
                      >
                        {pct > 0 ? `${Math.round(pct)}%` : ""}
                      </td>
                    );
                  })}

                  <td
                    style={{
                      ...styles.dataCell,
                      ...totalColorStyle,
                      width: totalColWidth,
                      minWidth: totalColWidth,
                      maxWidth: totalColWidth,
                    }}
                  >
                    {Math.round(percentOfTotal)}%
                  </td>
                </tr>
              );
            })}

            <tr
              style={{
                borderTop: "2px solid #444",
                backgroundColor: "#f8f9fa",
              }}
            >
              <td
                style={{
                  ...styles.dataCell,
                  ...styles.stickyCell,
                  width: winsColWidth,
                  minWidth: winsColWidth,
                  maxWidth: winsColWidth,
                  backgroundColor: "#f8f9fa",
                }}
              >
                Total
              </td>

              {seedColumns.map((seed) => {
                const pct = data.totalRow.seedDistribution[seed] || 0;
                const colorStyle = getCellColor(pct);

                return (
                  <td
                    key={`total-seed-${seed}`}
                    style={{
                      ...styles.dataCell,
                      ...colorStyle,
                      backgroundColor: colorStyle.backgroundColor || "#f8f9fa",
                      width: seedColWidth,
                      minWidth: seedColWidth,
                      maxWidth: seedColWidth,
                    }}
                  >
                    {pct > 0 ? `${Math.round(pct)}%` : ""}
                  </td>
                );
              })}

              {statusColumns.map((status) => {
                const pct = data.totalRow.statusDistribution[status] || 0;
                const isOutCategory =
                  status === "Out of Tourney" ||
                  status === "First Four Out" ||
                  status === "Next Four Out";
                const colorStyle = getStatusColor(pct, isOutCategory);

                return (
                  <td
                    key={`total-status-${status}`}
                    style={{
                      ...styles.dataCell,
                      ...colorStyle,
                      backgroundColor: colorStyle.backgroundColor || "#f8f9fa",
                      width: statusColWidth,
                      minWidth: statusColWidth,
                      maxWidth: statusColWidth,
                    }}
                  >
                    {pct > 0 ? `${Math.round(pct)}%` : ""}
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
                      ...styles.dataCell,
                      ...getCellColor(pct),
                      backgroundColor:
                        getCellColor(pct).backgroundColor || "#f8f9fa",
                      width: bidColWidth,
                      minWidth: bidColWidth,
                      maxWidth: bidColWidth,
                    }}
                  >
                    {pct > 0 ? `${Math.round(pct)}%` : ""}
                  </td>
                );
              })}

              <td
                style={{
                  ...styles.dataCell,
                  backgroundColor: "#f8f9fa",
                  width: totalColWidth,
                  minWidth: totalColWidth,
                  maxWidth: totalColWidth,
                }}
              >
                {/* Empty cell */}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
