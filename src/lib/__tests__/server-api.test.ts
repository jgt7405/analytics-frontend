/**
 * @jest-environment node
 */
// Server fetches give up on a slow backend, and team pages tell "no such
// team" (a real 404) from "the backend didn't answer" (render without data).

jest.mock("server-only", () => ({}));

import {
  SERVER_FETCH_TIMEOUT_MS,
  TEAM_LIST_TIMEOUT_MS,
  getFootballStandingsServer,
  getFootballTeamPageServer,
  isListedTeam,
} from "@/lib/server-api";

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock;
});
afterEach(() => jest.useRealTimers());

describe("server fetch timeout", () => {
  it("renders without the data once the backend has taken too long", async () => {
    jest.useFakeTimers();
    fetchMock.mockReturnValue(new Promise(() => {}));
    const result = getFootballStandingsServer("Big 12");
    await jest.advanceTimersByTimeAsync(SERVER_FETCH_TIMEOUT_MS);
    await expect(result).resolves.toBeUndefined();
  });

  it("returns the data when the backend answers in time", async () => {
    fetchMock.mockReturnValue(json({ data: [{ team_name: "Texas" }] }));
    await expect(getFootballStandingsServer("Big 12")).resolves.toEqual({
      data: [{ team_name: "Texas" }],
    });
  });

  it("doesn't leave a rejection unhandled when the request fails after the timeout", async () => {
    jest.useFakeTimers();
    let fail: (error: Error) => void = () => {};
    fetchMock.mockReturnValue(new Promise((_, reject) => (fail = reject)));
    const result = getFootballStandingsServer("Big 12");
    await jest.advanceTimersByTimeAsync(SERVER_FETCH_TIMEOUT_MS);
    await expect(result).resolves.toBeUndefined();
    const unhandled = jest.fn();
    process.on("unhandledRejection", unhandled);
    fail(new Error("socket hang up"));
    await jest.advanceTimersByTimeAsync(0);
    process.off("unhandledRejection", unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });
});

describe("team page data", () => {
  it("is missing when the backend answers 404", async () => {
    fetchMock.mockReturnValue(json({ error: "Team not found" }, 404));
    await expect(getFootballTeamPageServer("Not A Team")).resolves.toEqual({ missing: true });
  });

  it("is missing when the backend answers without team_info", async () => {
    fetchMock.mockReturnValue(json({}));
    await expect(getFootballTeamPageServer("Not A Team")).resolves.toMatchObject({
      missing: true,
    });
  });

  it("isn't missing when the backend fails or times out", async () => {
    fetchMock.mockReturnValue(json({ error: "boom" }, 500));
    await expect(getFootballTeamPageServer("Alabama")).resolves.toEqual({ missing: false });

    jest.useFakeTimers();
    fetchMock.mockReturnValue(new Promise(() => {}));
    const result = getFootballTeamPageServer("Alabama");
    await jest.advanceTimersByTimeAsync(SERVER_FETCH_TIMEOUT_MS);
    await expect(result).resolves.toEqual({ missing: false });
  });

  it("carries the data", async () => {
    const team = { team_info: { team_name: "Alabama" } };
    fetchMock.mockReturnValue(json(team));
    await expect(getFootballTeamPageServer("Alabama")).resolves.toEqual({
      data: team,
      missing: false,
    });
  });
});

describe("isListedTeam", () => {
  it("finds a team in its sport's team list", async () => {
    fetchMock.mockImplementation(() =>
      json({ data: [{ team_name: "Alabama" }, { team_name: "Texas" }] }),
    );
    await expect(isListedTeam("football", "Texas")).resolves.toBe(true);
    await expect(isListedTeam("football", "Not A Team")).resolves.toBe(false);
  });

  it("is undefined when the list doesn't load, or not quickly", async () => {
    fetchMock.mockReturnValue(json({ error: "boom" }, 500));
    await expect(isListedTeam("basketball", "Duke")).resolves.toBeUndefined();

    jest.useFakeTimers();
    fetchMock.mockReturnValue(new Promise(() => {}));
    const result = isListedTeam("basketball", "Duke");
    await jest.advanceTimersByTimeAsync(TEAM_LIST_TIMEOUT_MS);
    await expect(result).resolves.toBeUndefined();
  });
});
