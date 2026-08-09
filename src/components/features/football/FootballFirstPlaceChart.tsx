"use client";

import "@/lib/chartjs-setup";
import TeamLogo from "@/components/ui/TeamLogo";
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
import { ReactNode, useEffect, useRef, useState } from "react";
import { Line } from "react-chartjs-2";

// Matches the gradient/border/shadow "card" look used across the
// modernized Wins/Standings/CWV/etc. pages.
const CARD_CLASS =
  "relative border border-slate-200/90 dark:border-slate-700/90 rounded-[1.25rem] bg-gradient-to-br from-white to-[#fbfdff] dark:from-[#111827] dark:to-[#0f172a] shadow-[0_22px_55px_-36px_rgb(15_23_42_/_0.36),0_8px_22px_-18px_rgb(15_23_42_/_0.24)] dark:shadow-[0_24px_58px_-34px_rgb(0_0_0_/_0.82)]";

interface FirstPlaceData {
  team_name: string;
  date: string;
  first_place_pct: number;
  version_id?: string;
  team_info: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
}

interface FootballFirstPlaceChartProps {
  firstPlaceData: FirstPlaceData[];
  season?: string;
  headerRight?: ReactNode;
}

interface ChartDimensions {
  chartArea: ChartArea;
  canvas: HTMLCanvasElement;
}

interface TeamDataPoint {
  x: string;
  y: number;
}

interface TeamInfo {
  data: TeamDataPoint[];
  team_info: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
}

// Same focus-lens treatment as the conference-rankings-history chart: a
// transient guide band and a marker for every team at the hovered date.
const HOVER_LENS_PLUGIN: Plugin<"line"> = {
  id: "football-first-place-hover-lens",
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

export default function FootballFirstPlaceChart({
  firstPlaceData,
  season,
  headerRight,
}: FootballFirstPlaceChartProps) {
  const { isMobile } = useResponsive();
  const chartRef = useRef<ChartJS<"line", TeamDataPoint[], string> | null>(
    null,
  );
  const [chartDimensions, setChartDimensions] =
    useState<ChartDimensions | null>(null);
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
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
    setSelectedTeams(new Set());
  }, [firstPlaceData]);

  useEffect(() => {
    return () => {
      document.getElementById("chartjs-tooltip-firstplace")?.remove();
    };
  }, []);

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

    // ResizeObserver (not a one-shot timeout) keeps the end-of-line
    // markers/logos in sync with the actual canvas layout - see
    // PAGE_MODERNIZATION_GUIDE.md §8g.
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(canvas);
    updateDimensions();

    return () => observer.disconnect();
  }, [firstPlaceData]);

  const range = getFootballDateRange(season, firstPlaceData);
  const filteredFirstPlaceData = filterDataToRange(firstPlaceData, range);

  // Deduplicate by team and date, keeping earliest version_id
  const dataByTeamAndDate = new Map<string, FirstPlaceData>();
  filteredFirstPlaceData.forEach((item: FirstPlaceData) => {
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
    ...new Set(filteredFirstPlaceData.map((d) => d.date)),
  ].sort();
  const chartLabels = buildChartLabels(allDatesFromData, range, "football");
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
        y: item.first_place_pct,
      });
    }
  });

  const dates = chartLabels.map((l) => l.displayLabel);

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

  const datasets = Object.entries(teamData).map(([teamName, team]) => {
    // Show team if no teams are selected OR this team is in the selected set
    const isSelected = selectedTeams.size === 0 || selectedTeams.has(teamName);
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

  const chartData = {
    labels: dates,
    datasets,
  };

  const maxPct = (() => {
    const allValues = Object.values(teamData).flatMap((team) =>
      team.data.map((d: TeamDataPoint) => d.y),
    );
    if (allValues.length === 0) return 20;
    const maxValue = Math.max(...allValues);
    return Math.max(20, Math.ceil(maxValue / 10) * 10);
  })();

  const options = {
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
          let rows: TooltipRow[] = [];
          if (tooltipModel.body) {
            const dataIndex = tooltipModel.dataPoints[0].dataIndex;
            const displayDate = chartLabels[dataIndex]?.displayLabel;
            heading = displayDate ?? "";
            rows = Object.entries(teamData)
              .map(([teamName, team]) => {
                const dataPoint = team.data.find(
                  (d: TeamDataPoint) => d.x === displayDate,
                );
                return {
                  name: teamName,
                  pct: dataPoint?.y || 0,
                  color: team.team_info.primary_color || "#000000",
                  logoUrl:
                    team.team_info.logo_url ||
                    "/images/team_logos/default.png",
                };
              })
              .filter((team) => team.pct > 0)
              .sort((a, b) => b.pct - a.pct)
              .map((team, index) => ({
                label: `${index + 1}. ${team.name}`,
                value: `${Math.round(team.pct)}%`,
                color: team.color,
                logoUrl: team.logoUrl,
              }));
          }

          renderExternalTooltip(chart, tooltipModel, {
            id: "chartjs-tooltip-firstplace",
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
        grid: { display: false, drawOnChartArea: false, drawTicks: false },
        border: { display: false },
      },
      y: {
        title: {
          display: true,
          text: "First Place Probability (%)",
          color: isDark ? "#cbd5e1" : "#334155",
          font: {
            weight: 600,
            size: isMobile ? 13 : 15,
          },
        },
        min: 0,
        max: maxPct,
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
      padding: { left: 10, right: 70, top: 14 },
    },
    animation: {
      duration: 750,
    },
  };

  const chartHeight = isMobile ? 420 : 560;

  const getChartJsYPosition = (percentage: number) => {
    if (!chartDimensions?.chartArea) return null;
    const { top, bottom } = chartDimensions.chartArea;
    return top + ((maxPct - percentage) / maxPct) * (bottom - top);
  };

  const getAdjustedLogoPositions = () => {
    if (!chartDimensions) return [];
    const minSpacing = isMobile ? 21 : 25;
    const chartTop = chartDimensions.chartArea.top;
    const chartBottom = chartDimensions.chartArea.bottom - 15;

    // Show logos for teams that are either:
    // 1. Above threshold AND (no selection OR in selection)
    // 2. Below threshold but IN selection
    const visibleTeams =
      selectedTeams.size === 0
        ? teamsForLogos
        : allTeamsSorted.filter((t) => selectedTeams.has(t.team_name));

    const positions = visibleTeams.map((team) => ({
      team,
      idealY: getChartJsYPosition(team.final_pct) || 0,
      adjustedY: getChartJsYPosition(team.final_pct) || 0,
    }));

    // If only one team visible, don't adjust - use ideal position
    if (positions.length === 1) {
      return positions;
    }

    // Sort by final_pct descending (highest to lowest) to stack from top
    positions.sort((a, b) => b.team.final_pct - a.team.final_pct);

    // First pass: try to place all logos at their ideal positions
    for (let i = 0; i < positions.length; i++) {
      positions[i].adjustedY = positions[i].idealY;
    }

    // Second pass: adjust for collisions, working from top to bottom
    for (let i = positions.length - 1; i >= 0; i--) {
      if (positions[i].adjustedY > chartBottom) {
        positions[i].adjustedY = chartBottom;
      }
      if (positions[i].adjustedY < chartTop) {
        positions[i].adjustedY = chartTop;
      }

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

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 px-[1.35rem] pb-4 pt-5">
      <div
        className="flex min-w-0 items-center gap-3"
        data-screenshot-hide="true"
      >
        <h2 className="m-0 text-[clamp(1.25rem,2.2vw,1.75rem)] font-bold leading-[1.1] tracking-[-0.035em] text-slate-700 dark:text-slate-300">
          First Place Probability History (Over Time)
        </h2>
      </div>
      {headerRight && <div data-screenshot-hide="true">{headerRight}</div>}
    </div>
  );

  if (filteredFirstPlaceData.length === 0) {
    return (
      <div className={CARD_CLASS}>
        {header}
        <div className="flex h-64 items-center justify-center px-4 pb-5">
          <div className="text-gray-500 dark:text-gray-300">
            No first place probability data available
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={CARD_CLASS} style={{ zIndex: 10, isolation: "isolate" }}>
      {header}

      <div className="px-3 pb-2 sm:px-4">
        <div className="relative" style={{ height: chartHeight }}>
          <Line
            ref={chartRef}
            data={chartData}
            options={options}
            plugins={[HOVER_LENS_PLUGIN]}
            role="img"
            aria-label="First place probability history showing every team's chance of finishing in first place over time. Hover a date to see all teams ranked for that date."
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
                        className="ml-1.5 min-w-[30px] text-left text-xs font-medium tabular-nums"
                        style={{
                          color: isSelected
                            ? team.team_info.primary_color || "#000000"
                            : "#d1d5db",
                        }}
                      >
                        {Math.round(team.final_pct)}%
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
            const isExplicitlySelected = selectedTeams.has(team.team_name);
            return (
              <button
                key={team.team_name}
                type="button"
                aria-pressed={isSelected}
                aria-label={`${team.team_name}, final first place probability ${Math.round(team.final_pct)}%. Select to emphasize this team.`}
                onClick={() => handleTeamClick(team.team_name)}
                style={{
                  borderColor:
                    team.team_info.primary_color ||
                    (isDark ? "#475569" : "#cbd5e1"),
                }}
                className={cn(
                  "flex min-w-0 cursor-pointer flex-col items-center gap-0.5 rounded-xl border-2 bg-white/80 px-1 pb-1.5 pt-1 transition-[box-shadow,opacity,filter,background-color] hover:bg-slate-50 dark:bg-slate-900/60 dark:hover:bg-slate-800",
                  isExplicitlySelected &&
                    "ring-2 ring-sky-500/30 dark:ring-sky-400/40",
                  !isSelected && "opacity-30 grayscale",
                )}
              >
                <TeamLogo
                  logoUrl={
                    team.team_info.logo_url || "/images/team_logos/default.png"
                  }
                  teamName={team.team_name}
                  size={isMobile ? 24 : 28}
                />
                <span
                  className="text-xs font-semibold tabular-nums"
                  style={{
                    color: isSelected
                      ? team.team_info.primary_color || "#000000"
                      : "#9ca3af",
                  }}
                >
                  {Math.round(team.final_pct)}%
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
