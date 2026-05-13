"use client";

import TableActionButtons from "@/components/common/TableActionButtons";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useNCAAProjections } from "@/hooks/useNCAAProjections";
import { useResponsive } from "@/hooks/useResponsive";
import dynamic from "next/dynamic";
import { useMemo, useRef } from "react";

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

export default function BasketballHome() {
  const { isMobile } = useResponsive();
  const ncaaTableRef = useRef<HTMLDivElement>(null);
  const multiBidRef = useRef<HTMLDivElement>(null);
  const { data, loading } = useNCAAProjections();

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
        isLoading={loading}
        rightElement={`Updated: ${lastUpdated}`}
      >
        <div className="-mt-2 md:-mt-6">
          {/* NCAA Bracket Table Section */}
          <ErrorBoundary level="component">
            <div className="mb-8">
              <div className="ncaa-bracket-table min-h-[600px]" ref={ncaaTableRef}>
                <NCAABracketTable />
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

              <div className="multibid-leagues-table min-h-[300px]" ref={multiBidRef}>
                <MultiBidLeagues />
              </div>

              <div className="mt-6">
                <div className="flex flex-row items-start gap-4">
                  <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
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
