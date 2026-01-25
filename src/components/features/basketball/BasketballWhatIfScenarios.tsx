"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

import { useBasketballConfData } from "@/hooks/useBasketballConfData";
import {
  useBasketballWhatIf,
  type WhatIfGame,
  type WhatIfResponse,
  type WhatIfTeamResult,
} from "@/hooks/useBasketballWhatIf";
import { useResponsive } from "@/hooks/useResponsive";
import { getCellColor } from "@/lib/color-utils";
import tableStyles from "@/styles/components/tables.module.css";
import { useCallback, useEffect, useMemo, useState } from "react";

const TEAL_COLOR = "rgb(0, 151, 178)";

// ========================================
// COMPONENT
// ========================================

type SortColumn = "team" | "before" | "after" | "change" | null;
type SortDirection = "asc" | "desc";

export default function BasketballWhatIfScenarios() {
  const { isMobile } = useResponsive();
  const [selectedConference, setSelectedConference] = useState<string | null>(
    null,
  );
  const [gameSelections, setGameSelections] = useState<Map<number, number>>(
    new Map(),
  );
  const [whatIfData, setWhatIfData] = useState<WhatIfResponse | null>(null);
  const [hasCalculated, setHasCalculated] = useState(false);
  const [sortColumnWithTies, setSortColumnWithTies] =
    useState<SortColumn>(null);
  const [sortDirectionWithTies, setSortDirectionWithTies] =
    useState<SortDirection>("desc");
  const [sortColumnNoTies, setSortColumnNoTies] = useState<SortColumn>(null);
  const [sortDirectionNoTies, setSortDirectionNoTies] =
    useState<SortDirection>("desc");
  const [sortColumnTop4, setSortColumnTop4] = useState<SortColumn>(null);
  const [sortDirectionTop4, setSortDirectionTop4] =
    useState<SortDirection>("desc");
  const [sortColumnTop8, setSortColumnTop8] = useState<SortColumn>(null);
  const [sortDirectionTop8, setSortDirectionTop8] =
    useState<SortDirection>("desc");
  const {
    data: confData,
    isLoading: conferencesLoading,
    error: conferencesError,
  } = useBasketballConfData();

  // Extract conferences from the unified conference data (all 31)
  const conferences = useMemo(() => {
    if (!confData?.conferenceData?.data) return [];
    return confData.conferenceData.data
      .map((conf: { conference_name: string }) => conf.conference_name)
      .sort();
  }, [confData]);

  // Initialize default conference and fetch data
  useEffect(() => {
    if (conferences.length > 0 && !selectedConference) {
      setSelectedConference("Big 12");
    }
  }, [conferences, selectedConference]);

  const { mutate: fetchWhatIf, isPending: isCalculating } =
    useBasketballWhatIf();

  const handleFetchWhatIf = useCallback(
    (
      conference: string,
      selections: Array<{ game_id: number; winner_team_id: number }>,
    ) => {
      fetchWhatIf(
        { conference, selections },
        {
          onSuccess: (data: WhatIfResponse) => {
            setWhatIfData(data);
            if (selections.length > 0) {
              setHasCalculated(true);
            }
          },
          onError: (err: Error) => {
            console.error("WhatIf calculation failed", err.message);
          },
        },
      );
    },
    [fetchWhatIf],
  );

  // Fetch data when conference is set
  useEffect(() => {
    if (selectedConference) {
      handleFetchWhatIf(selectedConference, []);
    }
  }, [selectedConference, handleFetchWhatIf]);

  const handleCalculate = useCallback(() => {
    if (!selectedConference) return;

    const selectionsArray = Array.from(gameSelections.entries()).map(
      ([gId, wId]) => ({
        game_id: gId,
        winner_team_id: wId,
      }),
    );

    fetchWhatIf(
      { conference: selectedConference, selections: selectionsArray },
      {
        onSuccess: (data: WhatIfResponse) => {
          setWhatIfData(data);
          setHasCalculated(true);
        },
        onError: (err: Error) => {
          console.error("WhatIf calculation failed", err.message);
        },
      },
    );
  }, [selectedConference, gameSelections, fetchWhatIf]);

  const handleGameSelection = (gameId: number, winnerId: number) => {
    const newSelections = new Map(gameSelections);
    if (newSelections.get(gameId) === winnerId) {
      newSelections.delete(gameId);
    } else {
      newSelections.set(gameId, winnerId);
    }
    setGameSelections(newSelections);
    setHasCalculated(false);
  };

  const handleConferenceChange = (newConference: string) => {
    setSelectedConference(newConference);
    setGameSelections(new Map());
    setWhatIfData(null);
    setHasCalculated(false);
    handleFetchWhatIf(newConference, []);
  };

  const handleReset = () => {
    setGameSelections(new Map());
    setHasCalculated(false);
    if (selectedConference) {
      handleFetchWhatIf(selectedConference, []);
    }
  };

  // Get selected games for display
  const selectedGamesSummary = useMemo(() => {
    if (!whatIfData?.games || gameSelections.size === 0) return [];

    const result: Array<{
      game: WhatIfGame;
      leftTeam: string;
      leftLogo?: string;
      rightTeam: string;
      rightLogo?: string;
      leftIsWinner: boolean;
      rightIsWinner: boolean;
    }> = [];

    gameSelections.forEach((winnerId, gameId) => {
      const game = whatIfData.games.find((g) => g.game_id === gameId);
      if (game) {
        result.push({
          game,
          leftTeam: game.away_team,
          leftLogo: game.away_logo_url,
          rightTeam: game.home_team,
          rightLogo: game.home_logo_url,
          leftIsWinner: winnerId === game.away_team_id,
          rightIsWinner: winnerId === game.home_team_id,
        });
      }
    });

    return result.sort((a, b) => a.game.date.localeCompare(b.game.date));
  }, [whatIfData?.games, gameSelections]);

  // Create comparison data - WITH TIES
  const comparisonDataWithTies = useMemo(() => {
    if (
      !whatIfData?.data_with_ties ||
      !whatIfData?.current_projections_with_ties
    ) {
      return [];
    }

    return whatIfData.data_with_ties
      .map((team: WhatIfTeamResult) => {
        const currentTeam = whatIfData.current_projections_with_ties.find(
          (t: WhatIfTeamResult) => t.team_id === team.team_id,
        );

        const beforeFirstPlace = currentTeam?.standing_1_prob ?? 0;
        const afterFirstPlace = team.standing_1_prob ?? 0;
        const change = afterFirstPlace - beforeFirstPlace;

        return {
          team_id: team.team_id,
          team_name: team.team_name,
          logo_url: team.logo_url,
          before_first_place: beforeFirstPlace,
          after_first_place: afterFirstPlace,
          change: change,
          isZero: beforeFirstPlace === 0 && afterFirstPlace === 0,
        };
      })
      .sort(
        (a: { after_first_place: number }, b: { after_first_place: number }) =>
          b.after_first_place - a.after_first_place,
      );
  }, [whatIfData]);

  // Create comparison data - NO TIES
  const comparisonDataNoTies = useMemo(() => {
    if (!whatIfData?.data_no_ties || !whatIfData?.current_projections_no_ties) {
      return [];
    }

    return whatIfData.data_no_ties
      .map((team: WhatIfTeamResult) => {
        const currentTeam = whatIfData.current_projections_no_ties.find(
          (t: WhatIfTeamResult) => t.team_id === team.team_id,
        );

        const beforeFirstPlace = currentTeam?.standing_1_prob ?? 0;
        const afterFirstPlace = team.standing_1_prob ?? 0;
        const change = afterFirstPlace - beforeFirstPlace;

        return {
          team_id: team.team_id,
          team_name: team.team_name,
          logo_url: team.logo_url,
          before_first_place: beforeFirstPlace,
          after_first_place: afterFirstPlace,
          change: change,
          isZero: beforeFirstPlace === 0 && afterFirstPlace === 0,
        };
      })
      .sort(
        (
          a: { after_first_place: number; team_name: string },
          b: { after_first_place: number; team_name: string },
        ) => {
          if (b.after_first_place !== a.after_first_place) {
            return b.after_first_place - a.after_first_place;
          }
          return a.team_name.localeCompare(b.team_name);
        },
      );
  }, [whatIfData]);

  // Create comparison data - TOP 4 SEED (No Ties)
  const comparisonDataTop4 = useMemo(() => {
    if (!whatIfData?.data_no_ties || !whatIfData?.current_projections_no_ties) {
      return [];
    }

    return whatIfData.data_no_ties
      .map((team: WhatIfTeamResult) => {
        const currentTeam = whatIfData.current_projections_no_ties.find(
          (t: WhatIfTeamResult) => t.team_id === team.team_id,
        );

        // Sum seeds 1-4: standing_1_prob + standing_2_prob + standing_3_prob + standing_4_prob
        const beforeTop4 =
          (currentTeam?.standing_1_prob ?? 0) +
          (currentTeam?.standing_2_prob ?? 0) +
          (currentTeam?.standing_3_prob ?? 0) +
          (currentTeam?.standing_4_prob ?? 0);
        const afterTop4 =
          (team.standing_1_prob ?? 0) +
          (team.standing_2_prob ?? 0) +
          (team.standing_3_prob ?? 0) +
          (team.standing_4_prob ?? 0);
        const change = afterTop4 - beforeTop4;

        return {
          team_id: team.team_id,
          team_name: team.team_name,
          logo_url: team.logo_url,
          before_first_place: beforeTop4,
          after_first_place: afterTop4,
          change: change,
          isZero: beforeTop4 === 0 && afterTop4 === 0,
        };
      })
      .sort(
        (
          a: { after_first_place: number; team_name: string },
          b: { after_first_place: number; team_name: string },
        ) => {
          if (b.after_first_place !== a.after_first_place) {
            return b.after_first_place - a.after_first_place;
          }
          return a.team_name.localeCompare(b.team_name);
        },
      );
  }, [whatIfData]);

  // Create comparison data - TOP 8 SEED (No Ties)
  const comparisonDataTop8 = useMemo(() => {
    if (!whatIfData?.data_no_ties || !whatIfData?.current_projections_no_ties) {
      return [];
    }

    return whatIfData.data_no_ties
      .map((team: WhatIfTeamResult) => {
        const currentTeam = whatIfData.current_projections_no_ties.find(
          (t: WhatIfTeamResult) => t.team_id === team.team_id,
        );

        // Sum seeds 1-8
        const beforeTop8 =
          (currentTeam?.standing_1_prob ?? 0) +
          (currentTeam?.standing_2_prob ?? 0) +
          (currentTeam?.standing_3_prob ?? 0) +
          (currentTeam?.standing_4_prob ?? 0) +
          (currentTeam?.standing_5_prob ?? 0) +
          (currentTeam?.standing_6_prob ?? 0) +
          (currentTeam?.standing_7_prob ?? 0) +
          (currentTeam?.standing_8_prob ?? 0);
        const afterTop8 =
          (team.standing_1_prob ?? 0) +
          (team.standing_2_prob ?? 0) +
          (team.standing_3_prob ?? 0) +
          (team.standing_4_prob ?? 0) +
          (team.standing_5_prob ?? 0) +
          (team.standing_6_prob ?? 0) +
          (team.standing_7_prob ?? 0) +
          (team.standing_8_prob ?? 0);
        const change = afterTop8 - beforeTop8;

        return {
          team_id: team.team_id,
          team_name: team.team_name,
          logo_url: team.logo_url,
          before_first_place: beforeTop8,
          after_first_place: afterTop8,
          change: change,
          isZero: beforeTop8 === 0 && afterTop8 === 0,
        };
      })
      .sort(
        (
          a: { after_first_place: number; team_name: string },
          b: { after_first_place: number; team_name: string },
        ) => {
          if (b.after_first_place !== a.after_first_place) {
            return b.after_first_place - a.after_first_place;
          }
          return a.team_name.localeCompare(b.team_name);
        },
      );
  }, [whatIfData]);

  // Sorted data WITH TIES
  const sortedTeamsWithTies = useMemo(() => {
    const zeroTeams = comparisonDataWithTies.filter((t) => t.isZero);
    const nonZeroTeams = comparisonDataWithTies.filter((t) => !t.isZero);

    if (sortColumnWithTies) {
      nonZeroTeams.sort((a, b) => {
        let compareValue = 0;
        switch (sortColumnWithTies) {
          case "team":
            compareValue = a.team_name.localeCompare(b.team_name);
            break;
          case "before":
            compareValue = a.before_first_place - b.before_first_place;
            break;
          case "after":
            compareValue = a.after_first_place - b.after_first_place;
            break;
          case "change":
            compareValue = a.change - b.change;
            break;
        }
        return sortDirectionWithTies === "asc" ? compareValue : -compareValue;
      });
      zeroTeams.sort((a, b) => a.team_name.localeCompare(b.team_name));
      return [...nonZeroTeams, ...zeroTeams];
    }

    if (hasCalculated) {
      nonZeroTeams.sort((a, b) => {
        if (b.after_first_place !== a.after_first_place) {
          return b.after_first_place - a.after_first_place;
        }
        return a.team_name.localeCompare(b.team_name);
      });
      zeroTeams.sort((a, b) => a.team_name.localeCompare(b.team_name));
      return [...nonZeroTeams, ...zeroTeams];
    }

    nonZeroTeams.sort((a, b) => {
      if (b.after_first_place !== a.after_first_place) {
        return b.after_first_place - a.after_first_place;
      }
      return a.team_name.localeCompare(b.team_name);
    });
    zeroTeams.sort((a, b) => a.team_name.localeCompare(b.team_name));
    return [...nonZeroTeams, ...zeroTeams];
  }, [
    comparisonDataWithTies,
    sortColumnWithTies,
    sortDirectionWithTies,
    hasCalculated,
  ]);

  // Sorted data NO TIES
  const sortedTeamsNoTies = useMemo(() => {
    const zeroTeams = comparisonDataNoTies.filter((t) => t.isZero);
    const nonZeroTeams = comparisonDataNoTies.filter((t) => !t.isZero);

    if (sortColumnNoTies) {
      nonZeroTeams.sort((a, b) => {
        let compareValue = 0;
        switch (sortColumnNoTies) {
          case "team":
            compareValue = a.team_name.localeCompare(b.team_name);
            break;
          case "before":
            compareValue = a.before_first_place - b.before_first_place;
            break;
          case "after":
            compareValue = a.after_first_place - b.after_first_place;
            break;
          case "change":
            compareValue = a.change - b.change;
            break;
        }
        return sortDirectionNoTies === "asc" ? compareValue : -compareValue;
      });
      zeroTeams.sort((a, b) => a.team_name.localeCompare(b.team_name));
      return [...nonZeroTeams, ...zeroTeams];
    }

    if (hasCalculated) {
      nonZeroTeams.sort((a, b) => {
        if (b.after_first_place !== a.after_first_place) {
          return b.after_first_place - a.after_first_place;
        }
        return a.team_name.localeCompare(b.team_name);
      });
      zeroTeams.sort((a, b) => a.team_name.localeCompare(b.team_name));
      return [...nonZeroTeams, ...zeroTeams];
    }

    nonZeroTeams.sort((a, b) => {
      if (b.after_first_place !== a.after_first_place) {
        return b.after_first_place - a.after_first_place;
      }
      return a.team_name.localeCompare(b.team_name);
    });
    zeroTeams.sort((a, b) => a.team_name.localeCompare(b.team_name));
    return [...nonZeroTeams, ...zeroTeams];
  }, [
    comparisonDataNoTies,
    sortColumnNoTies,
    sortDirectionNoTies,
    hasCalculated,
  ]);

  // Sorted data TOP 4
  const sortedTeamsTop4 = useMemo(() => {
    const zeroTeams = comparisonDataTop4.filter((t) => t.isZero);
    const nonZeroTeams = comparisonDataTop4.filter((t) => !t.isZero);

    if (sortColumnTop4) {
      nonZeroTeams.sort((a, b) => {
        let compareValue = 0;
        switch (sortColumnTop4) {
          case "team":
            compareValue = a.team_name.localeCompare(b.team_name);
            break;
          case "before":
            compareValue = a.before_first_place - b.before_first_place;
            break;
          case "after":
            compareValue = a.after_first_place - b.after_first_place;
            break;
          case "change":
            compareValue = a.change - b.change;
            break;
        }
        return sortDirectionTop4 === "asc" ? compareValue : -compareValue;
      });
      zeroTeams.sort((a, b) => a.team_name.localeCompare(b.team_name));
      return [...nonZeroTeams, ...zeroTeams];
    }

    if (hasCalculated) {
      nonZeroTeams.sort((a, b) => {
        if (b.after_first_place !== a.after_first_place) {
          return b.after_first_place - a.after_first_place;
        }
        return a.team_name.localeCompare(b.team_name);
      });
      zeroTeams.sort((a, b) => a.team_name.localeCompare(b.team_name));
      return [...nonZeroTeams, ...zeroTeams];
    }

    nonZeroTeams.sort((a, b) => {
      if (b.after_first_place !== a.after_first_place) {
        return b.after_first_place - a.after_first_place;
      }
      return a.team_name.localeCompare(b.team_name);
    });
    zeroTeams.sort((a, b) => a.team_name.localeCompare(b.team_name));
    return [...nonZeroTeams, ...zeroTeams];
  }, [comparisonDataTop4, sortColumnTop4, sortDirectionTop4, hasCalculated]);

  // Sorted data TOP 8
  const sortedTeamsTop8 = useMemo(() => {
    const zeroTeams = comparisonDataTop8.filter((t) => t.isZero);
    const nonZeroTeams = comparisonDataTop8.filter((t) => !t.isZero);

    if (sortColumnTop8) {
      nonZeroTeams.sort((a, b) => {
        let compareValue = 0;
        switch (sortColumnTop8) {
          case "team":
            compareValue = a.team_name.localeCompare(b.team_name);
            break;
          case "before":
            compareValue = a.before_first_place - b.before_first_place;
            break;
          case "after":
            compareValue = a.after_first_place - b.after_first_place;
            break;
          case "change":
            compareValue = a.change - b.change;
            break;
        }
        return sortDirectionTop8 === "asc" ? compareValue : -compareValue;
      });
      zeroTeams.sort((a, b) => a.team_name.localeCompare(b.team_name));
      return [...nonZeroTeams, ...zeroTeams];
    }

    if (hasCalculated) {
      nonZeroTeams.sort((a, b) => {
        if (b.after_first_place !== a.after_first_place) {
          return b.after_first_place - a.after_first_place;
        }
        return a.team_name.localeCompare(b.team_name);
      });
      zeroTeams.sort((a, b) => a.team_name.localeCompare(b.team_name));
      return [...nonZeroTeams, ...zeroTeams];
    }

    nonZeroTeams.sort((a, b) => {
      if (b.after_first_place !== a.after_first_place) {
        return b.after_first_place - a.after_first_place;
      }
      return a.team_name.localeCompare(b.team_name);
    });
    zeroTeams.sort((a, b) => a.team_name.localeCompare(b.team_name));
    return [...nonZeroTeams, ...zeroTeams];
  }, [comparisonDataTop8, sortColumnTop8, sortDirectionTop8, hasCalculated]);

  // Handle download of detailed scenario data
  const handleDownloadScenarios = useCallback(() => {
    if (!whatIfData) return;

    let csv = "BASKETBALL WHAT-IF SCENARIO ANALYSIS - DETAILED BREAKDOWN\n";
    csv += `Conference: ${selectedConference}\n`;
    csv += `Date Generated: ${new Date().toLocaleString()}\n`;
    csv += `Number of Simulations: 1000\n\n`;

    // Section 1: Game Information (summary of user selections)
    csv += "=== SECTION 1: GAME INFORMATION & USER SELECTIONS ===\n";
    csv +=
      "Game ID,Date,Away Team,Home Team,Away Probability,Home Probability,Original Winner,User Selection,Winner For Scenarios\n";

    (whatIfData.games || []).forEach((game: WhatIfGame) => {
      const userSelection = gameSelections.get(game.game_id);
      const originalWinner =
        game.away_probability &&
        game.away_probability > (game.home_probability || 0)
          ? game.away_team
          : game.home_team;

      const newWinner = userSelection
        ? userSelection === game.away_team_id
          ? game.away_team
          : game.home_team
        : originalWinner;

      const awayProb = (game.away_probability || 0) * 100;
      const homeProb = (game.home_probability || 0) * 100;
      const userSelectionName = userSelection
        ? userSelection === game.away_team_id
          ? game.away_team
          : game.home_team
        : "None (Use original probabilities)";

      csv += `${game.game_id},"${game.date}","${game.away_team}","${game.home_team}",${awayProb.toFixed(1)}%,${homeProb.toFixed(1)}%,"${originalWinner}","${userSelectionName}","${newWinner}"\n`;
    });

    // Create blob and download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `basketball-whatif-${selectedConference}-detailed-${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [whatIfData, gameSelections, selectedConference]);
  const rankColWidth = isMobile ? 30 : 45;
  const teamColWidth = isMobile ? 40 : 180;
  const probColWidth = isMobile ? 60 : 100;
  const cellHeight = isMobile ? 32 : 36;
  const headerHeight = isMobile ? 48 : 56;

  // Get change cell color (matching Football What-If)
  const getChangeCellColor = (change: number) => {
    if (change === 0) return { backgroundColor: "white", color: "black" };

    const blue = [24, 98, 123];
    const white = [255, 255, 255];
    const yellow = [255, 230, 113];

    const allChanges = [
      ...sortedTeamsWithTies.map((t) => t.change),
      ...sortedTeamsNoTies.map((t) => t.change),
    ];
    const maxChange = Math.max(...allChanges, 1);
    const minChange = Math.min(...allChanges, -1);

    let r: number, g: number, b: number;

    if (change > 0) {
      const ratio = Math.min(Math.abs(change / maxChange), 1);
      r = Math.round(white[0] + (blue[0] - white[0]) * ratio);
      g = Math.round(white[1] + (blue[1] - white[1]) * ratio);
      b = Math.round(white[2] + (blue[2] - white[2]) * ratio);
    } else if (change < 0) {
      const ratio = Math.min(Math.abs(change / minChange), 1);
      r = Math.round(white[0] + (yellow[0] - white[0]) * ratio);
      g = Math.round(white[1] + (yellow[1] - white[1]) * ratio);
      b = Math.round(white[2] + (yellow[2] - white[2]) * ratio);
    } else {
      [r, g, b] = white;
    }

    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    const textColor = brightness > 140 ? "#000000" : "#ffffff";

    return {
      backgroundColor: `rgb(${r}, ${g}, ${b})`,
      color: textColor,
    };
  };

  if (conferencesLoading || !selectedConference) {
    return (
      <PageLayoutWrapper title="What If Calculator" isLoading={true}>
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      </PageLayoutWrapper>
    );
  }

  if (conferencesError) {
    return (
      <PageLayoutWrapper title="What If Calculator" isLoading={false}>
        <ErrorMessage
          message={`Failed to load conferences: ${(conferencesError as Error).message}`}
        />
      </PageLayoutWrapper>
    );
  }

  // Group games by date
  const gamesByDate = (whatIfData?.games || []).reduce(
    (acc, game) => {
      const date = game.date || "Unknown Date";
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(game);
      return acc;
    },
    {} as Record<string, WhatIfGame[]>,
  );

  const sortedDates = Object.keys(gamesByDate).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime(),
  );

  return (
    <PageLayoutWrapper title="What If Calculator" isLoading={false}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 -mt-2">
        {/* LEFT PANEL */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4">
            {/* Conference Selector - Next to label */}
            <div className="mb-4 flex items-center gap-2">
              <label className="text-sm font-normal text-gray-700 whitespace-nowrap">
                Conference
              </label>
              <div className="flex-1 min-w-0 inline-block">
                <div style={{ position: "relative" }}>
                  <ConferenceSelector
                    conferences={conferences}
                    selectedConference={selectedConference}
                    onChange={handleConferenceChange}
                    loading={conferencesLoading}
                  />
                </div>
              </div>
            </div>

            {/* Games Header */}
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-base font-normal">Select Games</h3>
              <span className="text-xs text-gray-500">
                {gameSelections.size} selected
              </span>
            </div>

            {/* Games - ORIGINAL GRID FORMAT */}
            {whatIfData?.games && whatIfData.games.length > 0 ? (
              <div className="max-h-[45vh] overflow-y-auto pr-1">
                {sortedDates.map((date) => (
                  <div key={date} className="mb-1">
                    <p className="text-xs font-medium text-gray-500 mb-0.5 sticky top-0 bg-white py-0 z-10">
                      {date}
                    </p>
                    {/* Games grid */}
                    <div className="grid grid-cols-3 lg:grid-cols-4 gap-1 p-2 rounded bg-white">
                      {gamesByDate[date].map((game: WhatIfGame) => {
                        const selectedWinner = gameSelections.get(game.game_id);
                        const awaySelected =
                          selectedWinner === game.away_team_id;
                        const homeSelected =
                          selectedWinner === game.home_team_id;

                        return (
                          <div
                            key={game.game_id}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "center",
                              gap: "4px",
                              padding: "4px 2px",
                              borderRadius: "12px",
                              border: `${selectedWinner ? "3px" : "2px"} solid ${
                                selectedWinner ? TEAL_COLOR : "#9ca3af"
                              }`,
                              backgroundColor: "white",
                              transition: "all 0.2s",
                            }}
                          >
                            {/* Away Team */}
                            <button
                              onClick={() =>
                                handleGameSelection(
                                  game.game_id,
                                  game.away_team_id,
                                )
                              }
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "4px",
                                transition: "all 0.2s",
                                background: "none",
                                border: "none",
                                padding: "0",
                                cursor: "pointer",
                                marginRight: "0",
                              }}
                            >
                              <div
                                style={{
                                  transition: "border 0.2s",
                                  border: awaySelected
                                    ? `3px solid ${TEAL_COLOR}`
                                    : "2px solid transparent",
                                  borderRadius: "8px",
                                  display: "inline-block",
                                  lineHeight: 0,
                                  padding: "2px",
                                }}
                              >
                                {game.away_logo_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={game.away_logo_url}
                                    alt={game.away_team}
                                    width={24}
                                    height={24}
                                    className="object-contain"
                                  />
                                ) : (
                                  <div
                                    style={{
                                      width: "24px",
                                      height: "24px",
                                      borderRadius: "4px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: "10px",
                                      fontWeight: "bold",
                                      color: "#374151",
                                    }}
                                  >
                                    {game.away_team
                                      .substring(0, 2)
                                      .toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: "500",
                                  color: "#4b5563",
                                }}
                              >
                                {game.away_probability != null &&
                                game.away_probability !== undefined
                                  ? `${(game.away_probability * 100).toFixed(0)}%`
                                  : "—"}
                              </span>
                            </button>

                            <div
                              style={{
                                fontSize: "10px",
                                fontWeight: "bold",
                                color: "#9ca3af",
                                display: "flex",
                                alignItems: "center",
                                height: "44px",
                              }}
                            >
                              @
                            </div>

                            {/* Home Team */}
                            <button
                              onClick={() =>
                                handleGameSelection(
                                  game.game_id,
                                  game.home_team_id,
                                )
                              }
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "4px",
                                transition: "all 0.2s",
                                background: "none",
                                border: "none",
                                padding: "0",
                                cursor: "pointer",
                                marginLeft: "0",
                              }}
                            >
                              <div
                                style={{
                                  transition: "border 0.2s",
                                  border: homeSelected
                                    ? `3px solid ${TEAL_COLOR}`
                                    : "2px solid transparent",
                                  borderRadius: "8px",
                                  display: "inline-block",
                                  lineHeight: 0,
                                  padding: "2px",
                                }}
                              >
                                {game.home_logo_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={game.home_logo_url}
                                    alt={game.home_team}
                                    width={24}
                                    height={24}
                                    className="object-contain"
                                  />
                                ) : (
                                  <div
                                    style={{
                                      width: "24px",
                                      height: "24px",
                                      borderRadius: "4px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: "10px",
                                      fontWeight: "bold",
                                      color: "#374151",
                                    }}
                                  >
                                    {game.home_team
                                      .substring(0, 2)
                                      .toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: "500",
                                  color: "#4b5563",
                                }}
                              >
                                {game.home_probability != null &&
                                game.home_probability !== undefined
                                  ? `${(game.home_probability * 100).toFixed(0)}%`
                                  : "—"}
                              </span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic py-4">
                {isCalculating
                  ? "Loading games..."
                  : "No upcoming conference games found."}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-3 border-t border-gray-200">
              <button
                onClick={handleCalculate}
                disabled={gameSelections.size === 0 || isCalculating}
                className="flex-1 py-2 px-3 text-sm font-medium text-white rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: TEAL_COLOR }}
              >
                {isCalculating
                  ? "Calculating..."
                  : `Calculate (${gameSelections.size})`}
              </button>
              {gameSelections.size > 0 && (
                <button
                  onClick={handleReset}
                  className="py-2 px-3 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - Results with Dual Sections + Selected Games Legend */}
        <div className="lg:col-span-2">
          {/* Download Button */}
          {hasCalculated && whatIfData && (
            <div className="mb-4">
              <button
                onClick={handleDownloadScenarios}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Download
              </button>
            </div>
          )}

          {/* Selected Games Summary Legend */}
          {selectedGamesSummary.length > 0 && (
            <div className="mb-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500 mb-2">
                Selections: {gameSelections.size} game
                {gameSelections.size !== 1 ? "s" : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedGamesSummary.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "center",
                      gap: "0px",
                      padding: "4px 2px",
                      borderRadius: "8px",
                      border: `1.5px solid #d1d5db`,
                      backgroundColor: "white",
                      fontSize: "11px",
                    }}
                  >
                    {/* Away Team */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "2px",
                        marginRight: "1px",
                      }}
                    >
                      <div
                        style={{
                          width: "18px",
                          height: "18px",
                          borderRadius: "3px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: item.leftIsWinner
                            ? `2px solid ${TEAL_COLOR}`
                            : "none",
                          padding: "3px",
                        }}
                      >
                        {item.leftLogo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.leftLogo}
                            alt={item.leftTeam}
                            width={14}
                            height={14}
                            className="object-contain"
                          />
                        ) : (
                          <span style={{ fontSize: "7px", fontWeight: "bold" }}>
                            {item.leftTeam.substring(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: "7px",
                        color: "#999",
                        fontWeight: "bold",
                        alignSelf: "center",
                        margin: "0 1px",
                      }}
                    >
                      @
                    </span>

                    {/* Home Team */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "2px",
                        marginLeft: "1px",
                      }}
                    >
                      <div
                        style={{
                          width: "18px",
                          height: "18px",
                          borderRadius: "3px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: item.rightIsWinner
                            ? `2px solid ${TEAL_COLOR}`
                            : "none",
                          padding: "3px",
                        }}
                      >
                        {item.rightLogo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.rightLogo}
                            alt={item.rightTeam}
                            width={14}
                            height={14}
                            className="object-contain"
                          />
                        ) : (
                          <span style={{ fontSize: "7px", fontWeight: "bold" }}>
                            {item.rightTeam.substring(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isCalculating && (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          )}

          {!isCalculating &&
          (comparisonDataWithTies.length > 0 ||
            comparisonDataNoTies.length > 0) ? (
            <div className="space-y-4">
              {/* WITH TIES SECTION - WITH NEW TABLE FORMATTING */}
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-normal mb-4">
                  #1 Regular Season Finish (With Ties)
                </h2>

                {comparisonDataWithTies.length > 0 ? (
                  <div
                    className={`${tableStyles.tableContainer} relative overflow-x-auto max-h-none`}
                  >
                    <table
                      className="border-collapse border-spacing-0"
                      style={{
                        width: "100%",
                        borderCollapse: "separate",
                        borderSpacing: 0,
                      }}
                    >
                      <thead>
                        <tr>
                          {/* Rank Column */}
                          <th
                            className="bg-gray-50 text-center font-normal text-sm"
                            style={{
                              width: rankColWidth,
                              minWidth: rankColWidth,
                              maxWidth: rankColWidth,
                              height: headerHeight,
                              position: "sticky",
                              top: 0,
                              left: 0,
                              border: "1px solid #e5e7eb",
                              borderRight: "1px solid #e5e7eb",
                            }}
                          >
                            #
                          </th>

                          {/* Team Column */}
                          <th
                            className="bg-gray-50 text-left font-normal px-2 text-sm cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => {
                              if (sortColumnWithTies === "team") {
                                setSortDirectionWithTies(
                                  sortDirectionWithTies === "asc"
                                    ? "desc"
                                    : "asc",
                                );
                              } else {
                                setSortColumnWithTies("team");
                                setSortDirectionWithTies("desc");
                              }
                            }}
                            style={{
                              width: teamColWidth,
                              minWidth: teamColWidth,
                              maxWidth: teamColWidth,
                              height: headerHeight,
                              position: "sticky",
                              top: 0,
                              left: rankColWidth,
                              border: "1px solid #e5e7eb",
                              borderLeft: "none",
                              borderRight: "1px solid #e5e7eb",
                              backgroundColor:
                                sortColumnWithTies === "team"
                                  ? "#dbeafe"
                                  : undefined,
                            }}
                            title="Click to sort by team name"
                          >
                            Team
                            {sortColumnWithTies === "team" && (
                              <div className="text-gray-600 text-xs mt-1">
                                {sortDirectionWithTies === "asc" ? "↑" : "↓"}
                              </div>
                            )}
                          </th>

                          {/* Current Column */}
                          <th
                            className="bg-gray-50 text-center font-normal text-sm cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => {
                              if (sortColumnWithTies === "before") {
                                setSortDirectionWithTies(
                                  sortDirectionWithTies === "asc"
                                    ? "desc"
                                    : "asc",
                                );
                              } else {
                                setSortColumnWithTies("before");
                                setSortDirectionWithTies("desc");
                              }
                            }}
                            style={{
                              width: probColWidth,
                              minWidth: probColWidth,
                              maxWidth: probColWidth,
                              height: headerHeight,
                              position: "sticky",
                              top: 0,
                              border: "1px solid #e5e7eb",
                              borderLeft: "none",
                              backgroundColor:
                                sortColumnWithTies === "before"
                                  ? "#dbeafe"
                                  : undefined,
                            }}
                            title="Click to sort by current value"
                          >
                            Current
                            {sortColumnWithTies === "before" && (
                              <div className="text-gray-600 text-xs mt-1">
                                {sortDirectionWithTies === "asc" ? "↑" : "↓"}
                              </div>
                            )}
                          </th>

                          {/* What If Column */}
                          <th
                            className="bg-gray-50 text-center font-normal text-sm cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => {
                              if (sortColumnWithTies === "after") {
                                setSortDirectionWithTies(
                                  sortDirectionWithTies === "asc"
                                    ? "desc"
                                    : "asc",
                                );
                              } else {
                                setSortColumnWithTies("after");
                                setSortDirectionWithTies("desc");
                              }
                            }}
                            style={{
                              width: probColWidth,
                              minWidth: probColWidth,
                              maxWidth: probColWidth,
                              height: headerHeight,
                              position: "sticky",
                              top: 0,
                              border: "1px solid #e5e7eb",
                              borderLeft: "none",
                              backgroundColor:
                                sortColumnWithTies === "after"
                                  ? "#dbeafe"
                                  : undefined,
                            }}
                            title="Click to sort by what if value"
                          >
                            What If
                            {sortColumnWithTies === "after" && (
                              <div className="text-gray-600 text-xs mt-1">
                                {sortDirectionWithTies === "asc" ? "↑" : "↓"}
                              </div>
                            )}
                          </th>

                          {/* Change Column */}
                          <th
                            className="bg-gray-50 text-center font-normal text-sm cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => {
                              if (sortColumnWithTies === "change") {
                                setSortDirectionWithTies(
                                  sortDirectionWithTies === "asc"
                                    ? "desc"
                                    : "asc",
                                );
                              } else {
                                setSortColumnWithTies("change");
                                setSortDirectionWithTies("desc");
                              }
                            }}
                            style={{
                              width: probColWidth,
                              minWidth: probColWidth,
                              maxWidth: probColWidth,
                              height: headerHeight,
                              position: "sticky",
                              top: 0,
                              border: "1px solid #e5e7eb",
                              borderLeft: "none",
                              backgroundColor:
                                sortColumnWithTies === "change"
                                  ? "#dbeafe"
                                  : undefined,
                            }}
                            title="Click to sort by change"
                          >
                            Change
                            {sortColumnWithTies === "change" && (
                              <div className="text-gray-600 text-xs mt-1">
                                {sortDirectionWithTies === "asc" ? "↑" : "↓"}
                              </div>
                            )}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedTeamsWithTies.map((team, index) => (
                          <tr
                            key={`${team.team_id}-${index}`}
                            className={team.isZero ? "opacity-40" : ""}
                          >
                            {/* Rank Cell */}
                            <td
                              className="bg-white text-center font-medium text-sm"
                              style={{
                                width: rankColWidth,
                                minWidth: rankColWidth,
                                maxWidth: rankColWidth,
                                height: cellHeight,
                                position: "sticky",
                                left: 0,
                                border: "1px solid #e5e7eb",
                                borderTop: "none",
                                borderRight: "1px solid #e5e7eb",
                              }}
                            >
                              {index + 1}
                            </td>

                            {/* Team Cell */}
                            <td
                              className="bg-white text-left px-2 text-sm"
                              style={{
                                width: teamColWidth,
                                minWidth: teamColWidth,
                                maxWidth: teamColWidth,
                                height: cellHeight,
                                position: "sticky",
                                left: rankColWidth,
                                border: "1px solid #e5e7eb",
                                borderTop: "none",
                                borderLeft: "none",
                                borderRight: "1px solid #e5e7eb",
                              }}
                            >
                              <div className="flex items-center gap-2">
                                {team.logo_url && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={team.logo_url}
                                    alt={team.team_name}
                                    width={20}
                                    height={20}
                                    className="object-contain"
                                    onError={(e) => {
                                      (
                                        e.target as HTMLImageElement
                                      ).style.display = "none";
                                    }}
                                  />
                                )}
                                <span className="truncate">
                                  {team.team_name}
                                </span>
                              </div>
                            </td>

                            {/* Before Cell */}
                            <td
                              className="relative p-0 text-sm font-medium"
                              style={{
                                height: cellHeight,
                                width: probColWidth,
                                minWidth: probColWidth,
                                maxWidth: probColWidth,
                                border: "1px solid #e5e7eb",
                                borderTop: "none",
                                borderLeft: "none",
                                ...getCellColor(team.before_first_place),
                              }}
                            >
                              <div className="absolute inset-0 flex items-center justify-center">
                                {team.before_first_place > 0
                                  ? `${team.before_first_place.toFixed(1)}%`
                                  : ""}
                              </div>
                            </td>

                            {/* After Cell */}
                            <td
                              className="relative p-0 text-sm font-medium"
                              style={{
                                height: cellHeight,
                                width: probColWidth,
                                minWidth: probColWidth,
                                maxWidth: probColWidth,
                                border: "1px solid #e5e7eb",
                                borderTop: "none",
                                borderLeft: "none",
                                ...(hasCalculated
                                  ? getCellColor(team.after_first_place)
                                  : {
                                      backgroundColor: "white",
                                      color: "transparent",
                                    }),
                              }}
                            >
                              <div className="absolute inset-0 flex items-center justify-center">
                                {hasCalculated && team.after_first_place > 0
                                  ? `${team.after_first_place.toFixed(1)}%`
                                  : ""}
                              </div>
                            </td>

                            {/* Change Cell */}
                            <td
                              className="relative p-0 text-sm font-medium"
                              style={{
                                height: cellHeight,
                                width: probColWidth,
                                minWidth: probColWidth,
                                maxWidth: probColWidth,
                                border: "1px solid #e5e7eb",
                                borderTop: "none",
                                borderLeft: "none",
                                ...(hasCalculated
                                  ? getChangeCellColor(team.change)
                                  : {
                                      backgroundColor: "white",
                                      color: "transparent",
                                    }),
                              }}
                            >
                              <div className="absolute inset-0 flex items-center justify-center">
                                {hasCalculated && team.change !== 0 && (
                                  <>
                                    {team.change > 0 ? "+" : ""}
                                    {team.change.toFixed(1)}%
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No team data available
                  </p>
                )}
              </div>

              {/* NO TIES SECTION - WITH NEW TABLE FORMATTING */}
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-normal mb-4">
                  #1 Seed in Conference Tournament (No Ties)
                </h2>

                {comparisonDataNoTies.length > 0 ? (
                  <div
                    className={`${tableStyles.tableContainer} relative overflow-x-auto max-h-none`}
                  >
                    <table
                      className="border-collapse border-spacing-0"
                      style={{
                        width: "100%",
                        borderCollapse: "separate",
                        borderSpacing: 0,
                      }}
                    >
                      <thead>
                        <tr>
                          {/* Rank Column */}
                          <th
                            className="bg-gray-50 text-center font-normal text-sm"
                            style={{
                              width: rankColWidth,
                              minWidth: rankColWidth,
                              maxWidth: rankColWidth,
                              height: headerHeight,
                              position: "sticky",
                              top: 0,
                              left: 0,
                              border: "1px solid #e5e7eb",
                              borderRight: "1px solid #e5e7eb",
                            }}
                          >
                            #
                          </th>

                          {/* Team Column */}
                          <th
                            className="bg-gray-50 text-left font-normal px-2 text-sm cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => {
                              if (sortColumnNoTies === "team") {
                                setSortDirectionNoTies(
                                  sortDirectionNoTies === "asc"
                                    ? "desc"
                                    : "asc",
                                );
                              } else {
                                setSortColumnNoTies("team");
                                setSortDirectionNoTies("desc");
                              }
                            }}
                            style={{
                              width: teamColWidth,
                              minWidth: teamColWidth,
                              maxWidth: teamColWidth,
                              height: headerHeight,
                              position: "sticky",
                              top: 0,
                              left: rankColWidth,
                              border: "1px solid #e5e7eb",
                              borderLeft: "none",
                              borderRight: "1px solid #e5e7eb",
                              backgroundColor:
                                sortColumnNoTies === "team"
                                  ? "#dbeafe"
                                  : undefined,
                            }}
                            title="Click to sort by team name"
                          >
                            Team
                            {sortColumnNoTies === "team" && (
                              <div className="text-gray-600 text-xs mt-1">
                                {sortDirectionNoTies === "asc" ? "↑" : "↓"}
                              </div>
                            )}
                          </th>

                          {/* Current Column */}
                          <th
                            className="bg-gray-50 text-center font-normal text-sm cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => {
                              if (sortColumnNoTies === "before") {
                                setSortDirectionNoTies(
                                  sortDirectionNoTies === "asc"
                                    ? "desc"
                                    : "asc",
                                );
                              } else {
                                setSortColumnNoTies("before");
                                setSortDirectionNoTies("desc");
                              }
                            }}
                            style={{
                              width: probColWidth,
                              minWidth: probColWidth,
                              maxWidth: probColWidth,
                              height: headerHeight,
                              position: "sticky",
                              top: 0,
                              border: "1px solid #e5e7eb",
                              borderLeft: "none",
                              backgroundColor:
                                sortColumnNoTies === "before"
                                  ? "#dbeafe"
                                  : undefined,
                            }}
                            title="Click to sort by current value"
                          >
                            Current
                            {sortColumnNoTies === "before" && (
                              <div className="text-gray-600 text-xs mt-1">
                                {sortDirectionNoTies === "asc" ? "↑" : "↓"}
                              </div>
                            )}
                          </th>

                          {/* What If Column */}
                          <th
                            className="bg-gray-50 text-center font-normal text-sm cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => {
                              if (sortColumnNoTies === "after") {
                                setSortDirectionNoTies(
                                  sortDirectionNoTies === "asc"
                                    ? "desc"
                                    : "asc",
                                );
                              } else {
                                setSortColumnNoTies("after");
                                setSortDirectionNoTies("desc");
                              }
                            }}
                            style={{
                              width: probColWidth,
                              minWidth: probColWidth,
                              maxWidth: probColWidth,
                              height: headerHeight,
                              position: "sticky",
                              top: 0,
                              border: "1px solid #e5e7eb",
                              borderLeft: "none",
                              backgroundColor:
                                sortColumnNoTies === "after"
                                  ? "#dbeafe"
                                  : undefined,
                            }}
                            title="Click to sort by what if value"
                          >
                            What If
                            {sortColumnNoTies === "after" && (
                              <div className="text-gray-600 text-xs mt-1">
                                {sortDirectionNoTies === "asc" ? "↑" : "↓"}
                              </div>
                            )}
                          </th>

                          {/* Change Column */}
                          <th
                            className="bg-gray-50 text-center font-normal text-sm cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => {
                              if (sortColumnNoTies === "change") {
                                setSortDirectionNoTies(
                                  sortDirectionNoTies === "asc"
                                    ? "desc"
                                    : "asc",
                                );
                              } else {
                                setSortColumnNoTies("change");
                                setSortDirectionNoTies("desc");
                              }
                            }}
                            style={{
                              width: probColWidth,
                              minWidth: probColWidth,
                              maxWidth: probColWidth,
                              height: headerHeight,
                              position: "sticky",
                              top: 0,
                              border: "1px solid #e5e7eb",
                              borderLeft: "none",
                              backgroundColor:
                                sortColumnNoTies === "change"
                                  ? "#dbeafe"
                                  : undefined,
                            }}
                            title="Click to sort by change"
                          >
                            Change
                            {sortColumnNoTies === "change" && (
                              <div className="text-gray-600 text-xs mt-1">
                                {sortDirectionNoTies === "asc" ? "↑" : "↓"}
                              </div>
                            )}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedTeamsNoTies.map((team, index) => (
                          <tr
                            key={`${team.team_id}-${index}`}
                            className={team.isZero ? "opacity-40" : ""}
                          >
                            {/* Rank Cell */}
                            <td
                              className="bg-white text-center font-medium text-sm"
                              style={{
                                width: rankColWidth,
                                minWidth: rankColWidth,
                                maxWidth: rankColWidth,
                                height: cellHeight,
                                position: "sticky",
                                left: 0,
                                border: "1px solid #e5e7eb",
                                borderTop: "none",
                                borderRight: "1px solid #e5e7eb",
                              }}
                            >
                              {index + 1}
                            </td>

                            {/* Team Cell */}
                            <td
                              className="bg-white text-left px-2 text-sm"
                              style={{
                                width: teamColWidth,
                                minWidth: teamColWidth,
                                maxWidth: teamColWidth,
                                height: cellHeight,
                                position: "sticky",
                                left: rankColWidth,
                                border: "1px solid #e5e7eb",
                                borderTop: "none",
                                borderLeft: "none",
                                borderRight: "1px solid #e5e7eb",
                              }}
                            >
                              <div className="flex items-center gap-2">
                                {team.logo_url && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={team.logo_url}
                                    alt={team.team_name}
                                    width={20}
                                    height={20}
                                    className="object-contain"
                                    onError={(e) => {
                                      (
                                        e.target as HTMLImageElement
                                      ).style.display = "none";
                                    }}
                                  />
                                )}
                                <span className="truncate">
                                  {team.team_name}
                                </span>
                              </div>
                            </td>

                            {/* Before Cell */}
                            <td
                              className="relative p-0 text-sm font-medium"
                              style={{
                                height: cellHeight,
                                width: probColWidth,
                                minWidth: probColWidth,
                                maxWidth: probColWidth,
                                border: "1px solid #e5e7eb",
                                borderTop: "none",
                                borderLeft: "none",
                                ...getCellColor(team.before_first_place),
                              }}
                            >
                              <div className="absolute inset-0 flex items-center justify-center">
                                {team.before_first_place > 0
                                  ? `${team.before_first_place.toFixed(1)}%`
                                  : ""}
                              </div>
                            </td>

                            {/* After Cell */}
                            <td
                              className="relative p-0 text-sm font-medium"
                              style={{
                                height: cellHeight,
                                width: probColWidth,
                                minWidth: probColWidth,
                                maxWidth: probColWidth,
                                border: "1px solid #e5e7eb",
                                borderTop: "none",
                                borderLeft: "none",
                                ...(hasCalculated
                                  ? getCellColor(team.after_first_place)
                                  : {
                                      backgroundColor: "white",
                                      color: "transparent",
                                    }),
                              }}
                            >
                              <div className="absolute inset-0 flex items-center justify-center">
                                {hasCalculated && team.after_first_place > 0
                                  ? `${team.after_first_place.toFixed(1)}%`
                                  : ""}
                              </div>
                            </td>

                            {/* Change Cell */}
                            <td
                              className="relative p-0 text-sm font-medium"
                              style={{
                                height: cellHeight,
                                width: probColWidth,
                                minWidth: probColWidth,
                                maxWidth: probColWidth,
                                border: "1px solid #e5e7eb",
                                borderTop: "none",
                                borderLeft: "none",
                                ...(hasCalculated
                                  ? getChangeCellColor(team.change)
                                  : {
                                      backgroundColor: "white",
                                      color: "transparent",
                                    }),
                              }}
                            >
                              <div className="absolute inset-0 flex items-center justify-center">
                                {hasCalculated && team.change !== 0 && (
                                  <>
                                    {team.change > 0 ? "+" : ""}
                                    {team.change.toFixed(1)}%
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No team data available
                  </p>
                )}
              </div>

              {/* TOP 4 SEED SECTION */}
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-normal mb-4">
                  Top 4 Seed in Conference Tournament (No Ties)
                </h2>

                {comparisonDataTop4.length > 0 ? (
                  <div
                    className={`${tableStyles.tableContainer} relative overflow-x-auto max-h-none`}
                  >
                    <table
                      className="border-collapse border-spacing-0"
                      style={{
                        width: "100%",
                        borderCollapse: "separate",
                        borderSpacing: 0,
                      }}
                    >
                      <thead>
                        <tr>
                          <th
                            className="bg-gray-50 text-center font-normal text-sm"
                            style={{
                              width: rankColWidth,
                              minWidth: rankColWidth,
                              maxWidth: rankColWidth,
                              height: headerHeight,
                              position: "sticky",
                              top: 0,
                              left: 0,
                              border: "1px solid #e5e7eb",
                              borderRight: "1px solid #e5e7eb",
                            }}
                          >
                            #
                          </th>

                          <th
                            className="bg-gray-50 text-left font-normal px-2 text-sm cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => {
                              if (sortColumnTop4 === "team") {
                                setSortDirectionTop4(
                                  sortDirectionTop4 === "asc" ? "desc" : "asc",
                                );
                              } else {
                                setSortColumnTop4("team");
                                setSortDirectionTop4("desc");
                              }
                            }}
                            style={{
                              width: teamColWidth,
                              minWidth: teamColWidth,
                              maxWidth: teamColWidth,
                              height: headerHeight,
                              position: "sticky",
                              top: 0,
                              left: rankColWidth,
                              border: "1px solid #e5e7eb",
                              borderLeft: "none",
                              borderRight: "1px solid #e5e7eb",
                            }}
                            title="Click to sort by team name"
                          >
                            Team
                            {sortColumnTop4 === "team" && (
                              <div className="text-gray-600 text-xs mt-1">
                                {sortDirectionTop4 === "asc" ? "↑" : "↓"}
                              </div>
                            )}
                          </th>

                          <th
                            className="bg-gray-50 text-center font-normal text-sm cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => {
                              if (sortColumnTop4 === "before") {
                                setSortDirectionTop4(
                                  sortDirectionTop4 === "asc" ? "desc" : "asc",
                                );
                              } else {
                                setSortColumnTop4("before");
                                setSortDirectionTop4("desc");
                              }
                            }}
                            style={{
                              width: probColWidth,
                              minWidth: probColWidth,
                              maxWidth: probColWidth,
                              height: headerHeight,
                              position: "sticky",
                              top: 0,
                              border: "1px solid #e5e7eb",
                              borderLeft: "none",
                            }}
                            title="Click to sort by current value"
                          >
                            Current
                            {sortColumnTop4 === "before" && (
                              <div className="text-gray-600 text-xs mt-1">
                                {sortDirectionTop4 === "asc" ? "↑" : "↓"}
                              </div>
                            )}
                          </th>

                          <th
                            className="bg-gray-50 text-center font-normal text-sm cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => {
                              if (sortColumnTop4 === "after") {
                                setSortDirectionTop4(
                                  sortDirectionTop4 === "asc" ? "desc" : "asc",
                                );
                              } else {
                                setSortColumnTop4("after");
                                setSortDirectionTop4("desc");
                              }
                            }}
                            style={{
                              width: probColWidth,
                              minWidth: probColWidth,
                              maxWidth: probColWidth,
                              height: headerHeight,
                              position: "sticky",
                              top: 0,
                              border: "1px solid #e5e7eb",
                              borderLeft: "none",
                            }}
                            title="Click to sort by what if value"
                          >
                            What If
                            {sortColumnTop4 === "after" && (
                              <div className="text-gray-600 text-xs mt-1">
                                {sortDirectionTop4 === "asc" ? "↑" : "↓"}
                              </div>
                            )}
                          </th>

                          <th
                            className="bg-gray-50 text-center font-normal text-sm cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => {
                              if (sortColumnTop4 === "change") {
                                setSortDirectionTop4(
                                  sortDirectionTop4 === "asc" ? "desc" : "asc",
                                );
                              } else {
                                setSortColumnTop4("change");
                                setSortDirectionTop4("desc");
                              }
                            }}
                            style={{
                              width: probColWidth,
                              minWidth: probColWidth,
                              maxWidth: probColWidth,
                              height: headerHeight,
                              position: "sticky",
                              top: 0,
                              border: "1px solid #e5e7eb",
                              borderLeft: "none",
                            }}
                            title="Click to sort by change"
                          >
                            Change
                            {sortColumnTop4 === "change" && (
                              <div className="text-gray-600 text-xs mt-1">
                                {sortDirectionTop4 === "asc" ? "↑" : "↓"}
                              </div>
                            )}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedTeamsTop4.map((team, index) => (
                          <tr
                            key={`${team.team_id}-${index}`}
                            className={team.isZero ? "opacity-40" : ""}
                          >
                            <td
                              className="bg-white text-center font-medium text-sm"
                              style={{
                                width: rankColWidth,
                                minWidth: rankColWidth,
                                maxWidth: rankColWidth,
                                height: cellHeight,
                                position: "sticky",
                                left: 0,
                                border: "1px solid #e5e7eb",
                                borderTop: "none",
                                borderRight: "1px solid #e5e7eb",
                              }}
                            >
                              {index + 1}
                            </td>

                            <td
                              className="bg-white text-left px-2 text-sm"
                              style={{
                                width: teamColWidth,
                                minWidth: teamColWidth,
                                maxWidth: teamColWidth,
                                height: cellHeight,
                                position: "sticky",
                                left: rankColWidth,
                                border: "1px solid #e5e7eb",
                                borderTop: "none",
                                borderLeft: "none",
                                borderRight: "1px solid #e5e7eb",
                              }}
                            >
                              <div className="flex items-center gap-2">
                                {team.logo_url && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={team.logo_url}
                                    alt={team.team_name}
                                    width={20}
                                    height={20}
                                    className="object-contain"
                                    onError={(e) => {
                                      (
                                        e.target as HTMLImageElement
                                      ).style.display = "none";
                                    }}
                                  />
                                )}
                                <span className="truncate">
                                  {team.team_name}
                                </span>
                              </div>
                            </td>

                            <td
                              className="relative p-0 text-sm font-medium"
                              style={{
                                height: cellHeight,
                                width: probColWidth,
                                minWidth: probColWidth,
                                maxWidth: probColWidth,
                                border: "1px solid #e5e7eb",
                                borderTop: "none",
                                borderLeft: "none",
                                ...getCellColor(team.before_first_place),
                              }}
                            >
                              <div className="absolute inset-0 flex items-center justify-center">
                                {team.before_first_place > 0
                                  ? `${team.before_first_place.toFixed(1)}%`
                                  : ""}
                              </div>
                            </td>

                            <td
                              className="relative p-0 text-sm font-medium"
                              style={{
                                height: cellHeight,
                                width: probColWidth,
                                minWidth: probColWidth,
                                maxWidth: probColWidth,
                                border: "1px solid #e5e7eb",
                                borderTop: "none",
                                borderLeft: "none",
                                ...(hasCalculated
                                  ? getCellColor(team.after_first_place)
                                  : {
                                      backgroundColor: "white",
                                      color: "transparent",
                                    }),
                              }}
                            >
                              <div className="absolute inset-0 flex items-center justify-center">
                                {hasCalculated && team.after_first_place > 0
                                  ? `${team.after_first_place.toFixed(1)}%`
                                  : ""}
                              </div>
                            </td>

                            <td
                              className="relative p-0 text-sm font-medium"
                              style={{
                                height: cellHeight,
                                width: probColWidth,
                                minWidth: probColWidth,
                                maxWidth: probColWidth,
                                border: "1px solid #e5e7eb",
                                borderTop: "none",
                                borderLeft: "none",
                                ...(hasCalculated
                                  ? getChangeCellColor(team.change)
                                  : {
                                      backgroundColor: "white",
                                      color: "transparent",
                                    }),
                              }}
                            >
                              <div className="absolute inset-0 flex items-center justify-center">
                                {hasCalculated && team.change !== 0 && (
                                  <>
                                    {team.change > 0 ? "+" : ""}
                                    {team.change.toFixed(1)}%
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No team data available
                  </p>
                )}
              </div>

              {/* TOP 8 SEED SECTION */}
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-normal mb-4">
                  Top 8 Seed in Conference Tournament (No Ties)
                </h2>

                {comparisonDataTop8.length > 0 ? (
                  <div
                    className={`${tableStyles.tableContainer} relative overflow-x-auto max-h-none`}
                  >
                    <table
                      className="border-collapse border-spacing-0"
                      style={{
                        width: "100%",
                        borderCollapse: "separate",
                        borderSpacing: 0,
                      }}
                    >
                      <thead>
                        <tr>
                          <th
                            className="bg-gray-50 text-center font-normal text-sm"
                            style={{
                              width: rankColWidth,
                              minWidth: rankColWidth,
                              maxWidth: rankColWidth,
                              height: headerHeight,
                              position: "sticky",
                              top: 0,
                              left: 0,
                              border: "1px solid #e5e7eb",
                              borderRight: "1px solid #e5e7eb",
                            }}
                          >
                            #
                          </th>

                          <th
                            className="bg-gray-50 text-left font-normal px-2 text-sm cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => {
                              if (sortColumnTop8 === "team") {
                                setSortDirectionTop8(
                                  sortDirectionTop8 === "asc" ? "desc" : "asc",
                                );
                              } else {
                                setSortColumnTop8("team");
                                setSortDirectionTop8("desc");
                              }
                            }}
                            style={{
                              width: teamColWidth,
                              minWidth: teamColWidth,
                              maxWidth: teamColWidth,
                              height: headerHeight,
                              position: "sticky",
                              top: 0,
                              left: rankColWidth,
                              border: "1px solid #e5e7eb",
                              borderLeft: "none",
                              borderRight: "1px solid #e5e7eb",
                            }}
                            title="Click to sort by team name"
                          >
                            Team
                            {sortColumnTop8 === "team" && (
                              <div className="text-gray-600 text-xs mt-1">
                                {sortDirectionTop8 === "asc" ? "↑" : "↓"}
                              </div>
                            )}
                          </th>

                          <th
                            className="bg-gray-50 text-center font-normal text-sm cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => {
                              if (sortColumnTop8 === "before") {
                                setSortDirectionTop8(
                                  sortDirectionTop8 === "asc" ? "desc" : "asc",
                                );
                              } else {
                                setSortColumnTop8("before");
                                setSortDirectionTop8("desc");
                              }
                            }}
                            style={{
                              width: probColWidth,
                              minWidth: probColWidth,
                              maxWidth: probColWidth,
                              height: headerHeight,
                              position: "sticky",
                              top: 0,
                              border: "1px solid #e5e7eb",
                              borderLeft: "none",
                            }}
                            title="Click to sort by current value"
                          >
                            Current
                            {sortColumnTop8 === "before" && (
                              <div className="text-gray-600 text-xs mt-1">
                                {sortDirectionTop8 === "asc" ? "↑" : "↓"}
                              </div>
                            )}
                          </th>

                          <th
                            className="bg-gray-50 text-center font-normal text-sm cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => {
                              if (sortColumnTop8 === "after") {
                                setSortDirectionTop8(
                                  sortDirectionTop8 === "asc" ? "desc" : "asc",
                                );
                              } else {
                                setSortColumnTop8("after");
                                setSortDirectionTop8("desc");
                              }
                            }}
                            style={{
                              width: probColWidth,
                              minWidth: probColWidth,
                              maxWidth: probColWidth,
                              height: headerHeight,
                              position: "sticky",
                              top: 0,
                              border: "1px solid #e5e7eb",
                              borderLeft: "none",
                            }}
                            title="Click to sort by what if value"
                          >
                            What If
                            {sortColumnTop8 === "after" && (
                              <div className="text-gray-600 text-xs mt-1">
                                {sortDirectionTop8 === "asc" ? "↑" : "↓"}
                              </div>
                            )}
                          </th>

                          <th
                            className="bg-gray-50 text-center font-normal text-sm cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => {
                              if (sortColumnTop8 === "change") {
                                setSortDirectionTop8(
                                  sortDirectionTop8 === "asc" ? "desc" : "asc",
                                );
                              } else {
                                setSortColumnTop8("change");
                                setSortDirectionTop8("desc");
                              }
                            }}
                            style={{
                              width: probColWidth,
                              minWidth: probColWidth,
                              maxWidth: probColWidth,
                              height: headerHeight,
                              position: "sticky",
                              top: 0,
                              border: "1px solid #e5e7eb",
                              borderLeft: "none",
                            }}
                            title="Click to sort by change"
                          >
                            Change
                            {sortColumnTop8 === "change" && (
                              <div className="text-gray-600 text-xs mt-1">
                                {sortDirectionTop8 === "asc" ? "↑" : "↓"}
                              </div>
                            )}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedTeamsTop8.map((team, index) => (
                          <tr
                            key={`${team.team_id}-${index}`}
                            className={team.isZero ? "opacity-40" : ""}
                          >
                            <td
                              className="bg-white text-center font-medium text-sm"
                              style={{
                                width: rankColWidth,
                                minWidth: rankColWidth,
                                maxWidth: rankColWidth,
                                height: cellHeight,
                                position: "sticky",
                                left: 0,
                                border: "1px solid #e5e7eb",
                                borderTop: "none",
                                borderRight: "1px solid #e5e7eb",
                              }}
                            >
                              {index + 1}
                            </td>

                            <td
                              className="bg-white text-left px-2 text-sm"
                              style={{
                                width: teamColWidth,
                                minWidth: teamColWidth,
                                maxWidth: teamColWidth,
                                height: cellHeight,
                                position: "sticky",
                                left: rankColWidth,
                                border: "1px solid #e5e7eb",
                                borderTop: "none",
                                borderLeft: "none",
                                borderRight: "1px solid #e5e7eb",
                              }}
                            >
                              <div className="flex items-center gap-2">
                                {team.logo_url && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={team.logo_url}
                                    alt={team.team_name}
                                    width={20}
                                    height={20}
                                    className="object-contain"
                                    onError={(e) => {
                                      (
                                        e.target as HTMLImageElement
                                      ).style.display = "none";
                                    }}
                                  />
                                )}
                                <span className="truncate">
                                  {team.team_name}
                                </span>
                              </div>
                            </td>

                            <td
                              className="relative p-0 text-sm font-medium"
                              style={{
                                height: cellHeight,
                                width: probColWidth,
                                minWidth: probColWidth,
                                maxWidth: probColWidth,
                                border: "1px solid #e5e7eb",
                                borderTop: "none",
                                borderLeft: "none",
                                ...getCellColor(team.before_first_place),
                              }}
                            >
                              <div className="absolute inset-0 flex items-center justify-center">
                                {team.before_first_place > 0
                                  ? `${team.before_first_place.toFixed(1)}%`
                                  : ""}
                              </div>
                            </td>

                            <td
                              className="relative p-0 text-sm font-medium"
                              style={{
                                height: cellHeight,
                                width: probColWidth,
                                minWidth: probColWidth,
                                maxWidth: probColWidth,
                                border: "1px solid #e5e7eb",
                                borderTop: "none",
                                borderLeft: "none",
                                ...(hasCalculated
                                  ? getCellColor(team.after_first_place)
                                  : {
                                      backgroundColor: "white",
                                      color: "transparent",
                                    }),
                              }}
                            >
                              <div className="absolute inset-0 flex items-center justify-center">
                                {hasCalculated && team.after_first_place > 0
                                  ? `${team.after_first_place.toFixed(1)}%`
                                  : ""}
                              </div>
                            </td>

                            <td
                              className="relative p-0 text-sm font-medium"
                              style={{
                                height: cellHeight,
                                width: probColWidth,
                                minWidth: probColWidth,
                                maxWidth: probColWidth,
                                border: "1px solid #e5e7eb",
                                borderTop: "none",
                                borderLeft: "none",
                                ...(hasCalculated
                                  ? getChangeCellColor(team.change)
                                  : {
                                      backgroundColor: "white",
                                      color: "transparent",
                                    }),
                              }}
                            >
                              <div className="absolute inset-0 flex items-center justify-center">
                                {hasCalculated && team.change !== 0 && (
                                  <>
                                    {team.change > 0 ? "+" : ""}
                                    {team.change.toFixed(1)}%
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No team data available
                  </p>
                )}
              </div>
            </div>
          ) : (
            !isCalculating && (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">
                  No team data available. Select games and click Calculate to
                  see results.
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </PageLayoutWrapper>
  );
}
