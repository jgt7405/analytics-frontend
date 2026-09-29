import { dedupeByVersion, layoutEndLogos, withoutFcs } from "../data";
import type { ConferenceEnd, ConfHistoryRow } from "../types";

const row = (
  conference: string,
  date: string,
  avg_bids: number,
  version_id?: string,
): ConfHistoryRow => ({
  conference,
  date,
  avg_bids,
  version_id,
  conference_info: {},
});

describe("withoutFcs", () => {
  it("drops any conference whose name contains FCS, in any case", () => {
    const rows = [
      row("SEC", "2025-09-01", 4),
      row("FCS", "2025-09-01", 0.3),
      row("Big Sky (fcs)", "2025-09-01", 0.1),
    ];
    expect(withoutFcs(rows).map((r) => r.conference)).toEqual(["SEC"]);
  });
});

describe("dedupeByVersion", () => {
  it("keeps one row per conference and date, preferring the earlier version", () => {
    const rows = [
      row("SEC", "2025-09-01", 4, "b"),
      row("SEC", "2025-09-08", 4.1),
      row("SEC", "2025-09-01", 3.9, "a"),
      row("SEC", "2025-09-01", 5, "c"),
    ];
    expect(dedupeByVersion(rows).map((r) => [r.date, r.avg_bids])).toEqual([
      ["2025-09-01", 3.9],
      ["2025-09-08", 4.1],
    ]);
  });

  it("keeps the first row when versions are missing", () => {
    const rows = [
      row("SEC", "2025-09-01", 4),
      row("SEC", "2025-09-01", 5, "a"),
    ];
    expect(dedupeByVersion(rows).map((r) => r.avg_bids)).toEqual([4]);
  });
});

describe("layoutEndLogos", () => {
  const conf = (conference: string, final_bids: number): ConferenceEnd => ({
    conference,
    final_bids,
    conference_info: {},
  });
  const yFor = (bids: number) => 100 - bids * 10; // 0 bids at y=100
  const bounds = { top: 0, bottom: 100 };

  it("keeps a single logo at its line's end", () => {
    expect(layoutEndLogos([conf("A", 0)], yFor, bounds, 18)).toEqual([
      { conf: conf("A", 0), idealY: 100, adjustedY: 100 },
    ]);
  });

  it("keeps logos a logo's height above the bottom and spaced apart", () => {
    const out = layoutEndLogos(
      [conf("low", 0.5), conf("high", 8), conf("mid", 1)],
      yFor,
      bounds,
      18,
    );
    expect(out.map((p) => [p.conf.conference, p.idealY, p.adjustedY])).toEqual([
      ["high", 20, 20],
      ["mid", 90, 58],
      ["low", 95, 76],
    ]);
  });
});
