import {
  expandExportClone,
  getFullScreenshotDimensions,
} from "@/lib/screenshot-layout";
import { saveCanvasImage } from "@/lib/save-image";

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
 * Turn a URL into a data URI. Tries a CORS fetch first, then falls back to
 * drawing an <img crossorigin> onto a canvas. Returns the original URL if
 * both fail so the export still references something.
 */
async function toDataUri(url: string): Promise<string> {
  if (!url || url.startsWith("data:")) return url;

  try {
    const response = await fetch(url, { mode: "cors" });
    if (response.ok) {
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
  } catch {
    // fall through to the <img> approach
  }

  return await new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2d context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      try {
        resolve(canvas.toDataURL("image/png"));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

declare global {
  interface Window {
    html2canvas?: (
      element: HTMLElement,
      options?: object,
    ) => Promise<HTMLCanvasElement>;
  }
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

  if (!window.html2canvas) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://html2canvas.hertzen.com/dist/html2canvas.min.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load html2canvas"));
      document.body.appendChild(script);
    });
  }
  if (!window.html2canvas) {
    throw new Error("Failed to load html2canvas");
  }

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
  const WRAPPER_PADDING = 20;
  const totalWidth = contentWidth + WRAPPER_PADDING * 2;

  const chartClone = chartElement.cloneNode(true) as HTMLElement;
  expandExportClone(chartElement, chartClone);
  chartClone.style.setProperty("width", `${contentWidth}px`, "important");
  chartClone.style.setProperty("max-width", `${contentWidth}px`, "important");

  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    background: white;
    padding: ${WRAPPER_PADDING}px;
    width: ${totalWidth}px;
  `;

  const header = document.createElement("div");
  header.style.cssText = `
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e5e7eb;
  `;

  const logo = document.createElement("img");
  logo.src = logoSrc;
  logo.style.cssText = `height: 50px; width: auto;`;

  const titleEl = document.createElement("div");
  titleEl.textContent = title;
  titleEl.style.cssText = `
    flex: 1;
    text-align: center;
    font-size: 18px;
    font-weight: 500;
    color: #1f2937;
  `;

  const date = document.createElement("div");
  date.textContent = new Date().toLocaleDateString();
  date.style.cssText = `font-size: 12px; color: #6b7280; white-space: nowrap;`;

  header.appendChild(logo);
  header.appendChild(titleEl);
  header.appendChild(date);
  wrapper.appendChild(header);
  wrapper.appendChild(chartClone);
  document.body.appendChild(wrapper);

  try {
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Inline every logo - HTML <img> and SVG <image> alike - so html2canvas
    // never has to fetch a cross-origin asset mid-render.
    const htmlImages = Array.from(wrapper.querySelectorAll("img"));
    await Promise.all(
      htmlImages.map(async (img) => {
        try {
          img.src = await toDataUri(img.src);
        } catch (err) {
          console.warn("Export: could not inline <img>", img.src, err);
        }
      }),
    );

    const svgImages = Array.from(wrapper.querySelectorAll("image"));
    await Promise.all(
      svgImages.map(async (node) => {
        const el = node as SVGImageElement;
        const src =
          el.getAttribute("href") || el.getAttribute("xlink:href") || "";
        try {
          const dataUri = await toDataUri(src);
          // Set both the SVG2 href and the legacy xlink:href - html2canvas
          // serializes the SVG and re-parses it as an image, and older
          // parse paths only honor xlink:href.
          el.setAttribute("href", dataUri);
          el.setAttributeNS(
            "http://www.w3.org/1999/xlink",
            "xlink:href",
            dataUri,
          );
        } catch (err) {
          console.warn("Export: could not inline <image>", src, err);
        }
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 200));

    const captureSize = getFullScreenshotDimensions(wrapper);
    const canvas = await window.html2canvas(wrapper, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: totalWidth,
      height: captureSize.height,
      windowWidth: totalWidth,
      windowHeight: captureSize.height,
      scrollX: 0,
      scrollY: 0,
    });

    await saveCanvasImage(canvas, `${filename}.png`, title);
  } finally {
    document.body.removeChild(wrapper);
  }
}
