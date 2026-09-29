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
import EndMarkers from "./EndMarkers";
import { createHoverLensPlugin } from "./hoverLens";
import type {
  LogoPosition,
  StandingsHistoryChartProps,
  StandingsHistoryTheme,
  TeamDataPoint,
  TeamInfo,
  TimelineData,
} from "./types";

// Matches the gradient/border/shadow "card" look used across the
// modernized Wins/Standings/CWV/etc. pages (§1; the chart follows §8).
// No `border` property: a real `border` combined with this element's
// `border-radius` can hit a Windows Chrome/Edge sub-pixel rasterization
// artifact (zoom-dependent dark corner/edge fringe, invisible to
// computed-style checks). The 1px ring is folded into the shadow stack as
// an inset layer instead - same visual result, different rasterization path.
const CARD_CLASS =
  "relative rounded-[1.25rem] bg-gradient-to-br from-white to-[#fbfdff] dark:from-[#111827] dark:to-[#0f172a] shadow-[inset_0_0_0_1px_rgb(226_232_240_/_0.9),0_22px_55px_-36px_rgb(15_23_42_/_0.36),0_8px_22px_-18px_rgb(15_23_42_/_0.24)] dark:shadow-[inset_0_0_0_1px_rgb(51_65_85_/_0.9),0_24px_58px_-34px_rgb(0_0_0_/_0.82)]";

interface ChartDimensions {
  chartArea: ChartArea;
  canvas: HTMLCanvasElement;
}

// Conference rankings history, shared by basketball and football. The sport
// adapters (BballStandingsHistoryChart, FootballStandingsHistoryChart) pass a
// theme with the few things that differ.
export default function StandingsHistoryChart({
  timelineData,
  conferenceSize,
  season,
  headerRight,
  theme,
}: StandingsHistoryChartProps & { theme: StandingsHistoryTheme }) {
  const { tooltipId, lensPluginId } = theme;
  const hoverLensPlugin = useMemo(
    () => createHoverLensPlugin(lensPluginId),
    [lensPluginId],
  );
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

    // ResizeObserver (rather than a one-shot timeout) keeps the SVG
    // end-of-line markers and logo overlay in sync with the actual canvas
    // layout - see PAGE_MODERNIZATION_GUIDE.md §8g.
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(canvas);
    updateDimensions();

    return () => observer.disconnect();
  }, [timelineData, conferenceSize]);

  const range = theme.dateRange(season, timelineData);
  const filteredTimelineData = filterDataToRange(timelineData, range);

  // Deduplicate by team and date, keeping earliest version_id
  const dataByTeamAndDate = new Map<string, TimelineData>();
  filteredTimelineData.forEach((item: TimelineData) => {
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
    ...new Set(filteredTimelineData.map((d) => d.date)),
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
        y: item.avg_standing,
      });
    }
  });

  const dates = chartLabels.map((l) => l.displayLabel);

  const allDates = [...new Set(filteredTimelineData.map((d) => d.date))].sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime(),
  );
  const lastDate = allDates[allDates.length - 1];
  const finalStandings = filteredTimelineData
    .filter((item) => item.date === lastDate)
    .sort((a, b) => a.avg_standing - b.avg_standing);

  // All teams sorted by final standing for bottom logos
  const allTeamsSorted = finalStandings.map((item) => {
    const points = teamData[item.team_name]?.data || [];
    const lastPoint = points[points.length - 1];
    return {
      team_name: item.team_name,
      avg_standing: lastPoint?.y ?? item.avg_standing,
      team_info: item.team_info,
    };
  });

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
    };
  });

  const chartData = {
    labels: dates,
    datasets,
  };

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
            const isoDate = chartLabels[dataIndex]?.isoDate;
            heading = chartLabels[dataIndex]?.displayLabel ?? "";
            rows = filteredTimelineData
              .filter((item) => item.date === isoDate)
              .sort((a, b) => a.avg_standing - b.avg_standing)
              .map((item, index) => ({
                label: `${index + 1}. ${item.team_name}`,
                value: item.avg_standing.toFixed(1),
                color: item.team_info.primary_color || "#000000",
                logoUrl:
                  item.team_info.logo_url || "/images/team_logos/default.png",
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
        grid: { display: false, drawOnChartArea: false, drawTicks: false },
        border: { display: false },
      },
      y: {
        title: {
          display: true,
          text: "Average Standing",
          color: isDark ? "#cbd5e1" : "#334155",
          font: {
            weight: 600,
            size: isMobile ? 13 : 15,
          },
        },
        reverse: true,
        min: 1,
        max: conferenceSize,
        ticks: {
          stepSize: 1,
          color: isDark ? "#94a3b8" : "#475569",
          font: {
            weight: 600,
            size: isMobile ? 13 : 15,
          },
          callback: function (value: string | number) {
            return Number(value);
          },
        },
        grid: {
          color: isDark ? "rgb(51 65 85 / 0.5)" : "rgb(226 232 240 / 0.9)",
        },
        border: { display: false },
      },
    },
    layout: {
      padding: { left: 10, right: 76, top: 14 },
    },
    animation: {
      duration: 750,
    },
  };

  const chartHeight = isMobile ? 420 : 560;

  const getChartJsYPosition = (standing: number) => {
    if (!chartDimensions?.chartArea) return null;
    const { top, bottom } = chartDimensions.chartArea;
    return top + ((standing - 1) / (conferenceSize - 1)) * (bottom - top);
  };

  const getAdjustedLogoPositions = (): LogoPosition[] => {
    if (!chartDimensions) return [];

    const minSpacing = isMobile ? 21 : 25;
    const chartTop = chartDimensions.chartArea.top;
    const chartBottom = chartDimensions.chartArea.bottom - 15;

    // Show logos for teams that are either all teams OR selected teams
    const visibleTeams =
      selectedTeams.size === 0
        ? finalStandings
        : finalStandings.filter((team) => selectedTeams.has(team.team_name));

    const positions = visibleTeams.map((team) => {
      const teamDataPoint = teamData[team.team_name];
      const lastPoint = teamDataPoint?.data[teamDataPoint.data.length - 1];
      const idealY =
        getChartJsYPosition(lastPoint?.y || team.avg_standing) || 0;

      return {
        team,
        idealY,
        adjustedY: idealY,
      };
    });

    // If only one team visible, don't adjust - use ideal position
    if (positions.length === 1) {
      return positions;
    }

    positions.sort((a, b) => a.team.avg_standing - b.team.avg_standing);

    for (let i = 1; i < positions.length; i++) {
      const currentPos = positions[i];
      const prevPos = positions[i - 1];

      if (currentPos.adjustedY - prevPos.adjustedY < minSpacing) {
        currentPos.adjustedY = prevPos.adjustedY + minSpacing;
      }

      if (currentPos.adjustedY > chartBottom) {
        currentPos.adjustedY = chartBottom;
      }
      if (currentPos.adjustedY < chartTop) {
        currentPos.adjustedY = chartTop;
      }
    }

    return positions;
  };

  return (
    <div className={CARD_CLASS} style={{ zIndex: 10, isolation: "isolate" }}>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 px-[1.35rem] pb-4 pt-5">
        <div
          className="flex min-w-0 items-center gap-3"
          data-screenshot-hide="true"
        >
          <h2 className="m-0 text-[clamp(1.25rem,2.2vw,1.75rem)] font-bold leading-[1.1] tracking-[-0.035em] text-slate-700 dark:text-slate-300">
            Conference Rankings History
            <span className="block text-xs font-normal text-gray-500 dark:text-gray-300 sm:inline sm:ml-1.5 sm:text-sm">
              (Over Time)
            </span>
          </h2>
        </div>
        {headerRight && <div data-screenshot-hide="true">{headerRight}</div>}
      </div>

      <div className="px-3 pb-2 sm:px-4">
        <div
          className="relative"
          style={{ height: `${chartHeight}px`, overflow: "visible" }}
        >
          <Line
            ref={chartRef}
            data={chartData}
            options={options}
            plugins={[hoverLensPlugin]}
            role="img"
            aria-label="Conference rankings history showing every team's average standing over time. Hover a date to see all teams ranked for that date."
          />

          {chartDimensions && (
            <EndMarkers
              positions={getAdjustedLogoPositions()}
              chartArea={chartDimensions.chartArea}
              teamData={teamData}
              selectedTeams={selectedTeams}
              isDark={isDark}
              isMobile={isMobile}
              endLabelClassName={theme.endLabelClassName}
            />
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
                aria-label={`${team.team_name}, final standing ${team.avg_standing.toFixed(1)}. Select to emphasize this team.`}
                onClick={() => handleTeamClick(team.team_name)}
                style={{
                  // Inset box-shadow instead of a real `border` - see the
                  // CARD_CLASS comment above for why.
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
                  {team.avg_standing.toFixed(1)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
