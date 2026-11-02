import { buildRankedLists, selectRankRange } from "../rank-select";
import type { CompositeRatingTeam, FootballTWVData } from "@/types/football";

function composite(
  team_name: string,
  rank: number,
  ap_rank: number | null = null,
  cfp_rank: number | null = null,
): CompositeRatingTeam {
  return {
    team_name,
    rank,
    conference: rank === 999 ? "FCS" : "SEC",
    composite_rating: 0,
    display_score: 0,
    num_sources: 10,
    sources: {},
    ap_rank,
    cfp_rank,
  };
}

function twv(team_name: string, value: number): FootballTWVData {
  return { team_name, team_id: team_name, logo_url: "", twv: value, actual_record: "", expected_record: "", rank: 0 };
}

describe("buildRankedLists", () => {
  const lists = buildRankedLists(
    [
      composite("Montana", 999),
      composite("Georgia", 2, 3, 1),
      composite("Ohio State", 1, 1, null),
      composite("Texas", 3, 2, 2),
      composite("Rice", 4),
    ],
    [twv("Rice", -1.2), twv("Texas", 2.5), twv("Georgia", 0.4)],
  );

  it("orders rating by FBS rank and leaves FCS out", () => {
    expect(lists.rating).toEqual(["Ohio State", "Georgia", "Texas", "Rice"]);
  });

  it("orders TWV highest first", () => {
    expect(lists.twv).toEqual(["Texas", "Georgia", "Rice"]);
  });

  it("orders AP and CFP by poll rank and skips unranked teams", () => {
    expect(lists.ap).toEqual(["Ohio State", "Texas", "Georgia"]);
    expect(lists.cfp).toEqual(["Georgia", "Texas"]);
  });

  it("returns empty lists while data is missing", () => {
    expect(buildRankedLists(undefined, undefined)).toEqual({ rating: [], twv: [], ap: [], cfp: [] });
  });

  it("treats a backend without poll fields as no poll", () => {
    const { ap, cfp } = buildRankedLists([{ ...composite("Georgia", 1), ap_rank: undefined, cfp_rank: undefined }], []);
    expect(ap).toEqual([]);
    expect(cfp).toEqual([]);
  });
});

describe("selectRankRange", () => {
  const list = Array.from({ length: 25 }, (_, i) => `T${i + 1}`);

  it("selects the top N", () => {
    expect(selectRankRange(list, 1, 5, 12)).toEqual(["T1", "T2", "T3", "T4", "T5"]);
  });

  it("selects a middle range", () => {
    expect(selectRankRange(list, 6, 10, 12)).toEqual(["T6", "T7", "T8", "T9", "T10"]);
  });

  it("caps the range at maxTeams from the start", () => {
    expect(selectRankRange(list, 1, 25, 12)).toHaveLength(12);
    expect(selectRankRange(list, 10, 25, 12)[0]).toBe("T10");
  });

  it("swaps reversed bounds and clamps to the list", () => {
    expect(selectRankRange(list, 5, 3, 12)).toEqual(["T3", "T4", "T5"]);
    expect(selectRankRange(list, 24, 40, 12)).toEqual(["T24", "T25"]);
    expect(selectRankRange(list, 0, 2, 12)).toEqual(["T1", "T2"]);
  });
});
