import { render } from "@testing-library/react";
import PageLayoutWrapper from "../PageLayoutWrapper";

jest.mock("../Footer", () => ({ __esModule: true, default: () => null }));

// The header is drawn the same while the page's data loads as after, so
// the content below doesn't move when it arrives. It used to draw a title
// bar and a selector placeholder while loading, even on pages that hide the
// title and have no selector: the content moved up to 80px on a slowed
// phone (plan step 10, 10n).
const header = (props: Partial<Parameters<typeof PageLayoutWrapper>[0]>, isLoading: boolean) =>
  render(
    <PageLayoutWrapper title="Compare Schedules" isLoading={isLoading} {...props}>
      <div>content</div>
    </PageLayoutWrapper>,
  ).container.querySelector(".page-header")!.innerHTML;

describe("PageLayoutWrapper", () => {
  it.each([
    ["with a title", {}],
    ["with a hidden title", { hideTitle: true }],
    ["with a subtitle and a right element", { subtitle: "(Including Ties)", rightElement: "Updated: 10/04/2026" }],
    ["with a selector", { conferenceSelector: <select aria-label="Conference" /> }],
  ])("draws the same header while loading %s", (_, props) => {
    expect(header(props, true)).toBe(header(props, false));
  });

  it("draws nothing above the content when the title is hidden", () => {
    expect(header({ hideTitle: true }, true)).toBe("");
  });
});
