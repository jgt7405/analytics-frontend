"use client";

import { useBasketballTeamAllHistory } from "@/hooks/useBasketballTeamAllHistory";
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
  Legend,
);

interface TournamentProgressionDataPoint {
  date: string;
  sweet_sixteen_pct: number;
  elite_eight_pct: number;
  final_four_pct: number;
  championship_pct: number;
  champion_pct: number;
  team_name: string;
  team_info: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
}

interface BasketballTeamTournamentProgressionHistoryProps {
  teamName: string;
  primaryColor?: string;
  secondaryColor?: string;
}

interface TournamentRoundDataPoint {
  date: string;
  team_name: string;
  team_info: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
  sweet_sixteen_pct?: number;
  elite_eight_pct?: number;
  final_four_pct?: number;
  championship_pct?: number;
  champion_pct?: number;
}

export default function BasketballTeamTournamentProgressionHistory({
  teamName,
  primaryColor = "#3b82f6",
  secondaryColor,
}: BasketballTeamTournamentProgressionHistoryProps) {
  const { isMobile } = useResponsive();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  const [data, setData] = useState<TournamentProgressionDataPoint[]>([]);

  const {
    data: allHistoryData,
    isLoading: loading,
    error: queryError,
  } = useBasketballTeamAllHistory(teamName);

  const error = queryError?.message || null;

  const formatDateForDisplay = (dateString: string) => {
    const [, month, day] = dateString.split("-").map(Number);
    return `${month}/${day}`;
  };

  useEffect(() => {
    if (!allHistoryData?.ncaa) {
      setData([]);
      return;
    }

    const ncaaData = allHistoryData.ncaa;
    const dataByDate = new Map<
      string,
      Partial<TournamentProgressionDataPoint>
    >();

    [
      { data: ncaaData.sweet_sixteen_data || [], field: "sweet_sixteen_pct" },
      { data: ncaaData.elite_eight_data || [], field: "elite_eight_pct" },
      { data: ncaaData.final_four_data || [], field: "final_four_pct" },
      { data: ncaaData.championship_data || [], field: "championship_pct" },
      { data: ncaaData.champion_data || [], field: "champion_pct" },
    ].forEach(({ data: sourceData, field }) => {
      sourceData.forEach((point: TournamentRoundDataPoint) => {
        if (!dataByDate.has(point.date)) {
          dataByDate.set(point.date, {
            date: point.date,
            team_name: point.team_name,
            team_info: point.team_info,
            sweet_sixteen_pct: 0,
            elite_eight_pct: 0,
            final_four_pct: 0,
            championship_pct: 0,
            champion_pct: 0,
          });
        }
        const existing = dataByDate.get(point.date)!;
        (existing as Record<string, number>)[field] =
          (point as unknown as Record<string, number>)[field] || 0;
      });
    });

    const cutoffDate = new Date("2024-11-01");
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
        sweet_sixteen_pct: item.sweet_sixteen_pct!,
        elite_eight_pct: item.elite_eight_pct!,
        final_four_pct: item.final_four_pct!,
        championship_pct: item.championship_pct!,
        champion_pct: item.champion_pct!,
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
  const teamLogo = data.length > 0 ? data[0].team_info.logo_url : null;

  const chartData = {
    labels,
    datasets: [
      {
        label: "Sweet Sixteen",
        data: data.map((item, index) => ({
          x: labels[index],
          y: item.sweet_sixteen_pct,
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
        label: "Elite Eight",
        data: data.map((item, index) => ({
          x: labels[index],
          y: item.elite_eight_pct,
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
        label: "Final Four",
        data: data.map((item, index) => ({
          x: labels[index],
          y: item.final_four_pct,
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
        label: "Championship Game",
        data: data.map((item, index) => ({
          x: labels[index],
          y: item.championship_pct,
        })),
        borderColor: primaryColor,
        backgroundColor: primaryColor,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.1,
        fill: false,
      },
      {
        label: "Champion",
        data: data.map((item, index) => ({
          x: labels[index],
          y: item.champion_pct,
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
                label.pointStyle = "circle";
                label.fillStyle = "transparent";
                label.strokeStyle = finalSecondaryColor;
                label.lineWidth = 2;
                label.lineDash = [5, 5];
              } else if (index === 1) {
                label.pointStyle = "circle";
                label.fillStyle = finalSecondaryColor;
                label.strokeStyle = finalSecondaryColor;
                label.lineWidth = 2;
              } else if (index === 2) {
                label.pointStyle = "circle";
                label.fillStyle = "transparent";
                label.strokeStyle = primaryColor;
                label.lineWidth = 2;
                label.lineDash = [3, 3];
              } else if (index === 3) {
                label.pointStyle = "circle";
                label.fillStyle = primaryColor;
                label.strokeStyle = primaryColor;
                label.lineWidth = 2;
              } else if (index === 4) {
                label.pointStyle = "circle";
                label.fillStyle = primaryColor;
                label.strokeStyle = primaryColor;
                label.lineWidth = 3;
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

          let tooltipEl = document.getElementById(
            "ncaa-progression-tooltip-basketball",
          );
          if (!tooltipEl) {
            tooltipEl = document.createElement("div");
            tooltipEl.id = "ncaa-progression-tooltip-basketball";

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
                      handleClickOutside,
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

            innerHtml += `<div style="color: ${finalSecondaryColor}; margin: 2px 0; font-weight: 400;">Sweet Sixteen: ${point.sweet_sixteen_pct.toFixed(1)}%</div>`;
            innerHtml += `<div style="color: ${finalSecondaryColor}; margin: 2px 0; font-weight: 400;">Elite Eight: ${point.elite_eight_pct.toFixed(1)}%</div>`;
            innerHtml += `<div style="color: ${primaryColor}; margin: 2px 0; font-weight: 400;">Final Four: ${point.final_four_pct.toFixed(1)}%</div>`;
            innerHtml += `<div style="color: ${primaryColor}; margin: 2px 0; font-weight: 400;">Championship: ${point.championship_pct.toFixed(1)}%</div>`;
            innerHtml += `<div style="color: ${primaryColor}; margin: 2px 0; font-weight: 400;">Champion: ${point.champion_pct.toFixed(1)}%</div>`;

            tooltipEl.innerHTML = innerHtml;

            const closeBtn = tooltipEl.querySelector("#tooltip-close");
            if (closeBtn) {
              closeBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                tooltipEl.style.opacity = "0";
              });
            }
          }

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
          text: "NCAA Progression %",
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
          Loading NCAA progression history...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 text-sm">
          Unable to load NCAA progression history
        </div>
        <div className="text-gray-400 text-xs mt-1">{error}</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 text-sm">
          No NCAA progression history available
        </div>
        <div className="text-gray-400 text-xs mt-1">
          Chart will show NCAA progression over time once data is collected
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
            top: "-30px",
            right: "-10px",
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
