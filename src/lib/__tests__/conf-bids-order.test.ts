import type { ConferenceData } from "@/hooks/useBasketballConfData";
import { sortConferencesByBids } from "@/lib/conf-bids-order";

const conf = (
  conference_name: string,
  average_bids: number,
  median?: number,
  netrtg_median = 0,
): ConferenceData =>
  ({
    conference_name,
    average_bids,
    netrtg_median,
    winprob: median === undefined ? undefined : { rk100: { median } },
  }) as unknown as ConferenceData;

const names = (list: ConferenceData[]) => list.map((c) => c.conference_name);

describe("sortConferencesByBids", () => {
  it("orders by bids first", () => {
    expect(names(sortConferencesByBids([conf("B", 1.3, 90), conf("A", 11.7, 10)]))).toEqual(["A", "B"]);
  });

  it("breaks ties at the shown one decimal by median win probability", () => {
    const list = [conf("Big South", 1.048, 20), conf("Big West", 1.026, 30), conf("MVC", 1.038, 45)];
    expect(names(sortConferencesByBids(list))).toEqual(["MVC", "Big West", "Big South"]);
  });

  it("keeps a real bids gap ahead of median", () => {
    expect(names(sortConferencesByBids([conf("WCC", 1.198, 40), conf("Big South", 1.053, 60)]))).toEqual(["WCC", "Big South"]);
  });

  it("falls back to median net rating without win probabilities", () => {
    expect(names(sortConferencesByBids([conf("X", 1.0, undefined, -5), conf("Y", 1.0, undefined, 3)]))).toEqual(["Y", "X"]);
  });

  it("does not mutate its input", () => {
    const list = [conf("B", 1, 1), conf("A", 2, 1)];
    sortConferencesByBids(list);
    expect(names(list)).toEqual(["B", "A"]);
  });
});
