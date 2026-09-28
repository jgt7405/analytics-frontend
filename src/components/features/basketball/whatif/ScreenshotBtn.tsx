"use client";

// Button that exports a table as an image.

import { logger } from "@/lib/logger";
import { Camera, Loader } from "lucide-react";
import { useState } from "react";
import { captureScreenshot } from "./screenshot";

// – Screenshot Button –
export function ScreenshotBtn({
  targetRef,
  filename,
  selectionHtml,
  chartTitle,
}: {
  targetRef: React.RefObject<HTMLDivElement | null>;
  filename: string;
  selectionHtml: string | null;
  chartTitle?: string;
}) {
  const [capturing, setCapturing] = useState(false);
  return (
    <button
      data-no-screenshot
      onClick={async () => {
        if (!targetRef.current || capturing) return;
        setCapturing(true);
        try {
          await captureScreenshot(
            targetRef.current,
            selectionHtml,
            filename,
            chartTitle,
          );
        } catch (e) {
          logger.error("Screenshot failed:", e);
        }
        setCapturing(false);
      }}
      className="flex items-center gap-1 px-2 py-1 text-[11px] text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:bg-slate-800 transition"
      title="Download screenshot"
    >
      {capturing ? (
        <Loader size={12} className="animate-spin" />
      ) : (
        <Camera size={12} />
      )}
      <span className="hidden sm:inline">Screenshot</span>
    </button>
  );
}
