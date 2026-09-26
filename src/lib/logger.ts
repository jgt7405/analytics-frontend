// Shared logger for server and browser code (docs/ARCHITECTURE_PLAN.md
// step 3). Use it instead of console.*; ESLint's no-console rule enforces it.
//
//   logger.debug("Fetched standings", { conference, rows: data.length });
//   logger.error("Standings request failed", error);
//
// - Levels: in production, browsers print warnings and errors only; the
//   server also keeps `info`, one JSON line per entry, searchable in Vercel's
//   logs. Everything prints in development.
// - Redaction: values under keys that look secret (password, token, cookie,
//   authorization, api key, email, ...) become "[redacted]", email addresses
//   inside strings become "[email]", and long strings, arrays and deep
//   objects are truncated so a response body can't flood the log.

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const isServer = typeof window === "undefined";

function minLevel(): Level {
  if (process.env.NODE_ENV === "test") return "warn";
  if (process.env.NODE_ENV !== "production") return "debug";
  return isServer ? "info" : "warn";
}

// Matches key names, not values. `pass` counts only as a whole word (as in
// nodemailer's { user, pass } or EMAIL_PASS), so stats such as passing_yards
// stay visible.
const SECRET_KEY =
  /(^|[-_])pass$|passw(or)?d|secret|token|authori[sz]ation|cookie|api[-_]?key|e-?mail|smtp/i;
const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
const MAX_STRING = 500;
const MAX_ARRAY = 20;
const MAX_DEPTH = 4;

/** A copy of `value` that is safe to log. Exported for tests. */
export function redact(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (typeof value === "string") {
    const clean = value.replace(EMAIL, "[email]");
    return clean.length > MAX_STRING
      ? `${clean.slice(0, MAX_STRING)}… (${clean.length} chars)`
      : clean;
  }
  if (typeof value === "function") return "[function]";
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[circular]";
  seen.add(value);

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redact(value.message, depth + 1, seen),
      ...(isServer && value.stack ? { stack: redact(value.stack, depth + 1, seen) } : {}),
    };
  }
  if (depth >= MAX_DEPTH) return Array.isArray(value) ? "[array]" : "[object]";
  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ARRAY).map((item) => redact(item, depth + 1, seen));
    if (value.length > MAX_ARRAY) items.push(`… (${value.length - MAX_ARRAY} more)`);
    return items;
  }
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    out[key] = SECRET_KEY.test(key) ? "[redacted]" : redact(item, depth + 1, seen);
  }
  return out;
}

function write(level: Level, message: string, details: unknown[]) {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel()]) return;
  const safe = details.map((detail) => redact(detail));
  /* eslint-disable no-console -- the one place console is called */
  if (isServer) {
    const entry: Record<string, unknown> = { level, msg: redact(message) };
    if (safe.length === 1) entry.details = safe[0];
    else if (safe.length > 1) entry.details = safe;
    console[level](JSON.stringify(entry));
  } else {
    console[level](redact(message), ...safe);
  }
  /* eslint-enable no-console */
}

export const logger = {
  debug: (message: string, ...details: unknown[]) => write("debug", message, details),
  info: (message: string, ...details: unknown[]) => write("info", message, details),
  warn: (message: string, ...details: unknown[]) => write("warn", message, details),
  error: (message: string, ...details: unknown[]) => write("error", message, details),
};
