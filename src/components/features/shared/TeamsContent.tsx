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
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);

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
    <div style={{ textAlign: "center", margin: "0 2px 2px 2px" }}>
      <div
        style={{
          fontSize: isMobile ? "10px" : "11px",
          color: "#9ca3af",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: isMobile ? "11px" : "12px",
          fontWeight: "bold",
          color: isDark ? "#f1f5f9" : "#1f2937",
        }}
      >
        {value}
      </div>
    </div>
  );

  const TeamCard = ({ team }: { team: Team }) => (
    <a
      href={teamHref(team.team_name)}
      className="bg-white dark:bg-slate-800 rounded-lg cursor-pointer transition duration-200 h-full"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: isMobile ? "8px" : "12px",
        boxShadow: isDark
          ? "0 2px 5px rgba(0,0,0,0.3)"
          : "0 2px 5px rgba(0,0,0,0.1)",
        transition: "transform 0.2s, box-shadow 0.2s",
        textDecoration: "none",
        color: "inherit",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 2px 5px rgba(0,0,0,0.1)";
      }}
    >
      <TeamLogo
        logoUrl={team.logo_url}
        teamName={team.team_name}
        size={isMobile ? 36 : 48}
      />

      <h3
        style={{
          margin: isMobile ? "8px 0 4px 0" : "10px 0 5px 0",
          textAlign: "center",
          fontSize: isMobile ? "12px" : "14px",
          fontWeight: "600",
          color: isDark ? "#f1f5f9" : "#1f2937",
          lineHeight: "1.2",
        }}
      >
        {team.team_name}
      </h3>

      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          width: "100%",
          marginTop: isMobile ? "4px" : "6px",
          flexWrap: "wrap",
        }}
      >
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

  if (error) {
    return (
      <ErrorBoundary level="page">
        <PageLayoutWrapper
          title={config.title}
          conferenceSelector={
            <ConferenceSelector
              conferences={availableConferences}
              selectedConference={selectedConference}
              onChange={handleConferenceChange}
            />
          }
          isLoading={false}
        >
          <ErrorMessage message={error} />
        </PageLayoutWrapper>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary level="page">
      <PageLayoutWrapper
        title={config.title}
        conferenceSelector={
          <ConferenceSelector
            conferences={availableConferences}
            selectedConference={selectedConference}
            onChange={handleConferenceChange}
          />
        }
        isLoading={loading}
      >
        <div className="w-full">
          {loading ? (
            <LoadingSpinner />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "repeat(auto-fill, minmax(140px, 1fr))"
                  : "repeat(auto-fill, minmax(180px, 1fr))",
                gap: isMobile ? "12px" : "16px",
                padding: isMobile ? "8px" : "12px",
              }}
            >
              {teamsData.map((team) => (
                <TeamCard key={team.team_name} team={team} />
              ))}
            </div>
          )}
        </div>
      </PageLayoutWrapper>
    </ErrorBoundary>
  );
}
