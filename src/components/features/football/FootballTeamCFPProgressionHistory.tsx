"use client";

import { useFootballTeamAllHistory } from "@/hooks/useFootballTeamAllHistory";
import { useResponsive } from "@/hooks/useResponsive";
import type { Chart, PointStyle, TooltipModel } from "chart.js";
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import Image from "next/image";
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

interface CFPProgressionDataPoint {
  date: string;
  cfp_quarterfinals_pct: number;
  cfp_semifinals_pct: number;
  cfp_championship_pct: number;
  cfp_champion_pct: number;
  team_name: string;
  team_info: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
}

interface FootballTeamCFPProgressionHistoryProps {
  teamName: string;
  primaryColor?: string;
  secondaryColor?: string;
}

interface CFPRoundDataPoint {
  date: string;
  team_name: string;
  team_info: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
  cfp_quarterfinals_pct?: number;
  cfp_semifinals_pct?: number;
  cfp_championship_pct?: number;
  cfp_champion_pct?: number;
}

export default function FootballTeamCFPProgressionHistory({
  teamName,
  primaryColor = "#3b82f6",
  secondaryColor,
}: FootballTeamCFPProgressionHistoryProps) {
  const { isMobile } = useResponsive();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  const [data, setData] = useState<CFPProgressionDataPoint[]>([]);

  // Use the master history hook
  const {
    data: allHistoryData,
    isLoading: loading,
    error: queryError,
  } = useFootballTeamAllHistory(teamName);

  const error = queryError?.message || null;

  const formatDateForDisplay = (dateString: string) => {
    const [, month, day] = dateString.split("-").map(Number);
    return `${month}/${day}`;
  };

  // Process the data when allHistoryData changes
  useEffect(() => {
    if (!allHistoryData?.cfp) {
      setData([]);
      return;
    }

    const cfpData = allHistoryData.cfp;

    // Process the data similar to CFP Bid History
    const dataByDate = new Map<string, Partial<CFPProgressionDataPoint>>();

    // Merge all the different data arrays
    [
      {
        data: cfpData.cfp_quarterfinals_data || [],
        field: "cfp_quarterfinals_pct",
      },
      {
        data: cfpData.cfp_semifinals_data || [],
        field: "cfp_semifinals_pct",
      },
      {
        data: cfpData.cfp_championship_data || [],
        field: "cfp_championship_pct",
      },
      {
        data: cfpData.cfp_champion_data || [],
        field: "cfp_champion_pct",
      },
    ].forEach(({ data: sourceData, field }) => {
      sourceData.forEach((point: CFPRoundDataPoint) => {
        if (!dataByDate.has(point.date)) {
          dataByDate.set(point.date, {
            date: point.date,
            team_name: point.team_name,
            team_info: point.team_info,
            cfp_quarterfinals_pct: 0,
            cfp_semifinals_pct: 0,
            cfp_championship_pct: 0,
            cfp_champion_pct: 0,
          });
        }
        const existing = dataByDate.get(point.date)!;
        (existing as Record<string, number>)[field] =
          (point as unknown as Record<string, number>)[field] || 0;
      });
    });

    const cutoffDate = new Date("2025-08-22");
    const finalData = Array.from(dataByDate.values())
      .filter((item) => {
        const itemDate = new Date(item.date!);
        return itemDate >= cutoffDate;
      })
      .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())
      .map((item) => ({
        date: item.date!,
        team_name: item.team_name!,
        team_info: item.team_info!,
        cfp_quarterfinals_pct: item.cfp_quarterfinals_pct!,
        cfp_semifinals_pct: item.cfp_semifinals_pct!,
        cfp_championship_pct: item.cfp_championship_pct!,
        cfp_champion_pct: item.cfp_champion_pct!,
      }));

    setData(finalData);
  }, [allHistoryData, teamName]);

  const finalSecondaryColor = secondaryColor
    ? secondaryColor.toLowerCase() === "#ffffff" ||
      secondaryColor.toLowerCase() === "white"
      ? "#000000"
      : secondaryColor
    : primaryColor === "#3b82f6"
      ? "#ef4444"
      : "#10b981";

  const labels = data.map((item) => formatDateForDisplay(item.date));

  // Get team logo from the first available data point
  const teamLogo = data.length > 0 ? data[0].team_info.logo_url : null;

  const chartData = {
    labels,
    datasets: [
      {
        label: "Quarterfinals",
        data: data.map((item, index) => ({
          x: labels[index],
          y: item.cfp_quarterfinals_pct,
        })),
        borderColor: finalSecondaryColor,
        backgroundColor: finalSecondaryColor,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.1,
        fill: false,
        borderDash: [5, 5],
      },
      {
        label: "Semifinals",
        data: data.map((item, index) => ({
          x: labels[index],
          y: item.cfp_semifinals_pct,
        })),
        borderColor: finalSecondaryColor,
        backgroundColor: finalSecondaryColor,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.1,
        fill: false,
      },
      {
        label: "Championship Game",
        data: data.map((item, index) => ({
          x: labels[index],
          y: item.cfp_championship_pct,
        })),
        borderColor: primaryColor,
        backgroundColor: primaryColor,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.1,
        fill: false,
        borderDash: [3, 3],
      },
      {
        label: "Champion",
        data: data.map((item, index) => ({
          x: labels[index],
          y: item.cfp_champion_pct,
        })),
        borderColor: primaryColor,
        backgroundColor: primaryColor,
        borderWidth: 3,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.1,
        fill: false,
        pointStyle: "circle" as PointStyle,
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
          color: "#6b7280",
          usePointStyle: true,
          padding: isMobile ? 15 : 20,
          generateLabels: function (chart: Chart) {
            const original =
              ChartJS.defaults.plugins.legend.labels.generateLabels;
            const labels = original.call(this, chart);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            labels.forEach((label: any, index: number) => {
              if (index === 0) {
                // Quarterfinals - dashed outline circle
                label.pointStyle = "circle";
                label.fillStyle = "transparent";
                label.strokeStyle = finalSecondaryColor;
                label.lineWidth = 2;
                label.lineDash = [5, 5];
              } else if (index === 1) {
                // Semifinals - solid circle
                label.pointStyle = "circle";
                label.fillStyle = finalSecondaryColor;
                label.strokeStyle = finalSecondaryColor;
                label.lineWidth = 2;
              } else if (index === 2) {
                // Championship Game - dotted outline circle
                label.pointStyle = "circle";
                label.fillStyle = "transparent";
                label.strokeStyle = primaryColor;
                label.lineWidth = 2;
                label.lineDash = [3, 3];
              } else if (index === 3) {
                // Champion - solid circle
                label.pointStyle = "circle";
                label.fillStyle = primaryColor;
                label.strokeStyle = primaryColor;
                label.lineWidth = 2;
              }
            });

            return labels;
          },
        },
      },
      tooltip: {
        enabled: false,
        external: (args: { chart: Chart; tooltip: TooltipModel<"line"> }) => {
          const { tooltip: tooltipModel, chart } = args;

          let tooltipEl = document.getElementById("cfp-progression-tooltip");
          if (!tooltipEl) {
            tooltipEl = document.createElement("div");
            tooltipEl.id = "cfp-progression-tooltip";

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
            const point = data[dataIndex];

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

            innerHtml += `<div style="color: ${primaryColor}; margin: 2px 0; font-weight: 400;">Champion: ${point.cfp_champion_pct.toFixed(1)}%</div>`;
            innerHtml += `<div style="color: ${primaryColor}; margin: 2px 0; font-weight: 400;">Championship: ${point.cfp_championship_pct.toFixed(1)}%</div>`;
            innerHtml += `<div style="color: ${finalSecondaryColor}; margin: 2px 0; font-weight: 400;">Semifinals: ${point.cfp_semifinals_pct.toFixed(1)}%</div>`;
            innerHtml += `<div style="color: ${finalSecondaryColor}; margin: 2px 0; font-weight: 400;">Quarterfinals: ${point.cfp_quarterfinals_pct.toFixed(1)}%</div>`;

            tooltipEl.innerHTML = innerHtml;

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
            tooltipEl.offsetHeight / 2 -
            20 +
            "px";
        },
      },
    },
    scales: {
      x: {
        display: true,
        ticks: {
          color: "#6b7280",
          font: {
            size: isMobile ? 9 : 10,
          },
          maxTicksLimit: isMobile ? 8 : 12,
        },
        grid: {
          display: false,
        },
      },
      y: {
        display: true,
        min: 0,
        max: 100,
        ticks: {
          color: "#6b7280",
          font: {
            size: isMobile ? 9 : 10,
          },
          stepSize: 20,
          callback: function (value: string | number) {
            return `${value}%`;
          },
        },
        title: {
          display: true,
          text: "CFP Progression %",
          color: "#6b7280",
        },
      },
    },
  };

  const chartHeight = isMobile ? 300 : 400;

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse text-gray-500">
          Loading CFP progression history...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 text-sm">
          Unable to load CFP progression history
        </div>
        <div className="text-gray-400 text-xs mt-1">{error}</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 text-sm">
          No CFP progression history available
        </div>
        <div className="text-gray-400 text-xs mt-1">
          Chart will show CFP progression over time once data is collected
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
      {teamLogo && (
        <div
          className="absolute z-10"
          style={{
            top: "-30px", // Moved up more from -5px
            right: "-10px", // Moved right more from -5px
            width: isMobile ? "24px" : "32px",
            height: isMobile ? "24px" : "32px",
          }}
        >
          <Image
            src={teamLogo}
            alt={`${teamName} logo`}
            width={isMobile ? 24 : 32}
            height={isMobile ? 24 : 32}
            className="object-contain opacity-80"
          />
        </div>
      )}
      <Line ref={chartRef} data={chartData} options={options} />
    </div>
  );
}
