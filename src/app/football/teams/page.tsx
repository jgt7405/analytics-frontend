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
  playoff_bid_pct?: number;
}

// Interface for the API response from /football_teams
interface FootballTeamApiResponse {
  team_name: string;
  team_id: string;
  conference: string;
  logo_url: string;
  overall_record: string;
  conference_record: string;
  cfp_bid_pct: number;
  average_seed?: number | null;
}

interface FootballTeamsApiResponse {
  data: FootballTeamApiResponse[];
}

export default function FootballTeamsPage() {
  const { trackEvent } = useMonitoring();
  const { preferences, updatePreference } = useUserPreferences();
  const { isMobile } = useResponsive();
  const router = useRouter();
  const [selectedConference, setSelectedConference] = useState("Big 12");
  const [availableConferences, setAvailableConferences] = useState<string[]>([
    "All Teams",
    preferences.defaultConference,
  ]);
  const [teamsData, setTeamsData] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track page load
  useEffect(() => {
    trackEvent({
      name: "page_view",
      properties: { page: "football-teams", conference: selectedConference },
    });
  }, [selectedConference, trackEvent]);

  // Fetch teams data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/proxy/football_teams`);

        if (!response.ok) {
          throw new Error("Failed to load teams data");
        }

        const data: FootballTeamsApiResponse = await response.json();

        // Extract conferences with proper typing
        if (data.data && Array.isArray(data.data)) {
          const conferences = data.data.map(
            (team: FootballTeamApiResponse) => team.conference
          );
          const uniqueConferences = Array.from(new Set(conferences)).filter(
            Boolean
          ) as string[];
          const allConferences = ["All Teams", ...uniqueConferences.sort()];
          setAvailableConferences(allConferences);
        }

        // Filter by conference if not "All Teams"
        const filteredTeams =
          selectedConference === "All Teams"
            ? data.data || []
            : (data.data || []).filter(
                (team: FootballTeamApiResponse) =>
                  team.conference === selectedConference
              );

        // Transform using the correct API response structure
        const transformedTeams: Team[] = filteredTeams.map(
          (team: FootballTeamApiResponse) => {
            // Parse records from strings like "10-2"
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
              playoff_bid_pct: team.cfp_bid_pct,
            };
          }
        );

        setTeamsData(transformedTeams);
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
    router.push(`/football/team/${encodeURIComponent(teamName)}`);
  };

  const formatBidPct = (value?: number) => {
    if (value === null || value === undefined || isNaN(value)) return "-";
    return `${Math.round(value)}%`;
  };

  const TeamCard = ({ team }: { team: Team }) => (
    <div
      onClick={() => handleTeamClick(team.team_name)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: isMobile ? "8px" : "12px",
        backgroundColor: "white",
        borderRadius: "8px",
        boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
        cursor: "pointer",
        transition: "transform 0.2s, box-shadow 0.2s",
        height: "100%",
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
          color: team.primary_color || "#1f2937",
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
              color: "#9ca3af",
            }}
          >
            Overall
          </div>
          <div
            style={{
              fontSize: isMobile ? "11px" : "12px",
              fontWeight: "bold",
            }}
          >
            {team.actual_total_wins}-{team.actual_total_losses}
          </div>
        </div>

        <div style={{ textAlign: "center", margin: "0 2px 2px 2px" }}>
          <div
            style={{
              fontSize: isMobile ? "10px" : "11px",
              color: "#9ca3af",
            }}
          >
            Conference
          </div>
          <div
            style={{
              fontSize: isMobile ? "11px" : "12px",
              fontWeight: "bold",
            }}
          >
            {team.actual_conference_wins}-{team.actual_conference_losses}
          </div>
        </div>

        <div style={{ textAlign: "center", margin: "0 2px 2px 2px" }}>
          <div
            style={{
              fontSize: isMobile ? "10px" : "11px",
              color: "#9ca3af",
            }}
          >
            Playoff Bid
          </div>
          <div
            style={{
              fontSize: isMobile ? "11px" : "12px",
              fontWeight: "bold",
            }}
          >
            {formatBidPct(team.playoff_bid_pct)}
          </div>
        </div>
      </div>
    </div>
  );

  if (error) {
    return (
      <ErrorBoundary level="page">
        <PageLayoutWrapper
          title="Football Teams"
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
        title="Football Teams"
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
