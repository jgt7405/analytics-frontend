"use client";

import type { ChartArea } from "chart.js";

// Right padding each host chart should reserve (via options.layout.padding.right)
// so the end-of-line value labels rendered here don't spill past the card edge.
export const END_LABEL_PADDING_RIGHT = { mobile: 46, desktop: 60 } as const;
// Wider variant for charts that keep a visible right-hand axis - the labels
// sit beyond the axis tick text, so more room is needed.
export const END_LABEL_PADDING_RIGHT_WIDE = { mobile: 78, desktop: 98 } as const;

export interface ChartEndMarker {
  /** Raw data value at the end of the line; null/undefined hides the marker. */
  value: number | null | undefined;
  /** Line / marker color. */
  color: string;
  /** Preformatted label text, e.g. "-0.9", "63%", "#4.2". */
  text: string;
  /** Filled dot instead of hollow ring (e.g. an "actual"/"no ties" series). */
  filled?: boolean;
  /** Scale id used to resolve the pixel Y (default "y"). */
  scaleId?: string;
}

interface ChartEndLabelsProps {
  /** The Chart.js instance (chartRef.current). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chart: any;
  chartArea: ChartArea | null;
  markers: ChartEndMarker[];
  isDark: boolean;
  mobile?: boolean;
  /**
   * Distance in px from the right edge of the plot area to the start of the
   * value text. Defaults to a short connector length; pass a larger value on
   * charts that keep a visible right-hand axis so the labels clear its ticks.
   */
  labelGap?: number;
}

/**
 * Renders end-of-line markers for a line chart: a glowing dot on the right
 * edge of the plot area, a short dashed connector, and the series' current
 * value as text just outside the plot. Overlapping labels are nudged apart
 * vertically. Mirrors the treatment on the standings-history chart.
 */
export default function ChartEndLabels({
  chart,
  chartArea,
  markers,
  isDark,
  mobile = false,
  labelGap,
}: ChartEndLabelsProps) {
  if (!chartArea || !chart) return null;

  const fontSize = mobile ? 11 : 13;
  const rowGap = fontSize + 5;
  const connectorLen = mobile ? 14 : 20;
  const labelX = chartArea.right + (labelGap ?? connectorLen + 4);

  type Resolved = ChartEndMarker & { y: number; labelY: number };

  const resolved: Resolved[] = markers
    .map((m): Resolved | null => {
      if (m.value === null || m.value === undefined) return null;
      const scale = chart.scales?.[m.scaleId ?? "y"];
      const y = scale?.getPixelForValue(m.value);
      if (typeof y !== "number" || Number.isNaN(y)) return null;
      return { ...m, y, labelY: y };
    })
    .filter((m): m is Resolved => m !== null)
    .sort((a, b) => a.y - b.y);

  if (resolved.length === 0) return null;

  // Keep labels at least rowGap apart, then pull the stack back inside the
  // plot area if it ran off the bottom.
  for (let i = 1; i < resolved.length; i++) {
    const minY = resolved[i - 1].labelY + rowGap;
    if (resolved[i].labelY < minY) resolved[i].labelY = minY;
  }
  const overflow = resolved[resolved.length - 1].labelY - chartArea.bottom;
  if (overflow > 0) {
    for (const r of resolved) {
      r.labelY = Math.max(chartArea.top, r.labelY - overflow);
    }
    for (let i = resolved.length - 2; i >= 0; i--) {
      const maxY = resolved[i + 1].labelY - rowGap;
      if (resolved[i].labelY > maxY) resolved[i].labelY = maxY;
    }
  }

  const dotFill = isDark ? "#0f172a" : "#ffffff";
  const halo = isDark ? "#0f172a" : "#ffffff";

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0"
      style={{ width: "100%", height: "100%", overflow: "visible" }}
    >
      {resolved.map((m, i) => (
        <g key={i}>
          <circle
            cx={chartArea.right}
            cy={m.y}
            r="8"
            fill={m.color}
            opacity={isDark ? 0.24 : 0.18}
          />
          <line
            x1={chartArea.right}
            y1={m.y}
            x2={labelX - 3}
            y2={m.labelY}
            stroke={m.color}
            strokeWidth="1"
            strokeDasharray="2,2"
            opacity="0.75"
          />
          <circle
            cx={chartArea.right}
            cy={m.y}
            r="4.25"
            fill={m.filled ? m.color : dotFill}
            stroke={m.color}
            strokeWidth="2.5"
            style={{ filter: `drop-shadow(0 0 3px ${m.color})` }}
          />
          {!m.filled && (
            <circle cx={chartArea.right} cy={m.y} r="1.75" fill={m.color} />
          )}
          <text
            x={labelX}
            y={m.labelY}
            fontSize={fontSize}
            fontWeight={700}
            dominantBaseline="middle"
            fill={m.color}
            stroke={halo}
            strokeWidth="3"
            style={{ paintOrder: "stroke", fontVariantNumeric: "tabular-nums" }}
          >
            {m.text}
          </text>
        </g>
      ))}
    </svg>
  );
}
