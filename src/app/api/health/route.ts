// src/app/api/health/route.ts
// Liveness check for uptime monitoring (plan step 10): answers as long as
// the app is serving. It doesn't call the backend, so a monitor polling it
// costs no Railway request; the backend has its own /health.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { status: "ok", time: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
