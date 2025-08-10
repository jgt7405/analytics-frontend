"use client";

import { useResponsive } from "@/hooks/useResponsive";
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
  const [isStable, setIsStable] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const updateDimensions = () => {
      if (chartRef.current?.chartArea && chartRef.current?.canvas) {
        setChartDimensions({
          chartArea: chartRef.current.chartArea,
          canvas: chartRef.current.canvas,
        });
        setIsStable(true);
      }
    };

    setIsStable(false);
    const timeout = setTimeout(updateDimensions, 1000);
    return () => clearTimeout(timeout);
  }, [timelineData]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const filteredData = timelineData.filter((item) => {
    const confName = item.conference_name.toLowerCase();
    return !confName.includes("fcs");
  });

  const confData = filteredData.reduce(
    (acc, item) => {
      if (!acc[item.conference_name]) {
        acc[item.conference_name] = {
          data: [],
          conf_info: item.conf_info,
        };
      }
      acc[item.conference_name].data.push({
        x: formatDate(item.date),
        y: item.avg_bids,
      });
      return acc;
    },
    {} as Record<
      string,
      {
        data: Array<{ x: string; y: number }>;
        conf_info: {
          primary_color?: string;
          secondary_color?: string;
          logo_url?: string;
        };
      }
    >
  );

  const dates = [
    ...new Set(filteredData.map((d) => formatDate(d.date))),
  ].sort();

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
    labels: dates,
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
        mode: "index" as const,
        intersect: false,
        backgroundColor: "#ffffff",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        titleColor: "#374151",
        bodyColor: "#374151",
        displayColors: false,
        callbacks: {
          title: (tooltipItems: Array<{ dataIndex: number }>) => {
            if (tooltipItems.length === 0) return "";
            return dates[tooltipItems[0].dataIndex];
          },
          label: () => "",
          afterBody: (tooltipItems: Array<{ dataIndex: number }>) => {
            if (tooltipItems.length === 0) return [];
            const currentDate = dates[tooltipItems[0].dataIndex];
            const confsAtDate = Object.entries(confData)
              .map(([confName, conf]) => {
                const dataPoint = conf.data.find(
                  (d: { x: string; y: number }) => d.x === currentDate
                );
                return { name: confName, bids: dataPoint?.y || 0 };
              })
              .sort((a, b) => b.bids - a.bids);
            return confsAtDate.map(
              (conf) => `${conf.name}: ${conf.bids.toFixed(1)} bids`
            );
          },
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
      padding: { left: 10, right: 60, top: 10, bottom: 10 },
    },
    animation: {
      onComplete: () => {
        if (chartRef.current?.chartArea && chartRef.current?.canvas) {
          setChartDimensions({
            chartArea: chartRef.current.chartArea,
            canvas: chartRef.current.canvas,
          });
          setIsStable(true);
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
    <div
      className="relative"
      style={{
        zIndex: 10,
        isolation: "isolate",
        overflow: "hidden",
        backgroundColor: "#ffffff",
        position: "relative",
        padding: "16px",
      }}
    >
      <div
        className="relative"
        style={{
          height: `${chartHeight}px`,
          overflow: "visible",
          position: "relative",
          backgroundColor: "#ffffff",
        }}
      >
        <Line ref={chartRef} data={chartData} options={options} />

        <div
          className="absolute right-0 top-0"
          style={{
            zIndex: 20,
            pointerEvents: "none",
            width: "60px",
            height: `${chartHeight}px`,
          }}
        >
          {mounted &&
            isStable &&
            chartDimensions &&
            logoPositions.map(({ conf, idealY, adjustedY }) => {
              const confColor = conf.conf_info.primary_color || "#94a3b8";
              const logoUrl = conf.conf_info.logo_url;

              return (
                <div key={`end-${conf.conference_name}`}>
                  <svg
                    className="absolute"
                    style={{
                      top: 0,
                      right: 0,
                      width: "60px",
                      height: `${chartHeight}px`,
                      pointerEvents: "none",
                    }}
                  >
                    <line
                      x1={0}
                      y1={idealY}
                      x2={25}
                      y2={adjustedY}
                      stroke={confColor}
                      strokeWidth="1"
                      strokeDasharray="2,2"
                    />
                  </svg>
                  <div
                    className="absolute flex items-center"
                    style={{ top: `${adjustedY - 12}px`, right: "25px" }}
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
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
