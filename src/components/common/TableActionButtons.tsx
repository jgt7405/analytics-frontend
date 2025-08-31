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

      // Count teams and calculate width
      const teamElements = targetElement.querySelectorAll(
        '[alt*="logo"], img[src*="team_logos"]'
      );
      const teamCount = teamElements.length || 10;
      const baseWidth = 350;
      const widthPerTeam = 50;
      const dynamicWidth = baseWidth + teamCount * widthPerTeam;
      const desktopWidth = Math.min(dynamicWidth, 1400);

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

      // Clone and force desktop layout
      const clone = targetElement.cloneNode(true) as HTMLElement;

      // Override all mobile styles aggressively
      const allElements = clone.querySelectorAll("*");
      allElements.forEach((el) => {
        const element = el as HTMLElement;

        // Remove all responsive classes
        element.className = element.className.replace(
          /\b(sm|md|lg|xl):[^\s]*/g,
          ""
        );
        element.classList.remove("flex-col", "md:flex-row", "sm:flex-col");

        // Force desktop layout
        if (element.style.flexDirection === "column") {
          element.style.flexDirection = "row";
        }

        // Chart containers
        if (element.closest("svg") || element.tagName === "SVG") {
          element.style.cssText = `
      min-width: ${desktopWidth - 100}px !important;
      width: 100% !important;
      text-align: center !important;
      display: block !important;
    `;
        }

        // Team logos - force desktop size and centering
        if (
          element.tagName === "IMG" &&
          (element as HTMLImageElement).src.includes("team_logos")
        ) {
          element.style.cssText = `
      width: 24px !important;
      height: 24px !important;
      min-width: 24px !important;
      max-width: 24px !important;
      object-fit: contain !important;
      display: inline-block !important;
      margin: 0 auto !important;
    `;
        }

        // Center table cells and columns
        if (element.tagName === "TD" || element.tagName === "TH") {
          element.style.textAlign = "center";
        }

        // Force center alignment for all table content
        if (element.tagName === "TABLE") {
          element.style.textAlign = "center";
        }

        // Force desktop font sizes
        element.style.fontSize = "14px";

        // Center text elements
        if (
          element.tagName === "text" ||
          element.classList.contains("chart-label")
        ) {
          element.style.textAlign = "center";
        }

        // Center containers
        if (
          element.classList.contains("chart-container") ||
          element.closest(".chart-container")
        ) {
          element.style.display = "flex";
          element.style.justifyContent = "center";
          element.style.alignItems = "center";
        }
      });

      // Force entire clone to desktop width and layout
      clone.style.cssText = `
       min-width: ${desktopWidth - 40}px !important;
       width: 100% !important;
       max-width: none !important;
       font-size: 14px !important;
       display: block !important;
       text-align: center !important;
     `;

      wrapper.appendChild(clone);

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
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Longer wait for mobile

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
