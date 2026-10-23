"use client";

import { Button } from "@/components/ui/Button";
import { Download, Loader2, Share2 } from "@/components/ui/icons";
import { useResponsive } from "@/hooks/useResponsive";
import { useState } from "react";
import toast from "react-hot-toast";
import { logger } from "@/lib/logger";

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

  const handleDownload = async () => {
    if (downloading || disabled) return;

    try {
      setDownloading(true);
      const { downloadTableImage } = await import("@/lib/export/table-download");
      await downloadTableImage({
        contentSelector,
        explainerSelector,
        pageTitle,
        pageName,
        selectedConference,
      });
    } catch (error) {
      logger.error("Download failed:", error);
      toast.error(
        `Screenshot failed: ${error instanceof Error ? error.message : "Unknown error"}`,
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
      logger.error("Share failed:", error);
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
        disabled={downloading || disabled}
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
