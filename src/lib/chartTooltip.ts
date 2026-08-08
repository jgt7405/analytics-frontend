// Shared external-tooltip renderer for Chart.js line charts (the
// "history over time" charts used across football/basketball). Each of
// these charts previously hand-rolled ~150 lines of near-identical DOM/
// positioning logic with light-mode-only colors hardcoded (#ffffff
// background, #1f2937 text) that turned into an unreadable white box once
// the surrounding card went dark. This centralizes that logic once, themed.
import type { Chart, TooltipModel } from "chart.js";

export interface TooltipRow {
  label: string;
  value: string;
  color: string;
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
    closeBtn: "#6b7280",
    shadow: "0 4px 12px rgba(0, 0, 0, 0.12)",
  },
  dark: {
    background: "#1e293b",
    border: "rgb(71 85 105 / 0.9)",
    heading: "#e2e8f0",
    text: "#94a3b8",
    closeBtn: "#94a3b8",
    shadow: "0 4px 16px rgba(0, 0, 0, 0.55)",
  },
};

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
    tooltipEl.style.pointerEvents = "auto";
    tooltipEl.style.transition = "all .1s ease";
    tooltipEl.style.zIndex = "1000";
    tooltipEl.style.borderRadius = "8px";
    tooltipEl.style.fontFamily = "Inter, system-ui, sans-serif";
    tooltipEl.style.fontSize = "12px";
    tooltipEl.style.padding = "16px";
    tooltipEl.style.paddingTop = "8px";
    tooltipEl.style.minWidth = "200px";
    tooltipEl.style.maxWidth = "300px";

    const handleClickOutside = (e: Event) => {
      if (!tooltipEl?.contains(e.target as Node)) {
        tooltipEl!.style.opacity = "0";
        setTimeout(() => {
          if (tooltipEl && tooltipEl.parentNode) {
            document.removeEventListener("click", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
            document.body.removeChild(tooltipEl);
          }
        }, 100);
      }
    };

    document.addEventListener("click", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.body.appendChild(tooltipEl);
  }

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
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <div style="font-weight: 600; color: ${theme.heading};">${config.heading}</div>
        <button id="${config.id}-close" style="
          background: none;
          border: none;
          font-size: 16px;
          cursor: pointer;
          color: ${theme.closeBtn};
          padding: 0;
          margin: 0;
          line-height: 1;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">&times;</button>
      </div>
    `;

    config.rows.forEach((row) => {
      innerHtml += `<div style="color: ${row.color}; margin: 2px 0; font-weight: 400;">${row.label}: ${row.value}</div>`;
    });

    tooltipEl.innerHTML = innerHtml;

    const closeBtn = tooltipEl.querySelector(`#${config.id}-close`);
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        tooltipEl!.style.opacity = "0";
      });
    }
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
    leftPosition = position.left + window.pageXOffset + caretX - tooltipWidth - 20;
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
  arrow.style.borderRight = arrowPosition === "left" ? `8px solid ${theme.background}` : "none";
  arrow.style.borderLeft = arrowPosition === "right" ? `8px solid ${theme.background}` : "none";

  const maxLeft = window.innerWidth - tooltipWidth - 10;
  const minLeft = 10;
  leftPosition = Math.max(minLeft, Math.min(maxLeft, leftPosition));

  tooltipEl.style.opacity = "1";
  tooltipEl.style.left = leftPosition + "px";
  tooltipEl.style.top =
    position.top +
    window.pageYOffset +
    caretY -
    tooltipEl.offsetHeight / 2 +
    (config.verticalOffset ?? 0) +
    "px";
}
