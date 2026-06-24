// Server-side device hint. Reads the request User-Agent so dynamic
// (force-dynamic) pages can render mobile-sized markup on the FIRST paint,
// avoiding the layout shift that otherwise happens when useResponsive flips
// from its desktop default to mobile after hydration.
//
// Calling headers() opts the caller into dynamic rendering — only use this in
// pages that are already `export const dynamic = "force-dynamic"`.
import { headers } from "next/headers";

const MOBILE_UA = /Mobi|Android|iPhone|iPod|IEMobile|BlackBerry|Opera Mini/i;

export function detectMobileFromHeaders(): boolean {
  try {
    const ua = headers().get("user-agent") || "";
    return MOBILE_UA.test(ua);
  } catch {
    // headers() unavailable (e.g. static context) — fall back to desktop,
    // which matches useResponsive's pre-hydration default.
    return false;
  }
}
