import {
  expandExportClone,
  getFullScreenshotDimensions,
} from "@/lib/screenshot-layout";
import { saveCanvasImage } from "@/lib/save-image";

declare global {
  interface Window {
    html2canvas?: (
      element: HTMLElement,
      options?: object,
    ) => Promise<HTMLCanvasElement>;
  }
}

/**
 * Turn a URL into a data URI. Tries a CORS fetch first, then falls back to
 * drawing an <img crossorigin> onto a canvas. Returns the original URL if
 * both fail so the export still references something.
 */
export async function toDataUri(url: string): Promise<string> {
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

export async function ensureHtml2Canvas(): Promise<void> {
  if (typeof window.html2canvas === "function") return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://html2canvas.hertzen.com/dist/html2canvas.min.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load html2canvas"));
    document.body.appendChild(script);
  });
  if (typeof window.html2canvas !== "function") {
    throw new Error("Failed to load html2canvas");
  }
}

interface CaptureAndSaveElementOptions {
  /** The live element to clone and rasterize. */
  sourceElement: HTMLElement;
  /** Width (px) the clone is pinned to before capture. */
  contentWidth: number;
  /** Header title rendered above the element in the export. */
  title: string;
  /** Path to the sport logo shown top-left of the export. */
  logoSrc: string;
  /** Download filename, without extension. */
  filename: string;
}

/**
 * Clone `sourceElement` into an off-screen wrapper (with a branded header),
 * inline every raster/SVG image as a data URI, rasterize with html2canvas,
 * and save the result as a PNG. Shared by the Compare-page chart export and
 * the Season Info table export.
 */
export async function captureAndSaveElement({
  sourceElement,
  contentWidth,
  title,
  logoSrc,
  filename,
}: CaptureAndSaveElementOptions): Promise<void> {
  await ensureHtml2Canvas();

  const WRAPPER_PADDING = 20;
  const totalWidth = contentWidth + WRAPPER_PADDING * 2;

  const clone = sourceElement.cloneNode(true) as HTMLElement;
  expandExportClone(sourceElement, clone);
  clone.style.setProperty("width", `${contentWidth}px`, "important");
  clone.style.setProperty("max-width", `${contentWidth}px`, "important");

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
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Inline every logo - HTML <img> and SVG <image> alike - so html2canvas
    // never has to fetch a cross-origin (or same-origin but async) asset
    // mid-render.
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
    const canvas = await window.html2canvas!(wrapper, {
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
