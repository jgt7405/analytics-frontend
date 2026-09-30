// Hooks used by the game preview: screen size, and the selected game kept in
// the URL (?game=) so a preview can be shared.

import { useResponsive } from "@/hooks/useResponsive";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/** Phone layout at 768 px and below (useResponsive's isMobile is < 768);
 *  false until hydrated, as before. */
export function useIsMobile() {
  const { width, isHydrated } = useResponsive();
  return isHydrated && width <= 768;
}

/**
 * Keeps the selected game in `?game=`. Once the games have loaded, the game
 * named in the URL (if any) is selected once; after that the selection is
 * written back to the URL. Restoring only once lets the user clear the
 * dropdown (it used to snap back to the URL's game), and the write-back
 * starts only after the restore, so it no longer removes `?game=` first.
 * `setSelectedGame` must set state of the component calling this hook.
 */
export function useGameInUrl<T extends { game_id: string }>(
  games: T[],
  selectedGame: T | null,
  setSelectedGame: (game: T) => void,
) {
  const searchParams = useSearchParams();
  const [restored, setRestored] = useState(false);

  // Set during render (React's pattern for adjusting state when data
  // arrives), so the selection and `restored` land together before the
  // write-back below first runs.
  if (!restored && games.length > 0) {
    setRestored(true);
    const gameParam = searchParams.get("game");
    const match = gameParam
      ? games.find((g) => g.game_id === gameParam)
      : undefined;
    if (match) setSelectedGame(match);
  }

  useEffect(() => {
    if (!restored) return;
    const params = new URLSearchParams(searchParams.toString());
    if (selectedGame) {
      params.set("game", selectedGame.game_id);
    } else {
      params.delete("game");
    }
    if (params.toString() === searchParams.toString()) return;
    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    window.history.replaceState({}, "", newUrl);
  }, [restored, selectedGame, searchParams]);
}
