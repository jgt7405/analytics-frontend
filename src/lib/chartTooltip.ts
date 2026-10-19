// Shared external-tooltip renderer for Chart.js line charts (the
// "history over time" charts used across football/basketball). Each of
// these charts previously hand-rolled ~150 lines of near-identical DOM/
// positioning logic with light-mode-only colors hardcoded (#ffffff
// background, #1f2937 text) that turned into an unreadable white box once
// the surrounding card went dark. This centralizes that logic once, themed.
import type { Chart, TooltipModel } from "chart.js";
import { ensureContrast } from "./color-utils";

export interface TooltipRow {
  label: string;
  value: string;
  color: string;
  logoUrl?: string;
}

export interface ExternalTooltipConfig {
  /** DOM id for the floating tooltip element (kept unique per chart instance). */
  id: string;
  isDark: boolean;
  heading: string;
  rows: TooltipRow[];
  /** Extra vertical offset (px) applied after centering on the cursor; tune per chart layout. */
  verticalOffset?: number;
}

const THEME = {
  light: {
    background: "#ffffff",
    border: "rgb(226 232 240 / 0.9)",
    heading: "#1f2937",
    text: "#6b7280",
    shadow: "0 4px 12px rgba(0, 0, 0, 0.12)",
  },
  dark: {
    background: "#1e293b",
    border: "rgb(71 85 105 / 0.9)",
    heading: "#e2e8f0",
    text: "#94a3b8",
    shadow: "0 4px 16px rgba(0, 0, 0, 0.55)",
  },
};

// The chart each tooltip element currently belongs to, so the outside-tap
// handler can tell a tap on the chart (which Chart.js answers by moving the
// tooltip) from a tap elsewhere (which closes it).
const tooltipCharts = new Map<string, Chart>();

function hideOnOutsidePointer(id: string) {
  // Once per id: charts remove their tooltip element on unmount, and the
  // listener looks the element up by id, so it serves every remount.
  if (tooltipCharts.has(id)) return;
  document.addEventListener("pointerdown", (event) => {
    const el = document.getElementById(id);
    if (!el || el.style.opacity === "0") return;
    const canvas = tooltipCharts.get(id)?.canvas;
    if (canvas && canvas.isConnected && canvas.contains(event.target as Node)) return;
    el.style.opacity = "0";
  });
}

export function renderExternalTooltip(
  chart: Chart,
  tooltipModel: TooltipModel<"line">,
  config: ExternalTooltipConfig,
) {
  const theme = config.isDark ? THEME.dark : THEME.light;

  let tooltipEl = document.getElementById(config.id);
  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.id = config.id;
    tooltipEl.style.position = "absolute";
    tooltipEl.style.opacity = "0";
    // Never takes the pointer: an invisible (opacity 0) tooltip that did
    // swallowed taps on whatever sat under it, and a visible one hid itself
    // when the mouse moved onto it. Mouse-out and outside taps close it.
    tooltipEl.style.pointerEvents = "none";
    // Opacity only: animating left/top made it trail behind the pointer.
    tooltipEl.style.transition = "opacity .1s ease";
    tooltipEl.style.zIndex = "1000";
    tooltipEl.style.borderRadius = "8px";
    tooltipEl.style.fontFamily = "Inter, system-ui, sans-serif";
    tooltipEl.style.fontSize = "12px";
    tooltipEl.style.padding = "16px";
    tooltipEl.style.paddingTop = "8px";
    tooltipEl.style.minWidth = "200px";
    tooltipEl.style.maxWidth = "300px";

    // The old handler removed the element 100 ms after any tap that wasn't
    // on the tooltip itself - including the tap on the chart that opened
    // it - so on phones the tooltip flashed and vanished.
    hideOnOutsidePointer(config.id);
    document.body.appendChild(tooltipEl);
  }
  tooltipCharts.set(config.id, chart);

  // Re-apply themed colors every render so a light<->dark toggle mid-session
  // (or a stale element left over from the other theme) never shows stale colors.
  tooltipEl.style.background = theme.background;
  tooltipEl.style.border = `1px solid ${theme.border}`;
  tooltipEl.style.color = theme.text;
  tooltipEl.style.boxShadow = theme.shadow;

  if (tooltipModel.opacity === 0) {
    tooltipEl.style.opacity = "0";
    return;
  }

  if (tooltipModel.body) {
    let innerHtml = `
      <div style="margin-bottom: 8px;">
        <div style="font-weight: 600; color: ${theme.heading};">${config.heading}</div>
      </div>
    `;

    config.rows.forEach((row) => {
      // Team colors are tuned for white; lift dark ones off the dark tooltip.
      const rowColor = config.isDark ? ensureContrast(row.color, theme.background) : row.color;
      const logo = row.logoUrl
        ? `<img src="${row.logoUrl}" alt="" style="width: 18px; height: 18px; object-fit: contain; flex: 0 0 18px;" />`
        : `<span style="width: 7px; height: 7px; border-radius: 999px; background: ${rowColor}; flex: 0 0 7px; margin: 0 5.5px;"></span>`;

      innerHtml += `
        <div style="display: flex; align-items: center; gap: 7px; min-height: 20px; margin: 1px 0; color: ${rowColor}; font-weight: 500;">
          ${logo}
          <span style="min-width: 0; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${row.label}</span>
          <span style="font-weight: 700; font-variant-numeric: tabular-nums;">${row.value}</span>
        </div>
      `;
    });

    tooltipEl.innerHTML = innerHtml;
  }

  // Smart positioning: flip left/right of the cursor based on which half
  // of the chart it's in, with an arrow pointing back at the data point.
  const position = chart.canvas.getBoundingClientRect();
  const chartWidth = chart.width;
  const tooltipWidth = tooltipEl.offsetWidth || 200;
  const caretX = tooltipModel.caretX;
  const caretY = tooltipModel.caretY;

  const isLeftSide = caretX < chartWidth / 2;
  let leftPosition: number;
  const arrowPosition = isLeftSide ? "left" : "right";

  if (isLeftSide) {
    leftPosition = position.left + window.pageXOffset + caretX + 20;
  } else {
    leftPosition =
      position.left + window.pageXOffset + caretX - tooltipWidth - 20;
  }

  let arrow = tooltipEl.querySelector(".tooltip-arrow") as HTMLElement | null;
  if (!arrow) {
    arrow = document.createElement("div");
    arrow.className = "tooltip-arrow";
    arrow.style.position = "absolute";
    arrow.style.width = "0";
    arrow.style.height = "0";
    arrow.style.top = "50%";
    arrow.style.transform = "translateY(-50%)";
    tooltipEl.appendChild(arrow);
  }

  arrow.style.left = arrowPosition === "left" ? "-8px" : "auto";
  arrow.style.right = arrowPosition === "right" ? "-8px" : "auto";
  arrow.style.borderTop = "8px solid transparent";
  arrow.style.borderBottom = "8px solid transparent";
  arrow.style.borderRight =
    arrowPosition === "left" ? `8px solid ${theme.background}` : "none";
  arrow.style.borderLeft =
    arrowPosition === "right" ? `8px solid ${theme.background}` : "none";

  const maxLeft = window.innerWidth - tooltipWidth - 10;
  const minLeft = 10;
  leftPosition = Math.max(minLeft, Math.min(maxLeft, leftPosition));

  const desiredTop =
    position.top +
    window.pageYOffset +
    caretY -
    tooltipEl.offsetHeight / 2 +
    (config.verticalOffset ?? 0);
  const minTop = window.pageYOffset + 10;
  const maxTop = Math.max(
    minTop,
    window.pageYOffset + window.innerHeight - tooltipEl.offsetHeight - 10,
  );

  tooltipEl.style.opacity = "1";
  tooltipEl.style.left = leftPosition + "px";
  tooltipEl.style.top = Math.max(minTop, Math.min(maxTop, desiredTop)) + "px";
}
