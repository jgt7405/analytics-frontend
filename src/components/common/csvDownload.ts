// File: src/components/common/csvDownload.ts
// CSV download utility for what-if results with proper TypeScript types

interface WhatIfTeam {
  team_name: string;
  avg_projected_conf_wins?: number;
  avg_reg_season_wins?: number;
  avg_conference_standing?: number;
  conf_champ_pct?: number;
}

interface WhatIfGame {
  date: string;
  home_team: string;
  away_team: string;
  conf_game: boolean;
  home_probability?: number;
}

interface GameSelection {
  game_id: number;
  winner_team_id: number;
}

export const downloadWhatIfAsCSV = async (
  conference: string,
  selections: GameSelection[]
): Promise<void> => {
  try {
    console.log("📥 Downloading what-if CSV for", conference);

    const response = await fetch("/api/proxy/football/whatif/export", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conference,
        selections,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `Failed to export CSV: ${response.statusText}`
      );
    }

    const data = await response.json();

    if (!data.success || !data.csv_data) {
      throw new Error("Invalid CSV export response from server");
    }

    // Create blob and download
    const blob = new Blob([data.csv_data], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", data.filename || "whatif_export.csv");
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup
    URL.revokeObjectURL(url);

    console.log("✓ CSV downloaded:", data.filename);
  } catch (error) {
    console.error("Error downloading CSV:", error);
    throw error;
  }
};

/**
 * Alternative: Download what-if data that's already displayed on the page
 * No backend call needed - just formats displayed data as CSV
 */
export const downloadWhatIfFromDisplayedData = (
  conference: string,
  whatIfResults: WhatIfTeam[],
  currentProjections: WhatIfTeam[],
  futureGames: WhatIfGame[]
): void => {
  let csv = `Conference: ${conference}\n`;
  csv += `Export Date: ${new Date().toISOString()}\n\n`;

  // What-If Results
  csv += `WHAT-IF RESULTS\n`;
  csv += `Team,Avg Projected Conf Wins,Avg Reg Season Wins,Avg Conference Standing,Conf Champ Game %\n`;
  whatIfResults.forEach((team) => {
    csv += `"${team.team_name}",${team.avg_projected_conf_wins || 0},${
      team.avg_reg_season_wins || 0
    },${team.avg_conference_standing || 0},${team.conf_champ_pct || 0}\n`;
  });

  csv += `\n`;

  // Current Projections
  csv += `CURRENT PROJECTIONS\n`;
  csv += `Team,Conf Champ Game %\n`;
  currentProjections.forEach((team) => {
    csv += `"${team.team_name}",${team.conf_champ_pct || 0}\n`;
  });

  csv += `\n`;

  // Future Games
  csv += `FUTURE GAMES\n`;
  csv += `Date,Home Team,Away Team,Conf Game,Home Win %\n`;
  futureGames.forEach((game) => {
    const homeWinPct = game.home_probability
      ? `${(game.home_probability * 100).toFixed(1)}%`
      : "N/A";
    csv += `${game.date},"${game.home_team}","${game.away_team}","${
      game.conf_game ? "Yes" : "No"
    }","${homeWinPct}"\n`;
  });

  // Trigger download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `whatif_${conference.replace(/\s+/g, "_")}.csv`
  );
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
  console.log("✓ CSV downloaded from displayed data");
};
