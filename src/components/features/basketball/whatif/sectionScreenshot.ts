// PNG export of one tournament section of a what-if team panel (Team Detail,
// What If Summary) with html2canvas, loaded on first use. The panel's
// sections carry data-summary-section ("conf", "ncaa", "divider"); the image
// keeps everything else plus the chosen section only.

export type SummarySection = "conf" | "ncaa";

export const SECTION_TITLE_SUFFIX: Record<SummarySection, string> = {
  conf: " (Conference Tournament)",
  ncaa: " (NCAA Tournament)",
};

export async function captureSectionScreenshot(
  element: HTMLElement,
  {
    section,
    filename,
    title,
    teamLogoUrl,
    explainer: explainerText,
    saveTitle,
  }: {
    section: SummarySection;
    filename: string;
    title: string;
    teamLogoUrl?: string;
    explainer: string;
    saveTitle: string;
  },
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
  titleSpan.textContent = title;
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
  explainer.textContent = explainerText;
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
  await saveCanvasImage(canvas, filename, saveTitle);
}
