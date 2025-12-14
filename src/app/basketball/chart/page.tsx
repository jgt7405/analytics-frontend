"use client";

import BballScatterplotChart from "@/components/features/basketball/BballScatterplotChart";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Download, Share2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    html2canvas?: (
      element: HTMLElement,
      options?: object
    ) => Promise<HTMLCanvasElement>;
  }
}

export default function BasketballChartPage() {
  const [isLoading] = useState(false);
  const [isScreenshotModalOpen, setIsScreenshotModalOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [html2canvasLoaded, setHtml2canvasLoaded] = useState(false);
  const [chartTitle, setChartTitle] = useState("Custom Scatterplot");
  const chartRef = useRef<HTMLDivElement>(null);

  // Load html2canvas
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      typeof window.html2canvas !== "function"
    ) {
      const script = document.createElement("script");
      script.src = "https://html2canvas.hertzen.com/dist/html2canvas.min.js";
      script.async = true;
      script.onload = () => setHtml2canvasLoaded(true);
      script.onerror = () => console.error("Failed to load html2canvas");
      document.body.appendChild(script);
      return () => {
        if (document.body.contains(script)) document.body.removeChild(script);
      };
    } else if (typeof window.html2canvas === "function") {
      setHtml2canvasLoaded(true);
    }
  }, []);

  // Convert image URL to base64
  const imageToBase64 = async (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } else {
          reject(new Error("Could not get canvas context"));
        }
      };

      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    });
  };

  const handleScreenshot = async () => {
    if (!chartRef.current || !html2canvasLoaded) return;

    try {
      setIsCapturing(true);
      console.log("Screenshot started");

      // Get the chart element
      const targetElement = chartRef.current;

      // Wait for SVG to render
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Clone the element
      const clone = targetElement.cloneNode(true) as HTMLElement;

      // Remove the Chart Settings section from the clone
      const settingsPanel = clone.querySelector(
        '[data-exclude-screenshot="true"]'
      );
      if (settingsPanel) {
        settingsPanel.remove();
      }

      // Also remove the entire parent div containing settings if needed
      const settingsContainer = clone.querySelector(".mb-6.p-6.pt-0");
      if (
        settingsContainer &&
        settingsContainer.querySelector('[data-exclude-screenshot="true"]')
      ) {
        settingsContainer.remove();
      }

      // Fix SVG visibility and styling
      const svgs = clone.querySelectorAll("svg");
      svgs.forEach((svg) => {
        svg.style.cssText = `
        display: block !important;
        overflow: visible !important;
        width: 100% !important;
        height: auto !important;
        background: white !important;
        border: none !important;
      `;
      });

      // Fix and convert images to base64
      const images = clone.querySelectorAll("img");
      for (const img of Array.from(images)) {
        const imgEl = img as HTMLImageElement;
        let originalUrl = imgEl.src;

        // Handle Next.js optimized images
        if (originalUrl.includes("/_next/image")) {
          try {
            const url = new URL(originalUrl);
            const path = url.searchParams.get("url");
            if (path) {
              originalUrl = path.startsWith("http")
                ? path
                : `${window.location.origin}${path}`;
            }
          } catch (e) {
            console.error("URL parse error:", e);
          }
        }

        try {
          const base64 = await imageToBase64(originalUrl);
          imgEl.src = base64;
        } catch (e) {
          console.error("Base64 conversion failed for:", originalUrl, e);
        }
      }

      // Create wrapper with fixed width
      const wrapper = document.createElement("div");
      wrapper.style.cssText = `
  position: fixed;
  left: -9999px;
  top: 0;
  background-color: white;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
  width: 1000px;
  box-sizing: border-box;
  z-index: -1;
  overflow: visible;
`;

      // Create header section
      const header = document.createElement("div");
      header.style.cssText = `
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  border-bottom: 2px solid #e5e7eb;
  width: 100%;
  box-sizing: border-box;
  position: relative;
`;

      // Logo and title section (left side)
      const logoSection = document.createElement("div");
      logoSection.style.cssText = `
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
`;

      // Add JThom logo
      const logo = document.createElement("img");
      try {
        const logoBase64 = await imageToBase64(
          `${window.location.origin}/images/JThom_Logo.png`
        );
        logo.src = logoBase64;
        logo.style.cssText = `
    height: 50px;
    width: auto;
    flex-shrink: 0;
  `;
        logoSection.appendChild(logo);
      } catch (e) {
        console.error("Failed to load logo:", e);
      }

      // Add centered title
      const titleElement = document.createElement("h1");
      titleElement.textContent = chartTitle;
      titleElement.style.cssText = `
  font-family: "Roboto Condensed", system-ui, sans-serif;
  font-size: 1.5rem;
  font-weight: 500;
  color: #374151;
  margin: 0;
  flex: 1;
  text-align: center;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
`;

      // Add date (moved further right)
      const dateElement = document.createElement("div");
      dateElement.textContent = new Date().toLocaleDateString();
      dateElement.style.cssText = `
  font-size: 12px;
  color: #6b7280;
  flex-shrink: 0;
  position: absolute;
  right: 40px;
  top: 50%;
  transform: translateY(-50%);
`;

      header.appendChild(logoSection);
      header.appendChild(titleElement);
      header.appendChild(dateElement);
      wrapper.appendChild(header);

      // Add chart container with reduced height to show bottom labels
      const chartContainer = document.createElement("div");
      chartContainer.style.cssText = `
  width: 100%;
  overflow: visible;
  display: block;
  padding: 2px 16px 0 24px;
  box-sizing: border-box;
  height: 680px;
  overflow: hidden;
`;

      clone.style.cssText = `
  width: 100% !important;
  overflow: visible !important;
  display: block !important;
  background: white !important;
  padding: 0 !important;
  margin-top: -60px !important;
`;
      chartContainer.appendChild(clone);
      wrapper.appendChild(chartContainer);

      // Append wrapper to body
      document.body.appendChild(wrapper);

      // Wait for all elements to fully render
      await new Promise((resolve) => setTimeout(resolve, 1500));

      console.log("Starting html2canvas render...");

      // Convert to canvas with proper options
      const canvas = (await Promise.race([
        window.html2canvas!(wrapper, {
          backgroundColor: "#ffffff",
          scale: 2,
          logging: false,
          useCORS: true,
          allowTaint: true,
          width: 1000,
          windowWidth: 1000,
          letterRendering: true,
        }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Screenshot timed out after 30 seconds")),
            30000
          )
        ),
      ])) as HTMLCanvasElement;

      console.log("Render complete, cleaning up...");

      // Clean up
      document.body.removeChild(wrapper);

      // Download file
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `${chartTitle.replace(/\s+/g, "_")}_${timestamp}.png`;
      const link = document.createElement("a");
      link.download = filename;
      link.href = canvas.toDataURL("image/png");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log("Download triggered");
      setIsCapturing(false);
      setIsScreenshotModalOpen(false);
    } catch (error) {
      console.error("Screenshot failed:", error);
      alert(
        `Failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      setIsCapturing(false);
    }
  };

  const handleShareX = () => {
    const url = new URL("https://twitter.com/intent/tweet");
    url.searchParams.append(
      "text",
      `Check out my ${chartTitle} scatterplot chart! 📊 Built with JThom Analytics`
    );
    url.searchParams.append("via", "JThom_Analytics");
    window.open(url.toString(), "_blank");
  };

  return (
    <PageLayoutWrapper title="Custom Scatterplot" isLoading={isLoading}>
      <div className="w-full">
        <ErrorBoundary>
          {/* Chart Container - Only header and chart get captured in screenshot */}
          <div
            ref={chartRef}
            className="bg-white rounded-lg"
            data-component="scatterplot"
            style={{ padding: 0 }}
          >
            <BballScatterplotChart onTitleChange={setChartTitle} />
          </div>

          {/* Action Buttons - NOT captured in screenshot */}
          <div className="mt-6 flex gap-3 justify-end">
            <button
              onClick={() => setIsScreenshotModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
              disabled={!html2canvasLoaded}
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={handleShareX}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share on X
            </button>
          </div>

          {/* Screenshot Modal */}
          {isScreenshotModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              {/* Backdrop */}
              <div
                className="absolute inset-0 bg-black bg-opacity-50"
                onClick={
                  !isCapturing
                    ? () => setIsScreenshotModalOpen(false)
                    : undefined
                }
              />

              {/* Modal Content */}
              <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 z-10">
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Download Screenshot
                  </h2>
                  <button
                    onClick={() => setIsScreenshotModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={isCapturing}
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Loading State */}
                {!html2canvasLoaded && (
                  <div className="mb-4 text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
                    Loading screenshot library...
                  </div>
                )}

                {/* Info Section */}
                <div className="space-y-4 mb-6">
                  <p className="text-sm text-gray-700 font-medium">
                    Your screenshot will include:
                  </p>
                  <ul className="text-sm text-gray-600 space-y-2 ml-4">
                    <li className="flex items-start gap-2">
                      <span className="text-gray-400 mt-0.5">•</span>
                      <span>JThom Analytics logo</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-400 mt-0.5">•</span>
                      <span>Chart title: {chartTitle}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-400 mt-0.5">•</span>
                      <span>Full scatterplot with all teams</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-400 mt-0.5">•</span>
                      <span>Current date</span>
                    </li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={handleScreenshot}
                    disabled={isCapturing || !html2canvasLoaded}
                    className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium"
                  >
                    {isCapturing ? (
                      <>
                        <span className="animate-spin inline-block">↻</span>
                        <span>Capturing...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Download as PNG</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setIsScreenshotModalOpen(false)}
                    disabled={isCapturing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Cancel
                  </button>
                </div>

                {/* Helper Text */}
                <p className="text-xs text-gray-500 mt-4 text-center">
                  The screenshot will be saved as PNG with high quality (2x
                  scale)
                </p>
              </div>
            </div>
          )}
        </ErrorBoundary>
      </div>
    </PageLayoutWrapper>
  );
}
