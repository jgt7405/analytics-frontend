"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useMonitoring } from "@/lib/unified-monitoring";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Team {
  team_name: string;
  logo_url: string;
  conference: string;
  primary_color?: string;
  secondary_color?: string;
  actual_conference_wins: number;
  actual_conference_losses: number;
  actual_total_wins: number;
  actual_total_losses: number;
  tournament_bid_pct?: number;
}

interface BasketballTeamApiResponse {
  team_name: string;
  team_id: string;
  conference: string;
  logo_url: string;
  overall_record: string;
  conference_record: string;
  tournament_bid_pct: number;
  average_seed?: number | null;
}

interface BasketballTeamsApiResponse {
  data: BasketballTeamApiResponse[];
}

export default function BasketballTeamsPage() {
  const { trackEvent } = useMonitoring();
  const { preferences, updatePreference } = useUserPreferences();
  const { isMobile } = useResponsive();
  const router = useRouter();
  const [selectedConference, setSelectedConference] = useState(
    preferences.defaultConference
  );
  const [availableConferences, setAvailableConferences] = useState<string[]>([
    "All Teams",
    preferences.defaultConference,
  ]);
  const [teamsData, setTeamsData] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);

  useEffect(() => {
    trackEvent({
      name: "page_view",
      properties: { page: "basketball-teams", conference: selectedConference },
    });
  }, [selectedConference, trackEvent]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/proxy/basketball_teams");

        if (!response.ok) {
          throw new Error("Failed to load teams data");
        }

        const data: BasketballTeamsApiResponse = await response.json();

        if (data.data && Array.isArray(data.data)) {
          const conferences = data.data.map(
            (team: BasketballTeamApiResponse) => team.conference
          );
          const uniqueConferences = Array.from(new Set(conferences)).filter(
            Boolean
          ) as string[];
          const allConferences = ["All Teams", ...uniqueConferences.sort()];
          setAvailableConferences(allConferences);
        }

        const filteredTeams =
          selectedConference === "All Teams"
            ? data.data || []
            : (data.data || []).filter(
                (team: BasketballTeamApiResponse) =>
                  team.conference === selectedConference
              );

        const transformedTeams: Team[] = filteredTeams.map(
          (team: BasketballTeamApiResponse) => {
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
              primary_color: undefined,
              secondary_color: undefined,
              actual_conference_wins: confWins || 0,
              actual_conference_losses: confLosses || 0,
              actual_total_wins: totalWins || 0,
              actual_total_losses: totalLosses || 0,
              tournament_bid_pct: team.tournament_bid_pct * 100,
            };
          }
        );

        setTeamsData(
          transformedTeams.sort((a, b) =>
            a.team_name.localeCompare(b.team_name)
          )
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load teams data"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedConference]);

  const handleConferenceChange = (conference: string) => {
    setSelectedConference(conference);
    if (conference !== "All Teams") {
      updatePreference("defaultConference", conference);
    }
  };

  const handleTeamClick = (teamName: string) => {
    router.push(`/basketball/team/${encodeURIComponent(teamName)}`);
  };

  const formatBidPct = (value?: number) => {
    if (value === null || value === undefined || isNaN(value)) return "-";
    return `${Math.round(value)}%`;
  };

  const TeamCard = ({ team }: { team: Team }) => (
    <div
      onClick={() => handleTeamClick(team.team_name)}
      className="bg-white dark:bg-slate-800 rounded-lg cursor-pointer transition duration-200 h-full"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: isMobile ? "8px" : "12px",
        boxShadow: isDark ? "0 2px 5px rgba(0,0,0,0.3)" : "0 2px 5px rgba(0,0,0,0.1)",
        transition: "transform 0.2s, box-shadow 0.2s",
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
          color: team.primary_color || (isDark ? "#f1f5f9" : "#1f2937"),
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
        <div style={{ textAlign: "center", margin: "0 2px 2px 2px" }}>
          <div
            style={{
              fontSize: isMobile ? "10px" : "11px",
              color: isDark ? "#9ca3af" : "#9ca3af",
            }}
          >
            Overall
          </div>
          <div
            style={{
              fontSize: isMobile ? "11px" : "12px",
              fontWeight: "bold",
              color: isDark ? "#f1f5f9" : "#1f2937",
            }}
          >
            {team.actual_total_wins}-{team.actual_total_losses}
          </div>
        </div>

        <div style={{ textAlign: "center", margin: "0 2px 2px 2px" }}>
          <div
            style={{
              fontSize: isMobile ? "10px" : "11px",
              color: isDark ? "#9ca3af" : "#9ca3af",
            }}
          >
            Conference
          </div>
          <div
            style={{
              fontSize: isMobile ? "11px" : "12px",
              fontWeight: "bold",
              color: isDark ? "#f1f5f9" : "#1f2937",
            }}
          >
            {team.actual_conference_wins}-{team.actual_conference_losses}
          </div>
        </div>

        <div style={{ textAlign: "center", margin: "0 2px 2px 2px" }}>
          <div
            style={{
              fontSize: isMobile ? "10px" : "11px",
              color: isDark ? "#9ca3af" : "#9ca3af",
            }}
          >
            NCAA Bid
          </div>
          <div
            style={{
              fontSize: isMobile ? "11px" : "12px",
              fontWeight: "bold",
              color: isDark ? "#f1f5f9" : "#1f2937",
            }}
          >
            {formatBidPct(team.tournament_bid_pct)}
          </div>
        </div>
      </div>
    </div>
  );

  if (error) {
    return (
      <ErrorBoundary level="page">
        <PageLayoutWrapper
          title="Basketball Teams"
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
        title="Basketball Teams"
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
