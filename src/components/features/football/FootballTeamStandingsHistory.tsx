"use client";

import { useResponsive } from "@/hooks/useResponsive";
import { useEffect, useState } from "react";
import {
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface HistoricalDataPoint {
  date: string;
  projected_conf_wins: number;
  projected_total_wins: number;
  standings_with_ties: number;
  standings_no_ties: number;
  first_place_with_ties: number;
  first_place_no_ties: number;
  version_id: string;
  is_current: boolean;
}

interface FootballTeamStandingsHistoryProps {
  teamName: string;
  primaryColor?: string;
  secondaryColor?: string;
}

interface TooltipPayload {
  color: string;
  name: string;
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

export default function FootballTeamStandingsHistory({
  teamName,
  primaryColor = "#3b82f6",
  secondaryColor = "#6b7280",
}: FootballTeamStandingsHistoryProps) {
  const { isMobile } = useResponsive();
  const [data, setData] = useState<HistoricalDataPoint[]>([]);
  const [conferenceSize, setConferenceSize] = useState(16);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const parseDateCentralTime = (dateString: string) => {
    const [year, month, day] = dateString.split("-").map(Number);
    const centralDate = new Date(year, month - 1, day, 12, 0, 0);
    return centralDate;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/proxy/football/team/${encodeURIComponent(teamName)}/history/conf_wins`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch historical data");
        }

        const result = await response.json();
        const rawData: HistoricalDataPoint[] = result.data || [];
        setConferenceSize(result.conference_size || 16);

        if (rawData.length === 0) {
          setData([]);
          setError(null);
          return;
        }

        const dataByDate = new Map<string, HistoricalDataPoint>();
        rawData.forEach((point: HistoricalDataPoint) => {
          const dateKey = point.date;
          if (
            !dataByDate.has(dateKey) ||
            point.version_id < dataByDate.get(dateKey)!.version_id
          ) {
            dataByDate.set(dateKey, point);
          }
        });

        const processedData = Array.from(dataByDate.values()).sort((a, b) => {
          const dateA = parseDateCentralTime(a.date);
          const dateB = parseDateCentralTime(b.date);
          return dateA.getTime() - dateB.getTime();
        });

        setData(processedData);
        setError(null);
      } catch (err) {
        console.error("Error fetching standings history:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    if (teamName) {
      fetchData();
    }
  }, [teamName]);

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length > 0 && label) {
      const date = parseDateCentralTime(String(label));
      const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;

      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-1">{formattedDate}</p>
          {payload.map((entry: TooltipPayload, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              <span className="font-medium">{entry.name}:</span>{" "}
              {entry.name.includes("#1") || entry.name.includes("%")
                ? `${entry.value.toFixed(1)}%`
                : `#${entry.value.toFixed(1)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-gray-500">Loading standings history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-red-500 text-sm">Error: {error}</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-gray-500 text-sm">
          No historical data available
        </div>
      </div>
    );
  }

  // Color logic
  const adjustedSecondaryColor = () => {
    const whiteValues = [
      "#ffffff",
      "#fff",
      "white",
      "rgb(255,255,255)",
      "#FFFFFF",
      "#FFF",
    ];
    return whiteValues.includes(secondaryColor.toLowerCase())
      ? "#000000"
      : secondaryColor;
  };

  const standingsPrimaryColor = primaryColor;
  const standingsSecondaryColor = primaryColor + "80";
  const probabilityPrimaryColor = adjustedSecondaryColor();
  const probabilitySecondaryColor = adjustedSecondaryColor() + "80";

  const chartHeight = isMobile ? 280 : 380;

  return (
    <div className="w-full" style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 50, left: 20, bottom: 50 }}
        >
          <XAxis
            dataKey="date"
            tick={{ fontSize: isMobile ? 10 : 12 }}
            tickFormatter={(value: string) => {
              const date = parseDateCentralTime(value);
              return `${date.getMonth() + 1}/${date.getDate()}`;
            }}
            interval="preserveStartEnd"
            minTickGap={isMobile ? 20 : 30}
          />

          <YAxis
            yAxisId="standings"
            tick={{ fontSize: isMobile ? 10 : 12, fill: standingsPrimaryColor }}
            domain={[1, conferenceSize]}
            tickFormatter={(value: number) => `#${value}`}
            reversed={true}
            label={{
              value: "Conference Standing",
              angle: -90,
              position: "insideLeft",
              style: { textAnchor: "middle", fill: standingsPrimaryColor },
            }}
          />

          <YAxis
            yAxisId="probability"
            orientation="right"
            tick={{
              fontSize: isMobile ? 10 : 12,
              fill: probabilityPrimaryColor,
            }}
            domain={[0, 100]}
            tickFormatter={(value: number) => `${value}%`}
            label={{
              value: "First Place %",
              angle: 90,
              position: "insideRight",
              style: { textAnchor: "middle", fill: probabilityPrimaryColor },
            }}
          />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            wrapperStyle={{
              fontSize: isMobile ? 10 : 12,
              paddingTop: "10px",
            }}
          />

          <Line
            yAxisId="standings"
            type="monotone"
            dataKey="standings_with_ties"
            stroke={standingsPrimaryColor}
            strokeWidth={2}
            dot={{ fill: standingsPrimaryColor, strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5, stroke: standingsPrimaryColor, strokeWidth: 2 }}
            name="Standing (With Ties)"
          />

          <Line
            yAxisId="standings"
            type="monotone"
            dataKey="standings_no_ties"
            stroke={standingsSecondaryColor}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: standingsSecondaryColor, strokeWidth: 0, r: 3 }}
            activeDot={{
              r: 5,
              stroke: standingsSecondaryColor,
              strokeWidth: 2,
            }}
            name="Standing (No Ties)"
          />

          <Line
            yAxisId="probability"
            type="monotone"
            dataKey="first_place_with_ties"
            stroke={probabilityPrimaryColor}
            strokeWidth={2}
            dot={{ fill: probabilityPrimaryColor, strokeWidth: 0, r: 3 }}
            activeDot={{
              r: 5,
              stroke: probabilityPrimaryColor,
              strokeWidth: 2,
            }}
            name="#1 % (With Ties)"
          />

          <Line
            yAxisId="probability"
            type="monotone"
            dataKey="first_place_no_ties"
            stroke={probabilitySecondaryColor}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: probabilitySecondaryColor, strokeWidth: 0, r: 3 }}
            activeDot={{
              r: 5,
              stroke: probabilitySecondaryColor,
              strokeWidth: 2,
            }}
            name="#1 % (No Ties)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
