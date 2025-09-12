"use client";

import { Button } from "@/components/ui/Button";
import { Download, Loader2, Share2 } from "@/components/ui/icons";
import { useResponsive } from "@/hooks/useResponsive";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

declare global {
  interface Window {
    html2canvas?: (
      element: HTMLElement,
      options?: object
    ) => Promise<HTMLCanvasElement>;
  }
}

export interface TableActionButtonsProps {
  contentSelector: string;
  title?: string;
  selectedConference?: string;
  pageName?: string;
  pageTitle?: string;
  shareTitle?: string;
  pathname?: string;
  conference?: string;
  className?: string;
  disabled?: boolean;
  explainerSelector?: string;
}

export default function TableActionButtons({
  contentSelector,
  title,
  selectedConference,
  pageName,
  pageTitle,
  shareTitle,
  pathname,
  conference,
  className,
  disabled = false,
  explainerSelector,
}: TableActionButtonsProps) {
  const { isMobile } = useResponsive();
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
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

  const handleDownload = async () => {
    if (downloading || disabled || !html2canvasLoaded) return;
    if (typeof window.html2canvas !== "function") {
      toast.error("Screenshot library not loaded. Please try again.");
      return;
    }

    try {
      setDownloading(true);

      const targetElement = document.querySelector(contentSelector);
      if (!targetElement) {
        throw new Error("Target element not found");
      }

      const explainerElement = explainerSelector
        ? document.querySelector(explainerSelector)
        : null;

      // Temporarily force element to show full width for measurement
      const originalStyles = new Map();
      const containers = targetElement.querySelectorAll(
        '[style*="overflow"], .overflow-x-auto'
      );
      containers.forEach((container) => {
        const el = container as HTMLElement;
        originalStyles.set(el, {
          overflow: el.style.overflow,
          width: el.style.width,
        });
        el.style.overflow = "visible";
        el.style.width = "max-content";
      });

      // Check chart type and calculate width
      const isLineChart = targetElement.querySelector("canvas") !== null;
      const table = targetElement.querySelector("table");
      let actualWidth;

      if (table) {
        actualWidth = (table as HTMLElement).offsetWidth + 200;
      } else if (isLineChart) {
        // Distinguish line charts from box plots
        const isLineChartSpecific =
          targetElement.textContent?.includes("Over Time") ||
          targetElement.textContent?.includes("History") ||
          pageTitle?.includes("History") ||
          pageTitle?.includes("Over Time");
        actualWidth = isLineChartSpecific ? 1475 : 800;
      } else {
        const teamLogos1 = targetElement.querySelectorAll(
          'img[src*="team_logos"]'
        );
        const teamLogos2 = targetElement.querySelectorAll('img[alt*="logo"]');
        const teamLogos3 = targetElement.querySelectorAll('img[src*="logos"]');

        let teamCount = Math.max(
          teamLogos1.length,
          teamLogos2.length,
          teamLogos3.length
        );

        if (teamCount === 0) {
          const teamElements = targetElement.querySelectorAll(
            '[data-team], .team-logo, [class*="team"]'
          );
          teamCount = teamElements.length;
        }

        if (teamCount === 0) {
          teamCount = 10;
        }

        const baseWidth = isMobile ? 200 : 400;
        const widthPerTeam = isMobile ? 40 : 50;
        actualWidth = baseWidth + teamCount * widthPerTeam;
      }

      // Restore original styles
      containers.forEach((container) => {
        const el = container as HTMLElement;
        const original = originalStyles.get(el);
        if (original) {
          el.style.overflow = original.overflow || "";
          el.style.width = original.width || "";
        }
      });

      // Clone element first
      const clone = targetElement.cloneNode(true) as HTMLElement;

      // Handle canvas replacement
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
        if (ctx) {
          ctx.drawImage(originalCanvas, 0, 0);
        }

        const clonedCanvas = clone.querySelector("canvas");
        if (clonedCanvas && clonedCanvas.parentNode) {
          clonedCanvas.parentNode.replaceChild(tempCanvas, clonedCanvas);
        }
      }

      // Simple fixes only
      const style = document.createElement("style");
      style.textContent = `
        .overflow-x-auto { overflow: visible !important; }
        .sticky { position: static !important; }
        [style*="position: sticky"] { position: static !important; }
        th img { width: 24px !important; height: 24px !important; }
        canvas { display: block !important; }
        .chartjs-render-monitor { display: block !important; }
      `;
      clone.appendChild(style);

      // Create wrapper with dynamic width
      const wrapper = document.createElement("div");
      wrapper.style.cssText = `
        position: fixed;
        left: -9999px;
        top: 0;
        background-color: white;
        padding: 24px 50px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
        width: ${actualWidth}px;
        z-index: -1;
        overflow: visible;
      `;

      // Header with proper width alignment
      const contentWidth = actualWidth - 100;
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

      const logo = document.createElement("img");
      const isFootball = window.location.pathname.includes("/football");
      logo.src = isFootball
        ? "/images/JThom_Logo_Football.png"
        : "/images/JThom_Logo.png";
      logo.style.cssText = `height: 50px; width: auto;`;

      const titleElement = document.createElement("h1");
      titleElement.textContent = pageTitle || "Analytics";
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
      infoSection.style.cssText = `display: flex; flex-direction: column; align-items: flex-end; gap: 4px;`;

      const confName = selectedConference || "All";
      if (confName && confName !== "All") {
        const formattedConfName = confName.replace(/ /g, "_");
        const conferenceLogoUrl = `/images/conf_logos/${formattedConfName}.png`;

        const confLogo = document.createElement("img");
        confLogo.src = conferenceLogoUrl;
        confLogo.style.cssText = `height: 30px; width: auto; max-width: 80px;`;

        confLogo.onerror = () => {
          confLogo.style.display = "none";
          const conference = document.createElement("div");
          conference.textContent = confName;
          conference.style.cssText = `font-size: 14px; font-weight: 600; color: #1f2937;`;
          infoSection.insertBefore(conference, infoSection.firstChild);
        };

        infoSection.appendChild(confLogo);
      } else {
        const conference = document.createElement("div");
        conference.textContent = confName;
        conference.style.cssText = `font-size: 14px; font-weight: 600; color: #1f2937;`;
        infoSection.appendChild(conference);
      }

      const date = document.createElement("div");
      date.textContent = new Date().toLocaleDateString();
      date.style.cssText = `font-size: 12px; color: #6b7280;`;
      infoSection.appendChild(date);

      header.appendChild(logo);
      header.appendChild(titleElement);
      header.appendChild(infoSection);
      wrapper.appendChild(header);

      // Add clone with left alignment
      clone.style.cssText = `
        width: ${contentWidth}px !important;
        overflow: visible !important;
        font-size: 14px !important;
        display: block !important;
        margin-left: 0 !important;
        padding-left: 0 !important;
      `;
      wrapper.appendChild(clone);

      // Add explainer with left alignment
      if (explainerElement) {
        const explainerClone = explainerElement.cloneNode(true) as HTMLElement;
        explainerClone.style.cssText = `
          margin-top: 16px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
          font-size: 12px;
          color: #6b7280;
          line-height: 1.3;
          width: ${contentWidth}px;
          margin-left: 0;
        `;
        wrapper.appendChild(explainerClone);
      }

      document.body.appendChild(wrapper);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const canvas = await window.html2canvas(wrapper, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      document.body.removeChild(wrapper);

      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `${selectedConference}_${pageName}_${timestamp}.png`;

      if (isMobile) {
        canvas.toBlob(async (blob: Blob | null) => {
          if (!blob) throw new Error("Failed to create image");

          const file = new File([blob], filename, { type: "image/png" });

          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: pageTitle || "Analytics",
              });
              return;
            } catch (shareError: unknown) {
              if (
                shareError &&
                typeof shareError === "object" &&
                "name" in shareError &&
                shareError.name === "AbortError"
              ) {
                return;
              }
            }
          }

          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = filename;
          link.click();
          URL.revokeObjectURL(url);
        }, "image/png");
      } else {
        const link = document.createElement("a");
        link.download = filename;
        link.href = canvas.toDataURL("image/png");
        link.click();
      }
    } catch (error) {
      console.error("Download failed:", error);
      toast.error(
        `Screenshot failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (sharing || disabled) return;

    try {
      setSharing(true);
      const baseUrl = window.location.origin;
      const currentPath = pathname || window.location.pathname;
      let url = `${baseUrl}${currentPath}`;

      const confShareParam = selectedConference || conference;
      if (confShareParam && confShareParam !== "All Conferences") {
        url += `?conference=${encodeURIComponent(confShareParam)}`;
      }

      const shareText =
        shareTitle || pageTitle || title || "Football Analytics";
      const fullShareText = confShareParam
        ? `${confShareParam} ${shareText}`
        : shareText;
      const tweetText = `Check out ${fullShareText} from JThom Analytics.\n\n${url}`;

      if (navigator.share && isMobile) {
        try {
          await navigator.share({
            title: fullShareText,
            text: `${fullShareText} - Sports Analytics`,
            url: url,
          });
        } catch (shareError: unknown) {
          if (
            shareError &&
            typeof shareError === "object" &&
            "name" in shareError &&
            shareError.name !== "AbortError"
          ) {
            await navigator.clipboard.writeText(url);
            toast.success("Link copied to clipboard!");
          }
        }
      } else {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
        window.open(twitterUrl, "_blank", "width=550,height=420");
      }
    } catch (error: unknown) {
      console.error("Share failed:", error);
      try {
        const fallbackUrl = `${window.location.origin}${pathname || window.location.pathname}`;
        await navigator.clipboard.writeText(fallbackUrl);
        toast.success("Link copied to clipboard!");
      } catch (clipboardError) {
        toast.error("Sharing failed. Please copy the URL manually.");
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <div
      className={`flex gap-2 ${isMobile ? "flex-col" : "flex-row"} w-full ${className || ""}`}
      role="group"
      aria-label="Export and sharing actions"
    >
      <Button
        onClick={handleDownload}
        size="sm"
        variant="outline"
        className={`
          bg-gray-700 text-white border-gray-700 hover:bg-gray-800 hover:border-gray-800 transition-colors duration-200 w-full
          ${isMobile ? "text-sm px-4 py-3" : "text-xs px-3 py-2"}
        `}
        disabled={downloading || disabled || !html2canvasLoaded}
        aria-label={
          downloading ? "Creating image..." : "Download table as image"
        }
      >
        {downloading ? (
          <Loader2
            className={`animate-spin ${isMobile ? "mr-2 h-4 w-4" : "mr-1.5 h-3 w-3"}`}
          />
        ) : (
          <Download className={isMobile ? "mr-2 h-4 w-4" : "mr-1.5 h-3 w-3"} />
        )}
        {downloading ? "Creating..." : "Download"}
      </Button>

      <Button
        onClick={handleShare}
        size="sm"
        variant="outline"
        className={`
          bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700 transition-colors duration-200 w-full
          ${isMobile ? "text-sm px-4 py-3" : "text-xs px-3 py-2"}
        `}
        disabled={sharing || disabled}
        aria-label={sharing ? "Sharing..." : "Share this page"}
      >
        {sharing ? (
          <Loader2
            className={`animate-spin ${isMobile ? "mr-2 h-4 w-4" : "mr-1.5 h-3 w-3"}`}
          />
        ) : (
          <Share2 className={isMobile ? "mr-2 h-4 w-4" : "mr-1.5 h-3 w-3"} />
        )}
        {sharing ? "Sharing..." : "Share"}
      </Button>
    </div>
  );
}
