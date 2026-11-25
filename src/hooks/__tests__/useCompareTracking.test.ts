import { renderHook, waitFor } from "@testing-library/react";
import { useCompareTracking } from "../useCompareTracking";

const trackCompare = jest.fn();
jest.mock("@/lib/usage-tracking", () => ({
  trackCompare: (...args: unknown[]) => trackCompare(...args),
}));

beforeEach(() => trackCompare.mockClear());

it("sends each added team with the comparison up to it, and nothing on removal", async () => {
  const { rerender } = renderHook(({ names }) => useCompareTracking("basketball", names), {
    initialProps: { names: [] as string[] },
  });
  expect(trackCompare).not.toHaveBeenCalled();

  rerender({ names: ["Duke"] });
  await waitFor(() => expect(trackCompare).toHaveBeenCalledWith("basketball", ["Duke"], "pick"));

  rerender({ names: ["Duke", "Kansas"] });
  await waitFor(() => expect(trackCompare).toHaveBeenLastCalledWith("basketball", ["Duke", "Kansas"], "pick"));

  trackCompare.mockClear();
  rerender({ names: ["Kansas"] });
  // A new array with the same teams sends nothing either.
  rerender({ names: ["Kansas"] });
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(trackCompare).not.toHaveBeenCalled();
});

it("labels a marked batch as rank quick-select, then goes back to picks", async () => {
  const { result, rerender } = renderHook(({ names }) => useCompareTracking("football", names), {
    initialProps: { names: ["Ohio State"] as string[] },
  });
  await waitFor(() => expect(trackCompare).toHaveBeenCalledTimes(1));

  result.current();
  rerender({ names: ["Ohio State", "Georgia", "Texas"] });
  await waitFor(() => expect(trackCompare).toHaveBeenCalledTimes(3));
  expect(trackCompare).toHaveBeenNthCalledWith(2, "football", ["Ohio State", "Georgia"], "rank");
  expect(trackCompare).toHaveBeenNthCalledWith(3, "football", ["Ohio State", "Georgia", "Texas"], "rank");

  rerender({ names: ["Ohio State", "Georgia", "Texas", "Oregon"] });
  await waitFor(() => expect(trackCompare).toHaveBeenLastCalledWith(
    "football", ["Ohio State", "Georgia", "Texas", "Oregon"], "pick"));
});
