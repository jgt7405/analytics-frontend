// Screenshots should look the same whether they're taken on a phone or a
// desktop, and that look is the desktop one. On a narrow screen the live page
// renders its mobile layout (smaller fonts and chart heights from
// useResponsive, a ~360px-wide Chart.js canvas), and a clone can't re-layout a
// canvas - it only copies its pixels. So for the moment it takes to clone a
// section, re-render that section at desktop width, then put it back.

import {
  DESKTOP_EXPORT_WIDTH,
  DESKTOP_MIN_VIEWPORT,
  getChartForCanvas,
  setDesktopLayoutForced,
} from "@/lib/export/desktop-layout-state";

const nextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

async function settle(): Promise<void> {
  // One frame for React to commit, one for ResizeObservers (Chart.js resize,
  // overlay positions) to fire, one for whatever state they set.
  await nextFrame();
  await nextFrame();
  await nextFrame();
}

/** Jump every Chart.js chart in `elements` to its final frame. */
function finishChartAnimations(elements: HTMLElement[]): void {
  elements
    .flatMap((el) => Array.from(el.querySelectorAll("canvas")))
    .forEach((canvas) => {
      const chart = getChartForCanvas(canvas);
      // update("none") only draws at once when no animation is running;
      // stop() cancels the running one first.
      chart?.stop();
      chart?.update("none");
    });
}

/**
 * Run `capture` (which clones/measures `elements`) with those elements laid
 * out as on a desktop. On a desktop-width screen it just runs `capture`.
 * A cover hides the brief re-layout on the phone.
 */
export async function withDesktopLayout<T>(
  elements: HTMLElement[],
  capture: () => T | Promise<T>,
): Promise<T> {
  if (
    typeof window === "undefined" ||
    window.innerWidth >= DESKTOP_MIN_VIEWPORT
  ) {
    return capture();
  }

  const { scrollX, scrollY } = window;
  const saved = elements.map((el) => ({
    el,
    width: el.style.width,
    maxWidth: el.style.maxWidth,
  }));

  const cover = document.createElement("div");
  cover.setAttribute("aria-hidden", "true");
  cover.textContent = "Creating image…";
  cover.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${getComputedStyle(document.body).backgroundColor || "#ffffff"};
    color: ${getComputedStyle(document.body).color || "#334155"};
    font: 600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;
  document.body.appendChild(cover);

  try {
    setDesktopLayoutForced(true);
    elements.forEach((el) => {
      el.style.width = `${Math.max(DESKTOP_EXPORT_WIDTH, el.getBoundingClientRect().width)}px`;
      el.style.maxWidth = "none";
    });
    await settle();
    finishChartAnimations(elements);
    await settle();
    // The re-render the resize set off (end-of-line logo positions, new
    // options) can start another animation; draw the final frame again,
    // synchronously, right before cloning.
    finishChartAnimations(elements);
    return await capture();
  } finally {
    saved.forEach(({ el, width, maxWidth }) => {
      el.style.width = width;
      el.style.maxWidth = maxWidth;
    });
    setDesktopLayoutForced(false);
    window.scrollTo(scrollX, scrollY);
    cover.remove();
  }
}
