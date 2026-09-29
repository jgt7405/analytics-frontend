"use client";

// Registers the Chart.js scales/elements this chart needs. Every chart
// component must import this itself - lazy loading means no other module
// is guaranteed to have registered them first.
import "@/lib/chartjs-setup";

import { buildChartLabels, filterDataToRange } from "@/lib/chartDateRange";
import { renderExternalTooltip, TooltipRow } from "@/lib/chartTooltip";
import { useResponsive } from "@/hooks/useResponsive";
import type { Chart } from "chart.js";
import { ChartArea, Chart as ChartJS, TooltipModel } from "chart.js";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import { HISTORY_CARD_CLASS } from "../history-chart/card";
import { createHoverLensPlugin } from "../history-chart/hoverLens";
import { useIsDark } from "../history-chart/useIsDark";
import ConferenceChips from "./ConferenceChips";
import { layoutEndLogos } from "./data";
import type {
  ConferenceEnd,
  ConferenceSeries,
  ConfBidsHistoryChartProps,
  ConfBidsTheme,
} from "./types";

interface ChartDimensions {
  chartArea: ChartArea;
  canvas: HTMLCanvasElement;
}

// Conference bid trends (NCAA tournament or CFP), shared by basketball and
// football. The sport adapters (BballConfBidsHistoryChart,
// FootballConfBidsHistoryChart) map their rows to ConfHistoryRow and pass a
// theme with what differs.
export default function ConfBidsHistoryChart({
  timelineData,
  season,
  theme,
}: ConfBidsHistoryChartProps & { theme: ConfBidsTheme }) {
  const { tooltipId, lensPluginId } = theme;
  const hoverLensPlugin = useMemo(
    () => createHoverLensPlugin(lensPluginId),
    [lensPluginId],
  );
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
  const isDark = useIsDark();

  useEffect(() => {
    setSelectedConferences(new Set());
  }, [timelineData]);

  useEffect(() => {
    return () => {
      document.getElementById(tooltipId)?.remove();
    };
  }, [tooltipId]);

  useEffect(() => {
    const canvas = chartRef.current?.canvas;
    if (!canvas) return;

    const updateDimensions = () => {
      if (chartRef.current?.chartArea && chartRef.current?.canvas) {
        const area = chartRef.current.chartArea;
        setChartDimensions((prev) => {
          if (
            prev &&
            prev.chartArea.top === area.top &&
            prev.chartArea.bottom === area.bottom &&
            prev.chartArea.left === area.left &&
            prev.chartArea.right === area.right
          ) {
            return prev;
          }
          return { chartArea: area, canvas: chartRef.current!.canvas };
        });
      }
    };

    // A ResizeObserver (rather than a one-shot timeout) keeps the SVG
    // end-of-line markers and logo overlay in sync with the actual
    // canvas layout - see PAGE_MODERNIZATION_GUIDE.md §8g.
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(canvas);
    updateDimensions();

    return () => observer.disconnect();
  }, [timelineData, season]);

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 px-[1.35rem] pb-4 pt-5">
      <div
        className="flex min-w-0 items-center gap-3"
        data-screenshot-hide="true"
      >
        <h2 className="m-0 text-[clamp(1.25rem,2.2vw,1.75rem)] font-bold leading-[1.1] tracking-[-0.035em] text-slate-700 dark:text-slate-300">
          {theme.title}
          <span className="block text-xs font-normal text-gray-500 dark:text-gray-300 sm:inline sm:ml-1.5 sm:text-sm">
            (Over Time)
          </span>
        </h2>
      </div>
    </div>
  );

  if (!timelineData || timelineData.length === 0) {
    return (
      <div className={HISTORY_CARD_CLASS}>
        {header}
        <div className="flex h-64 items-center justify-center px-4 pb-5">
          <p className="text-gray-500 dark:text-gray-300">
            No history data available.
          </p>
        </div>
      </div>
    );
  }

  const range = theme.dateRange(season, timelineData);
  const inRange = filterDataToRange(timelineData, range);
  const filteredData = theme.prepareRows ? theme.prepareRows(inRange) : inRange;

  const sortedData = filteredData.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const allDatesFromData = [...new Set(sortedData.map((d) => d.date))].sort();
  const chartLabels = buildChartLabels(allDatesFromData, range, theme.sport);
  const dateIndexMap = new Map(chartLabels.map((l, i) => [l.isoDate, i]));

  // Build conference data with remapped dates
  const confData: Record<string, ConferenceSeries> = {};
  sortedData.forEach((item) => {
    if (!confData[item.conference]) {
      confData[item.conference] = {
        data: [],
        conference_info: item.conference_info,
      };
    }
    const dataIndex = dateIndexMap.get(item.date);
    if (dataIndex !== undefined) {
      confData[item.conference].data.push({
        x: chartLabels[dataIndex].displayLabel,
        y: item.avg_bids,
      });
    }
  });

  const allDates = chartLabels.map((l) => l.displayLabel);

  // End-of-line logos only for conferences the sport's threshold keeps, so
  // near-zero entries don't clutter the right margin.
  const conferencesForLogos = Object.entries(confData)
    .map(([confName, conf]): ConferenceEnd => {
      const finalBids = conf.data[conf.data.length - 1]?.y || 0;
      return {
        conference: confName,
        final_bids: finalBids,
        conference_info: conf.conference_info,
      };
    })
    .filter((conf) => theme.showsEndLogo(conf.final_bids))
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
      ? conf.conference_info.primary_color || "#666666"
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
                  color: conf.conference_info.primary_color || "#666666",
                  logoUrl: conf.conference_info.logo_url,
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
            id: tooltipId,
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
          text: theme.yAxisLabel,
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
    const chartTop = chartDimensions.chartArea.top;
    const chartBottom = chartDimensions.chartArea.bottom;

    // Show logos for conferences that are either:
    // 1. Above threshold AND (no selection OR in selection)
    // 2. Below threshold but IN selection
    const visibleConferences =
      selectedConferences.size === 0
        ? conferencesForLogos
        : allConferencesSorted.filter((c) =>
            selectedConferences.has(c.conference),
          );

    return layoutEndLogos(
      visibleConferences,
      (bids) => getChartJsYPosition(bids) || 0,
      { top: chartTop, bottom: chartBottom },
      theme.logoSpacing,
    );
  };

  const logoPositions = getAdjustedLogoPositions();

  if (datasets.length === 0) {
    return (
      <div className={HISTORY_CARD_CLASS}>
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
    <div
      className={HISTORY_CARD_CLASS}
      style={{ zIndex: 10, isolation: "isolate" }}
    >
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
            plugins={[hoverLensPlugin]}
            role="img"
            aria-label={theme.ariaLabel}
          />

          {chartDimensions && (
            <div
              className="pointer-events-none absolute left-0 top-0"
              style={{ width: "100%", height: "100%" }}
            >
              {logoPositions.map(({ conf, idealY, adjustedY }) => {
                const isSelected =
                  selectedConferences.size === 0 ||
                  selectedConferences.has(conf.conference);
                const confColor = isSelected
                  ? conf.conference_info.primary_color || "#94a3b8"
                  : "#d1d5db";

                return (
                  <div key={`end-${conf.conference}`}>
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
                    selectedConferences.has(conf.conference);
                  const confColor = isSelected
                    ? conf.conference_info.primary_color || "#94a3b8"
                    : "#d1d5db";
                  const logoUrl = conf.conference_info.logo_url;

                  return (
                    <div
                      key={`logo-${conf.conference}`}
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
                          alt={conf.conference}
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
                              fallback.title = conf.conference;
                              parent.appendChild(fallback);
                            }
                          }}
                          title={conf.conference}
                        />
                      ) : (
                        <div
                          className="h-5 w-5 rounded border"
                          style={{ backgroundColor: confColor }}
                          title={conf.conference}
                        />
                      )}
                      <span
                        className={`${theme.endLabelClassName} min-w-[30px] text-left text-xs font-medium leading-none tabular-nums`}
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

      <ConferenceChips
        conferences={allConferencesSorted}
        selectedConferences={selectedConferences}
        onToggle={handleConferenceClick}
        onClear={clearSelectedConferences}
        isDark={isDark}
        isMobile={isMobile}
      />
    </div>
  );
}
