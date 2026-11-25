/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import type { PageChange } from "@/types/statistics";
import { Movers } from "../ContentSection";

const change = (team: string, current: number, previous: number): PageChange =>
  ({ team, sport: "football", current, previous, change: current - previous, change_pct: previous ? (current - previous) / previous : null }) as PageChange;

const movers = (rising: PageChange[], previous_complete?: boolean) => ({
  pages: { rising: [], falling: [] },
  teams: { rising, falling: [] },
  tracking_since: "2026-11-17T02:16:17+00:00",
  previous_complete,
});

describe("Movers", () => {
  it("shows the tables without a note when tracking covers the previous period", () => {
    render(<Movers movers={movers([change("Nebraska", 30, 10)], true)} />);
    expect(screen.getByText("Falling teams")).toBeTruthy();
    expect(screen.queryByText(/Visit tracking began/)).toBeNull();
  });

  it("notes a partly covered previous period above the tables", () => {
    render(<Movers movers={movers([change("Nebraska", 30, 10)], false)} />);
    expect(screen.getByText(/Visit tracking began Nov 16, partway through/)).toBeTruthy();
    expect(screen.getByText("Falling teams")).toBeTruthy();
  });

  it("replaces the tables when there is no earlier data at all", () => {
    render(<Movers movers={movers([change("Nebraska", 30, 0)], false)} />);
    expect(screen.getByText(/no earlier period of this length/)).toBeTruthy();
    expect(screen.queryByText("Falling teams")).toBeNull();
  });
});
