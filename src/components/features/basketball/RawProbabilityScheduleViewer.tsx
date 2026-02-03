"use client";

import { useEffect, useState } from "react";

interface ProbScheduleData {
  totalRows: number;
  rowtypes: string[];
  totalGameColumns: number;
  gameColumns: string[];
  scenarioData: {
    [scenario: number]: {
      [gameCol: string]: string | number;
    };
  };
  error?: string;
}

export default function RawProbabilityScheduleViewer() {
  const [data, setData] = useState<ProbScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({
    rowtypes: false,
    gameColumns: false,
    scenarios: true,
  });

  useEffect(() => {
    fetchRawProbabilitySchedule();
  }, []);

  const fetchRawProbabilitySchedule = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        "/api/basketball/debug/probability-schedule",
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.section}>
          <h2>📊 Raw Probability Schedule Viewer</h2>
          <div style={styles.loadingState}>
            Loading probability schedule data...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.section}>
          <h2>📊 Raw Probability Schedule Viewer</h2>
          <div style={styles.errorState}>
            Error loading probability schedule: {error}
            <button onClick={fetchRawProbabilitySchedule} style={styles.button}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={styles.container}>
        <div style={styles.section}>
          <h2>📊 Raw Probability Schedule Viewer</h2>
          <div style={styles.errorState}>No data available</div>
        </div>
      </div>
    );
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div style={styles.container}>
      <div style={styles.section}>
        <h2>📊 Raw Probability Schedule Viewer</h2>
        <p style={styles.subtitle}>
          Direct read from bball_probability_schedule_json table - no
          adjustments
        </p>

        {/* Summary Stats */}
        <div style={styles.summaryBox}>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Total Rows:</span>
            <span style={styles.statValue}>{data.totalRows}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Total Rowtypes:</span>
            <span style={styles.statValue}>{data.rowtypes.length}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Total Game Columns:</span>
            <span style={styles.statValue}>{data.totalGameColumns}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Scenarios with Data:</span>
            <span style={styles.statValue}>
              {Object.keys(data.scenarioData).length}
            </span>
          </div>
        </div>

        {/* Rowtypes Section */}
        <div style={styles.collapsibleSection}>
          <div
            style={styles.sectionHeader}
            onClick={() => toggleSection("rowtypes")}
          >
            <span style={styles.toggleIcon}>
              {expandedSections.rowtypes ? "▼" : "▶"}
            </span>
            Rowtypes ({data.rowtypes.length})
          </div>
          {expandedSections.rowtypes && (
            <div style={styles.sectionContent}>
              <div style={styles.rowTypeList}>
                {data.rowtypes.slice(0, 40).map((rowtype, idx) => (
                  <div key={idx} style={styles.rowTypeItem}>
                    {idx + 1}. {rowtype}
                  </div>
                ))}
                {data.rowtypes.length > 40 && (
                  <div style={styles.rowTypeItem}>
                    ... and {data.rowtypes.length - 40} more
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Game Columns Section */}
        <div style={styles.collapsibleSection}>
          <div
            style={styles.sectionHeader}
            onClick={() => toggleSection("gameColumns")}
          >
            <span style={styles.toggleIcon}>
              {expandedSections.gameColumns ? "▼" : "▶"}
            </span>
            Game Columns ({data.totalGameColumns})
          </div>
          {expandedSections.gameColumns && (
            <div style={styles.sectionContent}>
              <p style={styles.helpText}>
                These are the game columns in order. The INDEX is critical for
                matching scenarios to games!
              </p>
              <div style={styles.gameColumnGrid}>
                {data.gameColumns.slice(0, 20).map((col, idx) => (
                  <div key={idx} style={styles.gameColumnItem}>
                    <div style={styles.gameColumnIndex}>[{idx}]</div>
                    <div style={styles.gameColumnName}>{col}</div>
                  </div>
                ))}
              </div>
              {data.gameColumns.length > 20 && (
                <div style={styles.moreGamesText}>
                  ... and {data.gameColumns.length - 20} more games
                </div>
              )}
            </div>
          )}
        </div>

        {/* Scenario Data Section */}
        <div style={styles.collapsibleSection}>
          <div
            style={styles.sectionHeader}
            onClick={() => toggleSection("scenarios")}
          >
            <span style={styles.toggleIcon}>
              {expandedSections.scenarios ? "▼" : "▶"}
            </span>
            Scenario Winners (First 5 Games, Scenarios 1-10)
          </div>
          {expandedSections.scenarios && (
            <div style={styles.sectionContent}>
              <p style={styles.helpText}>
                Raw winner IDs for each game across scenarios. Watch for
                variation!
              </p>
              <div style={styles.scenarioTable}>
                <div style={styles.tableHeader}>
                  <div style={styles.tableCell}>Game</div>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                    <div
                      key={s}
                      style={{ ...styles.tableCell, fontWeight: "bold" }}
                    >
                      Scenario {s}
                    </div>
                  ))}
                </div>

                {data.gameColumns.slice(0, 5).map((gameCol, idx) => (
                  <div key={idx} style={styles.tableRow}>
                    <div style={{ ...styles.tableCell, fontWeight: "bold" }}>
                      [{idx}] {gameCol}
                    </div>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((scenario) => (
                      <div
                        key={`${idx}-${scenario}`}
                        style={{
                          ...styles.tableCell,
                          backgroundColor: idx % 2 === 0 ? "#f5f5f5" : "white",
                        }}
                      >
                        {data.scenarioData[scenario]?.[gameCol] ?? "?"}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Key Insight */}
        <div style={styles.insightBox}>
          <h3>🔍 Key Debugging Insight</h3>
          <p>
            The <strong>INDEX</strong> of each game in the gameColumns list is
            critical. When code does <code>baseline_winners[i]</code>, it's
            looking at index <code>i</code> in the gameColumns order.
          </p>
          <p>
            <strong>Example:</strong> If game_4325 is at index 78, then{" "}
            <code>baseline_winners[78]</code> is its winner. But if we use index
            0 (games_list[0]), we get the wrong game!
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "20px",
    fontFamily: "Arial, sans-serif",
  },
  section: {
    backgroundColor: "#f9f9f9",
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "20px",
  },
  subtitle: {
    color: "#666",
    fontSize: "14px",
    marginTop: "-10px",
    marginBottom: "20px",
  },
  summaryBox: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "15px",
    marginBottom: "20px",
    padding: "15px",
    backgroundColor: "#e8f4f8",
    borderRadius: "6px",
  },
  statRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid #ddd",
  },
  statLabel: {
    fontWeight: "bold",
    color: "#333",
  },
  statValue: {
    color: "#0066cc",
    fontWeight: "bold",
    fontSize: "16px",
  },
  collapsibleSection: {
    marginBottom: "15px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    overflow: "hidden",
  },
  sectionHeader: {
    padding: "12px",
    backgroundColor: "#f0f0f0",
    cursor: "pointer",
    fontWeight: "bold",
    userSelect: "none" as const,
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  toggleIcon: {
    display: "inline-block",
    width: "20px",
  },
  sectionContent: {
    padding: "15px",
    backgroundColor: "white",
  },
  helpText: {
    color: "#666",
    fontSize: "14px",
    marginBottom: "12px",
    fontStyle: "italic",
  },
  rowTypeList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "8px",
  },
  rowTypeItem: {
    padding: "8px",
    backgroundColor: "#f5f5f5",
    borderRadius: "4px",
    fontSize: "12px",
    fontFamily: "monospace",
  },
  gameColumnGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
    gap: "10px",
  },
  gameColumnItem: {
    padding: "10px",
    backgroundColor: "#f5f5f5",
    borderRadius: "4px",
    textAlign: "center" as const,
    border: "1px solid #ddd",
  },
  gameColumnIndex: {
    fontSize: "12px",
    color: "#0066cc",
    fontWeight: "bold",
  },
  gameColumnName: {
    fontSize: "12px",
    fontFamily: "monospace",
    marginTop: "4px",
  },
  moreGamesText: {
    padding: "10px",
    fontSize: "12px",
    color: "#666",
    textAlign: "center" as const,
  },
  scenarioTable: {
    overflowX: "auto" as const,
    border: "1px solid #ddd",
    borderRadius: "4px",
  },
  tableHeader: {
    display: "grid",
    gridTemplateColumns: "120px repeat(10, 1fr)",
    gap: "1px",
    backgroundColor: "#0066cc",
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "120px repeat(10, 1fr)",
    gap: "1px",
    backgroundColor: "#f5f5f5",
  },
  tableCell: {
    padding: "10px",
    fontSize: "12px",
    textAlign: "center" as const,
    fontFamily: "monospace",
    color: "#333",
    backgroundColor: "white",
  },
  insightBox: {
    padding: "15px",
    backgroundColor: "#fffacd",
    border: "2px solid #ffd700",
    borderRadius: "6px",
    marginTop: "20px",
  },
  loadingState: {
    padding: "20px",
    textAlign: "center" as const,
    color: "#666",
  },
  errorState: {
    padding: "20px",
    backgroundColor: "#ffe6e6",
    border: "1px solid #ff6666",
    borderRadius: "4px",
    color: "#cc0000",
  },
  button: {
    marginTop: "10px",
    padding: "8px 16px",
    backgroundColor: "#0066cc",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
};
