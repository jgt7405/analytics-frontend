/**
 * @jest-environment node
 */
import { logger, redact } from "../logger";

describe("redact", () => {
  it("hides values under secret-looking keys", () => {
    expect(
      redact({
        password: "hunter2",
        EMAIL_PASS: "x",
        pass: "p",
        authorization: "Bearer abc",
        apiKey: "k",
        email: "fan@example.com",
        conference: "SEC",
      }),
    ).toEqual({
      password: "[redacted]",
      EMAIL_PASS: "[redacted]",
      pass: "[redacted]",
      authorization: "[redacted]",
      apiKey: "[redacted]",
      email: "[redacted]",
      conference: "SEC",
    });
  });

  it("keeps football stats whose names merely contain 'pass'", () => {
    expect(redact({ passing_yards: 312, pass_rate: 0.6 })).toEqual({
      passing_yards: 312,
      pass_rate: 0.6,
    });
  });

  it("masks email addresses inside strings", () => {
    expect(redact("reply to fan@example.com please")).toBe("reply to [email] please");
  });

  it("truncates long strings, long arrays and deep objects", () => {
    expect(redact("x".repeat(600))).toMatch(/… \(600 chars\)$/);
    const items = redact(Array.from({ length: 25 }, (_, i) => i)) as unknown[];
    expect(items).toHaveLength(21);
    expect(items[20]).toBe("… (5 more)");
    expect(redact({ a: { b: { c: { d: { e: 1 } } } } })).toEqual({
      a: { b: { c: { d: "[object]" } } },
    });
  });

  it("survives circular references and serializes errors", () => {
    const loop: Record<string, unknown> = { name: "loop" };
    loop.self = loop;
    expect(redact(loop)).toEqual({ name: "loop", self: "[circular]" });
    expect(redact(new TypeError("bad"))).toMatchObject({ name: "TypeError", message: "bad" });
  });
});

describe("logger on the server", () => {
  let error: jest.SpyInstance;
  let debug: jest.SpyInstance;
  beforeEach(() => {
    error = jest.spyOn(console, "error").mockImplementation(() => {});
    debug = jest.spyOn(console, "debug").mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it("writes one redacted JSON line per entry", () => {
    logger.error("SMTP failed", { user: "me", pass: "p", password: "secret" });
    expect(error).toHaveBeenCalledTimes(1);
    expect(JSON.parse(error.mock.calls[0][0])).toEqual({
      level: "error",
      msg: "SMTP failed",
      details: { user: "me", pass: "[redacted]", password: "[redacted]" },
    });
  });

  it("drops levels below the environment's minimum", () => {
    logger.debug("noisy");
    expect(debug).not.toHaveBeenCalled();
  });
});
