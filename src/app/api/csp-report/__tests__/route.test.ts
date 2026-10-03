/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { POST, parseReports, resetLogBudget } from "../route";

function post(body: string, type = "application/csp-report") {
  return new NextRequest("http://localhost/api/csp-report/", {
    method: "POST",
    headers: { "content-type": type },
    body,
  });
}

const legacy = (blocked: string) =>
  JSON.stringify({
    "csp-report": {
      "document-uri": "https://www.jthomanalytics.com/football/standings/?conf=SEC#x",
      "effective-directive": "script-src-elem",
      "blocked-uri": blocked,
      disposition: "report",
    },
  });

let warn: jest.SpyInstance;
beforeEach(() => {
  resetLogBudget();
  warn = jest.spyOn(logger, "warn").mockImplementation(() => {});
});
afterEach(() => warn.mockRestore());

describe("parseReports", () => {
  it("reads report-uri reports and drops query strings", () => {
    expect(parseReports(JSON.parse(legacy("https://evil.example/x.js?token=1")))).toEqual([
      {
        directive: "script-src-elem",
        blocked: "https://evil.example/x.js",
        page: "https://www.jthomanalytics.com/football/standings/",
        disposition: "report",
      },
    ]);
  });

  it("reads Reporting API reports and ignores other report types", () => {
    const reports = [
      { type: "deprecation", body: {} },
      {
        type: "csp-violation",
        body: {
          documentURL: "https://www.jthomanalytics.com/",
          effectiveDirective: "img-src",
          blockedURL: "data:image/png;base64,AAAA",
          disposition: "report",
        },
      },
    ];
    expect(parseReports(reports)).toEqual([
      { directive: "img-src", blocked: "data:", page: "https://www.jthomanalytics.com/", disposition: "report" },
    ]);
  });

  it("ignores reports caused by browser extensions", () => {
    expect(parseReports(JSON.parse(legacy("chrome-extension://abc/script.js")))).toEqual([]);
  });
});

describe("POST /api/csp-report/", () => {
  it("logs a report and answers 204", async () => {
    const response = await POST(post(legacy("inline")));
    expect(response.status).toBe(204);
    expect(warn).toHaveBeenCalledWith("csp-report", expect.objectContaining({ blocked: "inline" }));
  });

  it("rejects bodies over 16 kB and invalid JSON", async () => {
    expect((await POST(post("x".repeat(17 * 1024)))).status).toBe(413);
    expect((await POST(post("{not json"))).status).toBe(400);
    expect(warn).not.toHaveBeenCalled();
  });

  it("logs at most 100 reports per minute per instance", async () => {
    for (let i = 0; i < 120; i++) await POST(post(legacy("inline")));
    expect(warn).toHaveBeenCalledTimes(100);
  });
});
