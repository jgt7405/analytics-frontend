// Frontend React Component for What-If CSV Export with Pagination
// Add this to your existing what-if export UI component

import React, { useState } from "react";

/**
 * ExportOptionsModal - Modal component for configuring CSV export options
 *
 * Props:
 *   isOpen: boolean - whether modal is visible
 *   onClose: function - callback to close modal
 *   conference: string - selected conference
 *   selections: array - game selections
 *   onExportComplete: function - callback when export completes
 */
interface ExportOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  conference: string;
  selections: Array<{ game_id: number; winner_team_id: string }>;
  onExportComplete?: (result: {
    success: boolean;
    filename: string;
    scenarios: string;
  }) => void;
}

export const ExportOptionsModal = ({
  isOpen,
  onClose,
  conference,
  selections,
  onExportComplete,
}: ExportOptionsModalProps) => {
  const [numScenarios, setNumScenarios] = useState(100);
  const [startScenario, setStartScenario] = useState(1);
  const [includeAll, setIncludeAll] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [scenarioPreview, setScenarioPreview] = useState("1-100");

  // Update preview text when values change
  React.useEffect(() => {
    if (includeAll) {
      setScenarioPreview("1-1000 (All scenarios)");
    } else {
      const end = startScenario + numScenarios - 1;
      if (end > 1000) {
        setScenarioPreview(`Invalid range (exceeds 1000)`);
      } else {
        setScenarioPreview(`${startScenario}-${end}`);
      }
    }
  }, [numScenarios, startScenario, includeAll]);

  const handleNumScenariosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 100;
    setNumScenarios(Math.max(1, Math.min(1000, value)));
    setError("");
  };

  const handleStartScenarioChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = parseInt(e.target.value) || 1;
    setStartScenario(Math.max(1, Math.min(1000, value)));
    setError("");
  };

  const validateOptions = () => {
    if (includeAll) return true;

    if (numScenarios < 1 || numScenarios > 1000) {
      setError("Number of scenarios must be between 1 and 1000");
      return false;
    }

    if (startScenario < 1 || startScenario > 1000) {
      setError("Starting scenario must be between 1 and 1000");
      return false;
    }

    const endScenario = startScenario + numScenarios - 1;
    if (endScenario > 1000) {
      setError(
        `Range exceeds 1000 scenarios. Maximum: ${1000 - startScenario + 1}`
      );
      return false;
    }

    return true;
  };

  const handleExport = async () => {
    if (!validateOptions()) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const exportOptions = includeAll
        ? {
            include_all_scenarios: true,
            num_scenarios: 1000,
            start_scenario: 1,
          }
        : {
            include_all_scenarios: false,
            num_scenarios: numScenarios,
            start_scenario: startScenario,
          };

      console.log("Export request:", {
        conference,
        selections,
        export_options: exportOptions,
      });

      const response = await fetch("/api/proxy/football/whatif/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conference: conference,
          selections: selections,
          export_options: exportOptions,
        }),
      });

      console.log("Export response status:", response.status);
      const data = await response.json();
      console.log("Export response data:", data);

      if (!response.ok) {
        throw new Error(data.error || `HTTP Error: ${response.status}`);
      }

      if (data.success && data.csv_data) {
        // Trigger download
        downloadCSV(data.csv_data, data.filename);

        // Callback
        if (onExportComplete) {
          onExportComplete({
            success: true,
            filename: data.filename,
            scenarios: includeAll
              ? "1-1000"
              : `${startScenario}-${startScenario + numScenarios - 1}`,
          });
        }

        // Close modal
        onClose();
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err) {
      console.error("Export error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to export CSV";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          maxWidth: "500px",
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>
            Export What-If Scenarios
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
              color: "#6b7280",
              padding: "0",
              width: "24px",
              height: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px" }}>
          {/* Include All Checkbox */}
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={includeAll}
                onChange={(e) => setIncludeAll(e.target.checked)}
                disabled={isLoading}
                style={{ marginRight: "10px", cursor: "pointer" }}
              />
              <span style={{ fontWeight: "500" }}>
                Include all 1000 scenarios
              </span>
            </label>
            <p
              style={{
                fontSize: "12px",
                color: "#6b7280",
                margin: "8px 0 0 28px",
              }}
            >
              Check this to export all scenarios (may take 30-60 seconds)
            </p>
          </div>

          {/* Pagination Options (hidden when Include All is checked) */}
          {!includeAll && (
            <>
              <div style={{ marginBottom: "20px" }}>
                <label
                  htmlFor="startScenario"
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "500",
                    fontSize: "14px",
                  }}
                >
                  Starting Scenario:
                </label>
                <input
                  id="startScenario"
                  type="number"
                  min="1"
                  max="1000"
                  value={startScenario}
                  onChange={handleStartScenarioChange}
                  disabled={isLoading}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "4px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
                <p
                  style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    margin: "8px 0 0 0",
                  }}
                >
                  First scenario to include (1-1000)
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  htmlFor="numScenarios"
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "500",
                    fontSize: "14px",
                  }}
                >
                  Number of Scenarios:
                </label>
                <input
                  id="numScenarios"
                  type="number"
                  min="1"
                  max="1000"
                  value={numScenarios}
                  onChange={handleNumScenariosChange}
                  disabled={isLoading}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "4px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
                <p
                  style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    margin: "8px 0 0 0",
                  }}
                >
                  How many scenarios to export (1-1000)
                </p>
              </div>
            </>
          )}

          {/* Preview */}
          <div
            style={{
              marginBottom: "20px",
              padding: "12px",
              backgroundColor: "#f3f4f6",
              borderRadius: "4px",
            }}
          >
            <strong style={{ display: "block", marginBottom: "4px" }}>
              Export Range:
            </strong>
            <div style={{ fontSize: "14px", color: "#1f2937" }}>
              {scenarioPreview}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                marginBottom: "20px",
                padding: "12px",
                backgroundColor: "#fee2e2",
                border: "1px solid #fca5a5",
                borderRadius: "4px",
                color: "#991b1b",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          )}

          {/* Info */}
          <div
            style={{
              marginBottom: "20px",
              padding: "12px",
              backgroundColor: "#f0f9ff",
              borderRadius: "4px",
              fontSize: "13px",
            }}
          >
            <p style={{ margin: "0 0 8px 0" }}>
              <strong>Conference:</strong> {conference}
            </p>
            <p style={{ margin: "0 0 8px 0" }}>
              <strong>Game Selections:</strong> {selections.length}
            </p>
            <p style={{ margin: "0", color: "#0369a1" }}>
              {includeAll
                ? "Exporting all 1000 scenarios (estimated 30-60 seconds)"
                : `Exporting ${numScenarios} scenarios (estimated ${Math.ceil((numScenarios / 100) * 5)}-${Math.ceil((numScenarios / 100) * 15)} seconds)`}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            padding: "20px",
            borderTop: "1px solid #e5e7eb",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: "8px 16px",
              backgroundColor: "#e5e7eb",
              color: "#374151",
              border: "none",
              borderRadius: "4px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isLoading}
            style={{
              padding: "8px 16px",
              backgroundColor: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {isLoading ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Helper function to trigger CSV download
 */
function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  URL.revokeObjectURL(url);
}

/**
 * Hook to use export modal
 */
export const useExportModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  return {
    isOpen,
    openModal: () => {
      console.log("Opening export modal");
      setIsOpen(true);
    },
    closeModal: () => {
      console.log("Closing export modal");
      setIsOpen(false);
    },
    toggleModal: () => setIsOpen(!isOpen),
  };
};
