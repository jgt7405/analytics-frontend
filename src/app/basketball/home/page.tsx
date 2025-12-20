"use client";

import TableActionButtons from "@/components/common/TableActionButtons";
import MultiBidLeagues from "@/components/features/basketball/MultiBidLeagues";
import NCAABracketTable from "@/components/features/basketball/NCAABracketTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useResponsive } from "@/hooks/useResponsive";
import { Suspense, useRef } from "react";

export default function BasketballHome() {
  const { isMobile } = useResponsive();
  const ncaaTableRef = useRef<HTMLDivElement>(null);
  const multiBidRef = useRef<HTMLDivElement>(null);

  return (
    <ErrorBoundary level="page">
      <PageLayoutWrapper
        title="NCAA Tournament Seed Projections"
        isLoading={false}
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
                      pageTitle="NCAA Tournament Projections"
                      shareTitle="Tournament Bracket Projections"
                    />
                  </div>
                </div>
              </div>
            </div>
          </ErrorBoundary>

          {/* Multi-Bid Conferences Section */}
          <ErrorBoundary level="component">
            <div className="mb-8">
              <h1 className="text-xl font-normal text-gray-500 mb-4">
                Multi-Bid Conferences
              </h1>
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
                        Conferences with multiple teams selected to the NCAA
                        tournament.
                      </div>
                      <div style={{ marginTop: "6px" }}>
                        Displays each conference and the projected seeds of its
                        tournament teams, sorted by number of tournament bids.
                      </div>
                    </div>
                  </div>
                  <div
                    className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                  >
                    <TableActionButtons
                      contentSelector=".multibid-leagues-table"
                      pageName="multibid-conferences"
                      pageTitle="Multi-Bid Conferences"
                      shareTitle="Multi-Bid Conferences"
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
