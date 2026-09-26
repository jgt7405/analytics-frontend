import { NextRequest, NextResponse } from "next/server";
import { BACKEND_API_URL } from "@/config/env";
import {
  buildBackendPath,
  checkQuery,
  matchEndpoint,
  type Endpoint,
} from "@/api/endpoints";
import { CACHE_POLICIES, cacheClassFor } from "@/lib/cache-policy";
import { logger } from "@/lib/logger";
import { MAX_UPLOAD_BYTES, requestSchemaFor, responseSchemaFor } from "@/api/schemas";

// Force Node.js runtime and disable static optimization
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The proxy forwards only what src/api/endpoints.ts registers: the path
// shape, method, each path parameter's rule and the query parameters.
// Anything else is rejected here and never reaches the backend.

type RouteContext = { params: Promise<{ slug: string[] }> };

// Cache headers that don't depend on the endpoint are applied here, so no
// return path can miss them (src/lib/cache-policy.ts): error responses are
// never cached, and POSTs are scenarios, never kept in a shared cache.
export async function GET(request: NextRequest, context: RouteContext) {
  const started = Date.now();
  const response = await handle("GET", request, context);
  if (!response.ok) response.headers.set("Cache-Control", "no-store");
  logRequest(request, response, started);
  return response;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const started = Date.now();
  const response = await handle("POST", request, context);
  response.headers.set(
    "Cache-Control",
    response.ok ? CACHE_POLICIES.scenario.cacheControl : "no-store",
  );
  logRequest(request, response, started);
  return response;
}

// One line per proxied request (a CDN hit never reaches this function, so
// every line is a cache miss). requestId is Vercel's x-vercel-id, which
// Vercel also returns to the browser, so a user-reported request can be
// found in the logs.
function logRequest(request: NextRequest, response: Response, started: number) {
  logger.info("proxy", {
    method: request.method,
    path: `${request.nextUrl.pathname}${request.nextUrl.search}`,
    status: response.status,
    durationMs: Date.now() - started,
    endpoint: response.headers.get("x-endpoint"),
    cacheClass: response.headers.get("x-cache-class"),
    requestId: request.headers.get("x-vercel-id"),
  });
}

async function handle(
  method: "GET" | "POST",
  request: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  const { slug } = await params;
  const match = matchEndpoint(method, slug);

  switch (match.kind) {
    case "notFound":
      return NextResponse.json({ error: "Unknown endpoint" }, { status: 404 });
    case "methodNotAllowed":
      return NextResponse.json(
        { error: "Method not allowed" },
        { status: 405, headers: { Allow: match.allowed.join(", ") } },
      );
    case "invalidParam":
      return NextResponse.json(
        { error: `Invalid path segment: ${match.param}` },
        { status: 400 },
      );
  }

  const { endpoint } = match;
  const query = checkQuery(endpoint, request.nextUrl.searchParams);
  if (!query.ok) {
    return NextResponse.json(
      { error: `Query parameter not allowed: ${query.param}` },
      { status: 400 },
    );
  }

  const backendPath = buildBackendPath(endpoint, match.params);
  const qs = query.query.toString();
  const backendUrl = `${BACKEND_API_URL}${backendPath}${qs ? `?${qs}` : ""}`;

  try {
    const response =
      method === "GET"
        ? await forwardGet(endpoint, backendUrl, query.query.get("season"))
        : await forwardPost(endpoint, backendUrl, request);
    response.headers.set("x-endpoint", endpoint.key);
    return response;
  } catch (error) {
    logger.error(`Proxy ${method} failed`, { endpoint: endpoint.key, error });
    return NextResponse.json(
      {
        error: "Internal proxy error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

async function forwardGet(
  endpoint: Endpoint,
  backendUrl: string,
  season: string | null,
): Promise<NextResponse> {
  const response = await fetch(backendUrl, {
    headers: { Accept: "application/json", "Cache-Control": "no-cache" },
    cache: "no-store",
    signal: AbortSignal.timeout(endpoint.timeoutMs),
  });

  if (!response.ok) {
    logger.warn("Backend request failed", {
      endpoint: endpoint.key,
      status: response.status,
    });
    return NextResponse.json(
      { error: `Backend request failed: ${response.status}`, details: response.statusText },
      { status: response.status },
    );
  }

  // CDN caching per freshness class (src/lib/cache-policy.ts)
  const cacheClass = cacheClassFor(endpoint, season);
  const cacheHeaders = {
    "Cache-Control": CACHE_POLICIES[cacheClass].cacheControl,
    "x-cache-class": cacheClass,
  };

  if (endpoint.response === "csv") {
    return new NextResponse(await response.text(), {
      headers: {
        ...cacheHeaders,
        "Content-Type": "text/csv",
        "Content-Disposition":
          response.headers.get("Content-Disposition") || 'attachment; filename="export.csv"',
      },
    });
  }

  const parsed = parseJson(endpoint, await response.text());
  if (!parsed) return invalidJsonResponse();
  checkResponseShape(endpoint, parsed.data);
  return NextResponse.json(parsed.data, { headers: cacheHeaders });
}

// The request body the backend receives: a JSON body parsed by the
// endpoint's schema (only the parsed fields are forwarded), or the upload's
// form data after checking the file.
async function readPostBody(
  endpoint: Endpoint,
  request: NextRequest,
): Promise<{ json?: unknown; formData?: FormData } | { error: string }> {
  try {
    if (endpoint.body === "formData") {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!(file instanceof Blob)) return { error: "No file provided" };
      if (file.size > MAX_UPLOAD_BYTES) return { error: "File too large" };
      return { formData };
    }
    const json: unknown = await request.json();
    const schema = requestSchemaFor(endpoint.key);
    if (!schema) return { error: "Unsupported request" };
    const result = schema.safeParse(json);
    if (!result.success) {
      const issue = result.error.issues[0];
      return { error: `Invalid request body: ${issue.path.join(".") || "body"} ${issue.message}` };
    }
    return { json: result.data };
  } catch {
    return { error: "Invalid request body" };
  }
}

// Responses with a schema (the shared conference-table envelope) are checked
// and a mismatch logged as backend drift; the response still goes out.
function checkResponseShape(endpoint: Endpoint, data: unknown) {
  const schema = responseSchemaFor(endpoint.key);
  if (!schema) return;
  const result = schema.safeParse(data);
  if (!result.success) {
    logger.warn("Backend response doesn't match its schema", {
      endpoint: endpoint.key,
      issues: result.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`),
    });
  }
}

async function forwardPost(
  endpoint: Endpoint,
  backendUrl: string,
  request: NextRequest,
): Promise<NextResponse> {
  const body = await readPostBody(endpoint, request);
  if ("error" in body) {
    return NextResponse.json({ error: body.error }, { status: 400 });
  }
  const init: RequestInit =
    body.formData !== undefined
      ? { method: "POST", body: body.formData }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(body.json),
        };
  const response = await fetch(backendUrl, {
    ...init,
    signal: AbortSignal.timeout(endpoint.timeoutMs),
  });
  const text = await response.text();

  if (!response.ok) {
    logger.warn("Backend request failed", {
      endpoint: endpoint.key,
      status: response.status,
      preview: text.slice(0, 200),
    });
    return NextResponse.json(
      { error: `Backend request failed: ${response.status}`, details: text.slice(0, 200) },
      { status: response.status },
    );
  }

  if (endpoint.response === "csv") {
    return new NextResponse(text, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition":
          response.headers.get("Content-Disposition") ||
          'attachment; filename="validation.csv"',
      },
    });
  }

  const parsed = parseJson(endpoint, text);
  return parsed ? NextResponse.json(parsed.data) : invalidJsonResponse();
}

function parseJson(endpoint: Endpoint, text: string): { data: unknown } | null {
  try {
    return { data: JSON.parse(text) };
  } catch {
    logger.error("Backend returned invalid JSON", {
      endpoint: endpoint.key,
      preview: text.slice(0, 200),
    });
    return null;
  }
}

function invalidJsonResponse() {
  return NextResponse.json(
    { error: "Failed to parse backend response" },
    { status: 500 },
  );
}
