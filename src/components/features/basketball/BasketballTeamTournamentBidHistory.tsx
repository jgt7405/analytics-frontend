"use client";

import { useBasketballTeamAllHistory } from "@/hooks/useBasketballTeamAllHistory";
import { useResponsive } from "@/hooks/useResponsive";
import {
  buildChartLabels,
  filterDataToRange,
  getBasketballDateRange,
} from "@/lib/chartDateRange";
import {
  Chart as ChartJS,
  type TooltipItem,
} from "chart.js";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Line } from "react-chartjs-2";

interface TournamentHistoricalDataPoint {
  date: string;
  tournament_bid_pct: number;
  average_seed: number;
  team_name: string;
  team_info: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
}

interface BasketballTeamTournamentBidHistoryProps {
  teamName: string;
  primaryColor?: string;
  secondaryColor?: string;
  season?: string;
}

export default function BasketballTeamTournamentBidHistory({
  teamName,
  primaryColor = "#3b82f6",
  secondaryColor,
  season,
}: BasketballTeamTournamentBidHistoryProps) {
  const { isMobile } = useResponsive();
  const chartRef = useRef<ChartJS<"line", (number | null)[], string> | null>(
    null
  );
  const [data, setData] = useState<TournamentHistoricalDataPoint[]>([]);

  const {
    data: allHistoryData,
    isLoading: loading,
    error: queryError,
  } = useBasketballTeamAllHistory(teamName, season);

  const error = queryError?.message || null;

  const parseDateCentralTime = (dateString: string) => {
    const [year, month, day] = dateString.split("-").map(Number);
    const centralDate = new Date(year, month - 1, day, 12, 0, 0);
    return centralDate;
  };

  useEffect(() => {
    if (!allHistoryData?.ncaa) {
      setData([]);
      return;
    }

    const ncaaData = allHistoryData.ncaa;
    const dataByDate = new Map<string, TournamentHistoricalDataPoint>();

    const tournamentBidData = ncaaData.tournament_bid_data || [];
    const avgSeedData = ncaaData.average_seed_data || [];

    tournamentBidData.forEach((point: any) => {
      dataByDate.set(point.date, {
        date: point.date,
        tournament_bid_pct: point.tournament_bid_pct || 0,
        average_seed: 0,
        team_name: point.team_name,
        team_info: point.team_info || {},
      });
    });

    avgSeedData.forEach((point: any) => {
      if (dataByDate.has(point.date)) {
        const existingPoint = dataByDate.get(point.date)!;
        existingPoint.average_seed = point.average_seed || 0;
      } else {
        dataByDate.set(point.date, {
          date: point.date,
          tournament_bid_pct: 0,
          average_seed: point.average_seed || 0,
          team_name: point.team_name,
          team_info: point.team_info || {},
        });
      }
    });

    const range = getBasketballDateRange(season, Array.from(dataByDate.values()));
    const filteredData = filterDataToRange(
      Array.from(dataByDate.values()),
      range
    );

    const processedData = filteredData.sort((a, b) => {
      const dateA = parseDateCentralTime(a.date);
      const dateB = parseDateCentralTime(b.date);
      return dateA.getTime() - dateB.getTime();
    });

    setData(processedData);
  }, [allHistoryData, teamName, season]);

  const finalSecondaryColor = secondaryColor
    ? secondaryColor.toLowerCase() === "#ffffff" ||
      secondaryColor.toLowerCase() === "white"
      ? "#000000"
      : secondaryColor
    : primaryColor === "#3b82f6"
      ? "#ef4444"
      : "#10b981";

  const range = getBasketballDateRange(season, data);
  const dataDates = data.map((point) => point.date);
  const chartLabels = buildChartLabels(dataDates, range, "basketball");
  const dataByDate = new Map(data.map((point) => [point.date, point]));
  const teamLogo = data.length > 0 ? data[0].team_info.logo_url : null;

  const bidData = chartLabels.map((label) => {
    const point = dataByDate.get(label.isoDate);
    return point ? point.tournament_bid_pct * 100 : null;
  });

  const seedData = chartLabels.map((label) => {
    const point = dataByDate.get(label.isoDate);
    return point && point.average_seed && point.average_seed > 0
      ? point.average_seed
      : null;
  });

  const chartData = {
    labels: chartLabels.map((l) => l.displayLabel),
    datasets: [
      {
        label: "NCAA Tournament Bid Probability",
        data: bidData,
        borderColor: primaryColor,
        backgroundColor: primaryColor,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.1,
        fill: false,
        yAxisID: "y",
      },
      {
        label: "Average Seed",
        data: seedData,
        borderColor: finalSecondaryColor,
        backgroundColor: finalSecondaryColor,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.1,
        fill: false,
        yAxisID: "y1",
        spanGaps: false,
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
        hitRadius: 15,
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
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: "#ffffff",
        titleColor: "#1f2937",
        bodyColor: "#1f2937",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        padding: 12,
        titleFont: {
          size: 14,
          weight: "bold" as const,
        },
        bodyFont: {
          size: 12,
        },
        callbacks: {
          title: function (context: TooltipItem<"line">[]) {
            if (context.length > 0) {
              const dataIndex = context[0].dataIndex;
              return chartLabels[dataIndex].displayLabel;
            }
            return "";
          },
          labelTextColor: function (context: TooltipItem<"line">) {
            const datasetIndex = context.datasetIndex;
            if (datasetIndex === 0) {
              return primaryColor;
            } else if (datasetIndex === 1) {
              return finalSecondaryColor;
            }
            return "#1f2937";
          },
          label: function (context: TooltipItem<"line">) {
            const dataIndex = context.dataIndex;
            const datasetIndex = context.datasetIndex;
            const label = chartLabels[dataIndex];
            const point = dataByDate.get(label.isoDate);
            if (!point) return "";

            if (datasetIndex === 0) {
              const bidPct = (point.tournament_bid_pct || 0) * 100;
              return `NCAA Bid Probability: ${bidPct.toFixed(1)}%`;
            } else if (datasetIndex === 1) {
              const avgSeed = point.average_seed || 0;
              return `Average Seed: ${avgSeed > 0 ? `#${avgSeed.toFixed(1)}` : "N/A"}`;
            }
            return "";
          },
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
        type: "linear" as const,
        display: true,
        position: "left" as const,
        min: 0,
        max: 100,
        ticks: {
          color: primaryColor,
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
          text: "NCAA Bid %",
          color: primaryColor,
        },
        grid: {
          color: "#f3f4f6",
          lineWidth: 1,
        },
      },
      y1: {
        type: "linear" as const,
        display: true,
        position: "right" as const,
        min: 1,
        max: 16,
        ticks: {
          font: {
            size: isMobile ? 9 : 10,
          },
          color: finalSecondaryColor,
          stepSize: 1,
          callback: function (value: string | number) {
            return `#${value}`;
          },
        },
        title: {
          display: true,
          text: "Avg Seed",
          color: finalSecondaryColor,
        },
        grid: {
          display: false,
        },
        reverse: true,
      },
    },
  };

  const chartHeight = isMobile ? 300 : 400;

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse text-gray-500 dark:text-gray-400">
          Loading NCAA bid history...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 text-sm">
          Unable to load NCAA bid history
        </div>
        <div className="text-gray-400 text-xs mt-1">{error}</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 dark:text-gray-400 text-sm">
          No NCAA bid history available
        </div>
        <div className="text-gray-400 text-xs mt-1">
          Chart will show NCAA bid probability over time once data is collected
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
