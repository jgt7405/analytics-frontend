/**
 * @jest-environment jsdom
 */
import { act, render, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { useHydrated } from "../useHydrated";

function Probe() {
  return <span data-testid="state">{useHydrated() ? "client" : "server"}</span>;
}

describe("useHydrated", () => {
  it("is false in the server render", () => {
    expect(renderToString(<Probe />)).toContain("server");
  });

  it("is true for a component mounted in the browser", () => {
    render(<Probe />);
    expect(screen.getByTestId("state").textContent).toBe("client");
  });

  it("hydrates as false without a mismatch, then turns true", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<Probe />);
    document.body.appendChild(container);
    const errors: unknown[] = [];
    await act(async () => {
      hydrateRoot(container, <Probe />, { onRecoverableError: (error) => errors.push(error) });
    });
    expect(errors).toEqual([]);
    expect(container.textContent).toBe("client");
  });
});
