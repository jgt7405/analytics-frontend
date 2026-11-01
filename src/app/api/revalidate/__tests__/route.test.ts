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
import { POST } from "../route";

const SECRET = "test-secret";

function post(body: unknown, auth: string | null = `Bearer ${SECRET}`) {
  return new NextRequest("http://localhost/api/revalidate/", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      ...(auth ? { authorization: auth } : {}),
    },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.REVALIDATE_SECRET = SECRET;
  jest.spyOn(console, "info").mockImplementation(() => {});
});

afterAll(() => {
  delete process.env.REVALIDATE_SECRET;
});

describe("revalidate route", () => {
  it("clears the sport's data cache and CDN copies", async () => {
    const res = await POST(post({ sport: "football" }));
    expect(res.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith("football-data", { expire: 0 });
    expect(dangerouslyDeleteByTag).toHaveBeenCalledWith("football-data");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("clears only the sport it was asked for", async () => {
    await POST(post({ sport: "basketball" }));
    expect(revalidateTag).toHaveBeenCalledTimes(1);
    expect(revalidateTag).toHaveBeenCalledWith("basketball-data", { expire: 0 });
  });

  it.each([
    ["no header", null],
    ["a wrong secret", "Bearer nope"],
    ["the secret without Bearer", SECRET],
  ])("refuses %s", async (_label, auth) => {
    const res = await POST(post({ sport: "football" }, auth));
    expect(res.status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
    expect(dangerouslyDeleteByTag).not.toHaveBeenCalled();
  });

  it("refuses everything when no secret is configured", async () => {
    delete process.env.REVALIDATE_SECRET;
    const res = await POST(post({ sport: "football" }, "Bearer "));
    expect(res.status).toBe(503);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it.each([[{ sport: "hockey" }], [{}], ["not json"]])("rejects body %p", async (body) => {
    const res = await POST(post(body));
    expect(res.status).toBe(400);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
