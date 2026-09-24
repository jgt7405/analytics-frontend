"use client";

import TableActionButtons from "@/components/common/TableActionButtons";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import {
  useNCAAProjections,
  type NCAAProjectionsMode,
  type NCAAProjectionsResponse,
} from "@/hooks/useNCAAProjections";
import { useResponsive } from "@/hooks/useResponsive";
import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";

const NCAABracketTable = dynamic(
  () => import("@/components/features/basketball/NCAABracketTable"),
  {
    loading: () => (
      <div className="min-h-[600px] bg-gray-50 animate-pulse rounded-lg" />
    ),
  }
);

const MultiBidLeagues = dynamic(
  () => import("@/components/features/basketball/MultiBidLeagues"),
  {
    loading: () => (
      <div className="min-h-[300px] bg-gray-50 animate-pulse rounded-lg" />
    ),
  }
);

export default function BasketballHomeContent({ initialData }: { initialData?: NCAAProjectionsResponse }) {
  const { isMobile } = useResponsive();
  const ncaaTableRef = useRef<HTMLDivElement>(null);
  const multiBidRef = useRef<HTMLDivElement>(null);
  const [selectedMode, setMode] = useState<NCAAProjectionsMode>("season");
  // The season projection drives the header date and whether a current
  // snapshot exists yet; the tables fetch the selected mode themselves.
  const { data, loading } = useNCAAProjections(undefined, initialData);
  // Before any games are played current TWV is zero for everyone, so the
  // snapshot would just be a ratings list - keep it off until then.
  const currentAvailable = data?.current_available === true;
  const mode: NCAAProjectionsMode = currentAvailable ? selectedMode : "season";
  const isCurrent = mode === "current";

  // Format the last updated timestamp
  const lastUpdated = useMemo(() => {
    if (data?.last_updated) {
      try {
        const date = new Date(data.last_updated);
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
      } catch (error) {
        console.error("Error formatting date:", error);
      }
    }

    // Fallback to current date
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const year = now.getFullYear();
    return `${month}/${day}/${year}`;
  }, [data?.last_updated]);

  // Segmented control switching the bracket between the simulated season
  // projection (default) and a snapshot built from current TWV/rating -
  // mirrors football/home.
  const sizeClasses = isMobile
    ? "text-xs px-1.5 py-1.5 whitespace-nowrap"
    : "text-sm px-4 py-2";
  const modeToggle = (
    <div className={`flex items-center ${isMobile ? "gap-1.5" : "gap-2"}`}>
      {(
        [
          ["season", "Season Projection"],
          ["current", "Current Snapshot"],
        ] as [NCAAProjectionsMode, string][]
      ).map(([value, label]) => {
        const disabled = value === "current" && !currentAvailable;
        return (
          <button
            key={value}
            onClick={() => setMode(value)}
            disabled={disabled}
            title={disabled ? "Available once games have been played" : undefined}
            className={`${sizeClasses} border rounded transition-colors ${
              mode === value
                ? "bg-[rgb(0,151,178)] text-white border-[rgb(0,151,178)]"
                : disabled
                  ? "bg-white border-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
            }`}
          >
            {label}
          </button>
        );
      })}
      {!currentAvailable && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Current snapshot starts once games are played
        </span>
      )}
    </div>
  );

  return (
    <ErrorBoundary level="page">
      <PageLayoutWrapper
        title={
          isCurrent
            ? "NCAA Tournament — Current Snapshot"
            : "Basketball Tournament Projections"
        }
        isLoading={loading}
        rightElement={`Updated: ${lastUpdated}`}
      >
        <div className="-mt-2 md:-mt-6">
          {/* NCAA Bracket Table Section */}
          <ErrorBoundary level="component">
            <div className="mb-8">
              <div className="mb-3">{modeToggle}</div>
              <div className="ncaa-bracket-table min-h-[600px]" ref={ncaaTableRef}>
                <NCAABracketTable mode={mode} />
              </div>

              <div className="mt-6">
                <div className="flex flex-row items-start gap-4">
                  <div className="ncaa-bracket-explainer flex-1 text-xs text-gray-600 dark:text-gray-300 max-w-none pr-4">
                    <div style={{ lineHeight: "1.3" }}>
                      <div>
                        {isCurrent
                          ? "Current snapshot based on teams' results and ratings to date. Auto bids go to the projected conference champions."
                          : "NCAA tournament projections based on 1,000 season simulations using composite ratings."}
                      </div>
                      <div style={{ marginTop: "6px" }}>
                        At-large bids go to the top 44 by TWV 50. Seeding uses
                        three tiers, each 65% TWV and 35% rating: seeds 1–4 on
                        TWV 30, seeds 5–11 on TWV 50, seeds 12–16 on TWV 200.
                      </div>
                      <div style={{ marginTop: "6px" }}>
                        {isCurrent
                          ? "TWV counts completed games only; Rtg is today's composite rating."
                          : "Proj Rtg blends today's rating with how the team projects to play the rest of the season, weighted by games remaining."}
                      </div>
                      <div style={{ marginTop: "6px" }}>
                        Seed Rtg % is the blend each team was seeded on — 65%
                        its tier&apos;s TWV and 35% rating — scaled so the top
                        team is 100% and the bottom is 0%. Seeds 12–16 are
                        scored on TWV 200, so it steps up at the 12 line. Teams
                        outside the field are picked on TWV 50 alone.
                      </div>
                      <div style={{ marginTop: "6px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            width: "12px",
                            height: "12px",
                            backgroundColor: "rgb(0 151 178 / 0.13)",
                            border: "1px solid rgb(0 151 178 / 0.5)",
                            borderRadius: "2px",
                            marginRight: "6px",
                            verticalAlign: "middle",
                          }}
                        ></span>
                        <span>
                          TWV used to seed the team
                          {isMobile ? " (shown under TWV 50 when it's TWV 30 or 200)" : ""}
                        </span>
                      </div>
                      <div style={{ marginTop: "6px" }}>
                        Featured in{" "}
                        <a
                          href="https://bracketproject.blogspot.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "#3b82f6",
                            textDecoration: "underline",
                          }}
                        >
                          Bracket Matrix Blog
                        </a>
                        . Bracket Matrix site{" "}
                        <a
                          href="http://bracketmatrix.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "#3b82f6",
                            textDecoration: "underline",
                          }}
                        >
                          here
                        </a>
                        .
                      </div>
                      <div style={{ marginTop: "6px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            width: "12px",
                            height: "12px",
                            backgroundColor: "#dcfce7",
                            border: "1px solid #16a34a",
                            borderRadius: "2px",
                            marginRight: "6px",
                            verticalAlign: "middle",
                          }}
                        ></span>
                        <span>Team secured auto bid</span>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                  >
                    <TableActionButtons
                      contentSelector=".ncaa-bracket-table"
                      explainerSelector=".ncaa-bracket-explainer"
                      pageName="ncaa-tournament"
                    />
                  </div>
                </div>
              </div>
            </div>
          </ErrorBoundary>

          {/* Multi-Bid Conferences Section */}
          <ErrorBoundary level="component">
            <div className="mb-8">
              <div className="multibid-leagues-table min-h-[300px]" ref={multiBidRef}>
                <MultiBidLeagues mode={mode} />
              </div>

              <div className="mt-6">
                <div className="flex flex-row items-start gap-4">
                  <div className="multibid-leagues-explainer flex-1 text-xs text-gray-600 dark:text-gray-300 max-w-none pr-4">
                    <div style={{ lineHeight: "1.3" }}>
                      <div>
                        Conferences with multiple teams projected to be in the
                        NCAA Tournament or with bubble teams in first four
                        out/next four out.
                      </div>
                    </div>
                  </div>
                  <div
                    className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                  >
                    <TableActionButtons
                      contentSelector=".multibid-leagues-table"
                      explainerSelector=".multibid-leagues-explainer"
                      pageName="multi-bid-conferences"
                    />
                  </div>
                </div>
              </div>
            </div>
          </ErrorBoundary>
        </div>
      </PageLayoutWrapper>
    </ErrorBoundary>
  );
}
