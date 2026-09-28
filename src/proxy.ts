import { NextResponse, type NextRequest } from "next/server";

// Team names with a period (St. John's, Stephen F. Austin) look like file
// names to Next's trailing-slash rule, which skips them, so
// /basketball/team/St.%20Bonaventure served the page without the slash
// instead of redirecting like every other URL. A redirect in next.config
// can't do this: with `trailingSlash` its source also matches the slash URL
// and loops. The matcher only lets team paths containing a period through.
export function proxy(request: NextRequest) {
  // A plain URL: NextURL applies the same file-name rule and drops the slash.
  const url = new URL(request.url);
  if (url.pathname.endsWith("/")) return NextResponse.next();
  url.pathname = `${url.pathname}/`;
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: [
    "/(basketball|football)/team/:name([^/]*\\.[^/]*)",
    "/(basketball|football)/:season(\\d{4}-\\d{2})/team/:name([^/]*\\.[^/]*)",
  ],
};
