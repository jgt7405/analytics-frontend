import { cn } from "@/lib/utils";
import { RotateCcw } from "lucide-react";
import Image from "next/image";
import type { ConferenceEnd } from "./types";

interface ConferenceChipsProps {
  conferences: ConferenceEnd[];
  selectedConferences: Set<string>;
  onToggle: (conference: string) => void;
  onClear: () => void;
  isDark: boolean;
  isMobile: boolean;
}

// The "select conferences to emphasize" grid under the chart.
export default function ConferenceChips({
  conferences,
  selectedConferences,
  onToggle,
  onClear,
  isDark,
  isMobile,
}: ConferenceChipsProps) {
  return (
    <div className="border-t border-slate-200/80 px-4 pb-5 pt-4 dark:border-slate-700/80 sm:px-[1.35rem]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Select conferences to emphasize
        </p>
        {selectedConferences.size > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-red-400/50 dark:hover:bg-red-950/30 dark:hover:text-red-400"
          >
            <RotateCcw className="h-3 w-3" />
            Show All
          </button>
        )}
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(56px,1fr))] gap-1.5 sm:gap-2">
        {conferences.map((conf) => {
          const isSelected =
            selectedConferences.size === 0 ||
            selectedConferences.has(conf.conference);
          const isExplicitlySelected = selectedConferences.has(conf.conference);
          const logoUrl = conf.conference_info.logo_url;
          const confColor = conf.conference_info.primary_color || "#666666";

          return (
            <button
              key={conf.conference}
              type="button"
              aria-pressed={isSelected}
              aria-label={`${conf.conference}, projected ${conf.final_bids.toFixed(1)} bids. Select to emphasize this conference.`}
              onClick={() => onToggle(conf.conference)}
              style={{
                // Inset box-shadow instead of a real `border` - see
                // FootballStandingsHistoryChart for the full explanation
                // (Windows-desktop-only corner rendering artifact from
                // border + border-radius rasterization).
                boxShadow: `inset 0 0 0 ${isExplicitlySelected ? 3 : 2}px ${
                  confColor || (isDark ? "#475569" : "#cbd5e1")
                }`,
              }}
              className={cn(
                "flex min-w-0 cursor-pointer appearance-none flex-col items-center gap-0.5 rounded-xl bg-white/80 px-1 pb-1.5 pt-1 transition-[box-shadow,background-color] hover:bg-slate-50 dark:bg-slate-900/60 dark:hover:bg-slate-800",
                !isSelected && "opacity-30 grayscale",
              )}
            >
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={conf.conference}
                  width={isMobile ? 24 : 28}
                  height={isMobile ? 24 : 28}
                  className="object-contain"
                  unoptimized
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector(".fallback-square")) {
                      const fallback = document.createElement("div");
                      fallback.className = "rounded border fallback-square";
                      fallback.style.width = isMobile ? "24px" : "28px";
                      fallback.style.height = isMobile ? "24px" : "28px";
                      fallback.style.backgroundColor = confColor;
                      fallback.title = conf.conference;
                      parent.appendChild(fallback);
                    }
                  }}
                  title={conf.conference}
                />
              ) : (
                <div
                  className="rounded border"
                  style={{
                    width: isMobile ? "24px" : "28px",
                    height: isMobile ? "24px" : "28px",
                    backgroundColor: confColor,
                  }}
                  title={conf.conference}
                />
              )}
              <span
                className="text-xs font-semibold tabular-nums"
                style={{ color: isSelected ? confColor : "#9ca3af" }}
              >
                {conf.final_bids.toFixed(1)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
