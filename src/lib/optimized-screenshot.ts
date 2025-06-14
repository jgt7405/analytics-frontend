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
    // Dynamic import to reduce initial bundle size
    const { default: html2canvas } = await import("html2canvas");

    const wrapper = createScreenshotWrapper(element, options);
    document.body.appendChild(wrapper);

    // Wait for all assets to load before capturing
    await waitForAssetsToLoad(wrapper);

    const canvasOptions: Html2CanvasOptions = {
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: "#ffffff",
      foreignObjectRendering: true,
      scale: 2, // Higher quality for better readability
    };

    const canvas = await html2canvas(wrapper, canvasOptions);

    // Clean up wrapper element
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

  // Wait for images to load
  const imagePromises = Array.from(images).map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const timeout = setTimeout(() => resolve(), 3000); // 3 second timeout

      img.onload = () => {
        clearTimeout(timeout);
        resolve();
      };
      img.onerror = () => {
        clearTimeout(timeout);
        resolve(); // Don't fail on broken images
      };
    });
  });

  // Wait for fonts to load
  const fontPromise = fonts.ready.catch(() => {
    // Continue even if fonts fail to load
    console.warn("Fonts failed to load for screenshot");
  });

  await Promise.all([...imagePromises, fontPromise]);

  // Additional small delay to ensure complete rendering
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

  // Create header
  const header = createHeader(options);
  wrapper.appendChild(header);

  // Clone and prepare the main element
  const clone = cleanElementForScreenshot(element);
  wrapper.appendChild(clone);

  // Add explainer if requested
  if (options.includeExplainer) {
    const explainer = createExplainerSection();
    if (explainer) {
      wrapper.appendChild(explainer);
    }
  }

  // Add footer with generation info
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

  // Logo section
  const logoSection = document.createElement("div");
  logoSection.style.cssText = `
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  `;

  const logo = document.createElement("img");
  logo.src = "/images/JThom_Logo.png";
  logo.alt = "JThom Analytics";
  logo.style.cssText = `
    height: 40px;
    width: 40px;
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

  // Title section
  const titleSection = document.createElement("div");
  titleSection.style.cssText = `
    flex: 1;
    text-align: center;
    padding: 0 20px;
    min-width: 0;
  `;

  const titleElement = document.createElement("h1");
  titleElement.textContent = options.pageTitle;
  titleElement.style.cssText = `
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    color: #1f2937;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `;
  titleSection.appendChild(titleElement);

  // Conference and date section
  const infoSection = document.createElement("div");
  infoSection.style.cssText = `
    text-align: right;
    min-width: 150px;
    flex-shrink: 0;
  `;

  if (
    options.selectedConference &&
    options.selectedConference !== "All Conferences"
  ) {
    const confText = document.createElement("div");
    confText.textContent = options.selectedConference;
    confText.style.cssText = `
      font-size: 16px;
      font-weight: 500;
      color: #4b5563;
      white-space: nowrap;
    `;
    infoSection.appendChild(confText);
  }

  const dateText = document.createElement("div");
  dateText.textContent = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  dateText.style.cssText = `
    font-size: 14px;
    color: #9ca3af;
    margin-top: 4px;
    white-space: nowrap;
  `;
  infoSection.appendChild(dateText);

  // Assemble header
  header.appendChild(logoSection);
  header.appendChild(titleSection);
  header.appendChild(infoSection);

  return header;
}

function cleanElementForScreenshot(element: HTMLElement): HTMLElement {
  const clone = element.cloneNode(true) as HTMLElement;

  // Reset all positioning and z-index issues
  const allElements = clone.querySelectorAll("*");
  allElements.forEach((el) => {
    const htmlEl = el as HTMLElement;

    // Reset problematic CSS properties
    htmlEl.style.position = "static";
    htmlEl.style.transform = "none";
    htmlEl.style.zIndex = "auto";
    htmlEl.style.left = "auto";
    htmlEl.style.top = "auto";
    htmlEl.style.right = "auto";
    htmlEl.style.bottom = "auto";
    htmlEl.style.maxHeight = "none";
    htmlEl.style.overflow = "visible";
  });

  // Style the clone container
  clone.style.cssText = `
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: visible;
    width: auto;
    display: block;
    margin-bottom: 20px;
    background: white;
  `;

  // Handle tables specifically
  const tables = clone.querySelectorAll("table");
  tables.forEach((table) => {
    table.style.cssText = `
      border-collapse: separate;
      border-spacing: 0;
      width: 100%;
      table-layout: auto;
      font-size: 14px;
      background: white;
    `;

    // Reset all table cells
    const cells = table.querySelectorAll("th, td");
    cells.forEach((cell) => {
      const cellEl = cell as HTMLElement;
      cellEl.style.position = "static";
      cellEl.style.border = "1px solid #e5e7eb";
      cellEl.style.padding = "8px 12px";
      cellEl.style.textAlign = cell.tagName === "TH" ? "center" : "inherit";
      cellEl.style.verticalAlign = "middle";
      cellEl.style.backgroundColor =
        cell.tagName === "TH" ? "#f8fafc" : "white";
      cellEl.style.fontWeight = cell.tagName === "TH" ? "600" : "normal";
    });

    // Handle first column (team names) alignment
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
    background-color: #f0f9ff;
    border: 1px solid #bfdbfe;
    border-radius: 8px;
    font-size: 14px;
    color: #1e40af;
    line-height: 1.5;
    width: 100%;
    box-sizing: border-box;
  `;

  // Clean up any problematic styles in explainer content
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

// Utility function for downloading canvas
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
              title: "Basketball Analytics Export",
            });
          } else {
            // Fallback: create download link
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

// Utility function to generate optimized filename
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

// Export types for external use
export type { ScreenshotOptions };
