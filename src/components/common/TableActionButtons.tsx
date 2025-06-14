// src/components/common/TableActionButtons.tsx
"use client";

import { Button } from "@/components/ui/Button";
import { Download, Loader2, Share2 } from "@/components/ui/icons";
import { useResponsive } from "@/hooks/useResponsive";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

declare global {
  interface Window {
    html2canvas: any;
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
    if (typeof window !== "undefined" && !window.html2canvas) {
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
    } else if (window.html2canvas) {
      setHtml2canvasLoaded(true);
    }
  }, []);

  const handleDownload = async () => {
    if (downloading || disabled || !html2canvasLoaded) return;
    if (!window.html2canvas) {
      toast.error("Screenshot library not loaded. Please try again.");
      return;
    }

    try {
      setDownloading(true);

      const contentElement = document.querySelector(
        contentSelector
      ) as HTMLElement;
      if (!contentElement) {
        throw new Error(`Element not found: ${contentSelector}`);
      }

      const explainerElement = document.querySelector(
        explainerSelector || ".explainer-text, [class*='explainer']"
      ) as HTMLElement;

      console.log("🔍 DEBUG: Starting screenshot process");

      const wrapper = document.createElement("div");
      wrapper.style.backgroundColor = "#ffffff";
      wrapper.style.padding = "24px";
      wrapper.style.position = "absolute";
      wrapper.style.left = "-9999px";
      wrapper.style.fontFamily = "Arial, sans-serif";
      wrapper.style.width = "auto";
      wrapper.style.minWidth = "800px";

      // Header with proper logo aspect ratio and alignment
      const header = document.createElement("div");
      header.style.display = "flex";
      header.style.justifyContent = "space-between";
      header.style.alignItems = "flex-start";
      header.style.marginBottom = "20px";
      header.style.paddingBottom = "16px";
      header.style.borderBottom = "2px solid #e5e7eb";
      header.style.width = "100%";
      header.style.minHeight = "60px";
      header.style.paddingTop = "0";

      // Logo section
      const logoDiv = document.createElement("div");
      logoDiv.style.display = "flex";
      logoDiv.style.alignItems = "flex-start";
      logoDiv.style.justifyContent = "flex-start";
      logoDiv.style.flexShrink = "0";
      logoDiv.style.minWidth = "0";

      const logo = document.createElement("img");
      logo.src = "/images/JThom_Logo.png";
      logo.alt = "JThom Analytics";
      logo.style.height = "50px";
      logo.style.width = "auto";
      logo.style.objectFit = "contain";
      logo.style.display = "block";
      logo.style.maxWidth = "none";

      logoDiv.appendChild(logo);

      // Title section
      const titleDiv = document.createElement("div");
      titleDiv.style.flex = "1";
      titleDiv.style.display = "flex";
      titleDiv.style.alignItems = "flex-start";
      titleDiv.style.justifyContent = "center";
      titleDiv.style.paddingTop = "0";
      titleDiv.style.marginTop = "0";

      const titleElement = document.createElement("h1");
      titleElement.textContent = pageTitle || title || "Basketball Analytics";
      titleElement.style.margin = "0";
      titleElement.style.padding = "0";
      titleElement.style.fontSize = "22px";
      titleElement.style.fontWeight = "400";
      titleElement.style.color = "#1f2937";
      titleElement.style.lineHeight = "1";
      titleDiv.appendChild(titleElement);

      // Conference and date section
      const confDiv = document.createElement("div");
      confDiv.style.display = "flex";
      confDiv.style.flexDirection = "column";
      confDiv.style.alignItems = "flex-end";
      confDiv.style.justifyContent = "flex-start";
      confDiv.style.flexShrink = "0";
      confDiv.style.minWidth = "150px";
      confDiv.style.paddingTop = "0";
      confDiv.style.marginTop = "0";

      const conferenceParam = selectedConference || conference;
      if (conferenceParam && conferenceParam !== "All Conferences") {
        const confText = document.createElement("div");
        confText.textContent = conferenceParam;
        confText.style.fontSize = "16px";
        confText.style.fontWeight = "500";
        confText.style.color = "#4b5563";
        confText.style.margin = "0";
        confText.style.padding = "0";
        confText.style.lineHeight = "1";
        confDiv.appendChild(confText);
      }

      const dateText = document.createElement("div");
      dateText.textContent = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      dateText.style.fontSize = "14px";
      dateText.style.color = "#9ca3af";
      dateText.style.margin = "4px 0 0 0";
      dateText.style.padding = "0";
      dateText.style.lineHeight = "1";
      confDiv.appendChild(dateText);

      header.appendChild(logoDiv);
      header.appendChild(titleDiv);
      header.appendChild(confDiv);
      wrapper.appendChild(header);

      // Table processing with extensive debugging
      const tableClone = contentElement.cloneNode(true) as HTMLElement;
      const table = tableClone.querySelector("table");

      console.log("🔍 DEBUG: Original table found:", !!table);

      if (table) {
        table.style.borderCollapse = "separate";
        table.style.borderSpacing = "0";
        table.style.width = "100%";
        table.style.border = "1px solid #e5e7eb";
        table.style.borderRadius = "8px";
        table.style.overflow = "hidden";
        table.style.marginBottom = "20px";

        console.log("🔍 DEBUG: Table setup:", {
          borderCollapse: table.style.borderCollapse,
          computedBorderCollapse: window.getComputedStyle(table).borderCollapse,
          tableLayout: window.getComputedStyle(table).tableLayout,
        });

        // Add thick border above summary rows
        const summaryRows = table.querySelectorAll("tbody tr");
        let foundFirstSummary = false;

        summaryRows.forEach((row, index) => {
          const rowEl = row as HTMLElement;
          const firstCell = row.querySelector("td");
          const cellText = firstCell?.textContent?.toLowerCase() || "";

          const isSummary =
            cellText.includes("conf win value") ||
            cellText.includes("current record") ||
            cellText.includes("est avg") ||
            cellText.includes("avg finish") ||
            cellText.includes("avg conf wins") ||
            index >= summaryRows.length - 3;

          if (isSummary && !foundFirstSummary) {
            rowEl.style.borderTop = "3px solid #4b5563";
            foundFirstSummary = true;
          }
        });

        // Process each cell with debugging
        let cellIndex = 0;
        table.querySelectorAll("td, th").forEach((cell) => {
          const el = cell as HTMLElement;
          cellIndex++;

          console.log(`🔍 DEBUG: Processing cell ${cellIndex}`);
          console.log("Original cell:", {
            tagName: cell.tagName,
            innerHTML: el.innerHTML.substring(0, 100) + "...",
            computedStyles: {
              display: window.getComputedStyle(el).display,
              verticalAlign: window.getComputedStyle(el).verticalAlign,
              height: window.getComputedStyle(el).height,
              padding: window.getComputedStyle(el).padding,
              lineHeight: window.getComputedStyle(el).lineHeight,
            },
          });

          el.style.border = "1px solid #e5e7eb";
          el.style.padding = "8px 12px";
          el.style.verticalAlign = "middle";
          el.style.fontSize = "14px";
          el.style.fontWeight = "normal";
          el.style.lineHeight = "1";
          el.style.textAlign = "center";

          if (cell.tagName === "TH") {
            el.style.backgroundColor = "#f8fafc";
            el.style.color = "#374151";
            el.style.fontWeight = "normal";
          } else {
            el.style.backgroundColor = "#ffffff";
          }

          // First column special handling
          if (
            cell.parentElement &&
            Array.from(cell.parentElement.children).indexOf(cell) === 0
          ) {
            el.style.textAlign = "center";
            el.style.fontWeight = "normal";
            el.style.borderRight = "2px solid #d1d5db";
          }

          // Center images
          const img = el.querySelector("img");
          if (img) {
            console.log(`🔍 DEBUG: Found image in cell ${cellIndex}`);
            img.style.display = "block";
            img.style.margin = "0 auto";
            img.style.maxWidth = "32px";
            img.style.maxHeight = "32px";
            img.style.objectFit = "contain";
          }

          // Content extraction with fix for cells without absoluteDiv
          let absoluteDiv: HTMLElement | null = null;
          const childDivs = el.querySelectorAll("div");

          // Check computed styles for absolute positioning
          for (const div of childDivs) {
            const computedStyle = window.getComputedStyle(div);
            if (computedStyle.position === "absolute") {
              absoluteDiv = div as HTMLElement;
              break;
            }
          }

          // Fallback to original selector
          if (!absoluteDiv) {
            absoluteDiv = el.querySelector(
              'div[style*="position: absolute"]'
            ) as HTMLElement;
          }

          if (absoluteDiv) {
            const content = absoluteDiv.textContent?.trim() || "";
            const bgColor =
              window.getComputedStyle(absoluteDiv).backgroundColor;
            const textColor = window.getComputedStyle(absoluteDiv).color;

            console.log(`🔍 DEBUG: Cell ${cellIndex} - Found absoluteDiv:`, {
              content: content,
              originalStyles: {
                position: absoluteDiv.style.position,
                top: absoluteDiv.style.top,
                left: absoluteDiv.style.left,
                right: absoluteDiv.style.right,
                bottom: absoluteDiv.style.bottom,
                display: absoluteDiv.style.display,
                alignItems: absoluteDiv.style.alignItems,
                justifyContent: absoluteDiv.style.justifyContent,
                height: absoluteDiv.style.height,
                width: absoluteDiv.style.width,
                transform: absoluteDiv.style.transform,
              },
              computedStyles: {
                verticalAlign:
                  window.getComputedStyle(absoluteDiv).verticalAlign,
                display: window.getComputedStyle(absoluteDiv).display,
                position: window.getComputedStyle(absoluteDiv).position,
                top: window.getComputedStyle(absoluteDiv).top,
                left: window.getComputedStyle(absoluteDiv).left,
              },
              backgroundColor: bgColor,
              textColor: textColor,
            });

            el.innerHTML = content;

            console.log(
              `🔍 DEBUG: Cell ${cellIndex} after content extraction:`,
              {
                offsetHeight: el.offsetHeight,
                clientHeight: el.clientHeight,
                computedHeight: window.getComputedStyle(el).height,
                verticalAlign: window.getComputedStyle(el).verticalAlign,
                display: window.getComputedStyle(el).display,
                padding: window.getComputedStyle(el).padding,
                innerHTML: el.innerHTML,
              }
            );

            el.style.verticalAlign = "middle";
            el.style.textAlign = "center";

            if (
              bgColor &&
              bgColor !== "transparent" &&
              bgColor !== "rgba(0, 0, 0, 0)"
            ) {
              el.style.backgroundColor = bgColor;
            }
            if (textColor && textColor !== "rgba(0, 0, 0, 0)") {
              el.style.color = textColor;
            }
          } else {
            // ✅ FIX: Handle cells without absoluteDiv (summary rows)
            const originalContent = el.textContent?.trim() || "";
            if (originalContent) {
              console.log(
                `🔍 DEBUG: Cell ${cellIndex} - Adding padding for text-only cell:`,
                originalContent
              );

              // Set minimum height and ensure proper centering
              el.style.minHeight = "28px";
              el.style.height = "28px";
              el.style.lineHeight = "28px";
              el.style.verticalAlign = "middle";
              el.style.display = "table-cell";
            }

            console.log(`🔍 DEBUG: Cell ${cellIndex} - No absoluteDiv found:`, {
              innerHTML: el.innerHTML.substring(0, 50),
              textContent: el.textContent?.substring(0, 50),
              offsetHeight: el.offsetHeight,
              hasChildDivs: el.querySelectorAll("div").length,
            });
          }
        });
      }

      wrapper.appendChild(tableClone);

      // Add explainer text properly
      if (explainerElement) {
        console.log("🔍 DEBUG: Adding explainer element");
        const explainerClone = explainerElement.cloneNode(true) as HTMLElement;
        explainerClone.style.marginTop = "20px";
        explainerClone.style.padding = "16px";
        explainerClone.style.backgroundColor = "#f0f9ff";
        explainerClone.style.border = "1px solid #bfdbfe";
        explainerClone.style.borderRadius = "8px";
        explainerClone.style.fontSize = "14px";
        explainerClone.style.color = "#1e40af";
        explainerClone.style.lineHeight = "1.5";
        explainerClone.style.maxWidth = "100%";
        explainerClone.style.display = "block";
        explainerClone.style.visibility = "visible";

        wrapper.appendChild(explainerClone);
      }

      document.body.appendChild(wrapper);

      // Wait for images
      const images = wrapper.querySelectorAll("img");
      await Promise.all(
        Array.from(images).map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = () => resolve(void 0);
            img.onerror = () => resolve(void 0);
            setTimeout(() => resolve(void 0), 3000);
          });
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log("🔍 DEBUG: Taking screenshot...");

      const canvas = await window.html2canvas(wrapper, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: wrapper.offsetWidth,
        height: wrapper.offsetHeight,
      });

      document.body.removeChild(wrapper);

      const timestamp = new Date().toISOString().split("T")[0];
      const confFileName = (selectedConference || conference || "All")
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_]/g, "");
      const pageNameClean = (pageName || "analytics").replace(
        /[^a-zA-Z0-9_]/g,
        ""
      );
      const filename = `${confFileName}_${pageNameClean}_${timestamp}.png`;

      if (isMobile && navigator.canShare) {
        canvas.toBlob(async (blob: Blob | null) => {
          if (!blob) throw new Error("Failed to create image");

          const file = new File([blob], filename, { type: "image/png" });
          try {
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: pageTitle || title,
              });
            } else {
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = filename;
              a.click();
              URL.revokeObjectURL(url);
            }
          } catch (shareError: any) {
            if (shareError?.name !== "AbortError") {
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = filename;
              a.click();
              URL.revokeObjectURL(url);
            }
          }
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
        shareTitle || pageTitle || title || "Basketball Analytics";
      const fullShareText = confShareParam
        ? `${confShareParam} ${shareText}`
        : shareText;
      const tweetText = `Check out ${fullShareText} from JThom Analytics.\n\n${url}`;

      if (navigator.share && isMobile) {
        try {
          await navigator.share({
            title: fullShareText,
            text: `${fullShareText} - Basketball Analytics`,
            url: url,
          });
        } catch (shareError: any) {
          if (shareError?.name !== "AbortError") {
            await navigator.clipboard.writeText(url);
            toast.success("Link copied to clipboard!");
          }
        }
      } else {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
        window.open(twitterUrl, "_blank", "width=550,height=420");
      }
    } catch (error: any) {
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
