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

      // Clone immediately without viewport changes
      const clone = targetElement.cloneNode(true) as HTMLElement;

      // Force desktop layout with image reloading
      const logoImages = clone.querySelectorAll('img[src*="team_logos"]');
      console.log("🚀 DEBUG: Found", logoImages.length, "logos in clone");

      const imageLoadPromises = Array.from(logoImages).map((img, _index) => {
        const image = img as HTMLImageElement;

        // Force desktop logo size
        image.style.cssText = `
          width: 24px !important;
          height: 24px !important;
          object-fit: contain !important;
          display: block !important;
        `;

        // Fix container
        const container = image.closest("div");
        if (container) {
          container.style.cssText += `
            width: 30px !important;
            height: 30px !important;
            min-width: 30px !important;
          `;
        }

        // Force image reload in clone
        return new Promise<void>((resolve) => {
          if (image.complete && image.naturalWidth > 0) {
            resolve();
          } else {
            const originalSrc = image.src;
            image.onload = () => resolve();
            image.onerror = () => resolve(); // Continue even if load fails
            image.src = ""; // Clear src
            image.src = originalSrc; // Reload

            // Timeout fallback
            setTimeout(resolve, 2000);
          }
        });
      });

      // Wait for all images to load
      await Promise.all(imageLoadPromises);

      // Calculate width based on team count and chart type
      const teamCount = logoImages.length || 10;

      // Detect mobile from user agent
      const isMobileDevice =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );

      // Device-specific width calculation
      let baseWidth, teamSpacing;
      if (isMobileDevice) {
        baseWidth = 100;
        teamSpacing = 45;
      } else {
        baseWidth = 425;
        teamSpacing = 45;
      }

      // Calculate width with minimum of 400px
      const calculatedWidth = baseWidth + teamCount * teamSpacing;
      const desktopWidth = Math.max(calculatedWidth, 400);

      // Create wrapper
      const wrapper = document.createElement("div");
      wrapper.style.cssText = `
        position: fixed;
        left: -9999px;
        top: 0;
        background-color: white;
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
        width: ${desktopWidth}px;
        z-index: -1;
      `;

      // Header
      const header = document.createElement("div");
      header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 12px;
        border-bottom: 2px solid #e5e7eb;
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

      // Add clone to wrapper with content-aware styling
      clone.style.cssText = `
        width: 100% !important;
        max-width: ${desktopWidth - 40}px !important;
        min-width: fit-content !important;
        font-size: 14px !important;
        display: block !important;
        text-align: center !important;
        overflow: visible !important;
      `;
      wrapper.appendChild(clone);

      // Add explainer if exists
      if (explainerElement) {
        const explainerClone = explainerElement.cloneNode(true) as HTMLElement;
        explainerClone.style.cssText = `
          margin-top: 16px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
          font-size: 12px;
          color: #6b7280;
          line-height: 1.3;
          width: 100%;
        `;
        wrapper.appendChild(explainerClone);
      }

      document.body.appendChild(wrapper);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const canvas = await window.html2canvas(wrapper, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: desktopWidth,
        height: wrapper.offsetHeight,
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
