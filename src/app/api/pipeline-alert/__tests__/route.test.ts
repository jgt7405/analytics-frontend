/**
 * @jest-environment node
 */
// /api/pipeline-alert: the data pipeline emails the owner about a run.

jest.mock("server-only", () => ({}));
const sendMail = jest.fn();
jest.mock("nodemailer", () => ({ __esModule: true, default: { createTransport: () => ({ sendMail }) } }));
const sharedRateLimit = jest.fn();
jest.mock("@/lib/shared-ratelimit", () => ({ sharedRateLimit: (...args: unknown[]) => sharedRateLimit(...args) }));

import { NextRequest } from "next/server";
import { POST } from "../route";

const GOOD = { sport: "football", kind: "run_completed", subject: "Run completed", text: "All good" };

function post(body: unknown) {
  return new NextRequest("http://localhost/api/pipeline-alert/", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  sharedRateLimit.mockResolvedValue(true);
  sendMail.mockResolvedValue({});
  Object.assign(process.env, { EMAIL_HOST: "smtp.test", EMAIL_USER: "user", EMAIL_PASS: "pass" });
  jest.spyOn(console, "info").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  delete process.env.EMAIL_HOST;
  delete process.env.EMAIL_USER;
  delete process.env.EMAIL_PASS;
});

describe("pipeline-alert route", () => {
  it("emails the owner a plain-text notice", async () => {
    const res = await POST(post(GOOD));
    expect(res.status).toBe(200);
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: "jacob@jthomanalytics.com",
      subject: "[JThom football] Run completed",
      text: "All good",
    }));
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("sends the daily website error report", async () => {
    const res = await POST(post({ sport: "site", kind: "site_errors", subject: "3 website errors (Nov 26)", text: "- Script error" }));
    expect(res.status).toBe(200);
    expect(sendMail.mock.calls[0][0].subject).toBe("[JThom site] 3 website errors (Nov 26)");
  });

  it("strips line breaks from the subject so it can't add mail headers", async () => {
    await POST(post({ ...GOOD, subject: "Hi\r\nBcc: someone@example.com" }));
    expect(sendMail.mock.calls[0][0].subject).toBe("[JThom football] Hi Bcc: someone@example.com");
  });

  it.each([
    [{ ...GOOD, sport: "hockey" }],
    [{ ...GOOD, kind: "anything" }],
    [{ ...GOOD, subject: " " }],
    [{ ...GOOD, text: 5 }],
    ["not json"],
  ])("rejects a bad request %#", async (body) => {
    const res = await POST(post(body));
    expect(res.status).toBe(400);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("stops sending past the hourly limit", async () => {
    sharedRateLimit.mockResolvedValue(false);
    const res = await POST(post(GOOD));
    expect(res.status).toBe(429);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("reports a mail failure", async () => {
    sendMail.mockRejectedValue(new Error("smtp down"));
    const res = await POST(post(GOOD));
    expect(res.status).toBe(502);
  });
});
