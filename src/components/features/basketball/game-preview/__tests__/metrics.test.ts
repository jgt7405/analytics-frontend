import type { TeamGameData, TeamInfo } from "@/types/gamePreview";
import { cap, computeConfPosition, computeMetrics, getLogoUrl, joinWithAnd, ordinal } from "../metrics";

const game = (status: string, location = "Home"): TeamGameData => ({ date: "01/10", opponent: "X", location, status });

describe("game preview metrics", () => {
  it("computes streak, last-N and records by location", () => {
    const schedule = [game("L"), game("W", "Away"), game("W"), game("W", "Neutral"), game("02/01")];
    const m = computeMetrics(schedule, { overall_record: "3-1" } as TeamInfo, "2nd");
    expect(m).toMatchObject({
      overallRecord: "3-1",
      conferenceRecord: "0-0",
      currentStreak: "W3",
      last5: "3-1",
      homeRecord: "1-1",
      awayRecord: "1-0",
      neutralRecord: "1-0",
      confPosition: "2nd",
    });
    expect(computeMetrics([], {} as TeamInfo, "—").currentStreak).toBe("N/A");
  });

  it("ranks conference positions with ties", () => {
    const standings = [
      { team_name: "A", teamid: 1, conference_record: "5-0", conf_wins: 5, conf_losses: 0 },
      { team_name: "B", teamid: 2, conference_record: "4-1", conf_wins: 4, conf_losses: 1 },
      { team_name: "C", teamid: 3, conference_record: "4-1", conf_wins: 4, conf_losses: 1 },
    ];
    expect(computeConfPosition("A", standings)).toBe("1st");
    expect(computeConfPosition("C", standings)).toBe("T-2nd");
    expect(computeConfPosition("Z", standings)).toBe("—");
    expect(computeConfPosition("A", [])).toBe("—");
  });

  it("formats ordinals, lists, capitals and logo paths", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101].map(ordinal)).toEqual([
      "1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "101st",
    ]);
    expect(joinWithAnd(["a"])).toBe("a");
    expect(joinWithAnd(["a", "b"])).toBe("a and b");
    expect(joinWithAnd(["a", "b", "c"])).toBe("a, b, and c");
    expect(cap("duke")).toBe("Duke");
    expect(getLogoUrl("duke.png")).toBe("/images/team_logos/duke.png");
    expect(getLogoUrl("/x.png")).toBe("/x.png");
    expect(getLogoUrl()).toBeUndefined();
  });
});
