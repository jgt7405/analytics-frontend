"use client";

import { useResponsive } from "@/hooks/useResponsive";
import type { Chart } from "chart.js";
import {
  CategoryScale,
  ChartArea,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  TooltipModel,
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

interface ConfHistoryData {
  conference_name: string;
  date: string;
  avg_bids: number;
  version_id: string;
  conf_info: {
    primary_color?: string;
    secondary_color?: string;
    logo_url?: string;
  };
}

interface FootballConfBidsHistoryChartProps {
  timelineData: ConfHistoryData[];
}

interface ChartDimensions {
  chartArea: ChartArea;
  canvas: HTMLCanvasElement;
}

type ConferenceData = {
  data: Array<{ x: string; y: number }>;
  conf_info: {
    primary_color?: string;
    secondary_color?: string;
    logo_url?: string;
  };
};

export default function FootballConfBidsHistoryChart({
  timelineData,
}: FootballConfBidsHistoryChartProps) {
  const { isMobile } = useResponsive();
  const chartRef = useRef<ChartJS<
    "line",
    Array<{ x: string; y: number }>,
    string
  > | null>(null);
  const [chartDimensions, setChartDimensions] =
    useState<ChartDimensions | null>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (chartRef.current?.chartArea && chartRef.current?.canvas) {
        setChartDimensions({
          chartArea: chartRef.current.chartArea,
          canvas: chartRef.current.canvas,
        });
      }
    };

    const timeout = setTimeout(updateDimensions, 1000);
    return () => clearTimeout(timeout);
  }, [timelineData]);

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const filteredData = timelineData.filter((item) => {
    const confName = item.conference_name.toLowerCase();
    const itemDate = new Date(item.date);
    const cutoffDate = new Date("2025-08-22");

    return !confName.includes("fcs") && itemDate >= cutoffDate;
  });

  const sortedData = filteredData.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Deduplicate by conference and date, keeping earliest version_id
  const dataByConfAndDate = new Map<string, ConfHistoryData>();
  sortedData.forEach((item) => {
    const key = `${item.conference_name}-${item.date}`;
    if (
      !dataByConfAndDate.has(key) ||
      item.version_id < dataByConfAndDate.get(key)!.version_id
    ) {
      dataByConfAndDate.set(key, item);
    }
  });

  // Build conference data from deduplicated items
  const confData: Record<string, ConferenceData> = {};
  Array.from(dataByConfAndDate.values()).forEach((item) => {
    if (!confData[item.conference_name]) {
      confData[item.conference_name] = {
        data: [],
        conf_info: item.conf_info,
      };
    }
    confData[item.conference_name].data.push({
      x: formatDate(item.date),
      y: item.avg_bids,
    });
  });

  const allDates = [
    ...new Set(
      Array.from(dataByConfAndDate.values()).map((item) =>
        formatDate(item.date)
      )
    ),
  ];

  const datasets = Object.entries(confData).map(([confName, conf]) => ({
    label: confName,
    data: conf.data,
    borderColor: conf.conf_info.primary_color || "#666666",
    backgroundColor: "transparent",
    borderWidth: 2,
    pointRadius: 0,
    pointHoverRadius: 4,
    tension: 0.1,
    fill: false,
  }));

  const conferencesForLogos = Object.entries(confData)
    .map(([confName, conf]) => {
      const finalBids = conf.data[conf.data.length - 1]?.y || 0;
      return {
        conference_name: confName,
        final_bids: finalBids,
        conf_info: conf.conf_info,
        should_show: true,
      };
    })
    .filter((conf) => conf.final_bids > 0.3)
    .sort((a, b) => b.final_bids - a.final_bids);

  const chartData = {
    labels: allDates,
    datasets,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    backgroundColor: "transparent",
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    elements: {
      point: {
        backgroundColor: "transparent",
        borderColor: "transparent",
      },
    },
    plugins: {
      title: { display: false },
      legend: { display: false },
      tooltip: {
        enabled: false,
        external: (args: { chart: Chart; tooltip: TooltipModel<"line"> }) => {
          const { tooltip: tooltipModel, chart } = args;

          let tooltipEl = document.getElementById("chartjs-tooltip-conf");
          if (!tooltipEl) {
            tooltipEl = document.createElement("div");
            tooltipEl.id = "chartjs-tooltip-conf";
            tooltipEl.style.background = "#ffffff";
            tooltipEl.style.border = "1px solid #e5e7eb";
            tooltipEl.style.borderRadius = "8px";
            tooltipEl.style.color = "#1f2937";
            tooltipEl.style.fontFamily = "Inter, system-ui, sans-serif";
            tooltipEl.style.fontSize = "12px";
            tooltipEl.style.opacity = "0";
            tooltipEl.style.padding = "16px";
            tooltipEl.style.paddingTop = "8px";
            tooltipEl.style.pointerEvents = "auto";
            tooltipEl.style.position = "absolute";
            tooltipEl.style.transition = "all .1s ease";
            tooltipEl.style.zIndex = "1000";
            tooltipEl.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
            tooltipEl.style.minWidth = "200px";
            tooltipEl.style.maxWidth = "300px";

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
            const currentDate = allDates[dataIndex];

            const confsAtDate = Object.entries(confData)
              .map(([confName, conf]) => {
                const dataPoint = conf.data.find(
                  (d: { x: string; y: number }) => d.x === currentDate
                );
                return {
                  name: confName,
                  bids: dataPoint?.y || 0,
                  color: conf.conf_info.primary_color || "#666666",
                };
              })
              .sort((a, b) => b.bids - a.bids);

            // Close button
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

            confsAtDate.forEach((conf) => {
              innerHtml += `<div style="color: ${conf.color}; margin: 2px 0; font-weight: 400;">${conf.name}: ${conf.bids.toFixed(1)} bids</div>`;
            });

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

          // Determine if point is on left or right side of chart
          const isLeftSide = caretX < chartWidth / 2;

          let leftPosition: number;
          let arrowPosition: string;

          if (isLeftSide) {
            // Point on left, show tooltip to the right
            leftPosition = position.left + window.pageXOffset + caretX + 20;
            arrowPosition = "left";
          } else {
            // Point on right, show tooltip to the left
            leftPosition =
              position.left + window.pageXOffset + caretX - tooltipWidth - 20;
            arrowPosition = "right";
          }

          // Add arrow styling
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
            // Update existing arrow position
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

          // Ensure tooltip doesn't go off screen
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
            150 +
            "px";
        },
      },
    },
    scales: {
      x: {
        title: { display: false },
        ticks: { maxTicksLimit: isMobile ? 5 : 10 },
        grid: { display: false },
      },
      y: {
        title: { display: true, text: "Projected CFP Bids" },
        min: 0,
        max: (() => {
          const allValues = datasets.flatMap((dataset) =>
            dataset.data.map((d: { x: string; y: number }) => d.y)
          );
          if (allValues.length === 0) return 4;
          const maxValue = Math.max(...allValues);
          return Math.max(4, Math.ceil(maxValue * 1.1));
        })(),
        ticks: { stepSize: 1 },
      },
    },
    layout: {
      padding: { left: 10, right: 100 },
    },
    animation: {
      onComplete: () => {
        if (chartRef.current?.chartArea && chartRef.current?.canvas) {
          setChartDimensions({
            chartArea: chartRef.current.chartArea,
            canvas: chartRef.current.canvas,
          });
        }
      },
    },
  };

  const chartHeight = isMobile ? 420 : 560;

  const getChartJsYPosition = (bids: number) => {
    if (!chartDimensions?.chartArea) return null;
    const { top, bottom } = chartDimensions.chartArea;
    const allValues = datasets.flatMap((dataset) =>
      dataset.data.map((d: { x: string; y: number }) => d.y)
    );
    if (allValues.length === 0) return null;
    const maxY = Math.max(...allValues);
    const adjustedMaxY = Math.max(4, Math.ceil(maxY * 1.1));
    return top + ((adjustedMaxY - bids) / adjustedMaxY) * (bottom - top);
  };

  const getAdjustedLogoPositions = () => {
    if (!chartDimensions) return [];
    const minSpacing = 40;
    const chartTop = chartDimensions.chartArea.top;
    const chartBottom = chartDimensions.chartArea.bottom;
    const logoHeight = 24;

    const positions = conferencesForLogos.map((conf) => ({
      conf,
      idealY: getChartJsYPosition(conf.final_bids) || 0,
      adjustedY: getChartJsYPosition(conf.final_bids) || 0,
    }));

    positions.sort((a, b) => a.conf.final_bids - b.conf.final_bids);

    for (let i = 0; i < positions.length; i++) {
      if (i === 0) {
        positions[i].adjustedY = chartBottom - logoHeight;
      } else {
        const previousY = positions[i - 1].adjustedY;
        const proposedY = previousY - minSpacing;
        const idealY = positions[i].idealY;
        positions[i].adjustedY = Math.min(idealY, proposedY);
        if (positions[i].adjustedY < chartTop) {
          positions[i].adjustedY = chartTop;
        }
      }
    }

    return positions;
  };

  const logoPositions = getAdjustedLogoPositions();

  if (datasets.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 p-4">
        <p className="text-gray-500">
          No conference data available for display
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white">
      <div
        className="relative w-full"
        style={{ height: `${chartHeight}px`, overflow: "visible" }}
      >
        <Line ref={chartRef} data={chartData} options={options} />

        {chartDimensions && (
          <div
            className="absolute right-0 top-0"
            style={{
              zIndex: 20,
              pointerEvents: "none",
              width: "100px",
              height: `${chartHeight}px`,
            }}
          >
            {logoPositions.map(({ conf, idealY, adjustedY }) => {
              const confColor = conf.conf_info.primary_color || "#94a3b8";
              const logoUrl = conf.conf_info.logo_url;

              return (
                <div key={`end-${conf.conference_name}`}>
                  <svg
                    className="absolute"
                    style={{
                      top: 0,
                      right: 0,
                      width: "100px",
                      height: `${chartHeight}px`,
                      pointerEvents: "none",
                    }}
                  >
                    <line
                      x1={0}
                      y1={idealY}
                      x2={12}
                      y2={adjustedY}
                      stroke={confColor}
                      strokeWidth="1"
                      strokeDasharray="2,2"
                      opacity="0.7"
                    />
                  </svg>

                  <div
                    className="absolute flex items-center"
                    style={{
                      top: `${adjustedY - 12}px`,
                      right: "25px",
                    }}
                  >
                    {logoUrl ? (
                      <Image
                        src={logoUrl}
                        alt={conf.conference_name}
                        width={24}
                        height={24}
                        className="object-contain"
                        unoptimized
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          const parent = target.parentElement;
                          if (
                            parent &&
                            !parent.querySelector(".fallback-square")
                          ) {
                            const fallback = document.createElement("div");
                            fallback.className =
                              "w-6 h-6 rounded border fallback-square";
                            fallback.style.backgroundColor = confColor;
                            fallback.title = conf.conference_name;
                            parent.appendChild(fallback);
                          }
                        }}
                        title={conf.conference_name}
                      />
                    ) : (
                      <div
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: confColor }}
                        title={conf.conference_name}
                      />
                    )}
                    <span
                      className="text-xs font-medium ml-2"
                      style={{
                        color: confColor,
                        minWidth: "35px",
                        textAlign: "left",
                      }}
                    >
                      {conf.final_bids.toFixed(1)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
