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
  options: ScreenshotOptions
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
      `Screenshot failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

async function waitForAssetsToLoad(element: HTMLElement): Promise<void> {
  const images = element.querySelectorAll("img");
  const fonts = document.fonts;

  const imagePromises = Array.from(images).map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const timeout = setTimeout(() => resolve(), 3000);

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

  const fontPromise = fonts.ready.catch(() => {
    console.warn("Fonts failed to load for screenshot");
  });

  await Promise.all([...imagePromises, fontPromise]);
  await new Promise((resolve) => setTimeout(resolve, 100));
}

function createScreenshotWrapper(
  element: HTMLElement,
  options: ScreenshotOptions
): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
   position: fixed;
   left: -9999px;
   top: 0;
   background-color: #ffffff;
   padding: 24px;
   font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
   min-width: ${Math.max(element.scrollWidth + 48, 800)}px;
   box-sizing: border-box;
   z-index: -1;
 `;

  const header = createHeader(options);
  wrapper.appendChild(header);

  const clone = cleanElementForScreenshot(element);
  wrapper.appendChild(clone);

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
  const isFootball = window.location.pathname.includes("/football");
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
   color: #666666;
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

  const conference = document.createElement("div");
  conference.textContent = options.selectedConference;
  conference.style.cssText = `
   font-size: 14px;
   font-weight: 600;
   color: #1f2937;
 `;

  const date = document.createElement("div");
  date.textContent = new Date().toLocaleDateString();
  date.style.cssText = `
   font-size: 12px;
   color: #6b7280;
 `;

  infoSection.appendChild(conference);
  infoSection.appendChild(date);

  header.appendChild(logoSection);
  header.appendChild(title);
  header.appendChild(infoSection);

  return header;
}

function cleanElementForScreenshot(element: HTMLElement): HTMLElement {
  const clone = element.cloneNode(true) as HTMLElement;

  clone.querySelectorAll("button, [role='button']").forEach((btn) => {
    (btn as HTMLElement).style.display = "none";
  });

  clone.querySelectorAll(".tooltip, [class*='tooltip']").forEach((tooltip) => {
    (tooltip as HTMLElement).style.display = "none";
  });

  clone.querySelectorAll("table").forEach((table) => {
    table.style.cssText = `
     width: 100%;
     border-collapse: collapse;
     margin: 16px 0;
     font-size: 12px;
     border: 1px solid #d1d5db;
   `;

    table.querySelectorAll("th, td").forEach((cell) => {
      const cellEl = cell as HTMLElement;
      cellEl.style.padding = "8px 12px";
      cellEl.style.border = "1px solid #d1d5db";
      cellEl.style.textAlign = cell.tagName === "TH" ? "center" : "inherit";
      cellEl.style.verticalAlign = "middle";
      cellEl.style.backgroundColor =
        cell.tagName === "TH" ? "#f8fafc" : "white";
      cellEl.style.fontWeight = cell.tagName === "TH" ? "600" : "normal";
    });

    const firstColumnCells = table.querySelectorAll(
      "th:first-child, td:first-child"
    );
    firstColumnCells.forEach((cell) => {
      (cell as HTMLElement).style.textAlign = "left";
      (cell as HTMLElement).style.borderRight = "2px solid #d1d5db";
    });
  });

  return clone;
}

function createExplainerSection(): HTMLElement | null {
  const explainerElement = document.querySelector(
    ".explainer-text, [class*='explainer']"
  );
  if (!explainerElement) return null;

  const explainerClone = explainerElement.cloneNode(true) as HTMLElement;
  explainerClone.style.cssText = `
   margin-top: 20px;
   padding: 16px;
   background-color: #f8fafc;
   border: 1px solid #e5e7eb;
   border-radius: 8px;
   font-family: "Roboto Condensed", system-ui, sans-serif;
   font-size: 12px;
   color: #666666;
   line-height: 1.3;
   width: 100%;
   box-sizing: border-box;
 `;

  const explainerElements = explainerClone.querySelectorAll("*");
  explainerElements.forEach((el) => {
    const element = el as HTMLElement;
    element.style.position = "static";
    element.style.zIndex = "auto";
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

  footer.textContent = `Generated by JThom Analytics • ${new Date().toLocaleString()}`;

  return footer;
}

export async function downloadCanvas(
  canvas: HTMLCanvasElement,
  filename: string,
  isMobile: boolean = false
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
  filename: string
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
      0.95
    );
  });
}

function handleDesktopDownload(
  canvas: HTMLCanvasElement,
  filename: string
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
  extension: string = "png"
): string {
  const timestamp = new Date().toISOString().split("T")[0];
  const confName = conference
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "");
  const pageNameClean = pageName.replace(/[^a-zA-Z0-9_]/g, "");

  return `${confName}_${pageNameClean}_${timestamp}.${extension}`;
}

export type { ScreenshotOptions };
