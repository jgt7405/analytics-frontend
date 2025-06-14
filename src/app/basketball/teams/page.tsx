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
  team_id: string;
  team_name: string;
  logo_url: string;
  conference: string;
  primary_color?: string;
  secondary_color?: string;
  actual_total_wins?: number;
  actual_total_losses?: number;
  record?: string;
  tournament_bid_pct?: number;
}

export default function TeamsPage() {
  const { startMeasurement, trackEvent } = useMonitoring();
  const { preferences, updatePreference } = useUserPreferences();
  const { isMobile } = useResponsive();
  const router = useRouter();
  const [selectedConference, setSelectedConference] = useState(
    preferences.defaultConference
  );
  const [availableConferences, setAvailableConferences] = useState<string[]>([
    preferences.defaultConference,
  ]);
  const [teamsData, setTeamsData] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startMeasurement("teams-page-load");
    trackEvent({
      name: "page_view",
      properties: { page: "teams", conference: selectedConference },
    });
  }, [selectedConference, startMeasurement, trackEvent]);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedConference) return;

      try {
        setLoading(true);
        const baseUrl =
          process.env.NEXT_PUBLIC_API_URL ||
          "https://analytics-backend-production.up.railway.app/api";

        const standingsResponse = await fetch(
          `${baseUrl}/standings/${selectedConference.replace(" ", "_")}`
        );
        if (!standingsResponse.ok) throw new Error("Failed to load teams data");
        const standingsData = await standingsResponse.json();

        const processedTeams = standingsData.data.map((team: any) => ({
          team_id: team.team_name,
          team_name: team.team_name,
          logo_url: team.logo_url,
          conference: team.conference,
          primary_color: team.primary_color,
          secondary_color: team.secondary_color,
          actual_total_wins: team.actual_total_wins || 0,
          actual_total_losses: team.actual_total_losses || 0,
          record: team.record || team.conference_record || "0-0",
          tournament_bid_pct: team.tournament_bid_pct || 0,
        }));

        const sortedTeams = processedTeams.sort((a: Team, b: Team) =>
          a.team_name.localeCompare(b.team_name)
        );

        setTeamsData(sortedTeams);
        setAvailableConferences(standingsData.conferences);
        setError(null);
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
    updatePreference("defaultConference", conference);
  };

  const handleTeamClick = (teamName: string) => {
    router.push(`/basketball/team/${encodeURIComponent(teamName)}`);
  };

  const formatBidPct = (value?: number) => {
    if (value === null || value === undefined) return "-";
    if (value > 0 && value <= 1) {
      return `${Math.round(value * 100)}%`;
    }
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
          color: team.primary_color || "#1f2937", // Use primary color with fallback
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
            {team.record}
          </div>
        </div>

        <div style={{ textAlign: "center", margin: "0 2px 2px 2px" }}>
          <div
            style={{
              fontSize: isMobile ? "10px" : "11px",
              color: "#9ca3af",
            }}
          >
            NCAA Bid
          </div>
          <div
            style={{
              fontSize: isMobile ? "11px" : "12px",
              fontWeight: "bold",
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
          title="Teams Directory"
          conferenceSelector={
            <ConferenceSelector
              conferences={availableConferences}
              selectedConference={selectedConference}
              onChange={handleConferenceChange}
              error={error}
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
        title="Teams Directory"
        conferenceSelector={
          <ConferenceSelector
            conferences={availableConferences}
            selectedConference={selectedConference}
            onChange={handleConferenceChange}
            loading={loading}
          />
        }
        isLoading={loading}
      >
        <div className="-mt-2 md:-mt-6">
          {loading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <LoadingSpinner size="lg" message="Loading teams..." />
            </div>
          ) : (
            <ErrorBoundary level="component">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "repeat(2, 1fr)" // Changed to exactly 2 columns on mobile
                    : "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: isMobile ? "12px" : "16px", // Reduced gap on mobile
                  padding: "10px 0",
                }}
              >
                {teamsData.map((team) => (
                  <TeamCard key={team.team_id} team={team} />
                ))}
              </div>
            </ErrorBoundary>
          )}
        </div>
      </PageLayoutWrapper>
    </ErrorBoundary>
  );
}
