"use client";

import { useResponsive } from "@/hooks/useResponsive";
import { getCellColor } from "@/lib/color-utils";
import { useEffect, useState } from "react";

interface TeamSeedProjectionsProps {
  winSeedCounts: any[];
}

export default function TeamSeedProjections({
  winSeedCounts,
}: TeamSeedProjectionsProps) {
  const { isMobile } = useResponsive();
  const [styles, setStyles] = useState<any>({});

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

  const getStatusColor = (value: number, isOutCategory: boolean) => {
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

  const processData = () => {
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
    const winData: any = {};
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
        rawCounts: {
          seedDistribution: {},
          statusDistribution: {},
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

      if (!winData[winsValue]) return; // Skip if wins value not initialized

      winData[winsValue].total += count;

      // Handle seed distribution - FIXED: Only add to seed distribution if it's a valid tournament seed
      if (
        entry.Seed &&
        !isNaN(parseInt(entry.Seed)) &&
        status === "In Tourney"
      ) {
        winData[winsValue].rawCounts.seedDistribution[entry.Seed] =
          (winData[winsValue].rawCounts.seedDistribution[entry.Seed] || 0) +
          count;
      }

      // Handle status distribution
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
    });

    // Calculate percentages - FIXED: Use proper totals for seed distribution
    winTotals.forEach((winsValue) => {
      const rowData = winData[winsValue];
      rowData.percentOfTotal = (rowData.total / grandTotal) * 100;

      // Calculate seed distribution percentages based on row total
      Object.entries(rowData.rawCounts.seedDistribution).forEach(
        ([seed, count]) => {
          rowData.seedDistribution[seed] =
            rowData.total > 0 ? ((count as number) / rowData.total) * 100 : 0;
        }
      );

      // Calculate status distribution percentages based on row total
      Object.entries(rowData.rawCounts.statusDistribution).forEach(
        ([status, count]) => {
          rowData.statusDistribution[status] =
            rowData.total > 0 ? ((count as number) / rowData.total) * 100 : 0;
        }
      );
    });

    // Calculate total row
    const totalRow: any = {
      seedDistribution: {},
      statusDistribution: {
        "In Tourney %": 0,
        "First Four Out": 0,
        "Next Four Out": 0,
        "Out of Tourney": 0,
      },
      rawCounts: {
        seedDistribution: {},
        statusDistribution: {},
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

    // Sum up totals across all win values
    Object.entries(winData).forEach(([, data]) => {
      totalRow.total += (data as any).total;

      Object.entries((data as any).rawCounts.seedDistribution).forEach(
        ([seed, count]) => {
          totalRow.rawCounts.seedDistribution[seed] =
            (totalRow.rawCounts.seedDistribution[seed] || 0) +
            (count as number);
        }
      );

      Object.entries((data as any).rawCounts.statusDistribution).forEach(
        ([status, count]) => {
          totalRow.rawCounts.statusDistribution[status] =
            (totalRow.rawCounts.statusDistribution[status] || 0) +
            (count as number);
        }
      );
    });

    // Calculate total row percentages
    Object.entries(totalRow.rawCounts.seedDistribution).forEach(
      ([seed, count]) => {
        totalRow.seedDistribution[seed] =
          grandTotal > 0 ? ((count as number) / grandTotal) * 100 : 0;
      }
    );

    Object.entries(totalRow.rawCounts.statusDistribution).forEach(
      ([status, count]) => {
        totalRow.statusDistribution[status] =
          grandTotal > 0 ? ((count as number) / grandTotal) * 100 : 0;
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
  const seedColumns = data.hasNumericSeeds ? data.seeds : [];

  const getCompactHeader = (label: string) => {
    if (label === "In Tourney %") return "In Tourney %";
    if (label === "First Four Out") return "First\nFour Out";
    if (label === "Next Four Out") return "Next\nFour Out";
    if (label === "Out of Tourney") return "Out of\nTourney";
    return label;
  };

  const winsColWidth = "40px";
  const seedColWidth = isMobile ? "33px" : "38px";
  const statusColWidth = isMobile ? "45px" : "60px";
  const totalColWidth = isMobile ? "35px" : "45px";

  return (
    <div style={styles.container}>
      <table style={styles.table}>
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

          {/* Total row */}
          <tr
            style={{ borderTop: "2px solid #444", backgroundColor: "#f8f9fa" }}
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
  );
}
