import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";
import { HOME_SPORT, SEASONS, SPORT_IDS } from "./src/config/seasons";
import { sportPagePath } from "./src/config/sports";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // Production optimizations.
  // NOTE: We intentionally do NOT override splitChunks here. The previous
  // override forced all of node_modules into a single ~288 kB "vendors" chunk
  // shared by every route (with chunks:"all", it even hoisted lazily-imported
  // libs like Recharts into the eager bundle). Next 14's default chunking
  // produces granular per-package chunks and keeps async-only deps in async
  // chunks, so each route loads closer to what it actually uses.
  ...(process.env.NODE_ENV === "production" && {
    compress: true,
  }),

  // Universal settings
  poweredByHeader: false,

  // The service worker (src/sw.ts) is bundled with esbuild by the Serwist
  // route handler at src/app/serwist/[path]/route.ts; keep esbuild out of
  // the server bundle (what @serwist/turbopack's withSerwist() does).
  serverExternalPackages: ["esbuild", "esbuild-wasm"],
  reactStrictMode: true,

  // Experimental features
  experimental: {
    optimizePackageImports: ["lucide-react", "chart.js", "react-chartjs-2"],
    optimizeCss: process.env.NODE_ENV === "production",
    webpackBuildWorker: true,
  },

  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "jthomprodbackend-production.up.railway.app",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "5000",
      },
    ],
  },

  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      // The front page shows HOME_SPORT (src/config/seasons.ts). Temporary
      // (307) so switching sports reaches returning visitors: browsers cache
      // a permanent redirect.
      {
        source: "/",
        destination: sportPagePath(HOME_SPORT, "wins"),
        permanent: false,
      },
      // The current season has no season in its URLs
      // (docs/decisions/url-policy.md): /football/2026-27/wins/ is the same
      // page as /football/wins/. Temporary (307), because at rollover the
      // same URL becomes an archive page. Query strings are kept.
      ...SPORT_IDS.map((sport) => ({
        source: `/${sport}/${SEASONS[sport].current}/:path*`,
        destination: `/${sport}/:path*/`,
        permanent: false,
      })),
    ];
  },

  async rewrites() {
    return [
      // Serve the service worker at /sw.js, the URL returning visitors'
      // browsers already have registered, so they update in place.
      { source: "/sw.js", destination: "/serwist/sw.js" },
      { source: "/sw.js.map", destination: "/serwist/sw.js.map" },
    ];
  },

  trailingSlash: true,
};

export default withBundleAnalyzer(nextConfig);
