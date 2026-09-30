import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { useGameInUrl } from "../hooks";

// useSearchParams follows the address bar, as Next's does after
// history.replaceState.
jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

interface Game {
  game_id: string;
}

const GAMES: Game[] = [{ game_id: "g1" }, { game_id: "g2" }];

function useHarness(initialGames: Game[]) {
  const [games, setGames] = useState(initialGames);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  useGameInUrl(games, selectedGame, setSelectedGame);
  return { selectedGame, setSelectedGame, setGames };
}

describe("useGameInUrl", () => {
  let replaceState: jest.SpyInstance;

  beforeEach(() => {
    window.history.replaceState({}, "", "/basketball/game-preview/");
    replaceState = jest.spyOn(window.history, "replaceState");
  });

  afterEach(() => {
    replaceState.mockRestore();
  });

  function setUrl(search: string) {
    window.history.replaceState({}, "", `/basketball/game-preview/${search}`);
    replaceState.mockClear();
  }

  it("selects the game named in the URL once the games load, without dropping ?game=", () => {
    setUrl("?game=g2");
    const { result } = renderHook(() => useHarness([]));
    expect(result.current.selectedGame).toBeNull();

    act(() => result.current.setGames(GAMES));

    expect(result.current.selectedGame).toEqual({ game_id: "g2" });
    expect(window.location.search).toBe("?game=g2");
    for (const [, , url] of replaceState.mock.calls) {
      expect(String(url)).toContain("game=g2");
    }
  });

  it("lets the user clear the selection after a restore", () => {
    setUrl("?game=g2");
    const { result } = renderHook(() => useHarness(GAMES));
    expect(result.current.selectedGame).toEqual({ game_id: "g2" });

    act(() => result.current.setSelectedGame(null));

    expect(result.current.selectedGame).toBeNull();
    expect(window.location.search).toBe("");
  });

  it("writes a chosen game to the URL", () => {
    const { result } = renderHook(() => useHarness(GAMES));

    act(() => result.current.setSelectedGame({ game_id: "g1" }));

    expect(window.location.search).toBe("?game=g1");
  });

  it("drops a ?game= that matches no upcoming game", () => {
    setUrl("?game=old");
    const { result } = renderHook(() => useHarness(GAMES));

    expect(result.current.selectedGame).toBeNull();
    expect(window.location.search).toBe("");
  });

  it("keeps other query parameters", () => {
    setUrl("?conf=ACC&game=g1");
    const { result } = renderHook(() => useHarness(GAMES));

    act(() => result.current.setSelectedGame({ game_id: "g2" }));

    expect(window.location.search).toBe("?conf=ACC&game=g2");
  });
});
