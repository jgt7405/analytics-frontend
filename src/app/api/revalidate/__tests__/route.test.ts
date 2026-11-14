/**
 * @jest-environment node
 */
// /api/revalidate: the data pipeline clears a sport's cached data after a run.

jest.mock("server-only", () => ({}));
jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }));
jest.mock("@vercel/functions", () => ({ dangerouslyDeleteByTag: jest.fn() }));

import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { dangerouslyDeleteByTag } from "@vercel/functions";
import { COOLDOWN_MS, resetCooldown } from "@/lib/revalidate-cooldown";
import { POST } from "../route";

function post(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/revalidate/", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json", ...headers },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetCooldown();
  jest.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("revalidate route", () => {
  it("clears the sport's data cache and CDN copies with no secret", async () => {
    const res = await POST(post({ sport: "football" }));
    expect(res.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith("football-data", { expire: 0 });
    expect(dangerouslyDeleteByTag).toHaveBeenCalledWith("football-data");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("ignores a leftover Authorization header and REVALIDATE_SECRET", async () => {
    process.env.REVALIDATE_SECRET = "still-set-on-vercel";
    try {
      const res = await POST(post({ sport: "football" }, { authorization: "Bearer nope" }));
      expect(res.status).toBe(200);
      expect(revalidateTag).toHaveBeenCalledTimes(1);
    } finally {
      delete process.env.REVALIDATE_SECRET;
    }
  });

  it("clears only the sport it was asked for", async () => {
    await POST(post({ sport: "basketball" }));
    expect(revalidateTag).toHaveBeenCalledTimes(1);
    expect(revalidateTag).toHaveBeenCalledWith("basketball-data", { expire: 0 });
  });

  it("does not clear the same sport again within the cooldown", async () => {
    const clock = jest.spyOn(Date, "now").mockReturnValue(1_000_000);
    await POST(post({ sport: "football" }));

    clock.mockReturnValue(1_000_000 + COOLDOWN_MS - 1);
    const repeat = await POST(post({ sport: "football" }));
    expect(repeat.status).toBe(200);
    expect(await repeat.json()).toMatchObject({ skipped: "football-data" });
    expect(revalidateTag).toHaveBeenCalledTimes(1);

    // Another sport is unaffected, and the first clears again once time is up
    await POST(post({ sport: "basketball" }));
    clock.mockReturnValue(1_000_000 + COOLDOWN_MS);
    await POST(post({ sport: "football" }));
    expect(revalidateTag).toHaveBeenCalledTimes(3);
  });

  it.each([[{ sport: "hockey" }], [{}], ["not json"]])("rejects body %p", async (body) => {
    const res = await POST(post(body));
    expect(res.status).toBe(400);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
