"use client";

// Shared implementation of the basketball/football "teams" grid pages
// (current + [season] archive variants; previously four ~98%-identical
// copies). Cards are real anchors (crawlable + middle-clickable); the
// sport differences are the API endpoint, team route, and bid stat.

import ConferenceSelector from "@/components/common/ConferenceSelector";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useMonitoring } from "@/lib/unified-monitoring";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./TeamsContent.module.css";

const cx = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

export interface TeamsApiRow {
  team_name: string;
  team_id?: string;
  conference: string;
  logo_url: string;
  overall_record?: string;
  conference_record?: string;
  [key: string]: unknown;
}

export interface TeamsContentConfig {
  sport: "basketball" | "football";
  /** Tracking page id ("basketball-teams" | "football-teams"). */
  pageId: string;
  /** Proxy endpoint name ("basketball_teams" | "football_teams"). */
  endpoint: string;
  /** Bid column label ("NCAA Bid" | "Playoff Bid"). */
  bidLabel: string;
  /** Extract the bid percentage (0-100) from an API row. */
  getBidPct: (row: TeamsApiRow) => number | undefined;
  title: string;
  /**
   * Hide PageLayoutWrapper's gray page-level title in favor of the bold
   * title rendered in this component's own card header. Only set this on
   * the football config (see PAGE_MODERNIZATION_GUIDE.md) - basketball is
   * left on the old page-level title until it gets the same treatment.
   */
  hidePageTitle?: boolean;
}

interface Team {
  team_name: string;
  logo_url: string;
  conference: string;
  actual_conference_wins: number;
  actual_conference_losses: number;
  actual_total_wins: number;
  actual_total_losses: number;
  bid_pct?: number;
}

interface TeamsContentProps {
  config: TeamsContentConfig;
  season?: string;
}

export default function TeamsContent({ config, season }: TeamsContentProps) {
  const { trackEvent } = useMonitoring();
  const { preferences, updatePreference } = useUserPreferences();
  const { isMobile } = useResponsive();
  const searchParams = useSearchParams();

  const [selectedConference, setSelectedConference] = useState(() => {
    const confParam = searchParams.get("conf");
    if (confParam) return decodeURIComponent(confParam);
    return preferences.defaultConference;
  });
  const [availableConferences, setAvailableConferences] = useState<string[]>([
    "All Teams",
    preferences.defaultConference,
  ]);
  const [teamsData, setTeamsData] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trackEvent({
      name: "page_view",
      properties: {
        page: config.pageId,
        conference: selectedConference,
        season: season || "current",
      },
    });
  }, [selectedConference, season, config.pageId, trackEvent]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const seasonQuery = season
          ? `?season=${encodeURIComponent(season)}`
          : "";
        const response = await fetch(
          `/api/proxy/${config.endpoint}${seasonQuery}`,
        );

        if (!response.ok) {
          throw new Error("Failed to load teams data");
        }

        const data: { data?: TeamsApiRow[] } = await response.json();

        if (data.data && Array.isArray(data.data)) {
          const uniqueConferences = Array.from(
            new Set(data.data.map((team) => team.conference)),
          ).filter(Boolean) as string[];
          setAvailableConferences(["All Teams", ...uniqueConferences.sort()]);
        }

        const filteredTeams =
          selectedConference === "All Teams"
            ? data.data || []
            : (data.data || []).filter(
                (team) => team.conference === selectedConference,
              );

        const transformedTeams: Team[] = filteredTeams.map((team) => {
          const [totalWins, totalLosses] = team.overall_record
            ?.split("-")
            .map(Number) || [0, 0];
          const [confWins, confLosses] = team.conference_record
            ?.split("-")
            .map(Number) || [0, 0];

          return {
            team_name: team.team_name,
            logo_url: team.logo_url,
            conference: team.conference,
            actual_conference_wins: confWins || 0,
            actual_conference_losses: confLosses || 0,
            actual_total_wins: totalWins || 0,
            actual_total_losses: totalLosses || 0,
            bid_pct: config.getBidPct(team),
          };
        });

        setTeamsData(
          transformedTeams.sort((a, b) =>
            a.team_name.localeCompare(b.team_name),
          ),
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load teams data",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConference, season, config.endpoint]);

  const handleConferenceChange = (conference: string) => {
    setSelectedConference(conference);
    if (conference !== "All Teams") {
      updatePreference("defaultConference", conference);
    }
  };

  const teamHref = (teamName: string) =>
    season
      ? `/${config.sport}/${season}/team/${encodeURIComponent(teamName)}/`
      : `/${config.sport}/team/${encodeURIComponent(teamName)}/`;

  const formatBidPct = (value?: number) => {
    if (value === null || value === undefined || isNaN(value)) return "-";
    return `${Math.round(value)}%`;
  };

  const statCell = (label: string, value: string) => (
    <div className={styles.statCell}>
      <div className={cx(styles.statLabel, isMobile && styles.mobile)}>
        {label}
      </div>
      <div className={cx(styles.statValue, isMobile && styles.mobile)}>
        {value}
      </div>
    </div>
  );

  const TeamCard = ({ team }: { team: Team }) => (
    <a
      href={teamHref(team.team_name)}
      className={cx(styles.teamCard, isMobile && styles.mobile)}
    >
      <TeamLogo
        logoUrl={team.logo_url}
        teamName={team.team_name}
        size={isMobile ? 36 : 48}
      />

      <h3 className={cx(styles.teamName, isMobile && styles.mobile)}>
        {team.team_name}
      </h3>

      <div className={cx(styles.statRow, isMobile && styles.mobile)}>
        {statCell(
          "Overall",
          `${team.actual_total_wins}-${team.actual_total_losses}`,
        )}
        {statCell(
          "Conference",
          `${team.actual_conference_wins}-${team.actual_conference_losses}`,
        )}
        {statCell(config.bidLabel, formatBidPct(team.bid_pct))}
      </div>
    </a>
  );

  const conferenceSelectorNode = (
    <ConferenceSelector
      conferences={availableConferences}
      selectedConference={selectedConference}
      onChange={handleConferenceChange}
      inline={config.hidePageTitle}
    />
  );

  const grid = (
    <div
      className={cx(styles.grid, isMobile && styles.mobile)}
      style={{
        gridTemplateColumns: isMobile
          ? "repeat(auto-fill, minmax(140px, 1fr))"
          : "repeat(auto-fill, minmax(180px, 1fr))",
      }}
    >
      {teamsData.map((team) => (
        <TeamCard key={team.team_name} team={team} />
      ))}
    </div>
  );

  // Football's config hides PageLayoutWrapper's gray title in favor of a
  // bold title in the card header, matching the modernized football pages.
  // Basketball is left on the old undecorated layout until it gets the
  // same treatment deliberately - see PAGE_MODERNIZATION_GUIDE.md.
  const body = config.hidePageTitle ? (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.titleGroup} data-screenshot-hide="true">
          <h2 className={styles.title}>{config.title}</h2>
        </div>
        <div data-screenshot-hide="true">{conferenceSelectorNode}</div>
      </div>
      {loading ? <LoadingSpinner /> : grid}
    </div>
  ) : (
    <div className="w-full">{loading ? <LoadingSpinner /> : grid}</div>
  );

  if (error) {
    const errorBody = config.hidePageTitle ? (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.titleGroup} data-screenshot-hide="true">
            <h2 className={styles.title}>{config.title}</h2>
          </div>
          <div data-screenshot-hide="true">{conferenceSelectorNode}</div>
        </div>
        <div style={{ padding: "0 1.35rem 1.35rem" }}>
          <ErrorMessage message={error} />
        </div>
      </div>
    ) : (
      <ErrorMessage message={error} />
    );

    return (
      <ErrorBoundary level="page">
        <PageLayoutWrapper
          title={config.title}
          conferenceSelector={
            config.hidePageTitle ? undefined : conferenceSelectorNode
          }
          hideTitle={config.hidePageTitle}
          isLoading={false}
        >
          {errorBody}
        </PageLayoutWrapper>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary level="page">
      <PageLayoutWrapper
        title={config.title}
        conferenceSelector={
          config.hidePageTitle ? undefined : conferenceSelectorNode
        }
        hideTitle={config.hidePageTitle}
        isLoading={loading}
      >
        {body}
      </PageLayoutWrapper>
    </ErrorBoundary>
  );
}
