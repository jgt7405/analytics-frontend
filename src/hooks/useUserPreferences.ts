// src/hooks/useUserPreferences.ts
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useMonitoring } from "@/lib/unified-monitoring";

export interface UserPreferences {
  defaultConference: string;
  autoRefresh: boolean;
  refreshInterval: number; // seconds
  favoriteTeams: string[];
  theme: "light" | "dark" | "system";
  enableNotifications: boolean;
  enableAnimations: boolean;
}

// ✅ FIXED: Remove tableView from default preferences
const DEFAULT_PREFERENCES: UserPreferences = {
  defaultConference: "Big 12",
  autoRefresh: false,
  refreshInterval: 300, // 5 minutes
  favoriteTeams: [],
  theme: "system",
  enableNotifications: false,
  enableAnimations: true,
};

export function useUserPreferences() {
  const { trackEvent } = useMonitoring();
  const [preferences, setPreferences] = useLocalStorage<UserPreferences>(
    "basketball-analytics-preferences",
    DEFAULT_PREFERENCES
  );

  const updatePreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));

    // Track preference changes
    trackEvent({
      name: "preference_changed",
      properties: { preference: key, value: String(value) },
    });
  };

  const addFavoriteTeam = (teamName: string) => {
    if (!preferences.favoriteTeams.includes(teamName)) {
      const newFavorites = [...preferences.favoriteTeams, teamName];
      updatePreference("favoriteTeams", newFavorites);
    }
  };

  const removeFavoriteTeam = (teamName: string) => {
    const newFavorites = preferences.favoriteTeams.filter(
      (team) => team !== teamName
    );
    updatePreference("favoriteTeams", newFavorites);
  };

  const resetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
    trackEvent({
      name: "preference_changed",
      properties: { preference: "reset", value: "all" },
    });
  };

  const exportPreferences = () => {
    const dataStr = JSON.stringify(preferences, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "basketball-analytics-preferences.json";
    link.click();
    URL.revokeObjectURL(url);

    trackEvent({
      name: "preference_changed",
      properties: { preference: "export", value: "json" },
    });
  };

  const importPreferences = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        const validated = { ...DEFAULT_PREFERENCES, ...imported };
        setPreferences(validated);
        trackEvent({
          name: "preference_changed",
          properties: { preference: "import", value: "json" },
        });
      } catch (error) {
        console.error("Failed to import preferences:", error);
      }
    };
    reader.readAsText(file);
  };

  return {
    preferences,
    updatePreference,
    addFavoriteTeam,
    removeFavoriteTeam,
    resetPreferences,
    exportPreferences,
    importPreferences,
  };
}
