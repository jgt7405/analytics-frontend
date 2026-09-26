/**
 * @jest-environment node
 */
// Every backend URL the site builds is registered in src/api/endpoints.ts,
// so no page calls a path the proxy would reject. Scans the source for the
// ways a URL is built: proxyUrl(...), the API clients' this.request/get/post,
// and server-api's fetchJson/confPath. A new call site is checked
// automatically; one built entirely at run time needs an entry in DYNAMIC.

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { checkQuery, endpointForBackendPath, matchEndpoint, type EndpointMatch } from "../endpoints";

const SRC = path.join(__dirname, "../..");

// Calls to paths the backend has never served, so they are deliberately not
// registered. Each needs a decision (build the backend route, or remove the
// call); remove the entry once it's made.
const KNOWN_UNSERVED: Record<string, string> = {};

// Call sites whose path is a variable: the values it can take.
const DYNAMIC: Record<string, string[]> = {
  // useTeamList
  "${sport}_teams${seasonQuery}": [
    "basketball_teams?season=2024-25",
    "football_teams?season=2024-25",
  ],
};
const usedDynamic = new Set<string>();

// Placeholders for template expressions. A variable holding a query string
// (`seasonQuery`, `query`) becomes a season query; anything else a path value.
function substitute(expression: ts.Expression, source: ts.SourceFile): string {
  // `${season ? `?season=${season}` : ""}`: check the branch that adds to the URL.
  if (ts.isConditionalExpression(expression)) {
    return literalOf(expression.whenTrue, source) ?? substitute(expression.whenTrue, source);
  }
  if (
    ts.isCallExpression(expression) &&
    expression.expression.getText(source) === "encodeURIComponent"
  ) {
    return substitute(expression.arguments[0], source);
  }
  const text = expression.getText(source);
  if (/^(seasonQuery|q)$/.test(text)) return "?season=2024-25";
  if (/^query$/.test(text)) return "";
  if (/season$/.test(text)) return "2024-25";
  if (/date$/.test(text)) return "2025-11-01";
  return "Sample";
}

function literalOf(node: ts.Expression, source: ts.SourceFile): string | null {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isTemplateExpression(node)) {
    const raw = node.getText(source).slice(1, -1);
    if (DYNAMIC[raw]) {
      usedDynamic.add(raw);
      return null;
    }
    return (
      node.head.text +
      node.templateSpans
        .map((span) => substitute(span.expression, source) + span.literal.text)
        .join("")
    );
  }
  return null;
}

interface CallSite {
  where: string;
  url: string;
  /** A backend path (server-api fetches the backend directly) rather than a
   *  proxy path. */
  backend: boolean;
}

function callSites(file: string): CallSite[] {
  const text = fs.readFileSync(file, "utf8");
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const sites: CallSite[] = [];
  const where = (node: ts.Node) =>
    `${path.relative(SRC, file)}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`;

  // `this.request/get/post` build URLs only in the API clients.
  const isClient = /services[\\/][a-z]+-api\.ts$/.test(file);
  const pattern = isClient
    ? /^(proxyUrl|fetchJson|api\.get|this\.(request|get|post))$/
    : /^(proxyUrl|fetchJson|api\.get)$/;

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && node.arguments.length > 0) {
      const callee = node.expression.getText(source);
      const [first, second] = node.arguments;
      let urls: string[] | null = null;

      if (pattern.test(callee)) {
        // fetchJson(confPath(...)): the confPath call is checked on its own.
        if (ts.isCallExpression(first)) {
          ts.forEachChild(node, visit);
          return;
        }
        const raw = first.getText(source).slice(1, -1);
        const literal = literalOf(first, source);
        urls = literal !== null ? [literal] : (DYNAMIC[raw] ?? null);
        if (urls === null) throw new Error(`Can't resolve the URL at ${where(node)}; add it to DYNAMIC`);
      } else if (callee === "confPath" && second) {
        const base = literalOf(first, source);
        if (base !== null) urls = [`${base}/Sample?season=2024-25`];
      }
      const backend = callee === "fetchJson" || callee === "confPath";
      for (const url of urls ?? []) sites.push({ where: where(node), url, backend });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return sites;
}

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "__tests__" || entry.name === "api" && dir.endsWith("app") ? [] : sourceFiles(full);
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

function resolve(site: CallSite): { match: EndpointMatch; query: URLSearchParams } {
  const [pathPart, queryPart = ""] = site.url.split("?");
  const query = new URLSearchParams(queryPart);
  if (site.backend) {
    const endpoint = endpointForBackendPath(pathPart);
    return { match: endpoint ? { kind: "ok", endpoint, params: {} } : { kind: "notFound" }, query };
  }
  const segments = pathPart
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .map((s) => decodeURIComponent(s));
  const get = matchEndpoint("GET", segments);
  const match = get.kind === "methodNotAllowed" ? matchEndpoint("POST", segments) : get;
  return { match, query };
}

// These two only pass on paths their callers supply, checked at those calls.
const PASS_THROUGH = [path.join("lib", "proxy-url.ts"), path.join("services", "shared-request.ts")];

const sites = sourceFiles(SRC)
  .filter((file) => !PASS_THROUGH.some((suffix) => file.endsWith(suffix)))
  .flatMap(callSites);

describe("backend URLs built by the site", () => {
  it("finds the call sites", () => {
    // Sanity check that the scan still sees the codebase's patterns.
    expect(sites.length).toBeGreaterThan(80);
    expect(sites.some((s) => s.where.startsWith("lib/server-api.ts"))).toBe(true);
    expect(sites.some((s) => s.where.startsWith("services/"))).toBe(true);
    expect(sites.some((s) => s.where.startsWith("hooks/"))).toBe(true);
  });

  it("lists only dynamic call sites that still exist", () => {
    expect([...usedDynamic].sort()).toEqual(Object.keys(DYNAMIC).sort());
  });

  it("lists only unserved calls that still exist", () => {
    for (const [url, file] of Object.entries(KNOWN_UNSERVED)) {
      expect(sites.some((s) => s.url === url && s.where.startsWith(file))).toBe(true);
    }
  });

  it.each(sites.filter((s) => !KNOWN_UNSERVED[s.url]).map((s) => [s.where, s.url, s] as const))("%s %s is registered", (_where, _url, site) => {
    const { match, query } = resolve(site);
    expect(match.kind).toBe("ok");
    if (match.kind === "ok") expect(checkQuery(match.endpoint, query)).toMatchObject({ ok: true });
  });
});
