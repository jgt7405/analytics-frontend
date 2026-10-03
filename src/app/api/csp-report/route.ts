// src/app/api/csp-report/route.ts
// Receives Content-Security-Policy violation reports (src/config/csp.ts)
// and logs one short line per report, so the policy can be checked against
// production before it's enforced. Public and unauthenticated, so it
// accepts only small bodies, logs a few fields with query strings removed,
// ignores reports caused by browser extensions, caps how much one instance
// logs per minute, and never calls the backend.
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16 * 1024;
const MAX_REPORTS_PER_REQUEST = 10;
const MAX_LOGS_PER_MINUTE = 100;
const EXTENSION_SCHEMES = /^(chrome|moz|safari|safari-web|ms-browser)-extension:/;

export interface CspViolation {
  directive: string;
  blocked: string;
  page: string;
  disposition: string;
}

let windowStart = 0;
let loggedInWindow = 0;

/** Exposed for tests. */
export function resetLogBudget() {
  windowStart = 0;
  loggedInWindow = 0;
}

function takeLogBudget(now = Date.now()): boolean {
  if (now - windowStart >= 60_000) {
    windowStart = now;
    loggedInWindow = 0;
  }
  if (loggedInWindow >= MAX_LOGS_PER_MINUTE) return false;
  loggedInWindow++;
  return true;
}

/** Origin and path only; keywords such as "inline" or "eval" pass through. */
function withoutQuery(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  try {
    const url = new URL(value);
    if (url.protocol === "data:" || url.protocol === "blob:") return url.protocol;
    return `${url.origin}${url.pathname}`.slice(0, 200);
  } catch {
    return value.slice(0, 50);
  }
}

function field(record: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) if (record[key] !== undefined) return record[key];
  return undefined;
}

/** Reads both formats: report-uri ({"csp-report": …}) and the Reporting API ([{type, body}]). */
export function parseReports(payload: unknown): CspViolation[] {
  const raw: Record<string, unknown>[] = [];
  if (Array.isArray(payload)) {
    for (const item of payload.slice(0, MAX_REPORTS_PER_REQUEST)) {
      if (item && typeof item === "object" && (item as { type?: unknown }).type === "csp-violation") {
        const body = (item as { body?: unknown }).body;
        if (body && typeof body === "object") raw.push(body as Record<string, unknown>);
      }
    }
  } else if (payload && typeof payload === "object") {
    const report = (payload as Record<string, unknown>)["csp-report"];
    if (report && typeof report === "object") raw.push(report as Record<string, unknown>);
  }

  return raw
    .filter((r) => !EXTENSION_SCHEMES.test(String(field(r, "blockedURL", "blocked-uri") ?? "")))
    .map((r) => ({
      directive: String(field(r, "effectiveDirective", "effective-directive", "violated-directive") ?? "").slice(0, 50),
      blocked: withoutQuery(field(r, "blockedURL", "blocked-uri")),
      page: withoutQuery(field(r, "documentURL", "document-uri")),
      disposition: String(field(r, "disposition") ?? "report").slice(0, 10),
    }))
    .filter((v) => v.directive);
}

export async function POST(request: NextRequest) {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return new NextResponse(null, { status: 413 });

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return new NextResponse(null, { status: 413 });

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  for (const violation of parseReports(payload)) {
    if (!takeLogBudget()) break;
    logger.warn("csp-report", violation);
  }
  return new NextResponse(null, { status: 204 });
}
