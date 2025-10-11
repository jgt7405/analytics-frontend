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
  conference: string;
  date: string;
  avg_bids: number;
  bid_distribution?: Record<string, number>;
  conference_info: {
    primary_color?: string;
    secondary_color?: string;
    logo_url?: string;
  };
}

interface BballConfBidsHistoryChartProps {
  timelineData: ConfHistoryData[];
}

interface ChartDimensions {
  chartArea: ChartArea;
  canvas: HTMLCanvasElement;
}

type ConferenceData = {
  data: Array<{ x: string; y: number }>;
  conference_info: {
    primary_color?: string;
    secondary_color?: string;
    logo_url?: string;
  };
};

export default function BballConfBidsHistoryChart({
  timelineData,
}: BballConfBidsHistoryChartProps) {
  const { isMobile } = useResponsive();
  const chartRef = useRef<ChartJS<
    "line",
    Array<{ x: string; y: number }>,
    string
  > | null>(null);
  const [chartDimensions, setChartDimensions] =
    useState<ChartDimensions | null>(null);
  const [selectedConferences, setSelectedConferences] = useState<Set<string>>(
    new Set()
  );

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

  // Filter and sort data
  const sortedData = timelineData.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Build conference data
  const confData: Record<string, ConferenceData> = {};
  sortedData.forEach((item) => {
    if (!confData[item.conference]) {
      confData[item.conference] = {
        data: [],
        conference_info: item.conference_info,
      };
    }
    confData[item.conference].data.push({
      x: formatDate(item.date),
      y: item.avg_bids,
    });
  });

  const allDates = [
    ...new Set(sortedData.map((item) => formatDate(item.date))),
  ];

  // Only show conferences with >= 1.1 bids
  const conferencesForLogos = Object.entries(confData)
    .map(([confName, conf]) => {
      const finalBids = conf.data[conf.data.length - 1]?.y || 0;
      return {
        conference: confName,
        final_bids: finalBids,
        conference_info: conf.conference_info,
      };
    })
    .filter((conf) => conf.final_bids >= 1.1)
    .sort((a, b) => b.final_bids - a.final_bids);

  // All conferences sorted for bottom selector
  const allConferencesSorted = Object.entries(confData)
    .map(([confName, conf]) => {
      const finalBids = conf.data[conf.data.length - 1]?.y || 0;
      return {
        conference: confName,
        final_bids: finalBids,
        conference_info: conf.conference_info,
      };
    })
    .sort((a, b) => b.final_bids - a.final_bids);

  const handleConferenceClick = (confName: string) => {
    setSelectedConferences((prev) => {
      const newSet = new Set(prev);

      // If all conferences are currently selected (none explicitly selected)
      if (newSet.size === 0) {
        // Select only this conference
        newSet.add(confName);
      } else if (newSet.has(confName)) {
        // If this conference is selected, deselect it
        newSet.delete(confName);
        // If no conferences left selected, show all conferences
        if (newSet.size === 0) {
          return new Set();
        }
      } else {
        // Add this conference to the selection
        newSet.add(confName);
      }

      return newSet;
    });
  };

  const datasets = Object.entries(confData).map(([confName, conf]) => {
    // Show conference if no conferences are selected OR this conference is in the selected set
    const isSelected =
      selectedConferences.size === 0 || selectedConferences.has(confName);
    const color = isSelected
      ? conf.conference_info.primary_color || "#666666"
      : "#d1d5db";

    return {
      label: confName,
      data: conf.data,
      borderColor: color,
      backgroundColor: "transparent",
      borderWidth: isSelected ? 2 : 1,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.1,
      fill: false,
    };
  });

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

          let tooltipEl = document.getElementById("chartjs-tooltip-bball-conf");
          if (!tooltipEl) {
            tooltipEl = document.createElement("div");
            tooltipEl.id = "chartjs-tooltip-bball-conf";
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
            const currentDate = allDates[dataIndex];

            const confsAtDate = Object.entries(confData)
              .map(([confName, conf]) => {
                const dataPoint = conf.data.find(
                  (d: { x: string; y: number }) => d.x === currentDate
                );
                return {
                  name: confName,
                  bids: dataPoint?.y || 0,
                  color: conf.conference_info.primary_color || "#666666",
                };
              })
              .sort((a, b) => b.bids - a.bids);

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

            const closeBtn = tooltipEl.querySelector("#tooltip-close");
            if (closeBtn) {
              closeBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                tooltipEl.style.opacity = "0";
              });
            }
          }

          // Smart positioning
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
          } else {
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
        title: { display: true, text: "Projected NCAA Tournament Bids" },
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
    const minSpacing = 18;
    const chartTop = chartDimensions.chartArea.top;
    const chartBottom = chartDimensions.chartArea.bottom;
    const logoHeight = 24;

    // Show logos for conferences that are either:
    // 1. Above threshold AND (no selection OR in selection)
    // 2. Below threshold but IN selection
    const visibleConferences =
      selectedConferences.size === 0
        ? conferencesForLogos
        : allConferencesSorted.filter((c) =>
            selectedConferences.has(c.conference)
          );

    const positions = visibleConferences.map((conf) => ({
      conf,
      idealY: getChartJsYPosition(conf.final_bids) || 0,
      adjustedY: getChartJsYPosition(conf.final_bids) || 0,
    }));

    // If only one conference is selected, don't adjust - use ideal position
    if (positions.length === 1) {
      return positions;
    }

    // Sort by final_bids descending (highest to lowest) to stack from top
    positions.sort((a, b) => b.conf.final_bids - a.conf.final_bids);

    // First pass: try to place all logos at their ideal positions
    for (let i = 0; i < positions.length; i++) {
      positions[i].adjustedY = positions[i].idealY;
    }

    // Second pass: adjust for collisions, working from top to bottom
    for (let i = positions.length - 1; i >= 0; i--) {
      // Ensure within chart bounds
      if (positions[i].adjustedY > chartBottom - logoHeight) {
        positions[i].adjustedY = chartBottom - logoHeight;
      }
      if (positions[i].adjustedY < chartTop) {
        positions[i].adjustedY = chartTop;
      }

      // Check for collision with logo below (higher index, lower on chart)
      if (i < positions.length - 1) {
        const lowerLogo = positions[i + 1];
        const minY = lowerLogo.adjustedY - minSpacing;
        if (positions[i].adjustedY > minY) {
          positions[i].adjustedY = minY;
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
              const isSelected =
                selectedConferences.size === 0 ||
                selectedConferences.has(conf.conference);
              const confColor = isSelected
                ? conf.conference_info.primary_color || "#94a3b8"
                : "#d1d5db";
              const logoUrl = conf.conference_info.logo_url;

              return (
                <div key={`end-${conf.conference}`}>
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
                      opacity: isSelected ? 1 : 0.3,
                    }}
                  >
                    {logoUrl ? (
                      <Image
                        src={logoUrl}
                        alt={conf.conference}
                        width={24}
                        height={24}
                        className="object-contain"
                        unoptimized
                        style={{
                          filter: isSelected ? "none" : "grayscale(100%)",
                        }}
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
                            fallback.title = conf.conference;
                            parent.appendChild(fallback);
                          }
                        }}
                        title={conf.conference}
                      />
                    ) : (
                      <div
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: confColor }}
                        title={conf.conference}
                      />
                    )}
                    <span
                      className="text-xs font-medium ml-2"
                      style={{
                        color: isSelected ? confColor : "#d1d5db",
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

      {/* Bottom logo selector */}
      <div className="mt-4 flex flex-wrap gap-2 justify-center items-center pb-2">
        {allConferencesSorted.map((conf) => {
          const isSelected =
            selectedConferences.size === 0 ||
            selectedConferences.has(conf.conference);
          const logoUrl = conf.conference_info.logo_url;
          const confColor = conf.conference_info.primary_color || "#666666";

          return (
            <button
              key={conf.conference}
              onClick={() => handleConferenceClick(conf.conference)}
              className="flex flex-col items-center gap-0.5 p-1 rounded hover:bg-gray-100 transition-colors cursor-pointer"
              style={{
                opacity: isSelected ? 1 : 0.3,
                filter: isSelected ? "none" : "grayscale(100%)",
              }}
            >
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={conf.conference}
                  width={isMobile ? 24 : 28}
                  height={isMobile ? 24 : 28}
                  className="object-contain"
                  unoptimized
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector(".fallback-square")) {
                      const fallback = document.createElement("div");
                      fallback.className = "rounded border fallback-square";
                      fallback.style.width = isMobile ? "24px" : "28px";
                      fallback.style.height = isMobile ? "24px" : "28px";
                      fallback.style.backgroundColor = confColor;
                      fallback.title = conf.conference;
                      parent.appendChild(fallback);
                    }
                  }}
                  title={conf.conference}
                />
              ) : (
                <div
                  className="rounded border"
                  style={{
                    width: isMobile ? "24px" : "28px",
                    height: isMobile ? "24px" : "28px",
                    backgroundColor: confColor,
                  }}
                  title={conf.conference}
                />
              )}
              <span
                className="text-[10px] font-medium"
                style={{
                  color: isSelected ? confColor : "#9ca3af",
                }}
              >
                {conf.final_bids.toFixed(1)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
