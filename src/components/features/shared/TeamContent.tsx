"use client";

// Shared implementation of the basketball/football team pages (current +
// [season] archive variants; previously four drifted copies totalling
// ~3,800 lines, each containing its own mobile AND desktop copy of every
// section). The scaffolding lives here once: loading/error states, the
// team header (mobile + desktop), the section card chrome (border, heading,
// logo watermark), column layout, screenshot button/modal, and the
// teamConf URL sync. Sports describe their sections declaratively in a
// TeamContentConfig; each section renders once and is placed into both
// layouts by key.

import ScreenshotModal from "@/components/common/ScreenshotModal";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { useMonitoring } from "@/lib/unified-monitoring";
import { Download } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ReactNode, useCallback, useEffect, useState } from "react";

export interface TeamInfoLike {
  team_name: string;
  conference: string;
  logo_url: string;
  conf_logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  overall_record: string;
  conference_record: string;
  average_seed?: number;
}

export interface TeamRenderContext<TData> {
  teamData: TData;
  teamInfo: TeamInfoLike;
  /** Season label for charts: archive season, or computed from history. */
  displaySeason: string;
  /** Raw archive season from the URL (undefined on current pages). */
  season?: string;
  navigateToTeam: (targetTeam: string) => void;
}

export interface TeamSection<TData> {
  key: string;
  heading: string;
  /** CSS class on the card; also the screenshot selector. */
  containerClass: string;
  /** Show the small team-logo watermark next to the heading. */
  watermark?: boolean;
  /** Team Schedule uses a distinct card frame with a bordered header. */
  scheduleFrame?: boolean;
  /** Omit the section when this returns false (e.g. data not loaded yet). */
  visible?: (teamData: TData) => boolean;
  render: (ctx: TeamRenderContext<TData>) => ReactNode;
}

export interface TeamContentConfig<TData, THistory> {
  /** "basketball" | "football" — used for team routes. */
  sport: string;
  /** Tracking page id ("basketball-team" | "football-team"). */
  pageId: string;
  useTeamData: (
    teamname: string,
    season?: string,
    initialData?: TData,
  ) => {
    data: TData | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => unknown;
  };
  useHistoryData: (
    teamname: string,
    season?: string,
  ) => { data: THistory | null | undefined };
  computeSeason: (history: THistory | null | undefined) => string;
  getTeamInfo: (data: TData) => TeamInfoLike;
  /** Rank shown after the team name in the h1 ("" to hide). */
  getRankLabel: (info: TeamInfoLike) => string;
  /** Third header stat (bid percentage). */
  bidLabel: string;
  getBidDisplay: (info: TeamInfoLike) => string;
  sections: TeamSection<TData>[];
  /** Section keys in mobile order; "screenshot" places the download button. */
  mobileOrder: string[];
  /** Desktop column assignments (button always ends the left column). */
  desktopLeft: string[];
  desktopRight: string[];
}

interface TeamContentProps<TData, THistory> {
  config: TeamContentConfig<TData, THistory>;
  params: { teamname: string };
  season?: string;
  initialData?: TData;
}

export default function TeamContent<TData, THistory>({
  config,
  params,
  season,
  initialData,
}: TeamContentProps<TData, THistory>) {
  const { trackEvent } = useMonitoring();
  const { isMobile } = useResponsive();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isScreenshotModalOpen, setIsScreenshotModalOpen] = useState(false);

  const teamname = decodeURIComponent(params.teamname);

  const useTeamData = config.useTeamData;
  const {
    data: teamData,
    isLoading,
    error,
    refetch,
  } = useTeamData(teamname, season, initialData);

  const useHistoryData = config.useHistoryData;
  const { data: historyData } = useHistoryData(teamname, season);

  const displaySeason = season ?? config.computeSeason(historyData);

  useEffect(() => {
    trackEvent({
      name: "page_view",
      properties: {
        page: config.pageId,
        team: teamname,
        season: season || "current",
      },
    });
  }, [teamname, season, config.pageId, trackEvent]);

  // Expose the team's conference in the URL so conference pages opened from
  // here preselect it (useConferenceUrl reads teamConf with priority).
  const teamConference = teamData
    ? config.getTeamInfo(teamData).conference
    : undefined;
  useEffect(() => {
    if (teamConference) {
      const urlParams = new URLSearchParams(searchParams.toString());
      urlParams.set("teamConf", teamConference);
      const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
      window.history.replaceState({}, "", newUrl);
    }
  }, [teamConference, searchParams]);

  const navigateToTeam = useCallback(
    (targetTeam: string) => {
      if (targetTeam && targetTeam !== teamname) {
        const base = season
          ? `/${config.sport}/${season}/team/`
          : `/${config.sport}/team/`;
        router.push(`${base}${encodeURIComponent(targetTeam)}`);
      }
    },
    [teamname, season, config.sport, router],
  );

  if (error) {
    return (
      <ErrorBoundary level="page">
        <div className="container mx-auto px-4 pt-6 pb-2 md:pt-6 md:pb-3">
          <ErrorMessage
            message={error.message || "Failed to load team data"}
            onRetry={() => refetch()}
            retryLabel="Reload Team Data"
          />
        </div>
      </ErrorBoundary>
    );
  }

  if (isLoading || !teamData) {
    return (
      <div className="container mx-auto px-4 pt-6 pb-2 md:pt-6 md:pb-3">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" message="Loading team data..." />
        </div>
      </div>
    );
  }

  const teamInfo = config.getTeamInfo(teamData);

  // Conference logo: prefer the API-provided URL, otherwise construct it
  // (spaces AND hyphens become underscores: Mid-American -> Mid_American).
  const formattedConfName = teamInfo.conference
    .replace(/ /g, "_")
    .replace(/-/g, "_");
  const conferenceLogoUrl =
    teamInfo.conf_logo_url || `/images/conf_logos/${formattedConfName}.png`;

  const rankLabel = config.getRankLabel(teamInfo);

  const ctx: TeamRenderContext<TData> = {
    teamData,
    teamInfo,
    displaySeason,
    season,
    navigateToTeam,
  };

  const sectionsByKey = new Map(config.sections.map((s) => [s.key, s]));

  const screenshotOptions = config.sections
    .filter((s) => !s.visible || s.visible(teamData))
    .map((s) => ({
      id: s.key,
      label: s.heading,
      selector: `.${s.containerClass}`,
    }));

  const watermark = (size: number, style: React.CSSProperties) =>
    teamInfo.logo_url && (
      <div className="absolute" style={{ ...style, width: size, height: size }}>
        <Image
          src={teamInfo.logo_url}
          alt={`${teamInfo.team_name} logo`}
          width={size}
          height={size}
          className="object-contain opacity-80"
        />
      </div>
    );

  const renderSection = (key: string, mobile: boolean) => {
    const s = sectionsByKey.get(key);
    if (!s) return null;
    if (s.visible && !s.visible(teamData)) return null;

    const headingClass = mobile
      ? "text-base font-semibold"
      : "text-lg font-semibold";
    const logoSize = mobile ? 24 : 32;

    if (s.scheduleFrame) {
      return (
        <div
          key={s.key}
          className={`bg-white dark:bg-slate-800 rounded-lg relative ${mobile ? "mx-2" : ""} ${s.containerClass}`}
          style={{
            border: "1px solid #d1d5db",
            ...(mobile ? {} : { minWidth: "350px" }),
          }}
        >
          <div
            className={
              mobile
                ? "px-2 py-1 border-b border-gray-200 -mt-4 relative"
                : "pt-0 px-3 pb-3 border-b border-gray-200 -mt-2 relative"
            }
          >
            <h2 className={headingClass}>{s.heading}</h2>
            {s.watermark &&
              watermark(logoSize, {
                top: mobile ? "20px" : "-5px",
                right: "5px",
              })}
          </div>
          <div className="border-b border-gray-200"></div>
          <div
            className={
              mobile
                ? "px-1 pb-1 -mt-8 flex justify-center items-center min-h-[300px]"
                : "pt-0 px-3 pb-3 flex justify-center items-center min-h-[300px] -mt-6"
            }
          >
            {s.render(ctx)}
          </div>
        </div>
      );
    }

    return (
      <div
        key={s.key}
        className={`bg-white dark:bg-slate-800 rounded-lg p-3 relative ${s.containerClass}`}
        style={{ border: "1px solid #d1d5db" }}
      >
        <div className="relative">
          <h2 className={`${headingClass} mb-1 -mt-2`}>{s.heading}</h2>
          {s.watermark &&
            watermark(logoSize, { top: "0px", right: "-5px" })}
        </div>
        {s.render(ctx)}
      </div>
    );
  };

  const screenshotButton = (mobile: boolean) => (
    <div
      key="screenshot"
      className={mobile ? "flex justify-end px-2 mt-2" : "flex justify-end"}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsScreenshotModalOpen(true);
        }}
        className="flex items-center gap-2 px-3 py-2 text-xs bg-gray-700 text-white rounded-md hover:bg-gray-800 transition-colors border border-gray-700"
      >
        <Download className="h-3 w-3" />
        Download
      </button>
    </div>
  );

  const statPair = (
    a: { value: string; label: string },
    b: { value: string; label: string },
    mobile: boolean,
  ) => (
    <div
      className={
        mobile
          ? "bg-white dark:bg-slate-800 p-3 rounded-lg flex-1"
          : "bg-white dark:bg-slate-800 p-4 rounded-lg"
      }
      style={{ border: "1px solid #d1d5db" }}
    >
      <div className={mobile ? "flex gap-3" : "flex gap-4"}>
        {[a, b].map((stat) => (
          <div
            key={stat.label}
            className={mobile ? "text-center flex-1" : "text-center"}
          >
            <div
              className={`${mobile ? "text-base" : "text-lg"} font-semibold text-gray-700 dark:text-gray-200`}
            >
              {stat.value}
            </div>
            <div
              className={`${mobile ? "text-xs" : "text-sm"} text-gray-600 dark:text-gray-300 italic`}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const recordStats = statPair(
    { value: teamInfo.overall_record, label: "Overall" },
    { value: teamInfo.conference_record, label: "Conference" },
    isMobile,
  );
  const bidStats = statPair(
    { value: config.getBidDisplay(teamInfo), label: config.bidLabel },
    {
      value: teamInfo.average_seed ? teamInfo.average_seed.toFixed(1) : "-",
      label: "Avg Seed",
    },
    isMobile,
  );

  const teamTitle = (mobile: boolean) => (
    <div className={mobile ? "flex items-center gap-3" : "flex items-center gap-4"}>
      <TeamLogo
        logoUrl={teamInfo.logo_url}
        teamName={teamInfo.team_name}
        size={mobile ? 40 : 64}
      />
      <div className="flex flex-col justify-center">
        <h1
          className={`${mobile ? "text-xl" : "text-2xl"} font-semibold leading-tight -mb-1`}
          style={{ color: teamInfo.primary_color || "#1f2937" }}
        >
          {teamInfo.team_name} {rankLabel}
        </h1>
        <p
          className={`text-gray-600 dark:text-gray-300 ${mobile ? "text-sm" : ""} leading-tight -mt-0`}
        >
          Team Page
        </p>
      </div>
    </div>
  );

  const confLogo = (size: number) => (
    <div
      className={`flex flex-col items-center ${size > 32 ? "ml-4" : ""}`}
      title={teamInfo.conference}
    >
      <Image
        src={conferenceLogoUrl}
        alt={`${teamInfo.conference} logo`}
        width={size}
        height={size}
        className={`${size > 32 ? "h-12" : "h-8"} w-auto object-contain`}
        unoptimized
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    </div>
  );

  return (
    <ErrorBoundary level="page">
      <div className="container mx-auto px-4 pt-6 pb-2 md:pt-6 md:pb-3">
        <div className="space-y-3">
          {isMobile ? (
            <div className="space-y-2">
              {/* Mobile Header */}
              <div className="bg-white dark:bg-slate-800 rounded-lg px-2 py-4">
                <div className="flex items-center justify-between mb-4">
                  {teamTitle(true)}
                  {confLogo(32)}
                </div>
                <div className="flex gap-2 -mt-2 mx-0">
                  {recordStats}
                  {bidStats}
                </div>
              </div>

              {config.mobileOrder.map((key) =>
                key === "screenshot"
                  ? screenshotButton(true)
                  : renderSection(key, true),
              )}
            </div>
          ) : (
            <div className="w-full">
              {/* Desktop Header */}
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 mb-3">
                <div className="flex items-center justify-between">
                  {teamTitle(false)}
                  <div className="flex gap-4">
                    {recordStats}
                    {bidStats}
                  </div>
                  {confLogo(48)}
                </div>
              </div>

              <div className="grid gap-3 grid-cols-1 lg:grid-cols-3">
                <div className="space-y-3">
                  {config.desktopLeft.map((key) => renderSection(key, false))}
                  {screenshotButton(false)}
                </div>
                <div className="space-y-3 col-span-2">
                  {config.desktopRight.map((key) => renderSection(key, false))}
                </div>
              </div>
            </div>
          )}
        </div>

        <ScreenshotModal
          isOpen={isScreenshotModalOpen}
          onClose={() => setIsScreenshotModalOpen(false)}
          options={screenshotOptions}
          teamName={teamInfo.team_name}
          teamLogoUrl={teamInfo.logo_url}
        />
      </div>
    </ErrorBoundary>
  );
}
