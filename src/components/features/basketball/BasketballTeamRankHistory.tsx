"use client";

import { useBasketballTeamAllHistory } from "@/hooks/useBasketballTeamAllHistory";
import { useResponsive } from "@/hooks/useResponsive";
import {
  buildChartLabels,
  filterDataToRange,
  getBasketballDateRange,
} from "@/lib/chartDateRange";
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
  type TooltipModel,
} from "chart.js";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Line } from "react-chartjs-2";

interface HistoricalDataPoint {
  date: string;
  projected_conf_wins: number;
  projected_total_wins: number;
  standings_with_ties: number;
  standings_no_ties: number;
  first_place_with_ties: number;
  first_place_no_ties: number;
  kenpom_rank: number | null;
  version_id: string;
  is_current?: boolean;
}

interface BasketballTeamRankHistoryProps {
  teamName: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  season?: string;
}

export default function BasketballTeamRankHistory({
  teamName,
  primaryColor = "#3b82f6",
  logoUrl,
  season,
}: BasketballTeamRankHistoryProps) {
  const { isMobile } = useResponsive();
  const chartRef = useRef<ChartJS<"line", (number | null)[], string> | null>(
    null
  );
  const [data, setData] = useState<HistoricalDataPoint[]>([]);

  const {
    data: allHistoryData,
    isLoading,
    error: queryError,
  } = useBasketballTeamAllHistory(teamName, season);

  const error = queryError?.message || null;

  const parseDateCentralTime = (dateString: string) => {
    const [year, month, day] = dateString.split("-").map(Number);
    const centralDate = new Date(year, month - 1, day, 12, 0, 0);
    return centralDate;
  };

  useEffect(() => {
    if (!allHistoryData?.confWins?.data) {
      setData([]);
      return;
    }

    const rawData = allHistoryData.confWins.data;
    const range = getBasketballDateRange(season, rawData);
    const filteredData = filterDataToRange(rawData, range);

    const dataByDateMap = new Map<string, HistoricalDataPoint>();

    filteredData.forEach((point: HistoricalDataPoint) => {
      if (point.kenpom_rank !== null && point.kenpom_rank !== undefined) {
        const dateKey = point.date;

        if (!dataByDateMap.has(dateKey)) {
          dataByDateMap.set(dateKey, point);
        } else {
          const existing = dataByDateMap.get(dateKey)!;
          if (point.version_id < existing.version_id) {
            dataByDateMap.set(dateKey, point);
          }
        }
      }
    });

    const processedData = Array.from(dataByDateMap.values()).sort((a, b) => {
      const dateA = parseDateCentralTime(a.date);
      const dateB = parseDateCentralTime(b.date);
      return dateA.getTime() - dateB.getTime();
    });

    setData(processedData);
  }, [allHistoryData, teamName, season]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
        external: (args: { chart: Chart; tooltip: TooltipModel<"line"> }) => {
          const { tooltip: tooltipModel, chart } = args;

          let tooltipEl = document.getElementById(
            "chartjs-tooltip-rankhistory-basketball"
          );
          if (!tooltipEl) {
            tooltipEl = document.createElement("div");
            tooltipEl.id = "chartjs-tooltip-rankhistory-basketball";

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

            document.body.appendChild(tooltipEl);

            setTimeout(() => {
              document.addEventListener("click", handleClickOutside);
              document.addEventListener("touchstart", handleClickOutside);
            }, 0);
          }

          if (tooltipModel.opacity === 0) {
            tooltipEl.style.opacity = "0";
            return;
          }

          if (tooltipModel.dataPoints && tooltipModel.dataPoints.length > 0) {
            const dataIndex = tooltipModel.dataPoints[0].dataIndex;
            const dataPoint = data[dataIndex];
            const displayDate = `${dataPoint.date.split("-")[1]}/${dataPoint.date.split("-")[2]}`;

            let innerHtml = `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div style="font-weight: 600; color: #374151;">${displayDate}</div>
                <button id="tooltip-close" style="background: none; border: none; font-size: 16px; color: #6b7280; cursor: pointer; padding: 0; margin-left: 12px;">&times;</button>
              </div>
            `;

            innerHtml += `<div style="color: ${primaryColor}; margin: 2px 0; font-weight: 400;">Rating: #${dataPoint.kenpom_rank}</div>`;

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
            Object.assign(arrow.style, {
              position: "absolute",
              width: "0",
              height: "0",
              borderStyle: "solid",
              zIndex: "1001",
            });

            if (arrowPosition === "left") {
              Object.assign(arrow.style, {
                left: "-6px",
                top: "50%",
                transform: "translateY(-50%)",
                borderWidth: "6px 6px 6px 0",
                borderColor: "transparent #e5e7eb transparent transparent",
              });

              const arrowInner = document.createElement("div");
              Object.assign(arrowInner.style, {
                position: "absolute",
                left: "1px",
                top: "-6px",
                width: "0",
                height: "0",
                borderStyle: "solid",
                borderWidth: "6px 6px 6px 0",
                borderColor: "transparent #ffffff transparent transparent",
              });
              arrow.appendChild(arrowInner);
            } else {
              Object.assign(arrow.style, {
                right: "-6px",
                top: "50%",
                transform: "translateY(-50%)",
                borderWidth: "6px 0 6px 6px",
                borderColor: "transparent transparent transparent #e5e7eb",
              });

              const arrowInner = document.createElement("div");
              Object.assign(arrowInner.style, {
                position: "absolute",
                right: "1px",
                top: "-6px",
                width: "0",
                height: "0",
                borderStyle: "solid",
                borderWidth: "6px 0 6px 6px",
                borderColor: "transparent transparent transparent #ffffff",
              });
              arrow.appendChild(arrowInner);
            }

            tooltipEl.appendChild(arrow);
          }

          tooltipEl.style.left = leftPosition + "px";
          tooltipEl.style.top =
            position.top +
            window.pageYOffset +
            caretY -
            tooltipEl.offsetHeight -
            10 +
            "px";
          tooltipEl.style.opacity = "1";
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          color: "#6b7280",
          font: {
            size: isMobile ? 9 : 10,
          },
          maxTicksLimit: isMobile ? 6 : 10,
        },
      },
      y: {
        display: true,
        reverse: true,
        min: 1,
        max: 365,
        grid: {
          color: "rgba(0, 0, 0, 0.1)",
        },
        ticks: {
          color: "#6b7280",
          font: {
            size: isMobile ? 10 : 11,
          },
          stepSize: 50,
          callback: function (value: string | number) {
            return `#${value}`;
          },
        },
        title: {
          display: true,
          text: "Rating",
          color: "#374151",
          font: {
            size: isMobile ? 11 : 12,
            weight: 500,
          },
        },
      },
    },
  } as const;

  const range = getBasketballDateRange(season, data);
  const dataDates = data.map((point) => point.date);
  const chartLabels = buildChartLabels(dataDates, range, "basketball");
  const dataByDate = new Map(data.map((point) => [point.date, point]));

  const rankData = chartLabels.map((label) => {
    const point = dataByDate.get(label.isoDate);
    return point ? point.kenpom_rank : null;
  });

  const chartData = {
    labels: chartLabels.map((l) => l.displayLabel),
    datasets: [
      {
        label: "Rating",
        data: rankData,
        borderColor: primaryColor,
        backgroundColor: primaryColor,
        borderWidth: isMobile ? 2 : 3,
        pointRadius: 0,
        pointHoverRadius: isMobile ? 5 : 6,
        pointBackgroundColor: primaryColor,
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        tension: 0.1,
        fill: false,
      },
    ],
  };

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: isMobile ? "200px" : "280px" }}
      >
        <div className="text-gray-500 text-sm">Loading rank history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: isMobile ? "200px" : "280px" }}
      >
        <div className="text-red-500 text-sm">{error}</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: isMobile ? "200px" : "280px" }}
      >
        <div className="text-gray-500 text-sm">
          No ranking data available for the selected period
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: isMobile ? "240px" : "320px",
        width: "100%",
        position: "relative",
      }}
    >
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
