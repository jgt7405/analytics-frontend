// Where a visit came from, for the site statistics tracker. Loaded by
// PageTracker only when it sends a visit's first page view, so it stays out of
// every page's first-load JS.

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;

function bareHost(host: string) {
  return host.toLowerCase().replace(/^www\./, "");
}

/**
 * Where this visit came from, sent with its first page view only. The
 * referrer keeps its scheme, host and path; its query string and fragment
 * (where tokens and personal details travel) never leave the browser. A
 * referrer from this site itself (a reload, or a link opened in a new tab)
 * is not a source.
 */
export function entryAttribution(referrer: string, ownHost: string, searchParams: URLSearchParams) {
  let source: string | null = null;
  if (referrer) {
    try {
      const url = new URL(referrer);
      if (bareHost(url.hostname) !== bareHost(ownHost)) {
        source = `${url.protocol}//${url.host}${url.pathname}`.slice(0, 500);
      }
    } catch {
      source = null;
    }
  }
  const tags = Object.fromEntries(
    UTM_KEYS.map((key) => [key, searchParams.get(key)?.trim().slice(0, 100) || null]),
  ) as Record<(typeof UTM_KEYS)[number], string | null>;
  return { referrer: source, ...tags };
}
