"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

interface ScreenshotOption {
  id: string;
  label: string;
  selector: string;
}

interface ScreenshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: ScreenshotOption[];
  teamName?: string;
  teamLogoUrl?: string;
}

declare global {
  interface Window {
    html2canvas?: (
      element: HTMLElement,
      options?: object
    ) => Promise<HTMLCanvasElement>;
  }
}

export default function ScreenshotModal({
  isOpen,
  onClose,
  options,
  teamName,
  teamLogoUrl,
}: ScreenshotModalProps) {
  const [isCapturing, setIsCapturing] = useState(false);
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
      script.onerror = () => alert("Failed to load screenshot library.");
      document.body.appendChild(script);
      return () => {
        if (document.body.contains(script)) document.body.removeChild(script);
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

  const handleScreenshot = async (selector: string, label: string) => {
    if (!html2canvasLoaded || typeof window.html2canvas !== "function") {
      alert("Screenshot library not loaded.");
      return;
    }

    setIsCapturing(true);

    try {
      const targetElement = document.querySelector(selector);
      if (!targetElement) throw new Error("Element not found");

      // Extract all Next.js image URLs and convert to base64
      const images = targetElement.querySelectorAll("img");
      const imageMap = new Map<HTMLImageElement, string>();

      for (const img of Array.from(images)) {
        const imgEl = img as HTMLImageElement;
        let originalUrl = imgEl.src;

        // Extract original path from Next.js URL
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
          imageMap.set(imgEl, base64);
        } catch (e) {
          console.error("Base64 conversion failed:", e);
        }
      }

      // Calculate width
      const isChart = targetElement.querySelector("canvas") !== null;
      const table = targetElement.querySelector("table");
      const actualWidth = table
        ? (table as HTMLElement).offsetWidth + 200
        : isChart
          ? 1475
          : 1200;

      // Clone and replace images with base64
      const clone = targetElement.cloneNode(true) as HTMLElement;

      // Handle canvas
      const originalCanvas = targetElement.querySelector(
        "canvas"
      ) as HTMLCanvasElement;
      if (originalCanvas) {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = originalCanvas.width;
        tempCanvas.height = originalCanvas.height;
        tempCanvas.style.width = originalCanvas.style.width;
        tempCanvas.style.height = originalCanvas.style.height;
        const ctx = tempCanvas.getContext("2d");
        if (ctx) ctx.drawImage(originalCanvas, 0, 0);
        const clonedCanvas = clone.querySelector("canvas");
        if (clonedCanvas?.parentNode)
          clonedCanvas.parentNode.replaceChild(tempCanvas, clonedCanvas);
      }

      // Replace cloned images with base64
      const clonedImages = clone.querySelectorAll("img");
      const originalImagesArray = Array.from(images);
      clonedImages.forEach((clonedImg, index) => {
        const originalImg = originalImagesArray[index] as HTMLImageElement;
        const base64 = imageMap.get(originalImg);
        if (base64) {
          (clonedImg as HTMLImageElement).src = base64;
        }
      });

      // Create wrapper
      const wrapper = document.createElement("div");
      wrapper.style.cssText = `position: fixed; left: -9999px; top: 0; background-color: white; padding: 24px 50px; width: ${actualWidth}px; z-index: -1; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;`;

      const contentWidth = actualWidth - 100;
      const header = document.createElement("div");
      header.style.cssText = `display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #e5e7eb; width: ${contentWidth}px;`;

      // JThom logo as base64
      const logo = document.createElement("img");
      const logoPath = window.location.pathname.includes("/football")
        ? "/images/JThom_Logo_Football.png"
        : "/images/JThom_Logo.png";
      const logoBase64 = await imageToBase64(
        `${window.location.origin}${logoPath}`
      );
      logo.src = logoBase64;
      logo.style.cssText = `height: 50px; width: auto;`;

      const titleElement = document.createElement("h1");
      titleElement.textContent = label;
      titleElement.style.cssText = `font-family: "Roboto Condensed", system-ui, sans-serif; font-size: 1.25rem; font-weight: 500; color: #6b7280; margin: 0; text-align: center; flex: 1;`;

      const infoSection = document.createElement("div");
      infoSection.style.cssText = `display: flex; flex-direction: column; align-items: flex-end; gap: 4px;`;

      if (teamLogoUrl) {
        const teamLogo = document.createElement("img");
        const teamLogoBase64 = await imageToBase64(
          `${window.location.origin}${teamLogoUrl}`
        );
        teamLogo.src = teamLogoBase64;
        teamLogo.style.cssText = `height: 40px; width: auto; max-width: 80px;`;
        infoSection.appendChild(teamLogo);
      }

      const date = document.createElement("div");
      date.textContent = new Date().toLocaleDateString();
      date.style.cssText = `font-size: 12px; color: #6b7280;`;
      infoSection.appendChild(date);

      header.appendChild(logo);
      header.appendChild(titleElement);
      header.appendChild(infoSection);
      wrapper.appendChild(header);

      clone.style.cssText = `width: ${contentWidth}px !important; overflow: visible !important; display: block !important;`;
      wrapper.appendChild(clone);

      document.body.appendChild(wrapper);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const canvas = await window.html2canvas(wrapper, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
      });

      document.body.removeChild(wrapper);

      const filename = teamName
        ? `${teamName.replace(/\s+/g, "_")}_${label.replace(/\s+/g, "_")}.png`
        : `${label.replace(/\s+/g, "_")}.png`;
      const link = document.createElement("a");
      link.download = filename;
      link.href = canvas.toDataURL("image/png");
      link.click();

      setIsCapturing(false);
      onClose();
    } catch (error) {
      console.error("Screenshot failed:", error);
      alert(`Failed: ${error instanceof Error ? error.message : "Unknown"}`);
      setIsCapturing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={!isCapturing ? onClose : undefined}
      />
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Select Component to Screenshot
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isCapturing}
          >
            <X size={24} />
          </button>
        </div>
        {!html2canvasLoaded && (
          <div className="mb-4 text-sm text-amber-600 bg-amber-50 p-3 rounded">
            Loading...
          </div>
        )}
        <div className="space-y-2">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => handleScreenshot(option.selector, option.label)}
              disabled={isCapturing || !html2canvasLoaded}
              className="w-full text-left px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="font-medium text-gray-900">{option.label}</div>
            </button>
          ))}
        </div>
        {isCapturing && (
          <div className="mt-4 text-center text-sm text-gray-600">
            Capturing...
          </div>
        )}
        <div className="mt-6">
          <button
            onClick={onClose}
            disabled={isCapturing}
            className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
