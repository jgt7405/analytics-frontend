"use client";

import { useResponsive } from "@/hooks/useResponsive";
import { getCellColor } from "@/lib/color-utils";
import Image from "next/image";
import { useEffect, useState } from "react";

// TypeScript interfaces
interface FootballRecordSeedCount {
  Record: string;
  Seed: string | number;
  Playoff_Status: string;
  Count: number;
  Percentage: number;
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
  recordSeedCounts: FootballRecordSeedCount[];
  logoUrl?: string;
}

export default function FootballTeamSeedProjections({
  recordSeedCounts,
  logoUrl,
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

  const parseRecord = (record: string): { wins: number; losses: number } => {
    const parts = record.split("-");
    if (parts.length === 2) {
      return {
        wins: parseInt(parts[0], 10),
        losses: parseInt(parts[1], 10),
      };
    }
    return { wins: 0, losses: 0 };
  };

  const sortRecords = (records: string[]): string[] => {
    return records.sort((a, b) => {
      const parsedA = parseRecord(a);
      const parsedB = parseRecord(b);

      // First sort by wins (descending)
      if (parsedA.wins !== parsedB.wins) {
        return parsedB.wins - parsedA.wins;
      }

      // Then sort by losses (ascending)
      return parsedA.losses - parsedB.losses;
    });
  };

  const processData = () => {
    if (!Array.isArray(recordSeedCounts) || recordSeedCounts.length === 0)
      return null;

    const recordsSet = new Set<string>();
    const seedsSet = new Set<string>();

    const grandTotal = recordSeedCounts.reduce(
      (sum, entry) => sum + (entry.Count || 0),
      0
    );

    recordSeedCounts.forEach((entry) => {
      if (entry.Record !== undefined) recordsSet.add(entry.Record);

      if (entry.Seed && !isNaN(parseInt(entry.Seed.toString()))) {
        seedsSet.add(entry.Seed.toString());
      }
    });

    const hasNumericSeeds = seedsSet.size > 0;
    const recordData: Record<string, FootballWinData> = {};
    const records = sortRecords([...recordsSet]);
    const seeds = hasNumericSeeds
      ? [...seedsSet].sort((a, b) => Number(a) - Number(b))
      : [];

    // Initialize recordData structure
    records.forEach((recordValue) => {
      recordData[recordValue] = {
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
        recordData[recordValue].seedDistribution[seed] = 0;
        recordData[recordValue].rawCounts.seedDistribution[seed] = 0;
      });
    });

    // Process each entry to populate the data
    recordSeedCounts.forEach((entry) => {
      const recordValue = entry.Record;
      const status = entry.Playoff_Status || "Out of Playoffs";
      const count = entry.Count || 0;
      const confChampPct = entry.Conf_Champ_Pct || 0;
      const atLargePct = entry.At_Large_Pct || 0;
      const seedValue = entry.Seed?.toString() || "None";

      if (!recordData[recordValue]) return;

      recordData[recordValue].total += count;

      // Handle bid category distribution
      if (status === "In Playoffs" || !isNaN(parseInt(entry.Seed.toString()))) {
        const confChampCount = Math.round((confChampPct / 100) * count);
        const atLargeCount = Math.round((atLargePct / 100) * count);

        recordData[recordValue].rawCounts.bidCategoryDistribution[
          "Conference Champion"
        ] += confChampCount;
        recordData[recordValue].rawCounts.bidCategoryDistribution["At Large"] +=
          atLargeCount;
      }

      // Handle seed distribution and determine playoff status
      if (entry.Seed && !isNaN(parseInt(entry.Seed.toString()))) {
        // This scenario has a numeric seed - IN PLAYOFFS
        const seedKey = entry.Seed.toString();
        recordData[recordValue].rawCounts.seedDistribution[seedKey] =
          (recordData[recordValue].rawCounts.seedDistribution[seedKey] || 0) +
          count;

        recordData[recordValue].rawCounts.statusDistribution["In Playoffs %"] +=
          count;
      } else {
        // UPDATED: Check the Seed field for First/Next Four Out
        if (seedValue === "First Four Out") {
          recordData[recordValue].rawCounts.statusDistribution[
            "First Four Out"
          ] += count;
        } else if (seedValue === "Next Four Out") {
          recordData[recordValue].rawCounts.statusDistribution[
            "Next Four Out"
          ] += count;
        }
        // Don't add to "Out of Playoffs" - it's calculated as complement
      }
    });

    // Calculate percentages
    records.forEach((recordValue) => {
      const rowData = recordData[recordValue];
      rowData.percentOfTotal = (rowData.total / grandTotal) * 100;

      // Calculate seed distribution percentages
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
      });

      // Calculate status distribution percentages
      const inPlayoffsCount =
        rowData.rawCounts.statusDistribution["In Playoffs %"];
      const firstFourOutCount =
        rowData.rawCounts.statusDistribution["First Four Out"];
      const nextFourOutCount =
        rowData.rawCounts.statusDistribution["Next Four Out"];

      if (rowData.total > 0) {
        const inPlayoffsPct = (inPlayoffsCount / rowData.total) * 100;
        rowData.statusDistribution["In Playoffs %"] = inPlayoffsPct;
        rowData.statusDistribution["Out of Playoffs"] = 100 - inPlayoffsPct;
        rowData.statusDistribution["First Four Out"] =
          (firstFourOutCount / rowData.total) * 100;
        rowData.statusDistribution["Next Four Out"] =
          (nextFourOutCount / rowData.total) * 100;
      } else {
        rowData.statusDistribution["In Playoffs %"] = 0;
        rowData.statusDistribution["Out of Playoffs"] = 100;
        rowData.statusDistribution["First Four Out"] = 0;
        rowData.statusDistribution["Next Four Out"] = 0;
      }
    });

    // Calculate totals
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
      total: grandTotal,
    };

    seeds.forEach((seed) => {
      let seedTotal = 0;
      records.forEach((recordValue) => {
        seedTotal +=
          recordData[recordValue].rawCounts.seedDistribution[seed] || 0;
      });
      totalRow.rawCounts.seedDistribution[seed] = seedTotal;
      totalRow.seedDistribution[seed] =
        grandTotal > 0 ? (seedTotal / grandTotal) * 100 : 0;
    });

    Object.entries(totalRow.rawCounts.statusDistribution).forEach(
      ([status, _]) => {
        const statusKey = status as keyof FootballStatusDistribution;
        let statusTotal = 0;
        records.forEach((recordValue) => {
          statusTotal +=
            recordData[recordValue].rawCounts.statusDistribution[statusKey] ||
            0;
        });
        totalRow.rawCounts.statusDistribution[statusKey] = statusTotal;
        totalRow.statusDistribution[statusKey] =
          grandTotal > 0 ? (statusTotal / grandTotal) * 100 : 0;
      }
    );

    Object.entries(totalRow.rawCounts.bidCategoryDistribution).forEach(
      ([category, _]) => {
        const catKey = category as keyof FootballBidCategoryDistribution;
        let catTotal = 0;
        records.forEach((recordValue) => {
          catTotal +=
            recordData[recordValue].rawCounts.bidCategoryDistribution[catKey] ||
            0;
        });
        totalRow.rawCounts.bidCategoryDistribution[catKey] = catTotal;
        totalRow.bidCategoryDistribution[catKey] =
          grandTotal > 0 ? (catTotal / grandTotal) * 100 : 0;
      }
    );

    return {
      recordData,
      records,
      seeds,
      totalRow,
      hasNumericSeeds,
      grandTotal,
    };
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

  const winsColWidth = "60px";
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
                Record
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
            {data.records.map((recordValue: string) => {
              const rowData = data.recordData[recordValue];
              const percentOfTotal = rowData.percentOfTotal;
              const totalColorStyle = getCellColor(percentOfTotal);

              return (
                <tr key={`record-${recordValue}`}>
                  <td
                    style={{
                      ...styles.dataCell,
                      ...styles.stickyCell,
                      width: winsColWidth,
                      minWidth: winsColWidth,
                      maxWidth: winsColWidth,
                    }}
                  >
                    {recordValue}
                  </td>

                  {seedColumns.map((seed) => {
                    const pct = rowData.seedDistribution[seed] || 0;
                    return (
                      <td
                        key={`record-${recordValue}-seed-${seed}`}
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
                    const isOutCategory =
                      status === "First Four Out" ||
                      status === "Next Four Out" ||
                      status === "Out of Playoffs";
                    const pct = rowData.statusDistribution[status] || 0;
                    return (
                      <td
                        key={`record-${recordValue}-status-${status}`}
                        style={{
                          ...styles.dataCell,
                          ...getStatusColor(pct, isOutCategory),
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
                        key={`record-${recordValue}-bid-${category}`}
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
                    {`${Math.round(percentOfTotal)}%`}
                  </td>
                </tr>
              );
            })}

            {/* Totals Row */}
            <tr>
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
                const isOutCategory =
                  status === "First Four Out" ||
                  status === "Next Four Out" ||
                  status === "Out of Playoffs";
                const pct = data.totalRow.statusDistribution[status] || 0;
                return (
                  <td
                    key={`total-status-${status}`}
                    style={{
                      ...styles.dataCell,
                      ...getStatusColor(pct, isOutCategory),
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
                  width: totalColWidth,
                  minWidth: totalColWidth,
                  maxWidth: totalColWidth,
                }}
              >
                {`${Math.round((data.totalRow.total / data.grandTotal) * 100)}%`}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
