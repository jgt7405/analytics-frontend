// Content-Security-Policy, sent as Content-Security-Policy-Report-Only
// (next.config.ts) while reports are collected; enforcing it needs the
// owner's OK (docs/ARCHITECTURE_PLAN.md, step 10).
//
// Sources, from what the pages load:
// - Inline scripts: Next's bootstrap and the Google Analytics snippet.
// - html2canvas (image exports, game preview PDF) and jsPDF (game preview
//   PDF) come from their CDNs.
// - Vercel Analytics and Speed Insights use same-origin /_vercel URLs; data
//   goes through /api/proxy; logos through /_next/image; fonts are
//   self-hosted by next/font.
// - Exports draw into data: and blob: URLs.

export const CSP_REPORT_PATH = "/api/csp-report/";

const GOOGLE_ANALYTICS = [
  "https://www.googletagmanager.com",
  "https://*.google-analytics.com",
  "https://*.analytics.google.com",
];

const DIRECTIVES: Record<string, string[]> = {
  "default-src": ["'self'"],
  "script-src": [
    "'self'",
    "'unsafe-inline'",
    "https://www.googletagmanager.com",
    "https://html2canvas.hertzen.com",
    "https://cdnjs.cloudflare.com",
  ],
  "connect-src": ["'self'", ...GOOGLE_ANALYTICS],
  "img-src": ["'self'", "data:", "blob:", ...GOOGLE_ANALYTICS],
  "style-src": ["'self'", "'unsafe-inline'"],
  "font-src": ["'self'", "data:"],
  "worker-src": ["'self'"],
  "manifest-src": ["'self'"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'none'"],
  "report-uri": [CSP_REPORT_PATH],
  "report-to": ["csp"],
};

export const CONTENT_SECURITY_POLICY = Object.entries(DIRECTIVES)
  .map(([directive, sources]) => `${directive} ${sources.join(" ")}`)
  .join("; ");

// Reporting API endpoint named by report-to (newer browsers); report-uri
// covers the rest.
export const REPORTING_ENDPOINTS = `csp="${CSP_REPORT_PATH}"`;
