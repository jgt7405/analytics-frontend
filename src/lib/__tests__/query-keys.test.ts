import { queryKeys } from "../query-keys";

type KeyFn = (...args: string[]) => readonly unknown[];

// Every key of one sport, built with the same sample arguments.
function allKeys(sport: "basketball" | "football") {
  return Object.entries(queryKeys[sport])
    .filter(([name]) => name !== "all")
    .map(([name, build]) => ({
      name,
      key: (build as KeyFn)("Big 12", "2025-26"),
    }));
}

describe("queryKeys", () => {
  it.each(["basketball", "football"] as const)(
    "starts every %s key with the sport, so invalidating `all` reaches it",
    (sport) => {
      for (const { key } of allKeys(sport)) {
        expect(key[0]).toBe(sport);
      }
    },
  );

  it("gives each resource its own key", () => {
    const keys = [...allKeys("basketball"), ...allKeys("football")];
    const resources = keys.map(({ key }) => `${key[0]}/${key[1]}`);
    expect(new Set(resources).size).toBe(resources.length);
  });

  it("separates requests that differ in any parameter", () => {
    expect(queryKeys.football.standings("SEC", undefined)).not.toEqual(
      queryKeys.football.standings("SEC", "2025-26"),
    );
    expect(queryKeys.basketball.ncaaProjections(undefined, "season")).not.toEqual(
      queryKeys.basketball.ncaaProjections(undefined, "current"),
    );
    expect(queryKeys.basketball.standings("SEC", undefined)).not.toEqual(
      queryKeys.football.standings("SEC", undefined),
    );
  });
});
