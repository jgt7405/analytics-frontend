// src/lib/chartTooltip.ts
import type { Chart, TooltipModel } from "chart.js";

interface TooltipOptions {
  tooltipId: string;
  getContent: (tooltipModel: TooltipModel<"line">, chart: Chart) => string;
  styling?: Partial<CSSStyleDeclaration>;
}

interface TooltipState {
  isTouch: boolean;
  touchStartTime: number;
  isHovering: boolean;
}

const tooltipStates = new Map<string, TooltipState>();

export function createChartTooltip(options: TooltipOptions) {
  const { tooltipId, getContent, styling = {} } = options;

  return (args: { chart: Chart; tooltip: TooltipModel<"line"> }) => {
    const { tooltip: tooltipModel, chart } = args;

    // Initialize or get tooltip state
    if (!tooltipStates.has(tooltipId)) {
      tooltipStates.set(tooltipId, {
        isTouch: false,
        touchStartTime: 0,
        isHovering: false,
      });
    }
    const state = tooltipStates.get(tooltipId)!;

    // Detect if this is a touch device
    const isTouchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;

    let tooltipEl = document.getElementById(tooltipId);

    if (!tooltipEl) {
      tooltipEl = document.createElement("div");
      tooltipEl.id = tooltipId;

      // Default styling
      Object.assign(tooltipEl.style, {
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        color: "#1f2937",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "12px",
        opacity: "0",
        padding: "16px",
        paddingTop: "8px",
        pointerEvents: "none",
        position: "absolute",
        transition: "opacity 0.2s ease",
        zIndex: "1000",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
        minWidth: "200px",
        maxWidth: "300px",
        ...styling,
      });

      document.body.appendChild(tooltipEl);

      // Chart canvas event listeners
      const canvas = chart.canvas;

      if (isTouchDevice) {
        // Mobile touch handling
        canvas.addEventListener("touchstart", handleTouchStart);
        canvas.addEventListener("touchend", handleTouchEnd);
        document.addEventListener("touchstart", handleDocumentTouch);
      } else {
        // Desktop mouse handling
        canvas.addEventListener("mouseenter", handleMouseEnter);
        canvas.addEventListener("mouseleave", handleMouseLeave);
      }
    }

    function handleTouchStart(e: TouchEvent) {
      e.preventDefault();
      state.isTouch = true;
      state.touchStartTime = Date.now();
    }

    function handleTouchEnd(e: TouchEvent) {
      e.preventDefault();
      // Only show tooltip on quick tap (< 200ms)
      if (Date.now() - state.touchStartTime < 200) {
        state.isHovering = true;
        showTooltip();
      }
    }

    function handleDocumentTouch(e: TouchEvent) {
      const canvas = chart.canvas;
      if (!canvas.contains(e.target as Node)) {
        hideTooltip();
        state.isHovering = false;
      }
    }

    function handleMouseEnter() {
      state.isHovering = true;
    }

    function handleMouseLeave() {
      state.isHovering = false;
      hideTooltip();
    }

    function showTooltip() {
      if (tooltipEl && tooltipModel.opacity > 0) {
        tooltipEl.innerHTML = getContent(tooltipModel, chart);

        // Position tooltip
        positionTooltip(tooltipEl, tooltipModel, chart);

        tooltipEl.style.opacity = "1";
      }
    }

    function hideTooltip() {
      if (tooltipEl) {
        tooltipEl.style.opacity = "0";
      }
    }

    // Main tooltip logic
    if (tooltipModel.opacity === 0) {
      hideTooltip();
      return;
    }

    // Show tooltip based on device and state
    if (isTouchDevice) {
      // On mobile, only show if user has tapped and is hovering
      if (state.isHovering && state.isTouch) {
        showTooltip();
      }
    } else {
      // On desktop, show if hovering over chart
      if (state.isHovering) {
        showTooltip();
      }
    }
  };
}

function positionTooltip(
  tooltipEl: HTMLElement,
  tooltipModel: TooltipModel<"line">,
  chart: Chart
) {
  const position = chart.canvas.getBoundingClientRect();
  const tooltipWidth = tooltipEl.offsetWidth;
  const tooltipHeight = tooltipEl.offsetHeight;

  let left = position.left + window.scrollX + tooltipModel.caretX;
  let top = position.top + window.scrollY + tooltipModel.caretY;

  // Prevent tooltip from going off-screen
  if (left + tooltipWidth > window.innerWidth) {
    left =
      position.left + window.scrollX + tooltipModel.caretX - tooltipWidth - 10;
  }

  if (top + tooltipHeight > window.innerHeight + window.scrollY) {
    top =
      position.top + window.scrollY + tooltipModel.caretY - tooltipHeight - 10;
  }

  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top = `${top}px`;
}

// Cleanup function to remove event listeners
export function cleanupTooltip(tooltipId: string) {
  const tooltipEl = document.getElementById(tooltipId);
  if (tooltipEl) {
    tooltipEl.remove();
  }
  tooltipStates.delete(tooltipId);
}
