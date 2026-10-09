import { fireEvent, render, screen } from "@testing-library/react";
import FootballScheduleTable from "../ScheduleTable";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => "/football/schedule/",
}));

// Hovering a win-probability count opens a tooltip listing the games in
// that bucket, each with the opponent's logo at 16 px. It goes through the
// image optimizer (plan step 9), not the original ~500 px file.
it("shows bucket tooltip logos resized", () => {
  const summary = {
    total_games: 1,
    expected_wins: 0.8,
    top_quartile: 0,
    second_quartile: 0,
    third_quartile: 0,
    bottom_quartile: 1,
  };
  render(
    <FootballScheduleTable
      scheduleData={[
        {
          Loc: "home",
          Team: "Auburn",
          Win_Pct: "80%",
          Win_Pct_Raw: 0.8,
          games: { Alabama: "W" },
          conf_game: true,
        },
      ]}
      teams={["Alabama"]}
      teamLogos={{ Auburn: "/images/team_logos/auburn.png" }}
      summary={{ Alabama: summary }}
      renderMainTable={false}
    />,
  );
  // The "70-100%" count for Alabama is the one hoverable chip showing 1.
  for (const chip of screen.getAllByText("1")) fireEvent.mouseEnter(chip);
  expect(screen.getByText(/70-100% Win Prob/)).toBeTruthy();
  const logo = document.querySelector('img[src*="auburn"]');
  expect(logo?.getAttribute("src")).toBe("/images/team_logos/auburn.png");
});
