import { captureAndSaveElement } from "@/lib/export-image";

interface DownloadCompareChartOptions {
  /** id of the element wrapping the comparison chart */
  chartId: string;
  /** Header title rendered above the chart in the export */
  title: string;
  /** Path to the sport logo shown top-left of the export */
  logoSrc: string;
  /** Download filename (without extension) */
  filename: string;
  /**
   * Minimum content width in px. The export is sized to the chart's own SVG
   * width, but the filter controls above it can be wider - this keeps them
   * from being clipped.
   */
  minWidth?: number;
}

/**
 * Export a single comparison chart (the Schedule Difficulty chart on the
 * Compare pages) to a PNG. Sizes the image to the chart's intrinsic width so
 * a 2-team comparison isn't rendered on a page-width canvas.
 */
export async function downloadCompareChart({
  chartId,
  title,
  logoSrc,
  filename,
  minWidth = 520,
}: DownloadCompareChartOptions): Promise<void> {
  const chartElement = document.getElementById(chartId);
  if (!chartElement) return;

  // The chart's true width is its SVG width - the live container is stretched
  // to the page. Fall back to the width attribute if it isn't laid out.
  const sourceSvg = chartElement.querySelector("svg");
  const svgWidth = sourceSvg
    ? Math.ceil(
        sourceSvg.getBoundingClientRect().width ||
          parseFloat(sourceSvg.getAttribute("width") || "0"),
      )
    : 0;
  const contentWidth = Math.max(svgWidth, minWidth);

  await captureAndSaveElement({
    sourceElement: chartElement,
    contentWidth,
    title,
    logoSrc,
    filename,
  });
}
