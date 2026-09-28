// PNG export of a what-if table (html2canvas, loaded on first use).

import { saveCanvasImage } from "@/lib/save-image";
import { expandExportClone, getFullContentWidth, getFullScreenshotDimensions } from "@/lib/screenshot-layout";

// – Screenshot helper –
export async function captureScreenshot(
  element: HTMLElement,
  selectionLegendHtml: string | null,
  filename: string,
  chartTitle?: string,
) {
  if (typeof window === "undefined") return;
  let html2canvas = window.html2canvas;
  if (!html2canvas) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://html2canvas.hertzen.com/dist/html2canvas.min.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load html2canvas"));
      document.body.appendChild(s);
    });
    html2canvas = window.html2canvas;
  }
  if (!html2canvas) return;

  const clone = element.cloneNode(true) as HTMLElement;
  expandExportClone(element, clone);
  clone.querySelectorAll("[data-no-screenshot]").forEach((el) => el.remove());

  // Remove only the page-level explainer text (not the component's built-in explainer)
  clone.querySelectorAll("p").forEach((el) => {
    const text = el.textContent?.trim() || "";
    // Remove paragraphs that are page-level explainers (longer, multi-sentence explanations at bottom)
    if (
      text.length > 100 &&
      text.includes("probabilities") &&
      !el.closest("table")
    ) {
      el.remove();
    }
  });

  // Measure actual content width for tighter screenshots
  const contentWidth = Math.max(getFullContentWidth(element) + 48, 660);

  const wrapper = document.createElement("div");
  wrapper.style.cssText = `position:fixed;left:-9999px;top:0;background:#fff;padding:16px 24px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Roboto",sans-serif;width:${contentWidth}px;z-index:-1;overflow:visible;`;

  const header = document.createElement("div");
  header.style.cssText =
    "display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:10px;border-bottom:2px solid var(--border-color);";
  const logo = document.createElement("img");
  logo.src = "/images/JThom_Logo.png";
  logo.style.cssText = "height:40px;width:auto;";

  const titleSpan = document.createElement("div");
  titleSpan.textContent = chartTitle || "";
  titleSpan.style.cssText =
    "font-size:13px;font-weight:500;color:#374151;text-align:center;flex:1;padding:0 12px;";

  const date = document.createElement("div");
  date.textContent = new Date().toLocaleDateString();
  date.style.cssText = "font-size:12px;color:#6b7280;";
  header.appendChild(logo);
  header.appendChild(titleSpan);
  header.appendChild(date);
  wrapper.appendChild(header);

  clone.style.cssText = "overflow:visible!important;width:100%!important;";
  wrapper.appendChild(clone);

  if (selectionLegendHtml) {
    const legendDiv = document.createElement("div");
    legendDiv.innerHTML = selectionLegendHtml;
    legendDiv.style.cssText =
      "margin-top:12px;padding-top:10px;border-top:1px solid var(--border-color);font-size:11px;color:#6b7280;";
    wrapper.appendChild(legendDiv);
  }

  document.body.appendChild(wrapper);
  await new Promise((r) => setTimeout(r, 400));

  const captureSize = getFullScreenshotDimensions(wrapper);
  const canvas = await html2canvas(wrapper, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
    width: captureSize.width,
    height: captureSize.height,
    windowWidth: captureSize.width,
    windowHeight: captureSize.height,
    scrollX: 0,
    scrollY: 0,
  });
  document.body.removeChild(wrapper);

  await saveCanvasImage(canvas, filename, "Basketball What-If Scenarios");
}

declare global {
  interface Window {
    html2canvas?: (
      element: HTMLElement,
      options?: object,
    ) => Promise<HTMLCanvasElement>;
  }
}
