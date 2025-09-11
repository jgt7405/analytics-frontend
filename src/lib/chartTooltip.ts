// src/lib/chartTooltip.ts
import type { Chart, TooltipModel } from "chart.js";

interface TooltipOptions {
  tooltipId: string;
  getContent: (tooltipModel: TooltipModel<"line">, chart: Chart) => string;
  styling?: Partial<CSSStyleDeclaration>;
  showCloseButton?: boolean;
}

interface TooltipState {
  isTouch: boolean;
  touchStartTime: number;
  isHovering: boolean;
}

const tooltipStates = new Map<string, TooltipState>();

export function createChartTooltip(options: TooltipOptions) {
  const {
    tooltipId,
    getContent,
    styling = {},
    showCloseButton = true,
  } = options;

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
      // Show tooltip immediately on tap
      if (Date.now() - state.touchStartTime < 300) {
        state.isHovering = !state.isHovering; // Toggle state
        if (state.isHovering) {
          showTooltip();
        } else {
          hideTooltip();
        }
      }
    }

    function handleDocumentTouch(e: TouchEvent) {
      const canvas = chart.canvas;
      const target = e.target as Node;

      // Only hide if touching outside both canvas and tooltip
      if (!canvas.contains(target) && !tooltipEl?.contains(target)) {
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
        const content = getContent(tooltipModel, chart);

        if (showCloseButton) {
          // Wrap content with close button
          tooltipEl.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <div style="flex: 1;">
                ${content}
              </div>
              <button 
                class="tooltip-close-btn"
                style="background: none; border: none; color: #6b7280; cursor: pointer; padding: 0; margin-left: 8px; font-size: 16px; line-height: 1; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;"
              >
                ×
              </button>
            </div>
          `;

          // Add close button functionality
          const closeBtn = tooltipEl.querySelector(".tooltip-close-btn");
          if (closeBtn) {
            closeBtn.addEventListener("click", (e) => {
              e.stopPropagation();
              hideTooltip();
              state.isHovering = false;
            });
          }
        } else {
          tooltipEl.innerHTML = content;
        }

        // Position tooltip
        positionTooltip(tooltipEl, tooltipModel, chart);

        tooltipEl.style.opacity = "1";
        tooltipEl.style.pointerEvents = "auto";
      }
    }

    function hideTooltip() {
      if (tooltipEl) {
        tooltipEl.style.opacity = "0";
        tooltipEl.style.pointerEvents = "none";
      }
    }

    // Main tooltip logic
    if (tooltipModel.opacity === 0) {
      hideTooltip();
      return;
    }

    // Show tooltip based on device and state
    if (isTouchDevice) {
      // On mobile, show based on hover state (set by touch handlers)
      if (state.isHovering) {
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

  // Get viewport dimensions
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const scrollX = window.scrollX || window.pageXOffset;
  const scrollY = window.scrollY || window.pageYOffset;

  // Calculate base position
  let left = position.left + scrollX + tooltipModel.caretX;
  let top = position.top + scrollY + tooltipModel.caretY;

  // Mobile-specific adjustments
  const isMobile = viewportWidth <= 768;

  if (isMobile) {
    // On mobile, position tooltip near the touch point but ensure visibility
    const touchX = tooltipModel.caretX;
    const touchY = tooltipModel.caretY;

    // Calculate position relative to chart
    left = position.left + scrollX + touchX - tooltipWidth / 2;
    top = position.top + scrollY + touchY - tooltipHeight - 20; // Position above touch point

    // Horizontal constraints
    const margin = 10;
    if (left < margin + scrollX) {
      left = margin + scrollX;
    } else if (left + tooltipWidth > viewportWidth - margin + scrollX) {
      left = viewportWidth - tooltipWidth - margin + scrollX;
    }

    // Vertical constraints - if tooltip would go above viewport, show below touch point
    if (top < margin + scrollY) {
      top = position.top + scrollY + touchY + 20; // Position below touch point
    }

    // Final check - ensure it doesn't go below viewport
    if (top + tooltipHeight > viewportHeight - margin + scrollY) {
      top = viewportHeight - tooltipHeight - margin + scrollY;
    }
  } else {
    // Desktop positioning
    const margin = 10;

    // Horizontal positioning
    if (left + tooltipWidth > viewportWidth - margin + scrollX) {
      left = position.left + scrollX + tooltipModel.caretX - tooltipWidth - 20;
    }

    // Ensure it doesn't go off the left edge
    if (left < margin + scrollX) {
      left = margin + scrollX;
    }

    // Vertical positioning
    if (top + tooltipHeight > viewportHeight - margin + scrollY) {
      top = position.top + scrollY + tooltipModel.caretY - tooltipHeight - 10;
    }

    // Ensure it doesn't go off the top edge
    if (top < margin + scrollY) {
      top = margin + scrollY;
    }
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
