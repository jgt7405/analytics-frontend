"use client";

// Registers the Chart.js scales/elements this chart needs. Every chart
// component must import this itself - lazy loading means no other module
// is guaranteed to have registered them first.
import "@/lib/chartjs-setup";

import { useFootballTeamAllHistory } from "@/hooks/useFootballTeamAllHistory";
import { useResponsive } from "@/hooks/useResponsive";
import {
  buildChartLabels,
  filterDataToRange,
  getFootballDateRange,
} from "@/lib/chartDateRange";
import { renderExternalTooltip, TooltipRow } from "@/lib/chartTooltip";
import type { Chart, ChartArea, PointStyle, TooltipModel } from "chart.js";
import {
  Chart as ChartJS,
} from "chart.js";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Line } from "react-chartjs-2";

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
  season?: string;
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
  season,
}: FootballTeamCFPProgressionHistoryProps) {
  const { isMobile } = useResponsive();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  const [data, setData] = useState<CFPProgressionDataPoint[]>([]);

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
    return () => {
      document.getElementById("cfp-progression-tooltip")?.remove();
    };
  }, []);

  const [chartArea, setChartArea] = useState<ChartArea | null>(null);

  // Use the master history hook
  const {
    data: allHistoryData,
    isLoading: loading,
    error: queryError,
  } = useFootballTeamAllHistory(teamName, season);

  const error = queryError?.message || null;


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

    const allData = Array.from(dataByDate.values()).map((item) => ({
      date: item.date!,
      team_name: item.team_name!,
      team_info: item.team_info!,
      cfp_quarterfinals_pct: item.cfp_quarterfinals_pct!,
      cfp_semifinals_pct: item.cfp_semifinals_pct!,
      cfp_championship_pct: item.cfp_championship_pct!,
      cfp_champion_pct: item.cfp_champion_pct!,
    }));

    const range = getFootballDateRange(season, allData);
    const finalData = filterDataToRange(allData, range).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    setData(finalData);
  }, [allHistoryData, teamName, season]);

  const finalSecondaryColor = secondaryColor
    ? secondaryColor.toLowerCase() === "#ffffff" ||
      secondaryColor.toLowerCase() === "white"
      ? "#000000"
      : secondaryColor
    : primaryColor === "#3b82f6"
      ? "#ef4444"
      : "#10b981";

  // Build chart labels and datasets
  const range = getFootballDateRange(season, data);
  const dataDates = data.map((item) => item.date);
  const chartLabels = buildChartLabels(dataDates, range, "football");
  const dataByDate = new Map(data.map((item) => [item.date, item]));

  // Get team logo from the first available data point
  const teamLogo = data.length > 0 ? data[0].team_info.logo_url : null;

  const quarterfinalsData = chartLabels.map((label) => {
    const point = dataByDate.get(label.isoDate);
    return point ? point.cfp_quarterfinals_pct : null;
  });
  const semifinalsData = chartLabels.map((label) => {
    const point = dataByDate.get(label.isoDate);
    return point ? point.cfp_semifinals_pct : null;
  });
  const championshipData = chartLabels.map((label) => {
    const point = dataByDate.get(label.isoDate);
    return point ? point.cfp_championship_pct : null;
  });
  const championData = chartLabels.map((label) => {
    const point = dataByDate.get(label.isoDate);
    return point ? point.cfp_champion_pct : null;
  });

  const lastQuarterfinals =
    [...quarterfinalsData].reverse().find((v) => v !== null) ?? null;
  const lastSemifinals =
    [...semifinalsData].reverse().find((v) => v !== null) ?? null;
  const lastChampionship =
    [...championshipData].reverse().find((v) => v !== null) ?? null;
  const lastChampion =
    [...championData].reverse().find((v) => v !== null) ?? null;

  // Tracks the end-of-line markers with a ResizeObserver (not a one-shot
  // timeout) so they stay aligned with the chart's actual current layout
  // (PAGE_MODERNIZATION_GUIDE.md §8g).
  useEffect(() => {
    const canvas = chartRef.current?.canvas;
    if (!canvas) return;

    const updateChartArea = () => {
      const area = chartRef.current?.chartArea;
      if (!area) return;
      setChartArea((prev: ChartArea | null) =>
        prev &&
        prev.top === area.top &&
        prev.right === area.right &&
        prev.bottom === area.bottom
          ? prev
          : { ...area },
      );
    };

    const observer = new ResizeObserver(updateChartArea);
    observer.observe(canvas);
    updateChartArea();

    return () => observer.disconnect();
  }, [data]);

  const chartData = {
    labels: chartLabels.map((l) => l.displayLabel),
    datasets: [
      {
        label: "Quarterfinals",
        data: quarterfinalsData,
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
        data: semifinalsData,
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
        data: championshipData,
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
        data: championData,
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
            size: isMobile ? 12 : 14,
            weight: 600,
          },
          color: isDark ? "#cbd5e1" : "#334155",
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

          let heading = "";
          let rows: TooltipRow[] = [];
          if (tooltipModel.body) {
            const dataIndex = tooltipModel.dataPoints[0].dataIndex;
            const label = chartLabels[dataIndex];
            const point = dataByDate.get(label.isoDate);
            if (point) {
              heading = label.displayLabel;
              rows = [
                {
                  label: "Champion",
                  value: `${point.cfp_champion_pct.toFixed(1)}%`,
                  color: primaryColor,
                },
                {
                  label: "Championship",
                  value: `${point.cfp_championship_pct.toFixed(1)}%`,
                  color: primaryColor,
                },
                {
                  label: "Semifinals",
                  value: `${point.cfp_semifinals_pct.toFixed(1)}%`,
                  color: finalSecondaryColor,
                },
                {
                  label: "Quarterfinals",
                  value: `${point.cfp_quarterfinals_pct.toFixed(1)}%`,
                  color: finalSecondaryColor,
                },
              ];
            }
          }

          renderExternalTooltip(chart, tooltipModel, {
            id: "cfp-progression-tooltip",
            isDark,
            heading,
            rows,
          });
        },
      },
    },
    scales: {
      x: {
        display: true,
        ticks: {
          color: isDark ? "#94a3b8" : "#475569",
          padding: 8,
          font: {
            size: isMobile ? 13 : 15,
            weight: 600,
          },
          maxTicksLimit: isMobile ? 8 : 12,
        },
        grid: {
          display: false,
        },
        border: { display: false },
      },
      y: {
        display: true,
        min: 0,
        max: 100,
        ticks: {
          color: isDark ? "#94a3b8" : "#475569",
          font: {
            size: isMobile ? 13 : 15,
            weight: 600,
          },
          stepSize: 20,
          callback: function (value: string | number) {
            return `${value}%`;
          },
        },
        title: {
          display: true,
          text: "CFP Progression %",
          color: isDark ? "#cbd5e1" : "#334155",
          font: { weight: 600, size: isMobile ? 13 : 15 },
        },
        grid: {
          color: isDark ? "rgb(51 65 85 / 0.5)" : "rgb(226 232 240 / 0.9)",
        },
        border: { display: false },
      },
    },
    layout: {
      padding: { top: 14, right: 12 },
    },
  };

  const chartHeight = isMobile ? 300 : 400;

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse text-gray-500 dark:text-gray-300">
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
        <div className="text-gray-500 dark:text-gray-300 text-sm">
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
      {chartArea && (
        <svg
          className="pointer-events-none absolute left-0 top-0"
          style={{ width: "100%", height: "100%", overflow: "visible" }}
        >
          {[
            { value: lastQuarterfinals, color: finalSecondaryColor, solid: false },
            { value: lastSemifinals, color: finalSecondaryColor, solid: true },
            { value: lastChampionship, color: primaryColor, solid: false },
            { value: lastChampion, color: primaryColor, solid: true },
          ].map(({ value, color, solid }, i) => {
            if (value === null) return null;
            const y = chartRef.current?.scales?.y?.getPixelForValue(value);
            if (y === undefined) return null;
            return (
              <circle
                key={i}
                cx={chartArea.right}
                cy={y}
                r="4.25"
                fill={solid ? color : isDark ? "#0f172a" : "#ffffff"}
                stroke={color}
                strokeWidth="2.5"
                style={{ filter: `drop-shadow(0 0 3px ${color})` }}
              />
            );
          })}
        </svg>
      )}
    </div>
  );
}
