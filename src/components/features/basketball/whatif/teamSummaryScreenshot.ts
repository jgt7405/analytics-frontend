// PNG export of one section of the What If Summary for a team (html2canvas,
// loaded on first use). The summary's sections carry data-summary-section
// ("conf", "ncaa", "divider"); the image keeps the selections and the chosen
// section only.

export type SummarySection = "conf" | "ncaa";

export const SUMMARY_SECTIONS: Record<
  SummarySection,
  { titleSuffix: string; explains: string }
> = {
  conf: {
    titleSuffix: " (Conference Tournament)",
    explains: "conference tournament seed probabilities",
  },
  ncaa: {
    titleSuffix: " (NCAA Tournament)",
    explains: "NCAA tournament probabilities",
  },
};

export async function captureTeamSummaryScreenshot(
  element: HTMLElement,
  filename: string,
  section: SummarySection,
  chartTitle?: string,
  teamLogoUrl?: string,
) {
  if (typeof window === "undefined") return;
  // Export helpers load on demand, not with the page.
  const {
    expandExportClone,
    getFullContentWidth,
    getFullScreenshotDimensions,
  } = await import("@/lib/export/layout");
  const { ensureHtml2Canvas } = await import("@/lib/export/capture");
  const { saveCanvasImage } = await import("@/lib/export/save");
  await ensureHtml2Canvas();
  const html2canvas = window.html2canvas;
  if (!html2canvas) return;
  // Clone as laid out on a desktop, so the image is the same from a phone.
  const { withDesktopLayout } = await import("@/lib/export/desktop-layout");
  const { clone, contentWidth } = await withDesktopLayout([element], () => {
    const clone = element.cloneNode(true) as HTMLElement;
    expandExportClone(element, clone);
    return {
      clone,
      contentWidth: Math.max(getFullContentWidth(element) + 48, 660),
    };
  });
  clone.querySelectorAll("[data-no-screenshot]").forEach((el) => el.remove());
  // Drop the other section and the divider between the two
  const dropped = section === "conf" ? "ncaa" : "conf";
  clone
    .querySelectorAll(
      `[data-summary-section="${dropped}"], [data-summary-section="divider"]`,
    )
    .forEach((el) => el.remove());
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `position:fixed;left:-9999px;top:0;background:#fff;padding:16px 24px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Roboto",sans-serif;width:${contentWidth}px;z-index:-1;overflow:visible;`;
  const header = document.createElement("div");
  header.style.cssText =
    "display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:10px;border-bottom:2px solid #e5e7eb;";
  const logo = document.createElement("img");
  logo.src = "/images/JThom_Logo.png";
  logo.style.cssText = "height:40px;width:auto;";
  const titleSpan = document.createElement("div");
  titleSpan.textContent = chartTitle || "What If Summary by Team";
  titleSpan.style.cssText =
    "font-size:13px;font-weight:500;color:#374151;text-align:center;flex:1;padding:0 12px;";
  // Right side: team logo above date
  const rightCol = document.createElement("div");
  rightCol.style.cssText =
    "display:flex;flex-direction:column;align-items:center;gap:2px;";
  if (teamLogoUrl) {
    const teamLogo = document.createElement("img");
    teamLogo.src = teamLogoUrl;
    teamLogo.style.cssText = "height:28px;width:28px;object-fit:contain;";
    rightCol.appendChild(teamLogo);
  }
  const date = document.createElement("div");
  date.textContent = new Date().toLocaleDateString();
  date.style.cssText = "font-size:12px;color:#6b7280;";
  rightCol.appendChild(date);
  header.appendChild(logo);
  header.appendChild(titleSpan);
  header.appendChild(rightCol);
  wrapper.appendChild(header);
  clone.style.cssText = "overflow:visible!important;width:100%!important;";
  wrapper.appendChild(clone);
  // Explainer text for screenshot
  const explainer = document.createElement("div");
  explainer.style.cssText =
    "margin-top:10px;padding-top:8px;border-top:1px solid #e5e7eb;font-size:9px;color:#9ca3af;line-height:1.4;";
  explainer.textContent = `Shows how selected game outcomes affect this team's ${SUMMARY_SECTIONS[section].explains}. Current reflects pre-selection probabilities; What If reflects updated probabilities after applying selected game results.`;
  wrapper.appendChild(explainer);
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
  await saveCanvasImage(canvas, filename, "What-If Team Summary");
}
