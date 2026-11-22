// src/app/api/pipeline-alert/route.ts
// Emails the site owner a data-pipeline notice (the pipeline repo's alerts.py):
// a run finished or failed, a data source failed to load, or a source's data
// has not changed in too long. It reuses the contact form's SMTP settings on
// Vercel, so the pipeline needs no mail credentials of its own.
//
// POST /api/pipeline-alert/ with JSON:
//   {"sport": "football" | "basketball",
//    "kind": "run_completed" | "run_failed" | "source_failed" | "source_stale",
//    "subject": "...", "text": "..."}
//
// No secret, like /api/revalidate: the recipient is fixed, the mail is plain
// text, and a shared limit caps how many go out per hour, so the worst a
// stranger can do is send the owner a few odd emails.
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { logger } from "@/lib/logger";
import { sharedRateLimit } from "@/lib/shared-ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ALERT_RECIPIENT = "jacob@jthomanalytics.com";
// A bad night can fail several sources in both sports; well above that.
const ALERTS_PER_HOUR = 40;

const SPORTS = ["football", "basketball"] as const;
const KINDS = ["run_completed", "run_failed", "source_failed", "source_stale"] as const;
const NO_STORE = { "Cache-Control": "no-store" };

function reply(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

/** One line, no control characters, so it can't inject mail headers. */
function cleanSubject(value: string) {
  return value.replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, 150);
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return reply({ error: "Invalid request body" }, 400);
  }
  const { sport, kind, subject, text } = body ?? {};
  if (!SPORTS.includes(sport as (typeof SPORTS)[number])) {
    return reply({ error: `sport must be one of: ${SPORTS.join(", ")}` }, 400);
  }
  if (!KINDS.includes(kind as (typeof KINDS)[number])) {
    return reply({ error: `kind must be one of: ${KINDS.join(", ")}` }, 400);
  }
  if (typeof subject !== "string" || !subject.trim() || typeof text !== "string") {
    return reply({ error: "subject and text are required" }, 400);
  }

  if (!(await sharedRateLimit("pipeline-alert", "all", ALERTS_PER_HOUR, 3600))) {
    return reply({ error: "Too many alerts this hour" }, 429);
  }
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return reply({ error: "Email service not configured" }, 500);
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: process.env.EMAIL_SECURE === "true",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: ALERT_RECIPIENT,
      subject: `[JThom ${sport}] ${cleanSubject(subject)}`,
      text: text.slice(0, 20000),
    });
  } catch (error) {
    logger.error("pipeline alert email failed", {
      sport,
      kind,
      reason: error instanceof Error ? error.message : String(error),
    });
    return reply({ error: "Failed to send" }, 502);
  }
  logger.info("pipeline alert sent", { sport, kind });
  return reply({ sent: true });
}
