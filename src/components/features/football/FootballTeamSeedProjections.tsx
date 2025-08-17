"use client";

import { useResponsive } from "@/hooks/useResponsive";
import { getCellColor } from "@/lib/color-utils";
import { useEffect, useState } from "react";

// TypeScript interfaces
interface FootballWinSeedCount {
  Wins: number;
  Seed: string | number;
  Tournament_Status: string;
  Count: number;
  Percentage?: number;
  Conf_Champ_Pct?: number;
  At_Large_Pct?: number;
}

interface FootballStatusDistribution {
  "In Playoffs %": number;
  "First Four Out": number;
  "Next Four Out": number;
  "Out of Playoffs": number;
}

interface FootballSeedDistribution {
  [seed: string]: number;
}

interface FootballBidCategoryDistribution {
  "Conference Champion": number;
  "At Large": number;
}

interface FootballRawCounts {
  seedDistribution: FootballSeedDistribution;
  statusDistribution: FootballStatusDistribution;
  bidCategoryDistribution: FootballBidCategoryDistribution;
}

interface FootballWinData {
  seedDistribution: FootballSeedDistribution;
  statusDistribution: FootballStatusDistribution;
  bidCategoryDistribution: FootballBidCategoryDistribution;
  rawCounts: FootballRawCounts;
  total: number;
  percentOfTotal: number;
}

interface FootballTotalRow {
  seedDistribution: FootballSeedDistribution;
  statusDistribution: FootballStatusDistribution;
  bidCategoryDistribution: FootballBidCategoryDistribution;
  rawCounts: FootballRawCounts;
  total: number;
}

interface FootballStyles {
  container: React.CSSProperties;
  table: React.CSSProperties;
  thead: React.CSSProperties;
  headerCell: React.CSSProperties;
  stickyHeaderCell: React.CSSProperties;
  dataCell: React.CSSProperties;
  stickyCell: React.CSSProperties;
}

interface FootballTeamSeedProjectionsProps {
  winSeedCounts: FootballWinSeedCount[];
}

export default function FootballTeamSeedProjections({
  winSeedCounts,
}: FootballTeamSeedProjectionsProps) {
  const { isMobile } = useResponsive();
  const [styles, setStyles] = useState<FootballStyles>({} as FootballStyles);

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
    console.log("🚀 Starting processData with winSeedCounts:", winSeedCounts);

    if (!Array.isArray(winSeedCounts) || winSeedCounts.length === 0) {
      console.error("❌ No winSeedCounts data available");
      return null;
    }

    const winTotalsSet = new Set<string>();
    const seedsSet = new Set<string>();

    const grandTotal = winSeedCounts.reduce(
      (sum, entry) => sum + (entry.Count || 0),
      0
    );

    console.log("📊 Grand total count:", grandTotal);

    winSeedCounts.forEach((entry) => {
      if (entry.Wins !== undefined) winTotalsSet.add(entry.Wins.toString());

      if (entry.Seed && !isNaN(parseInt(entry.Seed.toString()))) {
        seedsSet.add(entry.Seed.toString());
      }
    });

    const hasNumericSeeds = seedsSet.size > 0;
    const winData: Record<string, FootballWinData> = {};
    const winTotals = [...winTotalsSet].sort((a, b) => Number(b) - Number(a));
    const seeds = hasNumericSeeds
      ? [...seedsSet].sort((a, b) => Number(a) - Number(b))
      : [];

    console.log("🎯 Win totals found:", winTotals);
    console.log("🌱 Seeds found:", seeds);
    console.log("🔢 Has numeric seeds:", hasNumericSeeds);

    // Initialize winData structure
    winTotals.forEach((winsValue) => {
      winData[winsValue] = {
        seedDistribution: {},
        statusDistribution: {
          "In Playoffs %": 0,
          "First Four Out": 0,
          "Next Four Out": 0,
          "Out of Playoffs": 0,
        },
        bidCategoryDistribution: {
          "Conference Champion": 0,
          "At Large": 0,
        },
        rawCounts: {
          seedDistribution: {},
          statusDistribution: {
            "In Playoffs %": 0,
            "First Four Out": 0,
            "Next Four Out": 0,
            "Out of Playoffs": 0,
          },
          bidCategoryDistribution: {
            "Conference Champion": 0,
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
    });

    console.log(
      "✅ Initialized winData structure for",
      winTotals.length,
      "win totals"
    );

    // Process each entry to populate the data
    winSeedCounts.forEach((entry, index) => {
      const winsValue = entry.Wins.toString();
      const status = entry.Tournament_Status || "Out of Playoffs";
      const count = entry.Count || 0;
      const confChampPct = entry.Conf_Champ_Pct || 0;
      const atLargePct = entry.At_Large_Pct || 0;

      console.log(
        `\n📝 Processing entry ${index + 1}/${winSeedCounts.length}:`
      );
      console.log(`   Wins: ${winsValue}`);
      console.log(`   Seed: ${entry.Seed}`);
      console.log(`   Status: ${status}`);
      console.log(`   Count: ${count}`);
      console.log(`   Conf_Champ_Pct: ${confChampPct}%`);
      console.log(`   At_Large_Pct: ${atLargePct}%`);

      if (!winData[winsValue]) {
        console.warn(`⚠️ No winData found for wins value: ${winsValue}`);
        return;
      }

      winData[winsValue].total += count;

      // Handle bid category distribution
      if (status === "In Playoffs" || !isNaN(parseInt(entry.Seed.toString()))) {
        console.log(`   🎯 Processing bid categories (playoff scenario)`);

        const confChampCount = Math.round((confChampPct / 100) * count);
        const atLargeCount = Math.round((atLargePct / 100) * count);

        console.log(`   📊 Bid calculations:`);
        console.log(
          `      Conf Champ Count: ${confChampCount} (${confChampPct}% of ${count})`
        );
        console.log(
          `      At Large Count: ${atLargeCount} (${atLargePct}% of ${count})`
        );
        console.log(`      Total bid count: ${confChampCount + atLargeCount}`);

        winData[winsValue].rawCounts.bidCategoryDistribution[
          "Conference Champion"
        ] += confChampCount;
        winData[winsValue].rawCounts.bidCategoryDistribution["At Large"] +=
          atLargeCount;

        console.log(`   ✅ Updated bid category raw counts:`);
        console.log(
          `      Conf Champ total: ${winData[winsValue].rawCounts.bidCategoryDistribution["Conference Champion"]}`
        );
        console.log(
          `      At Large total: ${winData[winsValue].rawCounts.bidCategoryDistribution["At Large"]}`
        );
      } else {
        console.log(`   ⏭️ Skipping bid categories (non-playoff scenario)`);
      }

      // Handle seed distribution and determine playoff status
      if (entry.Seed && !isNaN(parseInt(entry.Seed.toString()))) {
        // This scenario has a numeric seed
        const seedKey = entry.Seed.toString();
        console.log(`   🌱 Processing numeric seed: ${seedKey}`);

        winData[winsValue].rawCounts.seedDistribution[seedKey] =
          (winData[winsValue].rawCounts.seedDistribution[seedKey] || 0) + count;

        // ANY scenario with a numeric seed counts as "In Playoffs" regardless of status
        winData[winsValue].rawCounts.statusDistribution["In Playoffs %"] +=
          count;

        console.log(`   ✅ Added ${count} to seed ${seedKey} and In Playoffs`);
      } else {
        // No numeric seed - handle based on status
        console.log(`   📊 Processing non-numeric seed with status: ${status}`);

        if (status === "First Four Out") {
          winData[winsValue].rawCounts.statusDistribution["First Four Out"] +=
            count;
          console.log(`   ✅ Added ${count} to First Four Out`);
        } else if (status === "Next Four Out") {
          winData[winsValue].rawCounts.statusDistribution["Next Four Out"] +=
            count;
          console.log(`   ✅ Added ${count} to Next Four Out`);
        } else {
          // True "Out of Playoffs" scenarios (includes any other status)
          winData[winsValue].rawCounts.statusDistribution["Out of Playoffs"] +=
            count;
          console.log(`   ✅ Added ${count} to Out of Playoffs`);
        }
      }
    });

    console.log("\n🧮 Starting percentage calculations...");

    // Calculate percentages
    winTotals.forEach((winsValue) => {
      const rowData = winData[winsValue];
      rowData.percentOfTotal = (rowData.total / grandTotal) * 100;

      console.log(
        `\n📊 Calculating percentages for ${winsValue} wins (total: ${rowData.total}):`
      );

      // Calculate seed distribution percentages based on row total
      Object.entries(rowData.rawCounts.seedDistribution).forEach(
        ([seed, count]) => {
          rowData.seedDistribution[seed] =
            rowData.total > 0 ? (count / rowData.total) * 100 : 0;
        }
      );

      // Calculate bid category distribution percentages
      const bidCategoryKeys: Array<keyof FootballBidCategoryDistribution> = [
        "Conference Champion",
        "At Large",
      ];

      bidCategoryKeys.forEach((category) => {
        const count = rowData.rawCounts.bidCategoryDistribution[category];
        rowData.bidCategoryDistribution[category] =
          rowData.total > 0 ? (count / rowData.total) * 100 : 0;

        console.log(
          `   ${category}: ${count} raw → ${rowData.bidCategoryDistribution[category].toFixed(1)}%`
        );
      });

      // Calculate status distribution percentages based on row total
      const inPlayoffsCount =
        rowData.rawCounts.statusDistribution["In Playoffs %"];
      const firstFourOutCount =
        rowData.rawCounts.statusDistribution["First Four Out"];
      const nextFourOutCount =
        rowData.rawCounts.statusDistribution["Next Four Out"];
      const outOfPlayoffsCount =
        rowData.rawCounts.statusDistribution["Out of Playoffs"];

      if (rowData.total > 0) {
        rowData.statusDistribution["In Playoffs %"] =
          (inPlayoffsCount / rowData.total) * 100;
        rowData.statusDistribution["First Four Out"] =
          (firstFourOutCount / rowData.total) * 100;
        rowData.statusDistribution["Next Four Out"] =
          (nextFourOutCount / rowData.total) * 100;
        rowData.statusDistribution["Out of Playoffs"] =
          (outOfPlayoffsCount / rowData.total) * 100;
      } else {
        rowData.statusDistribution["In Playoffs %"] = 0;
        rowData.statusDistribution["First Four Out"] = 0;
        rowData.statusDistribution["Next Four Out"] = 0;
        rowData.statusDistribution["Out of Playoffs"] = 0;
      }

      console.log(`   Status percentages:`);
      console.log(
        `     In Playoffs: ${rowData.statusDistribution["In Playoffs %"].toFixed(1)}%`
      );
      console.log(
        `     First Four Out: ${rowData.statusDistribution["First Four Out"].toFixed(1)}%`
      );
      console.log(
        `     Next Four Out: ${rowData.statusDistribution["Next Four Out"].toFixed(1)}%`
      );
      console.log(
        `     Out of Playoffs: ${rowData.statusDistribution["Out of Playoffs"].toFixed(1)}%`
      );
    });

    // Calculate total row
    const totalRow: FootballTotalRow = {
      seedDistribution: {},
      statusDistribution: {
        "In Playoffs %": 0,
        "First Four Out": 0,
        "Next Four Out": 0,
        "Out of Playoffs": 0,
      },
      bidCategoryDistribution: {
        "Conference Champion": 0,
        "At Large": 0,
      },
      rawCounts: {
        seedDistribution: {},
        statusDistribution: {
          "In Playoffs %": 0,
          "First Four Out": 0,
          "Next Four Out": 0,
          "Out of Playoffs": 0,
        },
        bidCategoryDistribution: {
          "Conference Champion": 0,
          "At Large": 0,
        },
      },
      total: 0,
    };

    seeds.forEach((seed) => {
      totalRow.seedDistribution[seed] = 0;
      totalRow.rawCounts.seedDistribution[seed] = 0;
    });

    console.log("\n🧮 Calculating total row...");

    // Sum up totals across all win values
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
          totalRow.rawCounts.statusDistribution[
            status as keyof FootballStatusDistribution
          ] =
            (totalRow.rawCounts.statusDistribution[
              status as keyof FootballStatusDistribution
            ] || 0) + count;
        }
      );

      // Fixed bid category aggregation with explicit type casting
      const bidCategoryEntries = Object.entries(
        data.rawCounts.bidCategoryDistribution
      ) as Array<[keyof FootballBidCategoryDistribution, number]>;
      bidCategoryEntries.forEach(([category, count]) => {
        totalRow.rawCounts.bidCategoryDistribution[category] =
          (totalRow.rawCounts.bidCategoryDistribution[category] || 0) + count;
      });
    });

    // Calculate total row percentages
    Object.entries(totalRow.rawCounts.seedDistribution).forEach(
      ([seed, count]) => {
        totalRow.seedDistribution[seed] =
          grandTotal > 0 ? (count / grandTotal) * 100 : 0;
      }
    );

    // Calculate total bid category percentages with explicit type casting
    const totalBidCategoryEntries = Object.entries(
      totalRow.rawCounts.bidCategoryDistribution
    ) as Array<[keyof FootballBidCategoryDistribution, number]>;
    totalBidCategoryEntries.forEach(([category, count]) => {
      totalRow.bidCategoryDistribution[category] =
        grandTotal > 0 ? (count / grandTotal) * 100 : 0;

      console.log(
        `Total ${category}: ${count} raw → ${totalRow.bidCategoryDistribution[category].toFixed(1)}%`
      );
    });

    const totalInPlayoffs =
      totalRow.rawCounts.statusDistribution["In Playoffs %"];
    const totalFirstFourOut =
      totalRow.rawCounts.statusDistribution["First Four Out"];
    const totalNextFourOut =
      totalRow.rawCounts.statusDistribution["Next Four Out"];
    const totalOutOfPlayoffs =
      totalRow.rawCounts.statusDistribution["Out of Playoffs"];

    totalRow.statusDistribution["In Playoffs %"] =
      grandTotal > 0 ? (totalInPlayoffs / grandTotal) * 100 : 0;
    totalRow.statusDistribution["First Four Out"] =
      grandTotal > 0 ? (totalFirstFourOut / grandTotal) * 100 : 0;
    totalRow.statusDistribution["Next Four Out"] =
      grandTotal > 0 ? (totalNextFourOut / grandTotal) * 100 : 0;
    totalRow.statusDistribution["Out of Playoffs"] =
      grandTotal > 0 ? (totalOutOfPlayoffs / grandTotal) * 100 : 0;

    console.log("\n🎉 ProcessData completed successfully!");
    console.log("Final data structure:", {
      winData,
      winTotals,
      seeds,
      totalRow,
      hasNumericSeeds,
      grandTotal,
    });

    return { winData, winTotals, seeds, totalRow, hasNumericSeeds, grandTotal };
  };

  const data = processData();

  if (!data) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "#999" }}>
        No CFP seed projection data available
      </div>
    );
  }

  const statusColumns: Array<keyof FootballStatusDistribution> = [
    "In Playoffs %",
    "First Four Out",
    "Next Four Out",
    "Out of Playoffs",
  ];
  const bidCategoryColumns: Array<keyof FootballBidCategoryDistribution> = [
    "Conference Champion",
    "At Large",
  ];
  const seedColumns = data.hasNumericSeeds ? data.seeds : [];

  const getCompactHeader = (label: string) => {
    if (label === "In Playoffs %") return "In Playoffs %";
    if (label === "First Four Out") return "First\nFour Out";
    if (label === "Next Four Out") return "Next\nFour Out";
    if (label === "Out of Playoffs") return "Out of\nPlayoffs";
    if (label === "Conference Champion") return "Conf\nChamp";
    if (label === "At Large") return "At\nLarge";
    return label;
  };

  const winsColWidth = "40px";
  const seedColWidth = isMobile ? "33px" : "38px";
  const statusColWidth = isMobile ? "45px" : "60px";
  const bidColWidth = isMobile ? "40px" : "50px";
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
              CFP Status
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
                    status === "Out of Playoffs" ||
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
                  {percentOfTotal > 0 ? `${Math.round(percentOfTotal)}%` : ""}
                </td>
              </tr>
            );
          })}

          {/* Total row */}
          <tr style={{ borderTop: "2px solid #333" }}>
            <td
              style={{
                ...styles.dataCell,
                ...styles.stickyCell,
                width: winsColWidth,
                minWidth: winsColWidth,
                maxWidth: winsColWidth,
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
              const pct = data.totalRow.statusDistribution[status] || 0;
              const isOutCategory =
                status === "Out of Playoffs" ||
                status === "First Four Out" ||
                status === "Next Four Out";
              const colorStyle = getStatusColor(pct, isOutCategory);

              return (
                <td
                  key={`total-status-${status}`}
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
              const pct = data.totalRow.bidCategoryDistribution[category] || 0;
              return (
                <td
                  key={`total-bid-${category}`}
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
                backgroundColor: "#f8f9fa",
                width: totalColWidth,
                minWidth: totalColWidth,
                maxWidth: totalColWidth,
              }}
            >
              100%
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
