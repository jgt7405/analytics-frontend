"use client";

import { useResponsive } from "@/hooks/useResponsive";
import type { Chart } from "chart.js";
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  TooltipModel,
} from "chart.js";
import { useEffect, useRef, useState } from "react";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface HistoricalDataPoint {
  date: string;
  projected_conf_wins: number;
  projected_total_wins: number;
  standings_with_ties: number;
  standings_no_ties: number;
  first_place_with_ties: number;
  first_place_no_ties: number;
  version_id: string;
  is_current: boolean;
}

interface FootballTeamStandingsHistoryProps {
  teamName: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export default function FootballTeamStandingsHistory({
  teamName,
  primaryColor = "#3b82f6",
  secondaryColor,
}: FootballTeamStandingsHistoryProps) {
  const { isMobile } = useResponsive();
  const chartRef = useRef<ChartJS<
    "line",
    Array<{ x: string; y: number }>,
    string
  > | null>(null);
  const [data, setData] = useState<HistoricalDataPoint[]>([]);
  const [conferenceSize, setConferenceSize] = useState(16);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const parseDateCentralTime = (dateString: string) => {
    const [year, month, day] = dateString.split("-").map(Number);
    const centralDate = new Date(year, month - 1, day, 12, 0, 0);
    return centralDate;
  };

  const formatDateForDisplay = (dateString: string) => {
    const [, month, day] = dateString.split("-").map(Number);
    return `${month}/${day}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/proxy/football/team/${encodeURIComponent(teamName)}/history/conf_wins`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch historical data");
        }

        const result = await response.json();
        const rawData: HistoricalDataPoint[] = result.data || [];
        setConferenceSize(result.conference_size || 16);

        if (rawData.length === 0) {
          setData([]);
          setError(null);
          return;
        }

        // Filter data starting from 8/22
        const cutoffDate = new Date("2025-08-22");
        const filteredData = rawData.filter((point: HistoricalDataPoint) => {
          const itemDate = new Date(point.date);
          return itemDate >= cutoffDate;
        });

        // Deduplicate by date, keeping earliest version_id
        const dataByDate = new Map<string, HistoricalDataPoint>();
        filteredData.forEach((point: HistoricalDataPoint) => {
          const dateKey = point.date;
          if (
            !dataByDate.has(dateKey) ||
            point.version_id < dataByDate.get(dateKey)!.version_id
          ) {
            dataByDate.set(dateKey, point);
          }
        });

        const processedData = Array.from(dataByDate.values()).sort((a, b) => {
          const dateA = parseDateCentralTime(a.date);
          const dateB = parseDateCentralTime(b.date);
          return dateA.getTime() - dateB.getTime();
        });

        setData(processedData);
        setError(null);
      } catch (err) {
        console.error("Error fetching standings history:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    if (teamName) {
      fetchData();
    }
  }, [teamName]);

  // Determine colors - handle white secondary color properly
  const finalSecondaryColor = (() => {
    if (!secondaryColor) {
      // No secondaryColor provided, use fallback logic
      return primaryColor === "#3b82f6" ? "#ef4444" : "#10b981";
    }

    // Check if secondary color is white (various formats)
    const whiteValues = [
      "#ffffff",
      "#fff",
      "white",
      "rgb(255,255,255)",
      "rgb(255, 255, 255)",
      "#FFFFFF",
      "#FFF",
      "WHITE",
    ];

    if (whiteValues.includes(secondaryColor.toLowerCase().replace(/\s/g, ""))) {
      return "#000000"; // Use black instead of white
    }

    return secondaryColor;
  })();

  const labels = data.map((point) => formatDateForDisplay(point.date));
  const standingsWithTiesData = data.map((point, index) => ({
    x: labels[index],
    y: point.standings_with_ties,
  }));
  const standingsNoTiesData = data.map((point, index) => ({
    x: labels[index],
    y: point.standings_no_ties,
  }));

  const datasets = [
    {
      label: "Standing (With Ties)",
      data: standingsWithTiesData,
      backgroundColor: `${primaryColor}20`,
      borderColor: primaryColor,
      borderWidth: 3,
      pointRadius: 0,
      pointBackgroundColor: primaryColor,
      pointBorderColor: "#ffffff",
      pointBorderWidth: 2,
      tension: 0.1,
      fill: false,
    },
    {
      label: "Standing (No Ties)",
      data: standingsNoTiesData,
      backgroundColor: `${finalSecondaryColor}20`,
      borderColor: finalSecondaryColor,
      borderWidth: 3,
      pointRadius: 0,
      pointBackgroundColor: finalSecondaryColor,
      pointBorderColor: "#ffffff",
      pointBorderWidth: 2,
      tension: 0.1,
      fill: false,
    },
  ];

  const chartData = {
    labels: labels,
    datasets,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      title: { display: false },
      legend: {
        display: true,
        position: "top" as const,
        labels: {
          font: {
            size: isMobile ? 10 : 12,
          },
          usePointStyle: true,
          padding: isMobile ? 15 : 20,
        },
      },
      tooltip: {
        enabled: false,
        external: (args: { chart: Chart; tooltip: TooltipModel<"line"> }) => {
          const { tooltip: tooltipModel, chart } = args;

          let tooltipEl = document.getElementById(
            "chartjs-tooltip-standings-history"
          );
          if (!tooltipEl) {
            tooltipEl = document.createElement("div");
            tooltipEl.id = "chartjs-tooltip-standings-history";

            Object.assign(tooltipEl.style, {
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              color: "#1f2937",
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: "12px",
              opacity: "0",
              padding: "16px",
              paddingTop: "8px",
              pointerEvents: "auto",
              position: "absolute",
              transition: "all .1s ease",
              zIndex: "1000",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
              minWidth: "200px",
              maxWidth: "300px",
            });

            // Add close functionality
            const handleClickOutside = (e: Event) => {
              if (!tooltipEl?.contains(e.target as Node)) {
                tooltipEl!.style.opacity = "0";
                setTimeout(() => {
                  if (tooltipEl && tooltipEl.parentNode) {
                    document.removeEventListener("click", handleClickOutside);
                    document.removeEventListener(
                      "touchstart",
                      handleClickOutside
                    );
                    document.body.removeChild(tooltipEl);
                  }
                }, 100);
              }
            };

            document.addEventListener("click", handleClickOutside);
            document.addEventListener("touchstart", handleClickOutside);
            document.body.appendChild(tooltipEl);
          }

          if (tooltipModel.opacity === 0) {
            tooltipEl.style.opacity = "0";
            return;
          }

          if (tooltipModel.body) {
            const dataIndex = tooltipModel.dataPoints[0].dataIndex;
            const currentDate = labels[dataIndex];
            const withTies = data[dataIndex].standings_with_ties;
            const noTies = data[dataIndex].standings_no_ties;

            // Standard header with close button
            let innerHtml = `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div style="font-weight: 600; color: #1f2937;">${currentDate}</div>
                <button id="tooltip-close" style="
                  background: none; 
                  border: none; 
                  font-size: 16px; 
                  cursor: pointer; 
                  color: #6b7280;
                  padding: 0;
                  margin: 0;
                  line-height: 1;
                  width: 20px;
                  height: 20px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                ">&times;</button>
              </div>
            `;

            innerHtml += `<div style="color: ${primaryColor}; margin: 2px 0; font-weight: 400;">Standing (With Ties): #${withTies.toFixed(1)}</div>`;
            innerHtml += `<div style="color: ${finalSecondaryColor}; margin: 2px 0; font-weight: 400;">Standing (No Ties): #${noTies.toFixed(1)}</div>`;

            tooltipEl.innerHTML = innerHtml;

            // Add close button functionality
            const closeBtn = tooltipEl.querySelector("#tooltip-close");
            if (closeBtn) {
              closeBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                tooltipEl.style.opacity = "0";
              });
            }
          }

          // Smart positioning logic
          const position = chart.canvas.getBoundingClientRect();
          const chartWidth = chart.width;
          const tooltipWidth = tooltipEl.offsetWidth || 200;
          const caretX = tooltipModel.caretX;
          const caretY = tooltipModel.caretY;

          // Determine positioning
          const isLeftSide = caretX < chartWidth / 2;
          let leftPosition: number;
          let arrowPosition: string;

          if (isLeftSide) {
            leftPosition = position.left + window.pageXOffset + caretX + 20;
            arrowPosition = "left";
          } else {
            leftPosition =
              position.left + window.pageXOffset + caretX - tooltipWidth - 20;
            arrowPosition = "right";
          }

          // Add/update arrow
          if (!tooltipEl.querySelector(".tooltip-arrow")) {
            const arrow = document.createElement("div");
            arrow.className = "tooltip-arrow";
            arrow.style.position = "absolute";
            arrow.style.width = "0";
            arrow.style.height = "0";
            arrow.style.top = "50%";
            arrow.style.transform = "translateY(-50%)";

            if (arrowPosition === "left") {
              arrow.style.left = "-8px";
              arrow.style.borderTop = "8px solid transparent";
              arrow.style.borderBottom = "8px solid transparent";
              arrow.style.borderRight = "8px solid #ffffff";
            } else {
              arrow.style.right = "-8px";
              arrow.style.borderTop = "8px solid transparent";
              arrow.style.borderBottom = "8px solid transparent";
              arrow.style.borderLeft = "8px solid #ffffff";
            }

            tooltipEl.appendChild(arrow);
          } else {
            // Update existing arrow
            const arrow = tooltipEl.querySelector(
              ".tooltip-arrow"
            ) as HTMLElement;
            if (arrow) {
              arrow.style.left = arrowPosition === "left" ? "-8px" : "auto";
              arrow.style.right = arrowPosition === "right" ? "-8px" : "auto";

              if (arrowPosition === "left") {
                arrow.style.borderLeft = "none";
                arrow.style.borderRight = "8px solid #ffffff";
              } else {
                arrow.style.borderRight = "none";
                arrow.style.borderLeft = "8px solid #ffffff";
              }
            }
          }

          // Prevent off-screen positioning
          const maxLeft = window.innerWidth - tooltipWidth - 10;
          const minLeft = 10;
          leftPosition = Math.max(minLeft, Math.min(maxLeft, leftPosition));

          // Position tooltip
          tooltipEl.style.opacity = "1";
          tooltipEl.style.left = leftPosition + "px";
          tooltipEl.style.top =
            position.top +
            window.pageYOffset +
            caretY -
            tooltipEl.offsetHeight / 2 +
            0 +
            "px";
        },
      },
    },
    scales: {
      x: {
        title: { display: false },
        ticks: {
          font: {
            size: isMobile ? 9 : 11,
          },
        },
        grid: { display: false },
      },
      y: {
        beginAtZero: false,
        min: 1,
        max: conferenceSize,
        reverse: true,
        grid: {
          color: "rgba(0, 0, 0, 0.1)",
        },
        ticks: {
          font: {
            size: isMobile ? 10 : 12,
          },
          stepSize: 1,
          callback: function (value: string | number) {
            return `#${value}`;
          },
        },
      },
    },
  };

  const chartHeight = isMobile ? 200 : 300;

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse text-gray-500">
          Loading standings history...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 text-sm">
          Unable to load standings history
        </div>
        <div className="text-gray-400 text-xs mt-1">{error}</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 text-sm">
          No historical data available
        </div>
        <div className="text-gray-400 text-xs mt-1">
          Chart will show standings over time once data is collected
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: `${chartHeight}px`,
        position: "relative",
        width: "100%",
      }}
    >
      <Line ref={chartRef} data={chartData} options={options} />
    </div>
  );
}
