"use client";

import TableActionButtons from "@/components/common/TableActionButtons";
import MultiBidLeagues from "@/components/features/basketball/MultiBidLeagues";
import NCAABracketTable from "@/components/features/basketball/NCAABracketTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useNCAAProjections } from "@/hooks/useNCAAProjections";
import { useResponsive } from "@/hooks/useResponsive";
import { Suspense, useMemo, useRef } from "react";

export default function BasketballHome() {
  const { isMobile } = useResponsive();
  const ncaaTableRef = useRef<HTMLDivElement>(null);
  const multiBidRef = useRef<HTMLDivElement>(null);
  const { data } = useNCAAProjections();

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

  return (
    <ErrorBoundary level="page">
      <PageLayoutWrapper
        title="Basketball Tournament Projections"
        isLoading={false}
        rightElement={`Updated: ${lastUpdated}`}
      >
        <div className="-mt-2 md:-mt-6">
          {/* NCAA Bracket Table Section */}
          <ErrorBoundary level="component">
            <div className="mb-8">
              <div className="ncaa-bracket-table" ref={ncaaTableRef}>
                <Suspense
                  fallback={
                    <div className="p-4 text-gray-500">
                      Loading tournament data...
                    </div>
                  }
                >
                  <NCAABracketTable />
                </Suspense>
              </div>

              <div className="mt-6">
                <div className="flex flex-row items-start gap-4">
                  <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                    <div style={{ lineHeight: "1.3" }}>
                      <div>
                        NCAA tournament projections based on 1,000 season
                        simulations using composite ratings.
                      </div>
                      <div style={{ marginTop: "6px" }}>
                        Shows tournament seeds (1-16), team records, and
                        projected tournament status (Auto Bid, At Large, Last 4
                        In, First 4 Out, Next 4 Out).
                      </div>
                    </div>
                  </div>
                  <div
                    className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                  >
                    <TableActionButtons
                      contentSelector=".ncaa-bracket-table"
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
              <h2 className="text-xl font-normal text-gray-500">
                Potential Multi-Bid Conferences
              </h2>

              <div className="multibid-leagues-table" ref={multiBidRef}>
                <Suspense
                  fallback={
                    <div className="p-4 text-gray-500">
                      Loading conference data...
                    </div>
                  }
                >
                  <MultiBidLeagues />
                </Suspense>
              </div>

              <div className="mt-6">
                <div className="flex flex-row items-start gap-4">
                  <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                    <div style={{ lineHeight: "1.3" }}>
                      <div>
                        Conferences with multiple teams projected to be in the NCAA Tournament
                        or with bubble teams in first four out/next four out.
                      </div>
                    </div>
                  </div>
                  <div
                    className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                  >
                    <TableActionButtons
                      contentSelector=".multibid-leagues-table"
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
