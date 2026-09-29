import { layoutEndLogos, tooltipRows } from "../data";
import type { FirstPlaceData, LogoTeam, TeamInfo } from "../types";

const info = (color: string) => ({
  primary_color: color,
  logo_url: `/${color}.png`,
});
const row = (
  team_name: string,
  date: string,
  first_place_pct: number,
): FirstPlaceData => ({
  team_name,
  date,
  first_place_pct,
  team_info: info(team_name),
});

describe("tooltipRows", () => {
  const rows = [
    row("A", "2025-11-03", 40),
    row("B", "2025-11-03", 0),
    row("C", "2025-11-03", 60),
    row("A", "2025-11-10", 50),
  ];
  const teamData: Record<string, TeamInfo> = {
    A: { data: [{ x: "11/3", y: 40 }], team_info: info("A") },
    B: { data: [{ x: "11/3", y: 0 }], team_info: info("B") },
    C: { data: [{ x: "11/3", y: 60.4 }], team_info: info("C") },
  };
  const label = { isoDate: "2025-11-03", displayLabel: "11/3" };
  const oneDecimal = (pct: number) => `${pct.toFixed(1)}%`;
  const rounded = (pct: number) => `${Math.round(pct)}%`;

  it("everyRow lists every row for the date, highest first, zeros included", () => {
    expect(tooltipRows("everyRow", label, rows, teamData, oneDecimal)).toEqual([
      { label: "1. C", value: "60.0%", color: "C", logoUrl: "/C.png" },
      { label: "2. A", value: "40.0%", color: "A", logoUrl: "/A.png" },
      { label: "3. B", value: "0.0%", color: "B", logoUrl: "/B.png" },
    ]);
  });

  it("teamsAboveZero reads the charted lines and drops teams at 0%", () => {
    expect(
      tooltipRows("teamsAboveZero", label, rows, teamData, rounded),
    ).toEqual([
      { label: "1. C", value: "60%", color: "C", logoUrl: "/C.png" },
      { label: "2. A", value: "40%", color: "A", logoUrl: "/A.png" },
    ]);
  });

  it("falls back to the default logo and black", () => {
    const bare = { ...row("D", "2025-11-03", 10), team_info: {} };
    expect(
      tooltipRows("everyRow", label, [bare], {}, oneDecimal)[0],
    ).toMatchObject({
      color: "#000000",
      logoUrl: "/images/team_logos/default.png",
    });
  });
});

describe("layoutEndLogos", () => {
  const team = (team_name: string, final_pct: number): LogoTeam => ({
    team_name,
    final_pct,
    team_info: {},
  });
  const yFor = (pct: number) => 100 - pct; // 0% at y=100, 100% at y=0
  const bounds = { top: 0, bottom: 85 };

  it("keeps a single logo at its line's end, even outside the bounds", () => {
    expect(layoutEndLogos([team("A", 0)], yFor, bounds, 20)).toEqual([
      { team: team("A", 0), idealY: 100, adjustedY: 100 },
    ]);
  });

  it("clamps to the plot and pushes crowded logos upward", () => {
    const out = layoutEndLogos(
      [team("low", 5), team("high", 60), team("mid", 10)],
      yFor,
      bounds,
      20,
    );
    expect(out.map((p) => [p.team.team_name, p.idealY, p.adjustedY])).toEqual([
      ["high", 40, 40],
      ["mid", 90, 65],
      ["low", 95, 85],
    ]);
  });

  it("leaves well-spaced logos alone", () => {
    const out = layoutEndLogos(
      [team("A", 80), team("B", 20)],
      yFor,
      bounds,
      20,
    );
    expect(out.map((p) => p.adjustedY)).toEqual([20, 80]);
  });
});
