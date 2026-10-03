/**
 * @jest-environment node
 */
jest.mock("server-only", () => ({}));

import { logger } from "@/lib/logger";
import { getClientIp } from "@/lib/ratelimit";
import { sharedRateLimit } from "@/lib/shared-ratelimit";

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

function reply(count: number) {
  return new Response(JSON.stringify([{ result: "OK" }, { result: count }]), { status: 200 });
}

let warn: jest.SpyInstance;
beforeEach(() => {
  fetchMock.mockReset();
  warn = jest.spyOn(logger, "warn").mockImplementation(() => {});
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
});
afterEach(() => warn.mockRestore());

describe("getClientIp", () => {
  it("reads the first x-forwarded-for entry, then x-real-ip", () => {
    expect(getClientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
    expect(getClientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(getClientIp(new Headers())).toBe("unknown");
  });
});

describe("sharedRateLimit", () => {
  it("uses the per-instance limit when the store isn't configured", async () => {
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await sharedRateLimit("test-a", "1.1.1.1", 3, 60));
    expect(results).toEqual([true, true, true, false]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe("with the store configured", () => {
    beforeEach(() => {
      process.env.KV_REST_API_URL = "https://example.upstash.io/";
      process.env.KV_REST_API_TOKEN = "test-token";
    });

    it("starts the window and counts in one pipeline call, without storing the IP", async () => {
      fetchMock.mockResolvedValue(reply(1));
      await expect(sharedRateLimit("contact", "203.0.113.7", 5, 3600)).resolves.toBe(true);

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("https://example.upstash.io/pipeline");
      expect(init.headers.Authorization).toBe("Bearer test-token");
      const [set, incr] = JSON.parse(init.body);
      expect(set).toEqual([ "SET", expect.stringMatching(/^ratelimit:contact:[0-9a-f]{32}$/), "0", "EX", "3600", "NX"]);
      expect(incr).toEqual(["INCR", set[1]]);
      expect(init.body).not.toContain("203.0.113.7");
    });

    it("allows up to the limit and refuses after it", async () => {
      fetchMock.mockResolvedValueOnce(reply(5)).mockResolvedValueOnce(reply(6));
      await expect(sharedRateLimit("contact", "203.0.113.7", 5, 3600)).resolves.toBe(true);
      await expect(sharedRateLimit("contact", "203.0.113.7", 5, 3600)).resolves.toBe(false);
    });

    it("falls back to the per-instance limit when the store fails", async () => {
      fetchMock.mockRejectedValue(new Error("network down"));
      await expect(sharedRateLimit("test-b", "1.1.1.1", 1, 60)).resolves.toBe(true);
      await expect(sharedRateLimit("test-b", "1.1.1.1", 1, 60)).resolves.toBe(false);
      expect(warn).toHaveBeenCalled();

      fetchMock.mockResolvedValue(new Response("unauthorized", { status: 401 }));
      await expect(sharedRateLimit("test-c", "1.1.1.1", 1, 60)).resolves.toBe(true);
    });
  });
});
