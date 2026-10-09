"use client";

// Registers the Chart.js scales/elements this chart needs. Every chart
// component must import this itself - lazy loading means no other module
// is guaranteed to have registered them first.
import "@/lib/chartjs-setup";

import TeamLogo from "@/components/ui/TeamLogo";
import { buildChartLabels, filterDataToRange } from "@/lib/chartDateRange";
import { renderExternalTooltip, TooltipRow } from "@/lib/chartTooltip";
import { cn } from "@/lib/utils";
import { useResponsive } from "@/hooks/useResponsive";
import type { Chart } from "chart.js";
import { ChartArea, Chart as ChartJS, TooltipModel } from "chart.js";
import { RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import { HISTORY_CARD_CLASS } from "../history-chart/card";
import { createHoverLensPlugin } from "../history-chart/hoverLens";
import { useIsDark } from "../history-chart/useIsDark";
import {
  layoutEndLogos,
  layoutEndLogosCascade,
  tooltipRows,
  valueOf,
} from "./data";
import type {
  ProbabilityHistoryChartProps,
  ProbabilityRow,
  ProbabilityTheme,
  TeamDataPoint,
  TeamInfo,
} from "./types";

interface ChartDimensions {
  chartArea: ChartArea;
  canvas: HTMLCanvasElement;
}

// Team probability history (first place, conference champion, championship
// game), shared by basketball and football. The adapters
// (BballFirstPlaceHistoryChart, FootballFirstPlaceChart,
// BasketballConfChampionHistoryChart, FootballConfChampionHistoryChart,
// FootballChampGameHistoryChart) pass their rows and a theme with what
// differs.
export default function ProbabilityHistoryChart({
  rows,
  season,
  headerRight,
  theme,
}: ProbabilityHistoryChartProps & { theme: ProbabilityTheme }) {
  const { tooltipId, lensPluginId, formatPct, valueKey } = theme;
  const chartPlugins = useMemo(
    () => (lensPluginId ? [createHoverLensPlugin(lensPluginId)] : []),
    [lensPluginId],
  );
  const { isMobile } = useResponsive();
  const chartRef = useRef<ChartJS<"line", TeamDataPoint[], string> | null>(
    null,
  );
  const [chartDimensions, setChartDimensions] =
    useState<ChartDimensions | null>(null);
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const isDark = useIsDark();

  useEffect(() => {
    setSelectedTeams((prev) => (prev.size === 0 ? prev : new Set()));
  }, [rows]);

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

    // ResizeObserver (rather than a one-shot timeout) keeps the SVG
    // end-of-line markers and logo overlay in sync with the actual canvas
    // layout - see PAGE_MODERNIZATION_GUIDE.md §8g.
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(canvas);
    updateDimensions();

    return () => observer.disconnect();
  }, [rows]);

  // Everything below derives from the data alone. Memoized so a re-render
  // for layout (chartDimensions) or selection doesn't hand Chart.js new
  // objects: react-chartjs-2 re-runs the whole chart update for any new
  // data/options object, ~0.3-0.8 s on a mid-range phone.
  const {
    filteredRows,
    chartLabels,
    teamData,
    displayLabels,
    teamsForLogos,
    allTeamsSorted,
  } = useMemo(() => {
    const range = theme.dateRange(season, rows);
    const filteredRows = filterDataToRange(rows, range);

    // Deduplicate by team and date, keeping earliest version_id
    const dataByTeamAndDate = new Map<string, ProbabilityRow>();
    filteredRows.forEach((item: ProbabilityRow) => {
      const key = `${item.team_name}-${item.date}`;
      if (
        !dataByTeamAndDate.has(key) ||
        (item.version_id &&
          dataByTeamAndDate.get(key)?.version_id &&
          item.version_id < dataByTeamAndDate.get(key)!.version_id!)
      ) {
        dataByTeamAndDate.set(key, item);
      }
    });

    const allDatesFromData = [
      ...new Set(filteredRows.map((d) => d.date)),
    ].sort();
    const chartLabels = buildChartLabels(allDatesFromData, range, theme.sport);
    const dateIndexMap = new Map(chartLabels.map((l, i) => [l.isoDate, i]));

    // Build team data from deduplicated items with remapped dates
    const teamData: Record<string, TeamInfo> = {};
    Array.from(dataByTeamAndDate.values()).forEach((item) => {
      if (!teamData[item.team_name]) {
        teamData[item.team_name] = {
          data: [],
          team_info: item.team_info,
        };
      }
      const dataIndex = dateIndexMap.get(item.date);
      if (dataIndex !== undefined) {
        teamData[item.team_name].data.push({
          x: chartLabels[dataIndex].displayLabel,
          y: valueOf(item, valueKey),
        });
      }
    });

    const displayLabels = chartLabels.map((l) => l.displayLabel);

    const teamsForLogos = Object.entries(teamData)
      .map(([teamName, team]) => {
        const finalPct = team.data[team.data.length - 1]?.y || 0;
        return {
          team_name: teamName,
          final_pct: finalPct,
          team_info: team.team_info,
          should_show: finalPct >= 3,
        };
      })
      .filter((team) => team.should_show)
      .sort((a, b) => b.final_pct - a.final_pct);

    // All teams sorted by final percentage for bottom logos
    const allTeamsSorted = Object.entries(teamData)
      .map(([teamName, team]) => {
        const finalPct = team.data[team.data.length - 1]?.y || 0;
        return {
          team_name: teamName,
          final_pct: finalPct,
          team_info: team.team_info,
        };
      })
      .sort((a, b) => b.final_pct - a.final_pct);

    return {
      filteredRows,
      chartLabels,
      teamData,
      displayLabels,
      teamsForLogos,
      allTeamsSorted,
    };
  }, [rows, season, theme, valueKey]);

  const clearSelectedTeams = () => setSelectedTeams(new Set());

  const handleTeamClick = (teamName: string) => {
    setSelectedTeams((prev) => {
      const newSet = new Set(prev);

      // If all teams are currently selected (none explicitly selected)
      if (newSet.size === 0) {
        // Select only this team
        newSet.add(teamName);
      } else if (newSet.has(teamName)) {
        // If this team is selected, deselect it
        newSet.delete(teamName);
        // If no teams left selected, show all teams
        if (newSet.size === 0) {
          return new Set();
        }
      } else {
        // Add this team to the selection
        newSet.add(teamName);
      }

      return newSet;
    });
  };

  const chartData = useMemo(() => {
    const datasets = Object.entries(teamData).map(([teamName, team]) => {
      const isSelected =
        selectedTeams.size === 0 || selectedTeams.has(teamName);
      const color = isSelected
        ? team.team_info.primary_color || "#000000"
        : "#d1d5db";

      return {
        label: teamName,
        data: team.data,
        borderColor: color,
        backgroundColor: color,
        borderWidth: isSelected ? 2.25 : 1.1,
        order: isSelected ? 0 : 1,
        pointRadius: 0,
        pointHoverRadius: 0,
        tension: 0.1,
        fill: false,
      };
    });

    return {
      labels: displayLabels,
      datasets,
    };
  }, [teamData, displayLabels, selectedTeams]);

  const yAxisMax = useMemo(() => {
    const allValues = Object.values(teamData).flatMap((team) =>
      team.data.map((d: TeamDataPoint) => d.y),
    );
    const maxValue = allValues.length > 0 ? Math.max(...allValues) : 0;
    return Math.max(20, Math.ceil(maxValue / 10) * 10);
  }, [teamData]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index" as const,
        intersect: false,
      },
      plugins: {
        title: { display: false },
        legend: { display: false },
        tooltip: {
          enabled: false,
          external: (args: { chart: Chart; tooltip: TooltipModel<"line"> }) => {
            const { tooltip: tooltipModel, chart } = args;

            let heading = "";
            let lines: TooltipRow[] = [];
            if (tooltipModel.body) {
              const dataIndex = tooltipModel.dataPoints[0].dataIndex;
              heading = chartLabels[dataIndex]?.displayLabel ?? "";
              lines = tooltipRows(
                theme,
                chartLabels[dataIndex] ?? {},
                filteredRows,
                teamData,
              );
            }

            renderExternalTooltip(chart, tooltipModel, {
              id: tooltipId,
              isDark,
              heading,
              rows: lines,
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
          grid: { display: false, drawOnChartArea: false, drawTicks: false },
          border: { display: false },
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
          max: yAxisMax,
          ticks: {
            color: isDark ? "#94a3b8" : "#475569",
            font: {
              weight: 600,
              size: isMobile ? 13 : 15,
            },
            callback: (value: string | number) => `${value}%`,
          },
          grid: {
            color: isDark ? "rgb(51 65 85 / 0.5)" : "rgb(226 232 240 / 0.9)",
          },
          border: { display: false },
        },
      },
      layout: {
        padding: { left: 10, right: theme.rightPadding, top: 14 },
      },
      animation: {
        duration: 750,
      },
    }),
    [
      chartLabels,
      filteredRows,
      teamData,
      theme,
      tooltipId,
      isDark,
      isMobile,
      yAxisMax,
    ],
  );

  const chartHeight = isMobile ? 420 : 560;

  const getChartJsYPosition = (percentage: number) => {
    if (!chartDimensions?.chartArea) return null;
    const { top, bottom } = chartDimensions.chartArea;
    return top + ((yAxisMax - percentage) / yAxisMax) * (bottom - top);
  };

  const getAdjustedLogoPositions = () => {
    if (!chartDimensions) return [];
    const minSpacing = isMobile
      ? theme.logoSpacing.mobile
      : theme.logoSpacing.desktop;
    const chartTop = chartDimensions.chartArea.top;
    const chartBottom = chartDimensions.chartArea.bottom - 15;

    // Show logos for teams that are either:
    // 1. Above threshold AND (no selection OR in selection)
    // 2. Below threshold but IN selection
    const visibleTeams =
      selectedTeams.size === 0
        ? teamsForLogos
        : allTeamsSorted.filter((t) => selectedTeams.has(t.team_name));

    const layout =
      theme.logoLayout === "cascade" ? layoutEndLogosCascade : layoutEndLogos;
    return layout(
      visibleTeams,
      (pct) => getChartJsYPosition(pct) || 0,
      { top: chartTop, bottom: chartBottom },
      minSpacing,
    );
  };

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
      {headerRight && <div data-screenshot-hide="true">{headerRight}</div>}
    </div>
  );

  if (filteredRows.length === 0) {
    if (theme.emptyState === "bare") {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-300">
            {theme.emptyText}
          </div>
        </div>
      );
    }
    return theme.emptyState === "compact" ? (
      <div className={HISTORY_CARD_CLASS} style={{ isolation: "isolate" }}>
        {header}
        <div className="flex items-center justify-center px-4 pb-6 text-gray-500 dark:text-gray-300">
          {theme.emptyText}
        </div>
      </div>
    ) : (
      <div className={HISTORY_CARD_CLASS}>
        {header}
        <div className="flex h-64 items-center justify-center px-4 pb-5">
          <div className="text-gray-500 dark:text-gray-300">
            {theme.emptyText}
          </div>
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
          className="relative"
          style={{ height: `${chartHeight}px`, overflow: "visible" }}
        >
          <Line
            ref={chartRef}
            data={chartData}
            options={options}
            plugins={chartPlugins}
            role="img"
            aria-label={theme.ariaLabel}
          />

          {chartDimensions && (
            <div
              className="pointer-events-none absolute left-0 top-0"
              style={{ width: "100%", height: "100%" }}
            >
              {getAdjustedLogoPositions().map(({ team, idealY, adjustedY }) => {
                const isSelected =
                  selectedTeams.size === 0 || selectedTeams.has(team.team_name);
                const teamColor = isSelected
                  ? team.team_info.primary_color || "#94a3b8"
                  : "#d1d5db";

                return (
                  <div key={`end-${team.team_name}`}>
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
                        stroke={teamColor}
                        strokeWidth="1"
                        strokeDasharray="2,2"
                        opacity="0.7"
                      />
                      <circle
                        cx={chartDimensions.chartArea.right}
                        cy={idealY}
                        r="8"
                        fill={teamColor}
                        opacity={isDark ? "0.24" : "0.18"}
                      />
                      <circle
                        cx={chartDimensions.chartArea.right}
                        cy={idealY}
                        r="4.25"
                        fill={isDark ? "#0f172a" : "#ffffff"}
                        stroke={teamColor}
                        strokeWidth="2.5"
                        style={{
                          filter: `drop-shadow(0 0 3px ${teamColor})`,
                        }}
                      />
                      <circle
                        cx={chartDimensions.chartArea.right}
                        cy={idealY}
                        r="1.75"
                        fill={teamColor}
                      />
                    </svg>
                  </div>
                );
              })}

              <div className="absolute inset-0">
                {getAdjustedLogoPositions().map(({ team, adjustedY }) => {
                  const isSelected =
                    selectedTeams.size === 0 ||
                    selectedTeams.has(team.team_name);

                  return (
                    <div
                      key={`logo-${team.team_name}`}
                      className="absolute flex items-center"
                      style={{
                        left: `${chartDimensions.chartArea.right + 8}px`,
                        top: `${adjustedY - 10}px`,
                        zIndex: 10,
                        opacity: isSelected ? 1 : 0.3,
                      }}
                    >
                      <div
                        style={{
                          filter: isSelected ? "none" : "grayscale(100%)",
                        }}
                      >
                        <TeamLogo
                          logoUrl={
                            team.team_info.logo_url ||
                            "/images/team_logos/default.png"
                          }
                          teamName={team.team_name}
                          size={isMobile ? 18 : 20}
                        />
                      </div>
                      <span
                        className={`${theme.endLabelClassName} text-left text-xs font-medium leading-none tabular-nums`}
                        style={{
                          color: isSelected
                            ? team.team_info.primary_color || "#000000"
                            : "#d1d5db",
                          alignSelf: "stretch",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        {formatPct(team.final_pct)}
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
            Select teams to emphasize
          </p>
          {selectedTeams.size > 0 && (
            <button
              type="button"
              onClick={clearSelectedTeams}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-red-400/50 dark:hover:bg-red-950/30 dark:hover:text-red-400"
            >
              <RotateCcw className="h-3 w-3" />
              Show All
            </button>
          )}
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(56px,1fr))] gap-1.5 sm:gap-2">
          {allTeamsSorted.map((team) => {
            const isSelected =
              selectedTeams.size === 0 || selectedTeams.has(team.team_name);
            return (
              <button
                key={team.team_name}
                type="button"
                aria-pressed={isSelected}
                aria-label={`${team.team_name}, final ${theme.chipValueName} ${formatPct(team.final_pct)}. Select to emphasize this team.`}
                onClick={() => handleTeamClick(team.team_name)}
                style={{
                  boxShadow: `inset 0 0 0 1px ${
                    team.team_info.primary_color ||
                    (isDark ? "#475569" : "#cbd5e1")
                  }`,
                }}
                className={cn(
                  "flex min-w-0 cursor-pointer appearance-none flex-col items-center gap-0.5 rounded-xl bg-white/80 px-1 pb-1.5 pt-1 transition-[box-shadow,background-color] hover:bg-slate-50 dark:bg-slate-900/60 dark:hover:bg-slate-800",
                  !isSelected && "opacity-30 grayscale",
                )}
              >
                <TeamLogo
                  logoUrl={
                    team.team_info.logo_url || "/images/team_logos/default.png"
                  }
                  teamName={team.team_name}
                  size={isMobile ? 24 : 28}
                  noLink
                />
                <span
                  className="text-xs font-semibold tabular-nums"
                  style={{
                    color: isSelected
                      ? team.team_info.primary_color || "#000000"
                      : "#9ca3af",
                  }}
                >
                  {formatPct(team.final_pct)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
