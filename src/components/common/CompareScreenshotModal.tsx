// src/components/common/CompareScreenshotModal.tsx
"use client";

import { Button } from "@/components/ui/Button";
import { Download } from "@/components/ui/icons";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface CompareScreenshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  visibleTeams: string[];
}

declare global {
  interface Window {
    html2canvas?: (
      element: HTMLElement,
      options?: object
    ) => Promise<HTMLCanvasElement>;
  }
}

const CompareScreenshotModal: React.FC<CompareScreenshotModalProps> = ({
  isOpen,
  onClose,
  visibleTeams,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [html2canvasLoaded, setHtml2canvasLoaded] = useState(false);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      typeof window.html2canvas !== "function"
    ) {
      const script = document.createElement("script");
      script.src = "https://html2canvas.hertzen.com/dist/html2canvas.min.js";
      script.async = true;
      script.onload = () => setHtml2canvasLoaded(true);
      script.onerror = (error) =>
        console.error("Failed to load html2canvas:", error);
      document.body.appendChild(script);

      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      };
    } else if (typeof window.html2canvas === "function") {
      setHtml2canvasLoaded(true);
    }
  }, []);

  if (!isOpen) return null;

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

  const handleDownload = async (selector: string, label: string) => {
    if (downloading || !html2canvasLoaded) return;

    try {
      setDownloading(true);
      toast.loading("Generating screenshot...");

      if (typeof window.html2canvas !== "function") {
        throw new Error("html2canvas not loaded");
      }

      // Find all elements matching the selector across all visible teams
      const elements = document.querySelectorAll(selector);

      if (elements.length === 0) {
        toast.dismiss();
        toast.error(`No ${label} components found`);
        return;
      }

      console.log(`Found ${elements.length} components for ${label}`);

      // Determine if this is schedule difficulty
      const isScheduleDifficulty = selector.includes("schedule-difficulty");

      // Calculate component width based on type
      let componentWidth: number;
      if (isScheduleDifficulty) {
        // Schedule difficulty needs more width due to the chart layout
        componentWidth = 500;
      } else {
        // Other charts - fill more space with less white space
        componentWidth = 380;
      }

      const gap = 20; // Reduced gap for line charts
      const padding = 100; // Left and right padding
      const totalWidth =
        componentWidth * elements.length +
        gap * (elements.length - 1) +
        padding;

      // Create wrapper
      const wrapper = document.createElement("div");
      wrapper.style.cssText = `
        position: fixed;
        left: -9999px;
        top: 0;
        background-color: white;
        padding: 32px 50px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
        width: ${totalWidth}px;
        z-index: -1;
        overflow: visible;
      `;

      // Create header
      const contentWidth = totalWidth - 100;
      const header = document.createElement("div");
      header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 12px;
        border-bottom: 2px solid #e5e7eb;
        width: ${contentWidth}px;
        margin-left: 0;
      `;

      // JThom logo as base64
      const logo = document.createElement("img");
      const logoPath = "/images/JThom_Logo_Football.png";
      const logoBase64 = await imageToBase64(
        `${window.location.origin}${logoPath}`
      );
      logo.src = logoBase64;
      logo.style.cssText = `height: 50px; width: auto;`;

      const titleElement = document.createElement("h1");
      titleElement.textContent = label;
      titleElement.style.cssText = `
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
        margin-top: -8px;
      `;

      const date = document.createElement("div");
      date.textContent = new Date().toLocaleDateString();
      date.style.cssText = `font-size: 12px; color: #6b7280;`;
      infoSection.appendChild(date);

      header.appendChild(logo);
      header.appendChild(titleElement);
      header.appendChild(infoSection);
      wrapper.appendChild(header);

      // Create container for components
      const componentsContainer = document.createElement("div");
      componentsContainer.style.cssText = `
        display: flex;
        gap: ${gap}px;
        flex-wrap: nowrap;
        width: ${contentWidth}px;
        overflow: visible;
      `;

      // Clone and process each component
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        const clone = element.cloneNode(true) as HTMLElement;

        // Find team name and logo from parent container
        const teamNameElement = element.closest("[data-team-name]");
        let teamName = "";
        let teamLogoUrl = "";

        if (teamNameElement) {
          teamName = teamNameElement.getAttribute("data-team-name") || "";
          // Try to find the team logo from the page
          const teamHeaderLogo = teamNameElement.querySelector(
            'img[alt*="logo"]'
          ) as HTMLImageElement;
          if (teamHeaderLogo) {
            teamLogoUrl = teamHeaderLogo.src;
          }
        }

        // For schedule difficulty, remove ONLY the team logo at top right, not opponent logos in chart
        if (isScheduleDifficulty) {
          // The team logo is in a div with class "absolute z-10" and specific positioning
          const allDivs = clone.querySelectorAll("div");
          allDivs.forEach((div) => {
            const divEl = div as HTMLElement;
            const className = divEl.className;
            const style = divEl.getAttribute("style") || "";

            // Check if this is the team logo container by its positioning
            // It has top: -30px and right: 0px
            if (
              (className.includes("absolute") && className.includes("z-10")) ||
              (style.includes("top") &&
                (style.includes("-30px") || style.includes("top: -30px"))) ||
              (style.includes("right") &&
                style.includes("0px") &&
                style.includes("top"))
            ) {
              divEl.remove();
            }
          });
        }

        // Convert all remaining images to base64
        const images = clone.querySelectorAll("img");
        for (const img of Array.from(images)) {
          const imgEl = img as HTMLImageElement;
          let originalUrl = imgEl.src;

          // Handle Next.js image URLs
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

        // Handle canvas elements - expand them to fill available space
        const originalCanvas = element.querySelector(
          "canvas"
        ) as HTMLCanvasElement;
        if (originalCanvas) {
          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = originalCanvas.width;
          tempCanvas.height = originalCanvas.height;

          // For line charts, expand the canvas to fill more space
          if (!isScheduleDifficulty) {
            tempCanvas.style.width = `${componentWidth - 32}px !important`; // Account for padding
            tempCanvas.style.height = "auto";
          } else {
            tempCanvas.style.width = originalCanvas.style.width;
            tempCanvas.style.height = originalCanvas.style.height;
          }

          const ctx = tempCanvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(originalCanvas, 0, 0);
          }

          const clonedCanvas = clone.querySelector("canvas");
          if (clonedCanvas && clonedCanvas.parentNode) {
            clonedCanvas.parentNode.replaceChild(tempCanvas, clonedCanvas);
          }
        }

        // Remove overflow restrictions and ensure full visibility
        const scrollableContainers = clone.querySelectorAll(
          '[style*="overflow"]'
        );
        scrollableContainers.forEach((container) => {
          (container as HTMLElement).style.overflow = "visible";
          (container as HTMLElement).style.overflowX = "visible";
          (container as HTMLElement).style.overflowY = "visible";
        });

        // For line charts, expand the chart containers
        if (!isScheduleDifficulty) {
          const chartContainers = clone.querySelectorAll("div");
          chartContainers.forEach((div) => {
            const divEl = div as HTMLElement;
            // Remove any width constraints
            if (divEl.style.maxWidth) {
              divEl.style.maxWidth = "none";
            }
            if (divEl.style.width && divEl.style.width !== "100%") {
              divEl.style.width = "100%";
            }
          });
        }

        // Remove sticky positioning
        const stickyElements = clone.querySelectorAll('[style*="sticky"]');
        stickyElements.forEach((el) => {
          (el as HTMLElement).style.position = "relative";
        });

        // Special handling for schedule difficulty
        if (isScheduleDifficulty) {
          // Reset any transform scaling
          const transformedElements = clone.querySelectorAll(
            '[style*="transform"]'
          );
          transformedElements.forEach((el) => {
            const element = el as HTMLElement;
            // Remove the scale transform but keep other transforms if any
            if (element.style.transform.includes("scale")) {
              element.style.transform = "none";
              element.style.transformOrigin = "top left";
            }
          });

          // Ensure the inner content is visible
          clone.style.cssText = `
            flex-shrink: 0;
            background: white;
            padding: 16px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            width: ${componentWidth}px;
            overflow: visible !important;
            min-height: 600px;
          `;
        } else {
          // Style for other components - maximize chart space
          clone.style.cssText = `
            flex-shrink: 0;
            background: white;
            padding: 16px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            width: ${componentWidth}px;
            overflow: visible !important;
            display: flex;
            flex-direction: column;
          `;

          // Make the chart container fill all available space
          const chartWrapper = clone.querySelector("div");
          if (chartWrapper) {
            (chartWrapper as HTMLElement).style.cssText = `
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
            `;
          }
        }

        // Add team name label and logo at the top
        if (teamName) {
          const teamHeader = document.createElement("div");
          teamHeader.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 16px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e5e7eb;
            flex-shrink: 0;
          `;

          const teamNameSpan = document.createElement("span");
          teamNameSpan.textContent = teamName;

          teamHeader.appendChild(teamNameSpan);

          // Add team logo if available
          if (teamLogoUrl) {
            try {
              const teamLogoBase64 = await imageToBase64(teamLogoUrl);
              const teamLogoImg = document.createElement("img");
              teamLogoImg.src = teamLogoBase64;
              teamLogoImg.style.cssText = `
                height: 32px;
                width: 32px;
                object-fit: contain;
                opacity: 0.8;
              `;
              teamHeader.appendChild(teamLogoImg);
            } catch (e) {
              console.error("Failed to load team logo:", e);
            }
          }

          clone.insertBefore(teamHeader, clone.firstChild);
        }

        componentsContainer.appendChild(clone);
      }

      wrapper.appendChild(componentsContainer);
      document.body.appendChild(wrapper);

      // Wait for everything to render
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Generate screenshot
      if (!window.html2canvas) {
        throw new Error("html2canvas failed to load");
      }

      const canvas = await window.html2canvas(wrapper, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: totalWidth,
        windowWidth: totalWidth,
      });

      document.body.removeChild(wrapper);

      // Download
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `compare_${label.replace(/\s+/g, "_")}_${timestamp}.png`;

      const link = document.createElement("a");
      link.download = filename;
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast.dismiss();
      toast.success("Screenshot downloaded!");
    } catch (error) {
      console.error("Download failed:", error);
      toast.dismiss();
      toast.error(
        `Screenshot failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setDownloading(false);
    }
  };

  const componentOptions = [
    {
      label: "Schedule Difficulty",
      selector: "[data-component='schedule-difficulty']",
      description: "Compare schedule difficulty across teams",
    },
    {
      label: "Projected Wins History",
      selector: "[data-component='win-history']",
      description: "Win projections over time",
    },
    {
      label: "Projected Standings History",
      selector: "[data-component='standings-history']",
      description: "Conference standings projections",
    },
    {
      label: "CFP Bid History",
      selector: "[data-component='cfp-bid-history']",
      description: "College Football Playoff bid probabilities",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              Download Team Comparison
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Showing {visibleTeams.length} team
              {visibleTeams.length !== 1 ? "s" : ""}: {visibleTeams.join(", ")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={downloading}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Loading indicator */}
        {!html2canvasLoaded && (
          <div className="px-6 py-3 bg-amber-50 text-amber-700 text-sm">
            Loading screenshot library...
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {componentOptions.map((option) => (
              <div
                key={option.selector}
                className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900 mb-1">
                    {option.label}
                  </div>
                  <div className="text-sm text-gray-500">
                    {option.description}
                  </div>
                </div>
                <Button
                  onClick={() => handleDownload(option.selector, option.label)}
                  disabled={downloading || !html2canvasLoaded}
                  size="sm"
                  className="ml-4 flex-shrink-0"
                >
                  {downloading ? (
                    <>
                      <Download className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 mb-3">
            Each screenshot will include all visible team comparisons side by
            side.
          </p>
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full"
            disabled={downloading}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CompareScreenshotModal;
