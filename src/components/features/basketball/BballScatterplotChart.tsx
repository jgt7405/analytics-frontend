"use client";

import { useResponsive } from "@/hooks/useResponsive";
import { layout } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

interface ChartData {
  team_name: string;
  x_value: number;
  y_value: number;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
}

interface ChartState {
  data: ChartData[];
  xLabel: string;
  yLabel: string;
  chartTitle: string;
  isLoading: boolean;
  error: string | null;
}

interface ChartSettings {
  chartTitle: string;
  xLabel: string;
  yLabel: string;
  xInterval: number;
  yInterval: number;
  logoSize: number;
  showGridLines: boolean;
  showXAxis: boolean;
  showYAxis: boolean;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  xFormat: "decimal" | "percentage";
  yFormat: "decimal" | "percentage";
  collisionDetection: "none" | "minor" | "major";
}

interface BballScatterplotChartProps {
  onTitleChange?: (title: string) => void;
}

interface PositionedLogo extends ChartData {
  adjustedX: number;
  adjustedY: number;
  hasCollision?: boolean;
  offsetX?: number;
  offsetY?: number;
}

const MARGIN = { top: 40, right: 60, bottom: 100, left: 80 };
const CHART_WIDTH = 1000;
const CHART_HEIGHT = 700;
const PLOT_WIDTH = CHART_WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;

export default function BballScatterplotChart({
  onTitleChange,
}: BballScatterplotChartProps) {
  const { isMobile } = useResponsive();
  const [state, setState] = useState<ChartState>({
    data: [],
    xLabel: "",
    yLabel: "",
    chartTitle: "",
    isLoading: false,
    error: null,
  });

  const [settings, setSettings] = useState<ChartSettings>({
    chartTitle: "",
    xLabel: "",
    yLabel: "",
    xInterval: 0.1,
    yInterval: 0.1,
    logoSize: 44,
    showGridLines: true,
    showXAxis: true,
    showYAxis: true,
    xMin: 0,
    xMax: 1,
    yMin: 0,
    yMax: 1,
    xFormat: "decimal",
    yFormat: "decimal",
    collisionDetection: "none",
  });

  const [hoveredTeam, setHoveredTeam] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Notify parent of title changes
  useEffect(() => {
    if (onTitleChange) {
      onTitleChange(settings.chartTitle);
    }
  }, [settings.chartTitle, onTitleChange]);

  const chartWidth = isMobile ? 600 : CHART_WIDTH;

  // Calculate scales
  const scales = useMemo(() => {
    if (state.data.length === 0) {
      return {
        xScale: (_v: number) => 0,
        yScale: (_v: number) => 0,
        xMin: 0,
        xMax: 1,
        yMin: 0,
        yMax: 1,
      };
    }

    const xValues = state.data.map((d) => d.x_value);
    const yValues = state.data.map((d) => d.y_value);
    const xDataMin = Math.min(...xValues);
    const xDataMax = Math.max(...xValues);
    const yDataMin = Math.min(...yValues);
    const yDataMax = Math.max(...yValues);

    let xMin = settings.xMin !== 0 ? settings.xMin : xDataMin;
    let xMax = settings.xMax !== 1 ? settings.xMax : xDataMax;
    let yMin = settings.yMin !== 0 ? settings.yMin : yDataMin;
    let yMax = settings.yMax !== 1 ? settings.yMax : yDataMax;

    if (settings.xMin === 0 && settings.xMax === 1) {
      const xPadding = (xDataMax - xDataMin) * 0.1 || 1;
      xMin = xDataMin - xPadding;
      xMax = xDataMax + xPadding;
    }
    if (settings.yMin === 0 && settings.yMax === 1) {
      const yPadding = (yDataMax - yDataMin) * 0.1 || 1;
      yMin = yDataMin - yPadding;
      yMax = yDataMax + yPadding;
    }

    const xRange = xMax - xMin;
    const yRange = yMax - yMin;

    const xScale = (value: number) =>
      MARGIN.left + ((value - xMin) / xRange) * PLOT_WIDTH;
    const yScale = (value: number) =>
      MARGIN.top + PLOT_HEIGHT - ((value - yMin) / yRange) * PLOT_HEIGHT;

    return {
      xScale,
      yScale,
      xMin,
      xMax,
      yMin,
      yMax,
    };
  }, [state.data, settings.xMin, settings.xMax, settings.yMin, settings.yMax]);

  // Check if two logos collide
  const checkCollision = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    size: number
  ): { collides: boolean; overlapArea: number } => {
    const r = size / 2;
    const dx = Math.abs(x1 - x2);
    const dy = Math.abs(y1 - y2);
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance >= size) {
      return { collides: false, overlapArea: 0 };
    }

    // Calculate overlap area (approximate)
    const overlapRadius = Math.max(0, r - distance / 2);
    const overlapArea = Math.PI * overlapRadius * overlapRadius;

    return { collides: true, overlapArea };
  };

  // Position logos with collision detection and avoidance
  const positionedLogos = useMemo(() => {
    if (state.data.length === 0) return [];

    const logos: PositionedLogo[] = state.data.map((team) => ({
      ...team,
      adjustedX: scales.xScale(team.x_value),
      adjustedY: scales.yScale(team.y_value),
      hasCollision: false,
      offsetX: 0,
      offsetY: 0,
    }));

    if (settings.collisionDetection === "none") {
      return logos;
    }

    // Detect collisions
    const collisions: { [key: string]: boolean } = {};

    for (let i = 0; i < logos.length; i++) {
      for (let j = i + 1; j < logos.length; j++) {
        const { collides, overlapArea } = checkCollision(
          logos[i].adjustedX,
          logos[i].adjustedY,
          logos[j].adjustedX,
          logos[j].adjustedY,
          settings.logoSize
        );

        if (!collides) continue;

        // For "major" collision detection, only flag high overlap
        if (settings.collisionDetection === "major") {
          const maxArea = Math.PI * (settings.logoSize / 2) ** 2;
          if (overlapArea < maxArea * 0.5) continue; // Less than 50% overlap
        }

        collisions[logos[i].team_name] = true;
        collisions[logos[j].team_name] = true;
      }
    }

    // Helper function to check if a position collides with any logo
    const hasCollisionAtPosition = (
      x: number,
      y: number,
      logoIndex: number,
      processedLogos: PositionedLogo[]
    ): boolean => {
      for (let i = 0; i < processedLogos.length; i++) {
        if (i === logoIndex) continue;

        const otherX =
          processedLogos[i].adjustedX + (processedLogos[i].offsetX || 0);
        const otherY =
          processedLogos[i].adjustedY + (processedLogos[i].offsetY || 0);

        const { collides } = checkCollision(
          x,
          y,
          otherX,
          otherY,
          settings.logoSize
        );

        if (collides) return true;
      }
      return false;
    };

    // Offset colliding logos - process one at a time and check against already-processed logos
    const processedLogos: PositionedLogo[] = [];
    const offsetDistance = settings.logoSize * 0.6; // Minimum distance to avoid collision

    const directions = [
      { x: offsetDistance, y: 0 }, // Right
      { x: -offsetDistance, y: 0 }, // Left
      { x: 0, y: -offsetDistance }, // Up
      { x: 0, y: offsetDistance }, // Down
      { x: offsetDistance, y: -offsetDistance }, // Up-Right
      { x: offsetDistance, y: offsetDistance }, // Down-Right
      { x: -offsetDistance, y: -offsetDistance }, // Up-Left
      { x: -offsetDistance, y: offsetDistance }, // Down-Left
      { x: offsetDistance * 2, y: 0 }, // Far Right
      { x: -offsetDistance * 2, y: 0 }, // Far Left
      { x: 0, y: -offsetDistance * 2 }, // Far Up
      { x: 0, y: offsetDistance * 2 }, // Far Down
      { x: offsetDistance * 1.5, y: -offsetDistance * 1.5 }, // Far Up-Right
      { x: offsetDistance * 1.5, y: offsetDistance * 1.5 }, // Far Down-Right
      { x: -offsetDistance * 1.5, y: -offsetDistance * 1.5 }, // Far Up-Left
      { x: -offsetDistance * 1.5, y: offsetDistance * 1.5 }, // Far Down-Left
    ];

    for (let i = 0; i < logos.length; i++) {
      const logo = logos[i];

      if (!collisions[logo.team_name]) {
        // No collision for this logo
        processedLogos.push(logo);
        continue;
      }

      // Find the best offset position
      let bestOffset = { x: 0, y: 0 };
      let foundGoodPosition = false;

      for (const direction of directions) {
        const testX = logo.adjustedX + direction.x;
        const testY = logo.adjustedY + direction.y;

        // Check if this position is within bounds and doesn't collide
        const isInBounds =
          testX >= MARGIN.left &&
          testX <= MARGIN.left + PLOT_WIDTH &&
          testY >= MARGIN.top &&
          testY <= MARGIN.top + PLOT_HEIGHT;

        if (!isInBounds) continue;

        const hasCollision = hasCollisionAtPosition(
          testX,
          testY,
          i,
          processedLogos
        );

        if (!hasCollision) {
          bestOffset = direction;
          foundGoodPosition = true;
          break;
        }
      }

      // If no good position found in bounds, use the direction with least overlap
      if (!foundGoodPosition) {
        let minOverlap = Infinity;

        for (const direction of directions) {
          const testX = logo.adjustedX + direction.x;
          const testY = logo.adjustedY + direction.y;
          let totalOverlap = 0;

          for (const processedLogo of processedLogos) {
            const otherX =
              processedLogo.adjustedX + (processedLogo.offsetX || 0);
            const otherY =
              processedLogo.adjustedY + (processedLogo.offsetY || 0);

            const { collides, overlapArea } = checkCollision(
              testX,
              testY,
              otherX,
              otherY,
              settings.logoSize
            );

            if (collides) totalOverlap += overlapArea;
          }

          if (totalOverlap < minOverlap) {
            minOverlap = totalOverlap;
            bestOffset = direction;
          }
        }
      }

      processedLogos.push({
        ...logo,
        hasCollision: true,
        offsetX: bestOffset.x,
        offsetY: bestOffset.y,
      });
    }

    return processedLogos;
  }, [state.data, scales, settings.collisionDetection, settings.logoSize]);

  // Generate ticks based on custom interval
  const generateTicksFromInterval = (
    min: number,
    max: number,
    interval: number
  ) => {
    if (interval <= 0) return [];

    const ticks: number[] = [];
    const start = Math.ceil(min / interval) * interval;
    const end = Math.floor(max / interval) * interval;

    for (let i = start; i <= end + interval * 0.0001; i += interval) {
      ticks.push(Number(i.toFixed(10)));
    }

    return ticks;
  };

  const xTicks = useMemo(
    () =>
      generateTicksFromInterval(scales.xMin, scales.xMax, settings.xInterval),
    [scales.xMin, scales.xMax, settings.xInterval]
  );

  const yTicks = useMemo(
    () =>
      generateTicksFromInterval(scales.yMin, scales.yMax, settings.yInterval),
    [scales.yMin, scales.yMax, settings.yInterval]
  );

  const getDecimalPlaces = (interval: number) => {
    if (interval >= 1) return 0;
    if (interval >= 0.1) return 1;
    if (interval >= 0.01) return 2;
    return 3;
  };

  const xDecimalPlaces = getDecimalPlaces(settings.xInterval);
  const yDecimalPlaces = getDecimalPlaces(settings.yInterval);

  const formatValue = (
    value: number,
    format: "decimal" | "percentage",
    decimals: number
  ): string => {
    if (format === "percentage") {
      const percentValue = value * 100;
      return `${Math.round(percentValue)}%`;
    }
    return value.toFixed(decimals);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log("❌ No file selected");
      return;
    }

    console.log("📄 File selected:", {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const formData = new FormData();
    formData.append("file", file);

    try {
      console.log("🚀 Sending request to /api/proxy/basketball/chart/upload");

      const response = await fetch("/api/proxy/basketball/chart/upload", {
        method: "POST",
        body: formData,
      });

      console.log("📡 Response received:", {
        status: response.status,
        statusText: response.statusText,
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.error("❌ Response not OK");
        let error;
        try {
          error = JSON.parse(responseText);
          console.error("❌ Parsed error:", error);
        } catch {
          console.error("❌ Could not parse error response");
          error = { error: responseText };
        }
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const result = JSON.parse(responseText);
      console.log("✅ Success! Parsed result:", result);

      setState((prev) => ({
        ...prev,
        data: result.data || [],
        xLabel: result.x_label || "X Axis",
        yLabel: result.y_label || "Y Axis",
        chartTitle: result.chart_title || "Scatterplot",
        isLoading: false,
      }));

      setSettings((prev) => ({
        ...prev,
        chartTitle: result.chart_title || "Scatterplot",
        xLabel: result.x_label || "X Axis",
        yLabel: result.y_label || "Y Axis",
      }));

      console.log("✅ State updated with", result.data?.length || 0, "teams");
    } catch (error) {
      console.error("❌ Fetch error:", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Upload failed",
        isLoading: false,
      }));
    }
  };

  return (
    <div className={cn(layout.card, "p-6")} style={{ padding: 0 }}>
      {state.data.length === 0 && !state.isLoading && !state.error && (
        <>
          <h2 className="text-xl font-semibold mb-4 p-6">Scatterplot Chart</h2>

          <div className="mb-6 p-6 pt-0">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload CSV File
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Format: Row 1 = Chart Title, X-axis label, Y-axis label | Rows 2+
              = Team name, X value, Y value
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={state.isLoading}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {state.isLoading && (
              <p className="text-sm text-blue-600 mt-2">Processing...</p>
            )}
            {state.error && (
              <p className="text-sm text-red-600 mt-2">{state.error}</p>
            )}
          </div>
        </>
      )}

      {state.data.length === 0 && !state.isLoading && !state.error && (
        <div className="text-center py-8 text-gray-500 p-6">
          <p>Upload a CSV file to create a scatterplot</p>
          <p className="text-xs mt-2">
            CSV format: Row 1 = Chart Title, X-axis name, Y-axis name | Rows 2+
            = Team name, X value, Y value
          </p>
        </div>
      )}

      {state.isLoading && (
        <div className="p-6">
          <p className="text-sm text-blue-600">Processing...</p>
        </div>
      )}

      {state.error && (
        <div className="p-6">
          <p className="text-sm text-red-600">{state.error}</p>
        </div>
      )}

      {state.data.length > 0 && (
        <div className="mb-6 p-6 pt-0">
          <div
            className="p-4 bg-gray-50 rounded-lg border border-gray-200"
            data-exclude-screenshot="true"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">
                Chart Settings
              </h3>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="text-xs px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-800"
              >
                {showSettings ? "Hide" : "Show"}
              </button>
            </div>

            {showSettings && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Chart Title
                  </label>
                  <input
                    type="text"
                    value={settings.chartTitle}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        chartTitle: e.target.value,
                      }))
                    }
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    X-Axis Label
                  </label>
                  <input
                    type="text"
                    value={settings.xLabel}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        xLabel: e.target.value,
                      }))
                    }
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Y-Axis Label
                  </label>
                  <input
                    type="text"
                    value={settings.yLabel}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        yLabel: e.target.value,
                      }))
                    }
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    X-Axis Interval
                  </label>
                  <input
                    type="number"
                    value={settings.xInterval}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        xInterval: parseFloat(e.target.value) || 0.1,
                      }))
                    }
                    step="0.01"
                    min="0.01"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Y-Axis Interval
                  </label>
                  <input
                    type="number"
                    value={settings.yInterval}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        yInterval: parseFloat(e.target.value) || 0.1,
                      }))
                    }
                    step="0.01"
                    min="0.01"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Logo Size (pixels)
                  </label>
                  <input
                    type="number"
                    value={settings.logoSize}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        logoSize: parseFloat(e.target.value) || 44,
                      }))
                    }
                    step="2"
                    min="20"
                    max="100"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Show Grid Lines
                  </label>
                  <select
                    value={settings.showGridLines ? "yes" : "no"}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        showGridLines: e.target.value === "yes",
                      }))
                    }
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Show X-Axis Labels
                  </label>
                  <select
                    value={settings.showXAxis ? "yes" : "no"}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        showXAxis: e.target.value === "yes",
                      }))
                    }
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Show Y-Axis Labels
                  </label>
                  <select
                    value={settings.showYAxis ? "yes" : "no"}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        showYAxis: e.target.value === "yes",
                      }))
                    }
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Collision Detection
                  </label>
                  <select
                    value={settings.collisionDetection}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        collisionDetection: e.target.value as
                          | "none"
                          | "minor"
                          | "major",
                      }))
                    }
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="none">None</option>
                    <option value="minor">Minor (Any Overlap)</option>
                    <option value="major">Major (High Overlap)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    X-Axis Min
                  </label>
                  <input
                    type="number"
                    value={settings.xMin}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        xMin: parseFloat(e.target.value) || 0,
                      }))
                    }
                    step="0.1"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    X-Axis Max
                  </label>
                  <input
                    type="number"
                    value={settings.xMax}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        xMax: parseFloat(e.target.value) || 1,
                      }))
                    }
                    step="0.1"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Y-Axis Min
                  </label>
                  <input
                    type="number"
                    value={settings.yMin}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        yMin: parseFloat(e.target.value) || 0,
                      }))
                    }
                    step="0.1"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Y-Axis Max
                  </label>
                  <input
                    type="number"
                    value={settings.yMax}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        yMax: parseFloat(e.target.value) || 1,
                      }))
                    }
                    step="0.1"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    X-Axis Format
                  </label>
                  <select
                    value={settings.xFormat}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        xFormat: e.target.value as "decimal" | "percentage",
                      }))
                    }
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="decimal">Decimal</option>
                    <option value="percentage">Percentage</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Y-Axis Format
                  </label>
                  <select
                    value={settings.yFormat}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        yFormat: e.target.value as "decimal" | "percentage",
                      }))
                    }
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="decimal">Decimal</option>
                    <option value="percentage">Percentage</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {state.data.length > 0 && (
        <div style={{ padding: 0, position: "relative" }}>
          <svg
            width={chartWidth}
            height={CHART_HEIGHT}
            className="border border-gray-200 rounded"
            onMouseLeave={() => setHoveredTeam(null)}
            style={{ display: "block", position: "relative", flexShrink: 0 }}
          >
            <rect width={chartWidth} height={CHART_HEIGHT} fill="white" />
            {/* Y-axis grid lines */}
            {settings.showGridLines &&
              yTicks.map((yValue) => {
                const y = scales.yScale(yValue);
                const isZeroLine = Math.abs(yValue) < 0.0001;
                return (
                  <g key={`y-tick-${yValue}`}>
                    <line
                      x1={MARGIN.left}
                      x2={MARGIN.left + PLOT_WIDTH}
                      y1={y}
                      y2={y}
                      stroke={isZeroLine ? "#000" : "#e5e7eb"}
                      strokeWidth={isZeroLine ? 2 : 1}
                    />
                  </g>
                );
              })}

            {/* X-axis grid lines */}
            {settings.showGridLines &&
              xTicks.map((xValue) => {
                const x = scales.xScale(xValue);
                const isZeroLine = Math.abs(xValue) < 0.0001;

                return (
                  <g key={`x-tick-${xValue}`}>
                    <line
                      x1={x}
                      x2={x}
                      y1={MARGIN.top}
                      y2={MARGIN.top + PLOT_HEIGHT}
                      stroke={isZeroLine ? "#000" : "#e5e7eb"}
                      strokeWidth={isZeroLine ? 2 : 1}
                    />
                  </g>
                );
              })}

            {/* Y-axis labels */}
            {settings.showYAxis &&
              yTicks.map((yValue) => {
                const y = scales.yScale(yValue);
                const isZeroLine = Math.abs(yValue) < 0.0001;

                return (
                  <text
                    key={`y-label-${yValue}`}
                    x={MARGIN.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="18"
                    fill="#666"
                    fontWeight={isZeroLine ? "bold" : "normal"}
                  >
                    {formatValue(yValue, settings.yFormat, yDecimalPlaces)}
                  </text>
                );
              })}

            {/* X-axis labels */}
            {settings.showXAxis &&
              xTicks.map((xValue) => {
                const x = scales.xScale(xValue);
                const isZeroLine = Math.abs(xValue) < 0.0001;

                return (
                  <text
                    key={`x-label-${xValue}`}
                    x={x}
                    y={MARGIN.top + PLOT_HEIGHT + 20}
                    textAnchor="middle"
                    fontSize="18"
                    fill="#666"
                    fontWeight={isZeroLine ? "bold" : "normal"}
                  >
                    {formatValue(xValue, settings.xFormat, xDecimalPlaces)}
                  </text>
                );
              })}

            {/* Data points for collisions */}
            {positionedLogos.map((team) => {
              if (!team.hasCollision) return null;

              return (
                <g key={`point-${team.team_name}`}>
                  {/* Dotted line from point to offset logo */}
                  <line
                    x1={team.adjustedX}
                    y1={team.adjustedY}
                    x2={team.adjustedX + team.offsetX!}
                    y2={team.adjustedY + team.offsetY!}
                    stroke="#999"
                    strokeWidth="1"
                    strokeDasharray="5,5"
                    opacity="0.6"
                  />
                  {/* Point at data location */}
                  <circle
                    cx={team.adjustedX}
                    cy={team.adjustedY}
                    r="3"
                    fill={team.primary_color}
                    stroke="#fff"
                    strokeWidth="1"
                  />
                </g>
              );
            })}

            {/* Axes */}
            <line
              x1={MARGIN.left}
              y1={MARGIN.top}
              x2={MARGIN.left}
              y2={MARGIN.top + PLOT_HEIGHT}
              stroke="#000"
              strokeWidth={2}
            />
            <line
              x1={MARGIN.left}
              y1={MARGIN.top + PLOT_HEIGHT}
              x2={MARGIN.left + PLOT_WIDTH}
              y2={MARGIN.top + PLOT_HEIGHT}
              stroke="#000"
              strokeWidth={2}
            />

            {/* Y-Axis Label */}
            <text
              x={MARGIN.left - 30}
              y={MARGIN.top + PLOT_HEIGHT / 2}
              textAnchor="middle"
              transform={`rotate(-90, ${MARGIN.left - 60}, ${
                MARGIN.top + PLOT_HEIGHT / 2
              })`}
              fontSize="20"
              fontWeight="500"
              fill="#374151"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              {settings.yLabel}
            </text>

            {/* X-Axis Label */}
            <text
              x={MARGIN.left + PLOT_WIDTH / 2}
              y={CHART_HEIGHT - 50}
              textAnchor="middle"
              fontSize="20"
              fontWeight="500"
              fill="#374151"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              {settings.xLabel}
            </text>
          </svg>

          {/* Logos */}
          <div
            style={{
              position: "absolute",
              top: "0px",
              left: "0px",
              width: `${chartWidth}px`,
              height: `${CHART_HEIGHT}px`,
              pointerEvents: "none",
            }}
          >
            {positionedLogos.map((team) => (
              <div
                key={team.team_name}
                style={{
                  position: "absolute",
                  left: `${team.adjustedX - settings.logoSize / 2 + (team.offsetX || 0)}px`,
                  top: `${team.adjustedY - settings.logoSize / 2 + (team.offsetY || 0)}px`,
                  cursor: "pointer",
                  zIndex: hoveredTeam === team.team_name ? 20 : 10,
                  width: `${settings.logoSize}px`,
                  height: `${settings.logoSize}px`,
                  overflow: "hidden",
                  pointerEvents: "auto",
                }}
                onMouseEnter={() => setHoveredTeam(team.team_name)}
                onMouseLeave={() => setHoveredTeam(null)}
              >
                {team.logo_url && (
                  <Image
                    src={team.logo_url}
                    alt={team.team_name}
                    title={team.team_name}
                    fill
                    style={{
                      opacity: hoveredTeam === team.team_name ? 1 : 0.8,
                      transition: "opacity 0.2s, filter 0.2s",
                      filter:
                        hoveredTeam === team.team_name
                          ? "drop-shadow(0 0 4px rgba(0,0,0,0.3))"
                          : "none",
                      objectFit: "contain",
                      border: "none",
                      outline: "none",
                    }}
                    unoptimized
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
