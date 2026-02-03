// src/lib/optimized-screenshot.ts
interface ScreenshotOptions {
  pageTitle: string;
  selectedConference: string;
  pageName: string;
  includeExplainer?: boolean;
  quality?: number;
}

interface Html2CanvasOptions {
  useCORS?: boolean;
  logging?: boolean;
  backgroundColor?: string;
  width?: number;
  height?: number;
  allowTaint?: boolean;
  foreignObjectRendering?: boolean;
  scale?: number;
}

export async function createOptimizedScreenshot(
  element: HTMLElement,
  options: ScreenshotOptions,
): Promise<HTMLCanvasElement> {
  try {
    const { default: html2canvas } = await import("html2canvas");

    const wrapper = createScreenshotWrapper(element, options);
    document.body.appendChild(wrapper);

    await waitForAssetsToLoad(wrapper);

    const canvasOptions: Html2CanvasOptions = {
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: "#ffffff",
      foreignObjectRendering: true,
      scale: 2,
    };

    const canvas = await html2canvas(wrapper, canvasOptions);

    document.body.removeChild(wrapper);

    return canvas;
  } catch (error) {
    console.error("Screenshot creation failed:", error);
    throw new Error(
      `Screenshot failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

async function waitForAssetsToLoad(element: HTMLElement): Promise<void> {
  const images = element.querySelectorAll("img");

  const imagePromises = Array.from(images).map((img) => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const timeout = setTimeout(() => resolve(), 2000);
      img.onload = () => {
        clearTimeout(timeout);
        resolve();
      };
      img.onerror = () => {
        clearTimeout(timeout);
        resolve();
      };
    });
  });

  await Promise.all(imagePromises);
  await new Promise((resolve) => setTimeout(resolve, 500));
}

function createScreenshotWrapper(
  element: HTMLElement,
  options: ScreenshotOptions,
): HTMLElement {
  const wrapper = document.createElement("div");

  // Measure content width more accurately
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    overflow: visible !important;
    width: max-content !important;
    opacity: 0.01;
    z-index: -9999;
  `;

  document.body.appendChild(clone);

  let actualContentWidth = 0;

  // Try to measure table first (for standings/data tables)
  const table = clone.querySelector("table");
  if (table) {
    actualContentWidth = table.offsetWidth;
  } else {
    // For charts (SVG, Canvas, etc), measure the actual rendered content
    const svg = clone.querySelector("svg") as SVGSVGElement;
    if (svg) {
      // Get the SVG's bounding box to find actual content width
      try {
        const bbox = svg.getBBox();
        actualContentWidth = Math.ceil(bbox.width + bbox.x);
      } catch {
        // Fallback to clientWidth if getBBox fails
        actualContentWidth = svg.clientWidth || svg.viewBox.baseVal?.width || 0;
      }
    } else {
      // For other components, find the widest child element
      let maxWidth = clone.offsetWidth;
      const allElements = clone.querySelectorAll("*");
      allElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const elementWidth = htmlEl.offsetWidth;
        if (elementWidth > 0 && elementWidth < 5000) {
          // Ignore unrealistic widths
          maxWidth = Math.max(maxWidth, elementWidth);
        }
      });
      actualContentWidth = maxWidth;
    }
  }

  document.body.removeChild(clone);

  // Add minimal padding (20px total: 10px on each side)
  const wrapperWidth = actualContentWidth + 40;

  wrapper.style.cssText = `
    position: fixed;
    left: 0;
    top: 0;
    background-color: #ffffff;
    padding: 24px 20px; /* 20px horizontal padding */
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
    width: ${wrapperWidth}px;
    box-sizing: border-box;
    z-index: -1000;
    opacity: 0.01;
  `;

  const header = createHeader(options);
  wrapper.appendChild(header);

  const contentClone = cleanElementForScreenshot(element);
  contentClone.style.cssText = `
    overflow: visible !important;
    width: 100% !important;
  `;

  const contentContainers = contentClone.querySelectorAll(
    '[style*="overflow"]',
  );
  contentContainers.forEach((container) => {
    (container as HTMLElement).style.overflow = "visible";
  });

  wrapper.appendChild(contentClone);

  if (options.includeExplainer) {
    const explainer = createExplainerSection();
    if (explainer) {
      wrapper.appendChild(explainer);
    }
  }

  const footer = createFooter();
  wrapper.appendChild(footer);

  return wrapper;
}

function getConferenceLogoPath(conference: string): string | null {
  const conferenceLogos: { [key: string]: string } = {
    "Big 12": "big_12.png",
    SEC: "sec.png",
    "Big Ten": "big_ten.png",
    ACC: "acc.png",
    "Pac-12": "pac_12.png",
    "Mountain West": "mountain_west.png",
    "American Athletic": "american.png",
    "Conference USA": "cusa.png",
    MAC: "mac.png",
    "Sun Belt": "sun_belt.png",
    WAC: "wac.png",
    "Ivy League": "ivy.png",
    "Patriot League": "patriot.png",
    "Big Sky": "big_sky.png",
    "Missouri Valley": "mvc.png",
    "Southern Conference": "socon.png",
    "Colonial Athletic": "caa.png",
    "Ohio Valley": "ovc.png",
    Southland: "southland.png",
    "Big South": "big_south.png",
    "Northeast Conference": "nec.png",
    MEAC: "meac.png",
    SWAC: "swac.png",
  };

  return conferenceLogos[conference] || null;
}

function createHeader(options: ScreenshotOptions): HTMLElement {
  const header = document.createElement("div");
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 2px solid #e5e7eb;
    width: 100%;
    min-height: 60px;
  `;

  const logoSection = document.createElement("div");
  logoSection.style.cssText = `
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  `;

  const logo = document.createElement("img");
  const isFootball =
    window.location.pathname.includes("/football") ||
    options.pageName.includes("football");
  logo.src = isFootball
    ? "/images/JThom_Logo_Football.png"
    : "/images/JThom_Logo.png";
  logo.alt = "JThom Analytics";
  logo.style.cssText = `
    height: 50px;
    width: auto;
    object-fit: contain;
    flex-shrink: 0;
  `;

  const logoText = document.createElement("span");
  logoText.textContent = "JThom Analytics";
  logoText.style.cssText = `
    font-size: 18px;
    font-weight: 600;
    color: #1f2937;
    white-space: nowrap;
  `;

  logoSection.appendChild(logo);
  logoSection.appendChild(logoText);

  const title = document.createElement("h1");
  title.textContent = options.pageTitle;
  title.style.cssText = `
    font-family: "Roboto Condensed", system-ui, sans-serif;
    font-size: 1.25rem;
    font-weight: 500;
    color: #6b7280;
    margin: 0;
    text-align: center;
    flex: 1;
  `;

  const infoSection = document.createElement("div");
  infoSection.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    flex-shrink: 0;
  `;

  const conferenceLogoPath = getConferenceLogoPath(options.selectedConference);
  if (conferenceLogoPath) {
    const conferenceLogo = document.createElement("img");
    conferenceLogo.src = `/images/conf_logos/${conferenceLogoPath}`;
    conferenceLogo.alt = options.selectedConference;
    conferenceLogo.style.cssText = `
      height: 30px;
      width: auto;
      object-fit: contain;
      max-width: 80px;
    `;

    conferenceLogo.onerror = () => {
      conferenceLogo.style.display = "none";
      const conferenceText = document.createElement("div");
      conferenceText.textContent = options.selectedConference;
      conferenceText.style.cssText = `
        font-size: 14px;
        font-weight: 600;
        color: #1f2937;
      `;
      infoSection.insertBefore(conferenceText, infoSection.firstChild);
    };

    infoSection.appendChild(conferenceLogo);
  } else {
    const conference = document.createElement("div");
    conference.textContent = options.selectedConference;
    conference.style.cssText = `
      font-size: 14px;
      font-weight: 600;
      color: #1f2937;
    `;
    infoSection.appendChild(conference);
  }

  const date = document.createElement("div");
  date.textContent = new Date().toLocaleDateString();
  date.style.cssText = `
    font-size: 12px;
    color: #6b7280;
  `;

  infoSection.appendChild(date);

  header.appendChild(logoSection);
  header.appendChild(title);
  header.appendChild(infoSection);

  return header;
}

function cleanElementForScreenshot(element: HTMLElement): HTMLElement {
  const clone = element.cloneNode(true) as HTMLElement;

  // Remove existing styles first
  clone.querySelectorAll("*").forEach((el) => {
    (el as HTMLElement).style.removeProperty("text-align");
    (el as HTMLElement).style.removeProperty("justify-content");
    (el as HTMLElement).style.removeProperty("align-items");
  });

  // Higher specificity CSS injection
  const style = document.createElement("style");
  style.textContent = `
    table th[class*="bg-gray"] {
      text-align: center !important;
      vertical-align: middle !important;
      padding: 8px !important;
    }
    table th[class*="bg-gray"] > div {
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      width: 100% !important;
      height: 100% !important;
      margin: 0 !important;
    }
    table th img {
      width: 24px !important;
      height: 24px !important;
      margin: 0 auto !important;
      display: block !important;
    }
  `;
  clone.appendChild(style);

  clone.style.position = "static";
  clone.style.display = "block";
  clone.style.visibility = "visible";
  clone.style.opacity = "1";
  clone.style.width = "100%";
  clone.style.height = "auto";

  return clone;
}

function createExplainerSection(): HTMLElement | null {
  const explainerElement = document.querySelector(
    ".explainer-text, [class*='explainer']",
  );
  if (!explainerElement) return null;

  const explainerClone = explainerElement.cloneNode(true) as HTMLElement;
  explainerClone.style.cssText = `
    margin-top: 20px;
    padding: 16px;
    background-color: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
    font-size: 12px;
    color: #6b7280;
    line-height: 1.3;
    width: 100%;
    box-sizing: border-box;
  `;

  const explainerElements = explainerClone.querySelectorAll("*");
  explainerElements.forEach((el) => {
    const element = el as HTMLElement;
    element.style.position = "static";
    element.style.zIndex = "auto";
    if (!element.style.color) {
      element.style.color = "#6b7280";
    }
    if (!element.style.fontSize) {
      element.style.fontSize = "12px";
    }
  });

  return explainerClone;
}

function createFooter(): HTMLElement {
  const footer = document.createElement("div");
  footer.style.cssText = `
    margin-top: 20px;
    padding-top: 12px;
    border-top: 1px solid #e5e7eb;
    font-size: 12px;
    color: #9ca3af;
    text-align: center;
  `;

  footer.textContent = `Generated by JThom Analytics Ã¢â‚¬Â¢ ${new Date().toLocaleString()}`;

  return footer;
}

export async function downloadCanvas(
  canvas: HTMLCanvasElement,
  filename: string,
  isMobile: boolean = false,
): Promise<void> {
  if (
    isMobile &&
    navigator.canShare &&
    typeof navigator.canShare === "function"
  ) {
    return handleMobileShare(canvas, filename);
  } else {
    return handleDesktopDownload(canvas, filename);
  }
}

async function handleMobileShare(
  canvas: HTMLCanvasElement,
  filename: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          reject(new Error("Failed to create blob"));
          return;
        }

        const file = new File([blob], filename, { type: "image/png" });

        try {
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: "Sports Analytics Export",
            });
          } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            a.style.display = "none";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      },
      "image/png",
      0.95,
    );
  });
}

function handleDesktopDownload(
  canvas: HTMLCanvasElement,
  filename: string,
): Promise<void> {
  return new Promise((resolve) => {
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png", 0.95);
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    resolve();
  });
}

export function generateScreenshotFilename(
  conference: string,
  pageName: string,
  extension: string = "png",
): string {
  const timestamp = new Date().toISOString().split("T")[0];
  const confName = conference
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "");
  const pageNameClean = pageName.replace(/[^a-zA-Z0-9_]/g, "");

  return `${confName}_${pageNameClean}_${timestamp}.${extension}`;
}

export type { ScreenshotOptions };
