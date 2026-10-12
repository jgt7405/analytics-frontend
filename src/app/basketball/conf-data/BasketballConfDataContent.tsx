"use client";

import TableActionButtons from "@/components/common/TableActionButtons";
import BballConfBidsHistoryChart from "@/components/features/basketball/BballConfBidsHistoryChart";
import BballConfBoxWhiskerChart from "@/components/features/basketball/BballConfBoxWhiskerChart";
import BballNonConfAnalysisTable from "@/components/features/basketball/nonconf-analysis";
import ConferenceBidsTable from "@/components/features/basketball/ConferenceBidsTable";
import ConferenceTeamWinProbLanes, {
  type WinProbLane,
} from "@/components/features/shared/ConferenceTeamWinProbLanes";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import {
  BasketballTableSkeleton,
  BoxWhiskerChartSkeleton,
} from "@/components/ui/LoadingSkeleton";
import {
  useBasketballConfData,
  type CombinedBasketballConfResponse,
  type ConferenceData,
  type WinProbOpponent,
} from "@/hooks/useBasketballConfData";
import { getBasketballSeasonLabel, getLatestDataDate } from "@/lib/chartDateRange";
import { useBasketballConfDataHistory } from "@/hooks/useBasketballConfDataHistory";
import { useResponsive } from "@/hooks/useResponsive";
import { useMonitoring } from "@/lib/unified-monitoring";
import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { logger } from "@/lib/logger";

// PAGE_MODERNIZATION_GUIDE.md §2 title tier - bold slate, not the old
// gray/normal style.
const SECTION_TITLE_CLASS =
  "text-[clamp(1.25rem,2.2vw,1.75rem)] font-bold leading-[1.1] tracking-[-0.035em] text-slate-700 dark:text-slate-300 mb-4";

const BOX_EXPLAINER =
  "Box shows 25th to 75th percentile teams in conference, line shows median, whiskers show top and bottom teams.";

function formatRating(rating: number | undefined): string {
  if (rating === undefined || !Number.isFinite(rating)) return "";
  return ` (rating ${rating > 0 ? "+" : ""}${rating.toFixed(1)})`;
}

/** Chart card plus its explainer and export buttons, the block every chart
 * on this page uses. `name` keys the container/explainer selectors. */
function ChartSection({
  name,
  pageTitle,
  explainer,
  isMobile,
  children,
}: {
  name: string;
  pageTitle: string;
  explainer: ReactNode;
  isMobile: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mb-8">
      <div className={`${name}-container`}>{children}</div>
      <div className="mt-6">
        <div className="flex flex-row items-start gap-4">
          <div
            className={`${name}-explainer flex-1 text-xs text-gray-600 dark:text-gray-300 max-w-none pr-4`}
          >
            <div style={{ lineHeight: "1.3" }}>{explainer}</div>
          </div>
          <div
            className={`flex-shrink-0 ${isMobile ? "w-1/3 pr-2" : "w-auto mr-4"}`}
          >
            <TableActionButtons
              contentSelector={`.${name}-container`}
              explainerSelector={`.${name}-explainer`}
              pageName={name}
              pageTitle={pageTitle}
              shareTitle={pageTitle}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function WinProbBoxSection({
  conferenceData,
  opponent,
  title,
  opponentText,
  isMobile,
}: {
  conferenceData: ConferenceData[];
  opponent: WinProbOpponent;
  title: string;
  opponentText: string;
  isMobile: boolean;
}) {
  if (!conferenceData.some((conf) => conf.winprob?.[opponent])) return null;
  return (
    <ChartSection
      name={`winprob-${opponent}-box-whisker`}
      pageTitle={title}
      isMobile={isMobile}
      explainer={
        <>
          <div>
            Win probability distribution by conference based on probability
            each team in conference would win a game vs {opponentText} in a
            neutral location.
          </div>
          <div style={{ marginTop: "6px" }}>{BOX_EXPLAINER}</div>
        </>
      }
    >
      <Suspense fallback={<BoxWhiskerChartSkeleton />}>
        <BballConfBoxWhiskerChart
          conferenceData={conferenceData}
          metric={opponent}
          title={title}
        />
      </Suspense>
    </ChartSection>
  );
}

export default function BasketballConfDataContent({ initialData }: { initialData?: CombinedBasketballConfResponse }) {
  const { trackEvent } = useMonitoring();
  const { isMobile } = useResponsive();
  const [showAll, setShowAll] = useState(false);

  const {
    data: confResponse,
    isLoading: confLoading,
    error: confError,
    refetch,
  } = useBasketballConfData(undefined, initialData);

  const {
    data: historyData,
    isLoading: historyLoading,
    error: historyError,
  } = useBasketballConfDataHistory();

  // Destructure the combined response
  const conferenceData = confResponse?.conferenceData;
  const nonconfData = confResponse?.nonconfData;

  // Season label comes from the shared April-boundary rule in
  // chartDateRange, so this page agrees with standings/conf-tourney/team.
  const currentSeason = useMemo(
    () => getBasketballSeasonLabel(getLatestDataDate(historyData?.timeline_data)),
    [historyData?.timeline_data]
  );

  // Debug logging
  useEffect(() => {
    logger.debug("=== Basketball History Debug ===");
    logger.debug("History Data:", historyData);
    logger.debug("History Loading:", historyLoading);
    logger.debug("History Error:", historyError);
    logger.debug(
      "Has timeline_data:",
      historyData?.timeline_data ? "YES" : "NO"
    );
    logger.debug("Timeline length:", historyData?.timeline_data?.length);
    logger.debug("================================");
  }, [historyData, historyLoading, historyError]);

  // Debug logging for nonconf data
  useEffect(() => {
    logger.debug("=== Basketball Non-Conf Debug ===");
    logger.debug("Nonconf Data:", nonconfData);
    logger.debug("Has data:", nonconfData?.data ? "YES" : "NO");
    logger.debug("Data length:", nonconfData?.data?.length);
    logger.debug("================================");
  }, [nonconfData]);

  useEffect(() => {
    trackEvent({
      name: "page_view",
      properties: { page: "basketball-conf-data" },
    });
  }, [trackEvent]);

  // Filter conference data based on showAll state
  const filteredConfData = useMemo(() => {
    if (!conferenceData?.data) return [];

    const sorted = [...conferenceData.data].sort(
      (a, b) => b.average_bids - a.average_bids
    );

    return showAll ? sorted : sorted.slice(0, 12);
  }, [conferenceData?.data, showAll]);

  // One lane per conference, each team at its win probability vs the
  // average D1 team (same filter as the charts above it).
  const winProbLanes = useMemo<WinProbLane[]>(
    () =>
      filteredConfData.map((conf) => ({
        conference_name: conf.conference_name,
        logo_url: conf.logo_url,
        primary_color: conf.primary_color,
        median: conf.winprob?.avg?.median ?? 0,
        teams: (conf.team_winprobs ?? []).map((team) => ({
          team_name: team.team_name,
          logo_url: team.logo_url,
          win_prob: team.win_prob_avg,
        })),
      })),
    [filteredConfData],
  );

  const baselines = conferenceData?.winprob_baselines;

  // Filter history data based on showAll state
  const filteredHistoryData = useMemo(() => {
    if (!historyData?.timeline_data) return [];

    // Get top 12 conferences by final average bids
    const conferencesByBids = new Map<string, number>();

    historyData.timeline_data.forEach((item) => {
      const existing = conferencesByBids.get(item.conference);
      if (!existing || item.avg_bids > existing) {
        conferencesByBids.set(item.conference, item.avg_bids);
      }
    });

    const sortedConferences = Array.from(conferencesByBids.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([conf]) => conf);

    if (showAll) {
      return historyData.timeline_data;
    }

    return historyData.timeline_data.filter((item) =>
      sortedConferences.includes(item.conference)
    );
  }, [historyData?.timeline_data, showAll]);

  // Filter toggle button, rendered inline in the table's own card header
  // (headerRight) instead of PageLayoutWrapper's page-header - see §4 of
  // PAGE_MODERNIZATION_GUIDE.md: once the page-level title is hidden, the
  // `.conference-selector` class's desktop absolute positioning
  // (relative to `.page-header`) has nothing to size the header against
  // and would float over the nav bar.
  const filterToggle = (
    <button
      onClick={() => setShowAll(!showAll)}
      className={`border rounded transition-colors ${
        isMobile ? "text-xs px-2 py-1.5" : "text-sm px-4 py-2"
      } bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100 dark:bg-slate-800 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700`}
    >
      {showAll ? "Show Top 12 Only" : "Show All Conferences"}
    </button>
  );

  if (confError) {
    return (
      <ErrorBoundary level="page" onRetry={() => refetch()}>
        <PageLayoutWrapper
          title="Conference Tournament Bid Projections"
          hideTitle
          isLoading={false}
        >
          <ErrorMessage
            message={confError.message || "Failed to load conference data"}
            onRetry={() => refetch()}
            retryLabel="Reload Conference Data"
          />
        </PageLayoutWrapper>
      </ErrorBoundary>
    );
  }

  return (
    <PageLayoutWrapper
      title="Conference Tournament Bid Projections"
      hideTitle
      isLoading={confLoading}
    >
      <ErrorBoundary level="component" onRetry={() => refetch()}>
        <div className="-mt-4 md:-mt-6">
          {confLoading ? (
            <>
              <div className="mb-8">
                <BasketballTableSkeleton
                  tableType="standings"
                  rows={15}
                  teamCols={13}
                  showSummaryRows={false}
                />
              </div>
              <div className="mb-8">
                <BoxWhiskerChartSkeleton />
              </div>
              <div className="mb-8">
                <div className="h-96 bg-gray-200 animate-pulse rounded" />
              </div>
              <div className="mb-8">
                <BasketballTableSkeleton
                  tableType="standings"
                  rows={15}
                  teamCols={13}
                  showSummaryRows={false}
                />
              </div>
            </>
          ) : (
            <>
              {/* Conference Bids Section */}
              <div className="mb-8">
                <div className="conf-data-table">
                  <Suspense
                    fallback={
                      <BasketballTableSkeleton
                        tableType="standings"
                        rows={15}
                        teamCols={13}
                        showSummaryRows={false}
                      />
                    }
                  >
                    {filteredConfData.length > 0 && (
                      <ConferenceBidsTable
                        confData={filteredConfData}
                        className="conf-data-table"
                        headerRight={filterToggle}
                      />
                    )}
                  </Suspense>
                </div>

                <div className="mt-6">
                  <div className="flex flex-row items-start gap-4">
                    <div className="flex-1 text-xs text-gray-600 dark:text-gray-300 max-w-none pr-4">
                      <div
                        className="conf-data-explainer"
                        style={{ lineHeight: "1.3" }}
                      >
                        <div>
                          Conference bid distribution based on 1,000 season
                          simulations using composite ratings based on kenpom,
                          barttorvik and evanmiya.
                        </div>
                      </div>
                    </div>
                    <div
                      className={`flex-shrink-0 ${isMobile ? "w-1/3 pr-2" : "w-auto mr-4"}`}
                    >
                      <TableActionButtons
                        contentSelector=".conf-data-table"
                        pageName="basketball-conf-data"
                        pageTitle="Conference Tournament Bid Projections"
                        shareTitle="Basketball Conference Bid Analysis"
                        explainerSelector=".conf-data-explainer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Conference Net Rating Distribution Section */}
              <div className="mb-8">
                {/* No external h3 here - BballConfBoxWhiskerChart renders its
                    own bold in-card title per §8a of
                    PAGE_MODERNIZATION_GUIDE.md; an external heading would
                    duplicate it (§3). */}
                <div className="netrtg-box-whisker-container">
                  <Suspense fallback={<BoxWhiskerChartSkeleton />}>
                    {filteredConfData.length > 0 && (
                      <BballConfBoxWhiskerChart
                        conferenceData={filteredConfData}
                      />
                    )}
                  </Suspense>
                </div>
                <div className="mt-6">
                  <div className="flex flex-row items-start gap-4">
                    <div className="netrtg-box-whisker-explainer flex-1 text-xs text-gray-600 dark:text-gray-300 max-w-none pr-4">
                      <div style={{ lineHeight: "1.3" }}>
                        <div>
                          Rating distribution by conference showing the strength
                          of teams within each conference.
                        </div>
                        <div style={{ marginTop: "6px" }}>
                          Box shows 25th to 75th percentile teams in conference,
                          line shows median, whiskers show top and bottom teams.
                        </div>
                      </div>
                    </div>
                    <div
                      className={`flex-shrink-0 ${isMobile ? "w-1/3 pr-2" : "w-auto mr-4"}`}
                    >
                      <TableActionButtons
                        contentSelector=".netrtg-box-whisker-container"
                        explainerSelector=".netrtg-box-whisker-explainer"
                        pageName="conference-netrtg-chart"
                        pageTitle="Conference Net Rating Distribution"
                        shareTitle="Conference Net Rating Distribution"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Win probability vs the average D1 team: conference boxes,
                  then every team by conference. */}
              <WinProbBoxSection
                conferenceData={filteredConfData}
                opponent="avg"
                title="Conference Win Probability vs Average Team"
                opponentText="the average Division I team"
                isMobile={isMobile}
              />

              {winProbLanes.some((lane) => lane.teams.length > 0) && (
                <ChartSection
                  name="team-winprob-lanes"
                  pageTitle="Team Win Probability by Conference"
                  isMobile={isMobile}
                  explainer={
                    <div>
                      Each team&apos;s probability of beating the average
                      Division I team at a neutral site, grouped by conference.
                      Dashed line shows the conference median.
                    </div>
                  }
                >
                  <ErrorBoundary level="component">
                    <ConferenceTeamWinProbLanes
                      lanes={winProbLanes}
                      opponentLabel="Division I team"
                    />
                  </ErrorBoundary>
                </ChartSection>
              )}

              <WinProbBoxSection
                conferenceData={filteredConfData}
                opponent="rk100"
                title="Conference Win Probability vs #100 Team"
                opponentText={`the 100th rated team${formatRating(baselines?.rk100)}`}
                isMobile={isMobile}
              />

              <WinProbBoxSection
                conferenceData={filteredConfData}
                opponent="rk50"
                title="Conference Win Probability vs #50 Team"
                opponentText={`the 50th rated team${formatRating(baselines?.rk50)}`}
                isMobile={isMobile}
              />

              {/* Conference Tournament Bid Trends Section */}
              <div className="mb-8">
                {/* No external h3 here - BballConfBidsHistoryChart renders
                    its own bold in-card title ("Conference Tournament Bid
                    Trends (Over Time)") per §8a of PAGE_MODERNIZATION_GUIDE.md.
                    An external heading here would duplicate it (§3). */}
                <div className="conf-bids-history-container">
                  <ErrorBoundary level="component">
                    {historyLoading ? (
                      <div className="p-8 text-center">
                        <div className="animate-pulse">
                          Loading history data...
                        </div>
                      </div>
                    ) : historyError ? (
                      <div className="p-8 text-center">
                        <p className="text-red-600 mb-2">
                          Error loading history:
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {historyError.message}
                        </p>
                      </div>
                    ) : filteredHistoryData.length > 0 ? (
                      <BballConfBidsHistoryChart
                        timelineData={filteredHistoryData}
                        season={currentSeason}
                      />
                    ) : (
                      <div className="p-8 text-center">
                        <p className="text-gray-500 dark:text-gray-300 mb-4">
                          No history data available
                        </p>
                        <details className="text-left max-w-2xl mx-auto">
                          <summary className="cursor-pointer text-xs text-gray-400 mb-2">
                            Show debug info
                          </summary>
                          <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto">
                            {JSON.stringify(
                              {
                                hasData: !!historyData,
                                hasTimeline: !!historyData?.timeline_data,
                                timelineLength:
                                  historyData?.timeline_data?.length,
                                sampleData: historyData?.timeline_data?.slice(
                                  0,
                                  2
                                ),
                              },
                              null,
                              2
                            )}
                          </pre>
                        </details>
                      </div>
                    )}
                  </ErrorBoundary>
                </div>
                <div className="mt-6">
                  <div className="flex flex-row items-start gap-4">
                    <div className="conf-bids-history-explainer flex-1 text-xs text-gray-600 dark:text-gray-300 max-w-none pr-4">
                      <div style={{ lineHeight: "1.3" }}>
                        <div>
                          Progression of projected NCAA tournament bids by
                          conference over time from 1,000 season simulations
                          using composite ratings based on kenpom, barttorvik
                          and evanmiya.
                        </div>
                      </div>
                    </div>
                    <div
                      className={`flex-shrink-0 ${isMobile ? "w-1/3 pr-2" : "w-auto mr-4"}`}
                    >
                      <TableActionButtons
                        contentSelector=".conf-bids-history-container"
                        explainerSelector=".conf-bids-history-explainer"
                        pageName="conference-bids-history-chart"
                        pageTitle="Conference Tournament Bids History"
                        shareTitle="Conference Tournament Bid Trends Over Time"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Non-Conference Opponent Analysis Section */}
              <div className="mb-8">
                <h3 className={SECTION_TITLE_CLASS}>
                  Non-Conference Opponent Analysis
                </h3>
                <div className="nonconf-analysis-table">
                  <Suspense
                    fallback={
                      <BasketballTableSkeleton
                        tableType="standings"
                        rows={15}
                        teamCols={13}
                        showSummaryRows={false}
                      />
                    }
                  >
                    {confLoading ? (
                      <div className="p-8 text-center">
                        <div className="animate-pulse">
                          Loading non-conference data...
                        </div>
                      </div>
                    ) : confError ? (
                      <div className="p-8 text-center">
                        <p className="text-red-600 mb-2">Error loading data:</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {String(confError)}
                        </p>
                      </div>
                    ) : nonconfData?.data && nonconfData.data.length > 0 ? (
                      <BballNonConfAnalysisTable className="nonconf-analysis-table" />
                    ) : (
                      <div className="p-8 text-center text-gray-500 dark:text-gray-300">
                        No non-conference data available
                      </div>
                    )}
                  </Suspense>
                </div>

                <div className="mt-6">
                  <div className="flex flex-row items-start gap-4">
                    <div className="flex-1 text-xs text-gray-600 dark:text-gray-300 max-w-none pr-4">
                      <div
                        className="nonconf-analysis-explainer"
                        style={{ lineHeight: "1.3" }}
                      >
                        <div>
                          Power conferences include ACC, Big 12, Big East, Big
                          Ten, and SEC.
                        </div>
                        <div style={{ marginTop: "6px" }}>
                          Exp Win % reflects the projected record of the #30
                          rated team vs the schedule of that conference or team.
                        </div>
                        <div style={{ marginTop: "6px" }}>
                          TWV reflects # of wins above or below the projected
                          wins for the #30 rated team vs that schedule. For
                          conferences, this is the average for the conference's
                          teams.
                        </div>
                      </div>
                    </div>
                    <div
                      className={`flex-shrink-0 ${isMobile ? "w-1/3 pr-2" : "w-auto mr-4"}`}
                    >
                      <TableActionButtons
                        contentSelector=".nonconf-analysis-table"
                        pageName="nonconf-analysis"
                        pageTitle="Non-Conference Opponent Analysis"
                        shareTitle="Non-Conference Performance Analysis"
                        explainerSelector=".nonconf-analysis-explainer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </ErrorBoundary>
    </PageLayoutWrapper>
  );
}
