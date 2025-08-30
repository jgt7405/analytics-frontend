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

interface CFPHistoricalDataPoint {
  date: string;
  cfp_bid_pct: number;
  average_seed: number;
  team_name: string;
  team_info: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
}

interface SeedDataPoint {
  date: string;
  team_name: string;
  average_seed: number;
  team_info: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
}

interface FootballTeamCFPBidHistoryProps {
  teamName: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export default function FootballTeamCFPBidHistory({
  teamName,
  primaryColor = "#3b82f6",
  secondaryColor,
}: FootballTeamCFPBidHistoryProps) {
  const { isMobile } = useResponsive();
  const chartRef = useRef<ChartJS<
    "line",
    Array<{ x: string; y: number }>,
    string
  > | null>(null);
  const [data, setData] = useState<CFPHistoricalDataPoint[]>([]);
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
        console.log("🏈 CFP: Fetching data for team:", teamName);

        const response = await fetch(
          `/api/proxy/football/cfp/${encodeURIComponent(teamName)}/history`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch CFP bid history");
        }

        const result = await response.json();
        console.log("🏈 CFP: API Response:", result);
        console.log("🏈 CFP: cfp_bid_data:", result.cfp_bid_data);
        console.log("🏈 CFP: average_seed_data:", result.average_seed_data);

        const cfpBidData: CFPHistoricalDataPoint[] = result.cfp_bid_data || [];
        const averageSeedData: SeedDataPoint[] = result.average_seed_data || [];

        console.log("🏈 CFP: Parsed cfpBidData length:", cfpBidData.length);
        console.log(
          "🏈 CFP: Parsed averageSeedData length:",
          averageSeedData.length
        );

        if (cfpBidData.length === 0 && averageSeedData.length === 0) {
          console.log("🏈 CFP: No data available");
          setData([]);
          setError(null);
          return;
        }

        // Filter for the specific team
        const teamCFPData = cfpBidData.filter(
          (point) => point.team_name === teamName
        );
        const teamSeedData = averageSeedData.filter(
          (point) => point.team_name === teamName
        );

        console.log("🏈 CFP: Filtered teamCFPData length:", teamCFPData.length);
        console.log(
          "🏈 CFP: Filtered teamSeedData length:",
          teamSeedData.length
        );

        // Create combined data by merging CFP and seed data by date
        const dataByDate = new Map<string, CFPHistoricalDataPoint>();

        teamCFPData.forEach((point) => {
          dataByDate.set(point.date, {
            ...point,
            average_seed: 0, // Default value
          });
        });

        teamSeedData.forEach((point: SeedDataPoint) => {
          const existing = dataByDate.get(point.date);
          if (existing) {
            existing.average_seed = point.average_seed || 0;
          } else {
            dataByDate.set(point.date, {
              date: point.date,
              cfp_bid_pct: 0,
              average_seed: point.average_seed || 0,
              team_name: point.team_name,
              team_info: point.team_info || {},
            });
          }
        });

        // Filter for dates from 8/22 onward and sort
        const cutoffDate = new Date("2025-08-22");
        const processedData = Array.from(dataByDate.values())
          .filter((item) => {
            const itemDate = parseDateCentralTime(item.date);
            return itemDate >= cutoffDate;
          })
          .sort((a, b) => {
            const dateA = parseDateCentralTime(a.date);
            const dateB = parseDateCentralTime(b.date);
            return dateA.getTime() - dateB.getTime();
          });

        console.log(
          "🏈 CFP: Final processed data length:",
          processedData.length
        );
        console.log("🏈 CFP: Final processed data:", processedData);

        // Debug: Check if average_seed values exist
        processedData.forEach((item, index) => {
          console.log(`🏈 CFP: Data point ${index}:`, {
            date: item.date,
            cfp_bid_pct: item.cfp_bid_pct,
            average_seed: item.average_seed,
            average_seed_type: typeof item.average_seed,
          });
        });

        setData(processedData);
        setError(null);
      } catch (err) {
        console.error("🏈 CFP: Error fetching CFP bid history:", err);
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

  const finalSecondaryColor = secondaryColor
    ? secondaryColor.toLowerCase() === "#ffffff" ||
      secondaryColor.toLowerCase() === "white"
      ? "#000000" // fallback to black if white
      : secondaryColor
    : primaryColor === "#3b82f6"
      ? "#ef4444"
      : "#10b981";

  const labels = data.map((item) => formatDateForDisplay(item.date));

  console.log("🏈 CFP: Chart labels:", labels);
  console.log(
    "🏈 CFP: Average seed chart data:",
    data.map((item) => ({ date: item.date, seed: item.average_seed }))
  );

  console.log("🏈 CFP: Average Seed Dataset:", {
    data: data.map((item, index) => ({
      x: labels[index],
      y: item.average_seed,
    })),
    yAxisID: "y1",
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: "CFP Bid Probability",
        data: data.map((item, index) => ({
          x: labels[index],
          y: item.cfp_bid_pct,
        })),
        borderColor: primaryColor,
        backgroundColor: primaryColor,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.1,
        fill: false,
        yAxisID: "y",
      },
      {
        label: "Average Seed",
        data: data.map((item, index) => ({
          x: labels[index],
          y: item.average_seed,
        })),
        borderColor: finalSecondaryColor,
        backgroundColor: finalSecondaryColor,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.1,
        fill: false,
        yAxisID: "y1",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    elements: {
      point: {
        radius: 0,
        hoverRadius: 6,
        hitRadius: 10,
      },
      line: {
        borderWidth: 2,
      },
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
        },
      },
      tooltip: {
        enabled: false,
        external: (args: { chart: Chart; tooltip: TooltipModel<"line"> }) => {
          const { tooltip: tooltipModel, chart } = args;

          let tooltipEl = document.getElementById(
            "chartjs-tooltip-cfp-bid-history"
          );
          if (!tooltipEl) {
            tooltipEl = document.createElement("div");
            tooltipEl.id = "chartjs-tooltip-cfp-bid-history";

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
            const cfpBidPct = data[dataIndex].cfp_bid_pct || 0;
            const avgSeed = data[dataIndex].average_seed || 0;

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

            innerHtml += `<div style="color: ${primaryColor}; margin: 2px 0; font-weight: 400;">CFP Bid Probability: ${cfpBidPct.toFixed(1)}%</div>`;
            innerHtml += `<div style="color: ${finalSecondaryColor}; margin: 2px 0; font-weight: 400;">Average Seed: ${avgSeed.toFixed(1)}</div>`;

            tooltipEl.innerHTML = innerHtml;

            const closeBtn = tooltipEl.querySelector("#tooltip-close");
            if (closeBtn) {
              closeBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                tooltipEl.style.opacity = "0";
              });
            }
          }

          // Positioning logic
          const position = chart.canvas.getBoundingClientRect();
          const chartWidth = chart.width;
          const tooltipWidth = tooltipEl.offsetWidth || 200;
          const caretX = tooltipModel.caretX;
          const caretY = tooltipModel.caretY;

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
          }

          const maxLeft = window.innerWidth - tooltipWidth - 10;
          const minLeft = 10;
          leftPosition = Math.max(minLeft, Math.min(maxLeft, leftPosition));

          tooltipEl.style.opacity = "1";
          tooltipEl.style.left = leftPosition + "px";
          tooltipEl.style.top =
            position.top +
            window.pageYOffset +
            caretY -
            tooltipEl.offsetHeight / 2 +
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
        type: "linear" as const,
        display: true,
        position: "left" as const,
        beginAtZero: true,
        min: 0,
        max: 100,
        grid: {
          color: "rgba(0, 0, 0, 0.1)",
        },
        ticks: {
          font: {
            size: isMobile ? 10 : 12,
          },
          callback: function (value: string | number) {
            return `${value}%`;
          },
        },
        title: {
          display: true,
          text: "CFP Bid %",
          color: primaryColor,
        },
      },
      y1: {
        type: "linear" as const,
        display: true,
        position: "right" as const,
        min: 1, // Changed from 1
        max: 12,
        reverse: true,
        grid: {
          drawOnChartArea: false,
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
        title: {
          display: true,
          text: "Avg Seed",
          color: finalSecondaryColor,
        },
      },
    },
  };

  const chartHeight = isMobile ? 300 : 400;

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse text-gray-500">
          Loading CFP bid history...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 text-sm">
          Unable to load CFP bid history
        </div>
        <div className="text-gray-400 text-xs mt-1">{error}</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 text-sm">
          No CFP bid history available
        </div>
        <div className="text-gray-400 text-xs mt-1">
          Chart will show CFP bid probability over time once data is collected
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
