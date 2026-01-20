// src/app/basketball/compare/page.tsx
"use client";

import BasketballCompareSchedulesChart from "@/components/features/basketball/BasketballCompareSchedulesChart";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Download } from "@/components/ui/icons";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ============ SPACING DEBUGGER COMPONENT ============
interface SpacingInfo {
  elementName: string;
  height: number;
  marginTop: string;
  marginBottom: string;
  paddingTop: string;
  paddingBottom: string;
  totalHeight: number;
  offsetTop: number;
  offsetHeight: number;
}

function SpacingDebugger() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [debugVisible, setDebugVisible] = useState(false);
  const [spacingData, setSpacingData] = useState<SpacingInfo[]>([]);

  useEffect(() => {
    // Allow toggling debug with Ctrl+Shift+D
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        setDebugVisible((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  useEffect(() => {
    if (!debugVisible || !containerRef.current) return;

    const elements = containerRef.current.querySelectorAll("[data-debug]");
    const spacing: SpacingInfo[] = [];

    elements.forEach((el) => {
      const computed = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const marginTop = parseFloat(computed.marginTop);
      const marginBottom = parseFloat(computed.marginBottom);

      const info: SpacingInfo = {
        elementName: el.getAttribute("data-debug") || "Unknown",
        height: Math.round(rect.height),
        marginTop: computed.marginTop,
        marginBottom: computed.marginBottom,
        paddingTop: computed.paddingTop,
        paddingBottom: computed.paddingBottom,
        totalHeight: Math.round(rect.height + marginTop + marginBottom),
        offsetTop: Math.round(rect.top),
        offsetHeight: Math.round(rect.height),
      };

      spacing.push(info);
    });

    setSpacingData(spacing);

    // Log to console
    console.clear();
    console.log(
      "%c=== BASKETBALL COMPARE PAGE SPACING DEBUG ===",
      "color: #0097b2; font-weight: bold; font-size: 14px",
    );
    console.log(
      "%cPress Ctrl+Shift+D to toggle this debug panel",
      "color: #666; font-size: 12px",
    );
    console.table(spacing);

    console.log(
      "\n%c=== GAP CALCULATIONS ===",
      "color: #0097b2; font-weight: bold",
    );
    for (let i = 0; i < spacing.length - 1; i++) {
      const current = spacing[i];
      const next = spacing[i + 1];
      const gap = next.offsetTop - (current.offsetTop + current.offsetHeight);
      console.log(
        `%cGap between "${current.elementName}" and "${next.elementName}": ${Math.round(gap)}px`,
        gap > 0 ? "color: #ff6b6b" : "color: #51cf66",
      );
    }

    console.log(
      "\n%c=== INDIVIDUAL ELEMENT DETAILS ===",
      "color: #0097b2; font-weight: bold",
    );
    spacing.forEach((s) => {
      console.log(
        `%c${s.elementName}`,
        "color: #0097b2; font-weight: bold; font-size: 12px",
      );
      console.log(
        `  Height: ${s.height}px | MT: ${s.marginTop} | MB: ${s.marginBottom}`,
      );
      console.log(
        `  PT: ${s.paddingTop} | PB: ${s.paddingBottom} | Total: ${s.totalHeight}px`,
      );
    });
  }, [debugVisible]);

  return (
    <div ref={containerRef} className="hidden">
      {debugVisible && (
        <div
          className="fixed bottom-4 right-4 bg-white border-2 border-[rgb(0,151,178)] rounded-lg shadow-2xl p-4 max-w-md max-h-96 overflow-y-auto z-50"
          style={{ backgroundColor: "#f8f9fa" }}
        >
          <div className="flex items-center justify-between mb-3 sticky top-0 bg-white pb-2 border-b">
            <h3 className="font-bold text-[rgb(0,151,178)] text-sm">
              Spacing Debug
            </h3>
            <button
              onClick={() => setDebugVisible(false)}
              className="text-sm text-gray-500 hover:text-red-500 font-bold"
            >
              ×
            </button>
          </div>

          {spacingData.length > 0 ? (
            <div className="space-y-2 text-xs">
              {spacingData.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-gray-200 rounded p-2"
                >
                  <div className="font-semibold text-[rgb(0,151,178)] mb-1">
                    {item.elementName}
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-gray-700">
                    <div>Height: {item.height}px</div>
                    <div>MT: {item.marginTop}</div>
                    <div>MB: {item.marginBottom}</div>
                    <div>PT: {item.paddingTop}</div>
                    <div>PB: {item.paddingBottom}</div>
                    <div className="col-span-2 font-semibold text-[rgb(0,151,178)]">
                      Total: {item.totalHeight}px
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">
              No elements with data-debug attribute found
            </p>
          )}

          <div className="mt-3 pt-3 border-t text-xs text-gray-600">
            <p className="font-semibold mb-1">Instructions:</p>
            <ul className="space-y-1">
              <li>• Press Ctrl+Shift+D to toggle this panel</li>
              <li>• Check browser console for detailed logs</li>
              <li>• Look for gaps between components</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ MAIN PAGE COMPONENT ============

interface Team {
  team_name: string;
  logo_url: string;
  conference: string;
  primary_color?: string;
  secondary_color?: string;
  kenpom_rank?: number;
}

interface BasketballTeamGame {
  date: string;
  opponent: string;
  opponent_logo?: string;
  opponent_primary_color?: string;
  location: string;
  status: string;
  kenpom_win_prob?: number;
  team_conf?: string;
}

interface AllScheduleGame {
  team: string;
  opponent: string;
  opponent_primary_color?: string;
  kenpom_win_prob: number;
  team_conf: string;
  team_conf_catg?: string;
  status: string;
}

interface TeamData {
  team_info: {
    team_name: string;
    logo_url: string;
    conference: string;
    primary_color?: string;
    secondary_color?: string;
    kenpom_rank?: number;
  };
  schedule: BasketballTeamGame[];
  all_schedule_data: AllScheduleGame[];
}

interface SelectedTeam {
  teamName: string;
  teamLogo: string;
  teamColor: string;
  teamConference: string;
  games: {
    date: string;
    opponent: string;
    opponentLogo?: string;
    opponentColor: string;
    winProb: number;
    status: string;
    location: string;
  }[];
  allScheduleData: {
    team: string;
    opponent: string;
    opponentColor: string;
    winProb: number;
    teamConference: string;
    teamConfCategory?: string;
    status: string;
  }[];
}

const MAX_TEAMS = 10;
const PRIORITY_CONFERENCES = [
  "Atlantic Coast",
  "Big 12",
  "Big East",
  "Big Ten",
  "Southeastern",
];

export default function BasketballComparePage() {
  const [availableConferences, setAvailableConferences] = useState<string[]>(
    [],
  );
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<SelectedTeam[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Team[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [highlightedTeam, setHighlightedTeam] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSearchResults(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadTeamData = useCallback(
    async (teamName: string): Promise<TeamData | null> => {
      try {
        const response = await fetch(
          `/api/proxy/team/${encodeURIComponent(teamName)}`,
        );
        return await response.json();
      } catch (error) {
        console.error("Error loading team data:", error);
        return null;
      }
    },
    [],
  );

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const response = await fetch("/api/proxy/basketball_teams");
        const data = await response.json();

        if (data.data) {
          setAllTeams(data.data);
          const conferences = [
            ...new Set(data.data.map((team: Team) => team.conference)),
          ] as string[];

          // Sort conferences: priority first, then alphabetical
          const sorted = conferences.sort((a, b) => {
            const aIndex = PRIORITY_CONFERENCES.indexOf(a);
            const bIndex = PRIORITY_CONFERENCES.indexOf(b);

            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
            if (aIndex !== -1) return -1;
            if (bIndex !== -1) return 1;
            return a.localeCompare(b);
          });

          setAvailableConferences(sorted);
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
      } finally {
        setIsLoadingInitial(false);
      }
    };

    loadInitialData();
  }, []);

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const results = allTeams
        .filter((team) => {
          const matchesName = team.team_name.toLowerCase().includes(query);
          return matchesName;
        })
        .sort((a, b) => {
          const aNameMatch = a.team_name.toLowerCase().indexOf(query);
          const bNameMatch = b.team_name.toLowerCase().indexOf(query);
          if (aNameMatch !== bNameMatch) return aNameMatch - bNameMatch;
          return a.team_name.localeCompare(b.team_name);
        });
      setSearchResults(results);
      setShowSearchResults(true);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
      setHighlightedTeam(null);
    }
  }, [searchQuery, allTeams]);

  const addTeam = async (team: Team) => {
    if (selectedTeams.length >= MAX_TEAMS) return;
    if (selectedTeams.some((t) => t.teamName === team.team_name)) return;

    const teamData = await loadTeamData(team.team_name);
    if (!teamData) return;

    const newTeam: SelectedTeam = {
      teamName: teamData.team_info.team_name,
      teamLogo: teamData.team_info.logo_url,
      teamColor: teamData.team_info.primary_color || "#9ca3af",
      teamConference: teamData.team_info.conference,
      games: teamData.schedule.map((game) => ({
        date: game.date,
        opponent: game.opponent,
        opponentLogo: game.opponent_logo,
        opponentColor: game.opponent_primary_color || "#9ca3af",
        winProb: game.kenpom_win_prob || 0.5,
        status: game.status,
        location: game.location,
      })),
      allScheduleData: teamData.all_schedule_data.map((game) => ({
        team: game.team,
        opponent: game.opponent,
        opponentColor: game.opponent_primary_color || "#9ca3af",
        winProb: game.kenpom_win_prob,
        teamConference: game.team_conf,
        teamConfCategory: game.team_conf_catg,
        status: game.status,
      })),
    };

    setSelectedTeams((prev) => [...prev, newTeam]);
    setHighlightedTeam(team.team_name);
    setTimeout(() => setHighlightedTeam(null), 2000);
  };

  const removeTeam = (teamName: string) => {
    setSelectedTeams((prev) => prev.filter((t) => t.teamName !== teamName));
  };

  const clearAllTeams = () => {
    setSelectedTeams([]);
  };

  const downloadChart = async () => {
    const chartElement = document.getElementById("basketball-compare-chart");
    if (!chartElement) return;

    try {
      // Load html2canvas from CDN if not already loaded
      if (!window.html2canvas) {
        const script = document.createElement("script");
        script.src = "https://html2canvas.hertzen.com/dist/html2canvas.min.js";
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      if (!window.html2canvas) {
        throw new Error("Failed to load html2canvas");
      }

      // Helper function to convert image URL to base64
      const imageToBase64 = async (url: string): Promise<string> => {
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          console.warn(`Failed to load image: ${url}`, error);
          return url; // Fallback to original URL
        }
      };

      // Calculate width based on number of teams
      // Base margins: 100px left + 100px right, Column width: 130px per team
      const TEAM_COLUMN_WIDTH = 130;
      const MARGIN_LEFT = 100;
      const MARGIN_RIGHT = 100;
      const chartWidth =
        MARGIN_LEFT + selectedTeams.length * TEAM_COLUMN_WIDTH + MARGIN_RIGHT;
      const WRAPPER_PADDING = 20;
      const totalWidth = chartWidth + WRAPPER_PADDING * 2;

      // Clone the chart element WITHOUT adding to DOM yet
      const chartClone = chartElement.cloneNode(true) as HTMLElement;

      // Create wrapper with calculated width
      const wrapper = document.createElement("div");
      wrapper.style.cssText = `
        position: fixed;
        left: -9999px;
        top: 0;
        background: white;
        padding: ${WRAPPER_PADDING}px;
        width: ${totalWidth}px;
      `;

      // Add header
      const header = document.createElement("div");
      header.style.cssText = `
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 1px solid #e5e7eb;
      `;

      const logo = document.createElement("img");
      logo.src = "/images/JThom_Logo.png";
      logo.style.cssText = `height: 50px; width: auto;`;

      const title = document.createElement("div");
      title.textContent = "Schedule Comparison";
      title.style.cssText = `
        flex: 1;
        text-align: center;
        font-size: 18px;
        font-weight: 500;
        color: #1f2937;
      `;

      const date = document.createElement("div");
      date.textContent = new Date().toLocaleDateString();
      date.style.cssText = `font-size: 12px; color: #6b7280; white-space: nowrap;`;

      header.appendChild(logo);
      header.appendChild(title);
      header.appendChild(date);
      wrapper.appendChild(header);
      wrapper.appendChild(chartClone);

      // NOW add to DOM only for html2canvas rendering
      document.body.appendChild(wrapper);

      // Wait for initial render
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Find all img tags and convert to base64
      const images = wrapper.querySelectorAll("img");
      const imagePromises: Promise<void>[] = [];

      images.forEach((img) => {
        imagePromises.push(
          (async () => {
            try {
              const base64 = await imageToBase64(img.src);
              img.src = base64;
            } catch (error) {
              console.warn(`Failed to convert image to base64:`, error);
            }
          })(),
        );
      });

      await Promise.all(imagePromises);

      // Wait for images to load
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Render with html2canvas
      const canvas = await (
        window.html2canvas as (
          element: HTMLElement,
          options: object,
        ) => Promise<HTMLCanvasElement>
      )(wrapper, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        fontTimeout: 3000,
      });

      // Remove from DOM IMMEDIATELY after rendering - before any styles affect live page
      document.body.removeChild(wrapper);

      // Download
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `basketball-compare-${new Date().toISOString().split("T")[0]}.png`;
      link.click();
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download chart. Please try again.");
    }
  };

  const selectedTeamNames = new Set(selectedTeams.map((t) => t.teamName));

  // Organize teams by conference in priority order
  const conferenceGroups = useMemo(() => {
    const groups: Record<string, Team[]> = {};

    availableConferences.forEach((conf) => {
      groups[conf] = allTeams.filter((team) => team.conference === conf);
    });

    return groups;
  }, [availableConferences, allTeams]);

  if (isLoadingInitial) {
    return (
      <PageLayoutWrapper title="Compare Schedules" isLoading={true}>
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      </PageLayoutWrapper>
    );
  }

  return (
    <PageLayoutWrapper title="Compare Schedules" isLoading={false}>
      <ErrorBoundary level="page">
        <SpacingDebugger />
        <div className="space-y-0 px-4 pt-0 pb-0 -mt-10">
          {/* Scrollable Conference Cards with Team Logos */}
          <div
            className="bg-white rounded-lg border border-gray-200 p-3 overflow-hidden"
            data-debug="Conference Cards Section"
          >
            <div ref={scrollContainerRef} className="overflow-x-auto pb-1">
              <div className="flex gap-3">
                {availableConferences.map((conference, index) => {
                  // Sort teams alphabetically within each conference
                  const sortedTeams = [...conferenceGroups[conference]].sort(
                    (a, b) => a.team_name.localeCompare(b.team_name),
                  );

                  return (
                    <div
                      key={conference}
                      className="flex-shrink-0 flex items-start gap-3"
                    >
                      {index > 0 && (
                        <div className="w-px bg-gray-300 flex-shrink-0 self-stretch"></div>
                      )}
                      <div>
                        <h3 className="text-xs text-gray-700 mb-2 px-1 font-normal border-b border-gray-200 pb-2 text-center min-w-20">
                          {conference}
                        </h3>
                        <div
                          className="grid gap-1"
                          style={{
                            gridTemplateRows: "repeat(6, minmax(0, 1fr))",
                            gridAutoFlow: "column",
                          }}
                        >
                          {sortedTeams.map((team) => {
                            const isSelected = selectedTeamNames.has(
                              team.team_name,
                            );
                            const isDisabled =
                              !isSelected && selectedTeams.length >= MAX_TEAMS;
                            const isHighlighted =
                              highlightedTeam === team.team_name;

                            return (
                              <button
                                key={team.team_name}
                                onClick={() => {
                                  if (isSelected) {
                                    removeTeam(team.team_name);
                                  } else {
                                    addTeam(team);
                                  }
                                }}
                                disabled={isDisabled}
                                title={team.team_name}
                                className={`relative w-10 h-10 rounded border-2 transition-all flex-shrink-0 overflow-hidden ${
                                  isSelected
                                    ? "border-[rgb(0,151,178)] shadow-lg ring-2 ring-[rgb(0,151,178)] ring-offset-1"
                                    : isHighlighted
                                      ? "border-[rgb(0,151,178)] shadow-lg scale-110"
                                      : isDisabled
                                        ? "bg-gray-100 border-gray-200 cursor-not-allowed opacity-50"
                                        : "bg-white border-gray-200 hover:border-[rgb(0,151,178)] hover:shadow-md"
                                }`}
                              >
                                <Image
                                  src={team.logo_url}
                                  alt={team.team_name}
                                  fill
                                  className="object-contain p-1"
                                  unoptimized
                                />
                                {isSelected && (
                                  <div className="absolute top-0 right-0 w-3 h-3 bg-[rgb(0,151,178)] rounded-full flex items-center justify-center">
                                    <div className="text-white text-[8px] font-bold">
                                      ✓
                                    </div>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div
            className="relative w-72 mb-0"
            ref={searchRef}
            data-debug="Search Bar Container"
          >
            <input
              type="text"
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(0,151,178)] m-0"
            />

            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-40 max-h-96 overflow-y-auto [&>button]:border-0">
                {searchResults.map((team) => {
                  const isSelected = selectedTeamNames.has(team.team_name);
                  const isDisabled =
                    !isSelected && selectedTeams.length >= MAX_TEAMS;

                  return (
                    <button
                      key={team.team_name}
                      onClick={() => {
                        addTeam(team);
                        setSearchQuery("");
                      }}
                      disabled={isDisabled}
                      className={`w-full flex items-center gap-3 px-3 py-2 transition-colors text-sm outline-none focus:outline-none border-0 ${
                        isSelected
                          ? "bg-[rgb(0,151,178)] text-white"
                          : isDisabled
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <div className="relative w-6 h-6 flex-shrink-0">
                        <Image
                          src={team.logo_url}
                          alt={team.team_name}
                          fill
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium">
                          {team.team_name}
                        </div>
                      </div>
                      {isSelected && <span className="text-lg">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {showSearchResults && searchResults.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-center text-xs text-gray-500 z-40">
                No teams found
              </div>
            )}
          </div>

          {/* Selected Teams Summary */}
          {selectedTeams.length > 0 && (
            <div
              className="bg-white rounded-lg border border-gray-200 p-3 -mt-10"
              data-debug="Selected Teams Section"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold">
                  Selected Teams ({selectedTeams.length}/{MAX_TEAMS})
                </h2>
                <button
                  onClick={clearAllTeams}
                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedTeams.map((team) => (
                  <div
                    key={team.teamName}
                    className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded border border-gray-300 text-xs"
                  >
                    <div className="relative w-4 h-4">
                      <Image
                        src={team.teamLogo}
                        alt={team.teamName}
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                    <span className="text-gray-700">{team.teamName}</span>
                    <button
                      onClick={() => removeTeam(team.teamName)}
                      className="ml-1 text-gray-500 hover:text-red-600 font-bold"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comparison Chart */}
          {selectedTeams.length > 0 && (
            <>
              <div
                id="basketball-compare-chart"
                className="-mt-6"
                data-debug="Chart Container"
              >
                <BasketballCompareSchedulesChart teams={selectedTeams} />
              </div>

              <div
                className="flex justify-end gap-3"
                data-debug="Download Button Section"
              >
                <button
                  onClick={downloadChart}
                  className="px-3 py-2 text-xs bg-gray-700 text-white rounded-md hover:bg-gray-800 flex items-center gap-2 transition-colors border border-gray-700"
                >
                  <Download className="w-4 h-4" />
                  Download Chart
                </button>
              </div>
            </>
          )}

          {selectedTeams.length === 0 && (
            <div
              className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-sm"
              data-debug="Empty State Section"
            >
              <p className="text-gray-500">
                Select teams above or use search to compare their schedules
              </p>
            </div>
          )}
        </div>
      </ErrorBoundary>
    </PageLayoutWrapper>
  );
}
