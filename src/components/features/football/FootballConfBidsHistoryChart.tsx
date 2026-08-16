"use client";

import "@/lib/chartjs-setup";
import {
  buildChartLabels,
  filterDataToRange,
  getFootballDateRange,
} from "@/lib/chartDateRange";
import { renderExternalTooltip, TooltipRow } from "@/lib/chartTooltip";
import { cn } from "@/lib/utils";
import { useResponsive } from "@/hooks/useResponsive";
import type { Chart } from "chart.js";
import { ChartArea, Chart as ChartJS, Plugin, TooltipModel } from "chart.js";
import { RotateCcw } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Line } from "react-chartjs-2";

// Matches the gradient/border/shadow "card" look used across the
// modernized Wins/Standings/CWV/etc. pages.
// No `border` property - see FootballStandingsHistoryChart for why
// (Windows-desktop border+border-radius rasterization artifact).
const CARD_CLASS =
  "relative rounded-[1.25rem] bg-gradient-to-br from-white to-[#fbfdff] dark:from-[#111827] dark:to-[#0f172a] shadow-[inset_0_0_0_1px_rgb(226_232_240_/_0.9),0_22px_55px_-36px_rgb(15_23_42_/_0.36),0_8px_22px_-18px_rgb(15_23_42_/_0.24)] dark:shadow-[inset_0_0_0_1px_rgb(51_65_85_/_0.9),0_24px_58px_-34px_rgb(0_0_0_/_0.82)]";

interface ConfHistoryData {
  conference_name: string;
  date: string;
  avg_bids: number;
  version_id?: string;
  conf_info: {
    primary_color?: string;
    secondary_color?: string;
    logo_url?: string;
  };
}

interface FootballConfBidsHistoryChartProps {
  timelineData: ConfHistoryData[];
  season?: string;
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

// Same focus-lens treatment as the other modernized history charts: a
// transient guide band and a marker for every conference at the hovered
// date.
const HOVER_LENS_PLUGIN: Plugin<"line"> = {
  id: "football-conf-bids-hover-lens",
  beforeDatasetsDraw(chart) {
    const active = chart.getActiveElements();
    if (active.length === 0) return;

    const point = chart.getDatasetMeta(active[0].datasetIndex).data[
      active[0].index
    ];
    if (!point) return;

    const { x } = point.getProps(["x"], true);
    const { ctx, chartArea } = chart;
    const isDarkMode = document.documentElement.classList.contains("dark");

    ctx.save();
    ctx.fillStyle = isDarkMode
      ? "rgb(56 189 248 / 0.08)"
      : "rgb(14 165 233 / 0.07)";
    ctx.fillRect(x - 18, chartArea.top, 36, chartArea.bottom - chartArea.top);
    ctx.strokeStyle = isDarkMode
      ? "rgb(125 211 252 / 0.75)"
      : "rgb(2 132 199 / 0.65)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.stroke();
    ctx.restore();
  },
  afterDatasetsDraw(chart) {
    const active = chart.getActiveElements();
    if (active.length === 0) return;

    const dataIndex = active[0].index;
    const isDarkMode = document.documentElement.classList.contains("dark");
    const { ctx } = chart;

    ctx.save();
    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      const point = meta.data[dataIndex];
      if (!point || meta.hidden) return;

      const { x, y } = point.getProps(["x", "y"], true);
      const datasetColor = Array.isArray(dataset.borderColor)
        ? dataset.borderColor[dataIndex]
        : dataset.borderColor;

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = isDarkMode ? "#0f172a" : "#ffffff";
      ctx.fill();
      ctx.strokeStyle =
        typeof datasetColor === "string" ? datasetColor : "#64748b";
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    ctx.restore();
  },
};

export default function FootballConfBidsHistoryChart({
  timelineData,
  season,
}: FootballConfBidsHistoryChartProps) {
  const { isMobile } = useResponsive();
  const chartRef = useRef<ChartJS<
    "line",
    Array<{ x: string; y: number }>,
    string
  > | null>(null);
  const [chartDimensions, setChartDimensions] =
    useState<ChartDimensions | null>(null);
  const [selectedConferences, setSelectedConferences] = useState<Set<string>>(
    new Set(),
  );
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const root = document.documentElement;
    const updateTheme = () => {
      setIsDark(root.classList.contains("dark") || mediaQuery.matches);
    };
    const observer = new MutationObserver(updateTheme);

    updateTheme();
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    mediaQuery.addEventListener("change", updateTheme);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", updateTheme);
    };
  }, []);

  useEffect(() => {
    setSelectedConferences(new Set());
  }, [timelineData]);

  useEffect(() => {
    return () => {
      document.getElementById("chartjs-tooltip-conf")?.remove();
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current?.canvas) return;

    const updateDimensions = () => {
      if (chartRef.current?.chartArea && chartRef.current?.canvas) {
        setChartDimensions({
          chartArea: chartRef.current.chartArea,
          canvas: chartRef.current.canvas,
        });
      }
    };

    const observer = new ResizeObserver(updateDimensions);
    observer.observe(chartRef.current.canvas);
    updateDimensions();

    return () => observer.disconnect();
  }, [timelineData]);

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 px-[1.35rem] pb-4 pt-5">
      <div
        className="flex min-w-0 items-center gap-3"
        data-screenshot-hide="true"
      >
        <h2 className="m-0 text-[clamp(1.25rem,2.2vw,1.75rem)] font-bold leading-[1.1] tracking-[-0.035em] text-slate-700 dark:text-slate-300">
          Conference CFP Bid Trends
          <span className="block text-xs font-normal text-gray-500 dark:text-gray-300 sm:inline sm:ml-1.5 sm:text-sm">
            (Over Time)
          </span>
        </h2>
      </div>
    </div>
  );

  if (!timelineData || timelineData.length === 0) {
    return (
      <div className={CARD_CLASS}>
        {header}
        <div className="flex h-64 items-center justify-center px-4 pb-5">
          <p className="text-gray-500 dark:text-gray-300">
            No history data available.
          </p>
        </div>
      </div>
    );
  }

  const range = getFootballDateRange(season, timelineData);
  const filteredByRange = filterDataToRange(timelineData, range);

  const filteredData = filteredByRange.filter((item) => {
    const confName = item.conference_name.toLowerCase();
    return !confName.includes("fcs");
  });

  const sortedData = filteredData.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  // Deduplicate by conference and date, keeping earliest version_id
  const dataByConfAndDate = new Map<string, ConfHistoryData>();
  sortedData.forEach((item) => {
    const key = `${item.conference_name}-${item.date}`;
    if (
      !dataByConfAndDate.has(key) ||
      (item.version_id &&
        dataByConfAndDate.get(key)?.version_id &&
        item.version_id < dataByConfAndDate.get(key)!.version_id!)
    ) {
      dataByConfAndDate.set(key, item);
    }
  });

  const allDatesFromData = [...new Set(sortedData.map((d) => d.date))].sort();
  const chartLabels = buildChartLabels(allDatesFromData, range, "football");
  const dateIndexMap = new Map(chartLabels.map((l, i) => [l.isoDate, i]));

  // Build conference data from deduplicated items with remapped dates
  const confData: Record<string, ConferenceData> = {};
  Array.from(dataByConfAndDate.values()).forEach((item) => {
    if (!confData[item.conference_name]) {
      confData[item.conference_name] = {
        data: [],
        conf_info: item.conf_info,
      };
    }
    const dataIndex = dateIndexMap.get(item.date);
    if (dataIndex !== undefined) {
      confData[item.conference_name].data.push({
        x: chartLabels[dataIndex].displayLabel,
        y: item.avg_bids,
      });
    }
  });

  const allDates = chartLabels.map((l) => l.displayLabel);

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

  // All conferences sorted by final bids for bottom logos
  const allConferencesSorted = Object.entries(confData)
    .map(([confName, conf]) => {
      const finalBids = conf.data[conf.data.length - 1]?.y || 0;
      return {
        conference_name: confName,
        final_bids: finalBids,
        conf_info: conf.conf_info,
      };
    })
    .sort((a, b) => b.final_bids - a.final_bids);

  const clearSelectedConferences = () => setSelectedConferences(new Set());

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
      ? conf.conf_info.primary_color || "#666666"
      : "#d1d5db";

    return {
      label: confName,
      data: conf.data,
      borderColor: color,
      backgroundColor: "transparent",
      borderWidth: isSelected ? 2.25 : 1.1,
      order: isSelected ? 0 : 1,
      pointRadius: 0,
      pointHoverRadius: 0,
      tension: 0.1,
      fill: false,
    };
  });

  const chartData = {
    labels: allDates,
    datasets,
  };

  const maxBids = (() => {
    const allValues = datasets.flatMap((dataset) =>
      dataset.data.map((d: { x: string; y: number }) => d.y),
    );
    if (allValues.length === 0) return 4;
    const maxValue = Math.max(...allValues);
    return Math.max(4, Math.ceil(maxValue * 1.1));
  })();

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

          let heading = "";
          let rows: TooltipRow[] = [];
          if (tooltipModel.body) {
            const dataIndex = tooltipModel.dataPoints[0].dataIndex;
            const displayDate = chartLabels[dataIndex]?.displayLabel;
            heading = displayDate ?? "";
            rows = Object.entries(confData)
              .map(([confName, conf]) => {
                const dataPoint = conf.data.find(
                  (d: { x: string; y: number }) => d.x === displayDate,
                );
                return {
                  name: confName,
                  bids: dataPoint?.y || 0,
                  color: conf.conf_info.primary_color || "#666666",
                  logoUrl: conf.conf_info.logo_url,
                };
              })
              .sort((a, b) => b.bids - a.bids)
              .map((conf, index) => ({
                label: `${index + 1}. ${conf.name}`,
                value: `${conf.bids.toFixed(1)} bids`,
                color: conf.color,
                logoUrl: conf.logoUrl,
              }));
          }

          renderExternalTooltip(chart, tooltipModel, {
            id: "chartjs-tooltip-conf",
            isDark,
            heading,
            rows,
            verticalOffset: 0,
          });
        },
      },
    },
    scales: {
      x: {
        title: { display: false },
        ticks: {
          maxTicksLimit: isMobile ? 5 : 10,
          color: isDark ? "#94a3b8" : "#475569",
          padding: 8,
          font: {
            weight: 600,
            size: isMobile ? 13 : 15,
          },
        },
        grid: { display: false },
      },
      y: {
        title: {
          display: true,
          text: "Projected CFP Bids",
          color: isDark ? "#cbd5e1" : "#334155",
          font: {
            weight: 600,
            size: isMobile ? 13 : 15,
          },
        },
        min: 0,
        max: maxBids,
        ticks: {
          stepSize: 1,
          color: isDark ? "#94a3b8" : "#475569",
          font: {
            weight: 600,
            size: isMobile ? 13 : 15,
          },
        },
        grid: {
          color: isDark ? "rgb(51 65 85 / 0.5)" : "rgb(226 232 240 / 0.9)",
        },
      },
    },
    layout: {
      padding: { left: 10, right: 100, top: 14 },
    },
    animation: {
      duration: 750,
    },
  };

  const chartHeight = isMobile ? 420 : 560;

  const getChartJsYPosition = (bids: number) => {
    if (!chartDimensions?.chartArea) return null;
    const { top, bottom } = chartDimensions.chartArea;
    return top + ((maxBids - bids) / maxBids) * (bottom - top);
  };

  const getAdjustedLogoPositions = () => {
    if (!chartDimensions) return [];
    const minSpacing = 28;
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
            selectedConferences.has(c.conference_name),
          );

    const positions = visibleConferences.map((conf) => ({
      conf,
      idealY: getChartJsYPosition(conf.final_bids) || 0,
      adjustedY: getChartJsYPosition(conf.final_bids) || 0,
    }));

    // If only one conference visible, don't adjust - use ideal position
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
      <div className={CARD_CLASS}>
        {header}
        <div className="flex h-64 items-center justify-center px-4 pb-5">
          <p className="text-gray-500 dark:text-gray-300">
            No conference data available for display
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={CARD_CLASS} style={{ zIndex: 10, isolation: "isolate" }}>
      {header}

      <div className="px-3 pb-2 sm:px-4">
        <div
          className="relative w-full"
          style={{ height: `${chartHeight}px`, overflow: "visible" }}
        >
          <Line
            ref={chartRef}
            data={chartData}
            options={options}
            plugins={[HOVER_LENS_PLUGIN]}
            role="img"
            aria-label="Conference CFP bid trends showing each conference's projected bid count over time. Hover a date to see all conferences ranked for that date."
          />

          {chartDimensions && (
            <div
              className="pointer-events-none absolute left-0 top-0"
              style={{ width: "100%", height: "100%" }}
            >
              {logoPositions.map(({ conf, idealY, adjustedY }) => {
                const isSelected =
                  selectedConferences.size === 0 ||
                  selectedConferences.has(conf.conference_name);
                const confColor = isSelected
                  ? conf.conf_info.primary_color || "#94a3b8"
                  : "#d1d5db";

                return (
                  <div key={`end-${conf.conference_name}`}>
                    <svg
                      className="absolute left-0 top-0"
                      style={{
                        width: "100%",
                        height: "100%",
                        pointerEvents: "none",
                      }}
                    >
                      <line
                        x1={chartDimensions.chartArea.right}
                        y1={idealY}
                        x2={chartDimensions.chartArea.right + 6}
                        y2={adjustedY}
                        stroke={confColor}
                        strokeWidth="1"
                        strokeDasharray="2,2"
                        opacity="0.7"
                      />
                      <circle
                        cx={chartDimensions.chartArea.right}
                        cy={idealY}
                        r="8"
                        fill={confColor}
                        opacity={isDark ? "0.24" : "0.18"}
                      />
                      <circle
                        cx={chartDimensions.chartArea.right}
                        cy={idealY}
                        r="4.25"
                        fill={isDark ? "#0f172a" : "#ffffff"}
                        stroke={confColor}
                        strokeWidth="2.5"
                        style={{
                          filter: `drop-shadow(0 0 3px ${confColor})`,
                        }}
                      />
                      <circle
                        cx={chartDimensions.chartArea.right}
                        cy={idealY}
                        r="1.75"
                        fill={confColor}
                      />
                    </svg>
                  </div>
                );
              })}

              <div className="absolute inset-0">
                {logoPositions.map(({ conf, adjustedY }) => {
                  const isSelected =
                    selectedConferences.size === 0 ||
                    selectedConferences.has(conf.conference_name);
                  const confColor = isSelected
                    ? conf.conf_info.primary_color || "#94a3b8"
                    : "#d1d5db";
                  const logoUrl = conf.conf_info.logo_url;

                  return (
                    <div
                      key={`logo-${conf.conference_name}`}
                      className="absolute flex items-center"
                      style={{
                        left: `${chartDimensions.chartArea.right + 8}px`,
                        top: `${adjustedY - 10}px`,
                        zIndex: 10,
                        opacity: isSelected ? 1 : 0.3,
                      }}
                    >
                      {logoUrl ? (
                        <Image
                          src={logoUrl}
                          alt={conf.conference_name}
                          width={20}
                          height={20}
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
                                "w-5 h-5 rounded border fallback-square";
                              fallback.style.backgroundColor = confColor;
                              fallback.title = conf.conference_name;
                              parent.appendChild(fallback);
                            }
                          }}
                          title={conf.conference_name}
                        />
                      ) : (
                        <div
                          className="h-5 w-5 rounded border"
                          style={{ backgroundColor: confColor }}
                          title={conf.conference_name}
                        />
                      )}
                      <span
                        className="-translate-y-px ml-0.5 min-w-[30px] text-left text-xs font-medium leading-none tabular-nums"
                        style={{
                          color: isSelected ? confColor : "#d1d5db",
                          alignSelf: "stretch",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        {conf.final_bids.toFixed(1)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-slate-200/80 px-4 pb-5 pt-4 dark:border-slate-700/80 sm:px-[1.35rem]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Select conferences to emphasize
          </p>
          {selectedConferences.size > 0 && (
            <button
              type="button"
              onClick={clearSelectedConferences}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-red-400/50 dark:hover:bg-red-950/30 dark:hover:text-red-400"
            >
              <RotateCcw className="h-3 w-3" />
              Show All
            </button>
          )}
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(56px,1fr))] gap-1.5 sm:gap-2">
          {allConferencesSorted.map((conf) => {
            const isSelected =
              selectedConferences.size === 0 ||
              selectedConferences.has(conf.conference_name);
            const isExplicitlySelected = selectedConferences.has(
              conf.conference_name,
            );
            const logoUrl = conf.conf_info.logo_url;
            const confColor = conf.conf_info.primary_color || "#666666";

            return (
              <button
                key={conf.conference_name}
                type="button"
                aria-pressed={isSelected}
                aria-label={`${conf.conference_name}, projected ${conf.final_bids.toFixed(1)} bids. Select to emphasize this conference.`}
                onClick={() => handleConferenceClick(conf.conference_name)}
                style={{
                  // Inset box-shadow instead of a real `border` - see
                  // FootballStandingsHistoryChart for the full explanation
                  // (Windows-desktop-only corner rendering artifact from
                  // border + border-radius rasterization).
                  boxShadow: `inset 0 0 0 ${isExplicitlySelected ? 3 : 2}px ${
                    confColor || (isDark ? "#475569" : "#cbd5e1")
                  }`,
                }}
                className={cn(
                  "flex min-w-0 cursor-pointer appearance-none flex-col items-center gap-0.5 rounded-xl bg-white/80 px-1 pb-1.5 pt-1 transition-[box-shadow,background-color] hover:bg-slate-50 dark:bg-slate-900/60 dark:hover:bg-slate-800",
                  !isSelected && "opacity-30 grayscale",
                )}
              >
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt={conf.conference_name}
                    width={isMobile ? 24 : 28}
                    height={isMobile ? 24 : 28}
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
                        fallback.className = "rounded border fallback-square";
                        fallback.style.width = isMobile ? "24px" : "28px";
                        fallback.style.height = isMobile ? "24px" : "28px";
                        fallback.style.backgroundColor = confColor;
                        fallback.title = conf.conference_name;
                        parent.appendChild(fallback);
                      }
                    }}
                    title={conf.conference_name}
                  />
                ) : (
                  <div
                    className="rounded border"
                    style={{
                      width: isMobile ? "24px" : "28px",
                      height: isMobile ? "24px" : "28px",
                      backgroundColor: confColor,
                    }}
                    title={conf.conference_name}
                  />
                )}
                <span
                  className="text-xs font-semibold tabular-nums"
                  style={{ color: isSelected ? confColor : "#9ca3af" }}
                >
                  {conf.final_bids.toFixed(1)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
