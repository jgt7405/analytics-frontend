"use client";

import TableActionButtons from "@/components/common/TableActionButtons";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useFootballPlayoffRankings } from "@/hooks/useFootballPlayoffRankings";
import { useResponsive } from "@/hooks/useResponsive";
import { useMonitoring } from "@/lib/unified-monitoring";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef } from "react";

const FootballCFPBracketTable = dynamic(
  () =>
    import(
      "@/components/features/football/FootballCFPBracketTable"
    ),
  {
    loading: () => (
      <div className="min-h-[600px] bg-gray-50 animate-pulse rounded-lg" />
    ),
  }
);

const FootballConferenceBidsTable = dynamic(
  () =>
    import(
      "@/components/features/football/FootballConferenceBidsTable"
    ),
  {
    loading: () => (
      <div className="min-h-[300px] bg-gray-50 animate-pulse rounded-lg" />
    ),
  }
);

export default function FootballHome() {
  const { trackEvent } = useMonitoring();
  const { isMobile } = useResponsive();
  const cfpTableRef = useRef<HTMLDivElement>(null);
  const confBidsRef = useRef<HTMLDivElement>(null);
  const { data, isLoading } = useFootballPlayoffRankings();

  // Track page view
  useEffect(() => {
    trackEvent({
      name: "page_view",
      properties: { page: "football-home" },
    });
  }, [trackEvent]);

  // Format the last updated timestamp
  const lastUpdated = useMemo(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const year = now.getFullYear();
    return `${month}/${day}/${year}`;
  }, []);

  return (
    <ErrorBoundary level="page">
      <PageLayoutWrapper
        title="College Football Playoff Projections"
        isLoading={isLoading}
        rightElement={`Updated: ${lastUpdated}`}
      >
        <div className="-mt-2 md:-mt-6">
          {/* CFP Bracket Table Section */}
          <ErrorBoundary level="component">
            <div className="mb-8">
              <div className="cfp-bracket-table min-h-[600px]" ref={cfpTableRef}>
                <FootballCFPBracketTable
                  playoffTeams={data?.playoff_teams ?? []}
                  firstFourOut={data?.first_four_out ?? []}
                  nextFourOut={data?.next_four_out ?? []}
                />
              </div>

              <div className="mt-6">
                <div className="flex flex-row items-start gap-4">
                  <div className="flex-1 text-xs text-gray-600 dark:text-gray-300 max-w-none pr-4">
                    <div style={{ lineHeight: "1.3" }}>
                      <div>
                        CFP projections based on 1,000 season simulations.
                      </div>
                      <div style={{ marginTop: "6px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            width: "12px",
                            height: "12px",
                            backgroundColor: "#dbeafe",
                            border: "1px solid #3b82f6",
                            borderRadius: "2px",
                            marginRight: "6px",
                            verticalAlign: "middle",
                          }}
                        ></span>
                        <span>Auto Bid (Conference Champion)</span>
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
                        <span>At Large Bid</span>
                      </div>
                      <div style={{ marginTop: "6px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            width: "12px",
                            height: "12px",
                            backgroundColor: "#ffedd5",
                            border: "1px solid #b45309",
                            borderRadius: "2px",
                            marginRight: "6px",
                            verticalAlign: "middle",
                          }}
                        ></span>
                        <span>First 4 Out</span>
                      </div>
                      <div style={{ marginTop: "6px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            width: "12px",
                            height: "12px",
                            backgroundColor: "#fee2e2",
                            border: "1px solid #991b1b",
                            borderRadius: "2px",
                            marginRight: "6px",
                            verticalAlign: "middle",
                          }}
                        ></span>
                        <span>Next 4 Out</span>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`flex-shrink-0 ${
                      isMobile ? "w-1/3" : "w-auto mr-2"
                    }`}
                  >
                    <TableActionButtons
                      contentSelector=".cfp-bracket-table"
                      pageName="cfp-bracket"
                    />
                  </div>
                </div>
              </div>
            </div>
          </ErrorBoundary>

          {/* Conference Multi-Bid Conferences Section */}
          <ErrorBoundary level="component">
            <div className="mb-8">
              <h2 className="text-xl font-normal text-gray-500 dark:text-gray-200">
                Projected Bids by Conference
              </h2>

              <div className="conf-multi-bid-table min-h-[300px]" ref={confBidsRef}>
                <FootballConferenceBidsTable />
              </div>

              <div className="mt-6">
                <div className="flex flex-row items-start gap-4">
                  <div className="flex-1 text-xs text-gray-600 dark:text-gray-300 max-w-none pr-4">
                    <div style={{ lineHeight: "1.3" }}>
                      <div>
                        All conferences, showing projected playoff teams (with
                        seeds) and first/next four out teams.
                      </div>
                    </div>
                  </div>
                  <div
                    className={`flex-shrink-0 ${
                      isMobile ? "w-1/3" : "w-auto mr-2"
                    }`}
                  >
                    <TableActionButtons
                      contentSelector=".conf-multi-bid-table"
                      pageName="conference-multi-bid"
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
