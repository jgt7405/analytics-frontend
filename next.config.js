const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
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
      {
        source: "/",
        destination: "/football/wins/",
        permanent: true,
      },
    ];
  },

  // TEMPORARY: Show 2025-26 season content on base basketball pages.
  // To revert, delete this rewrites() block.
  async rewrites() {
    const seasonPages = [
      "home", "wins", "standings", "schedule", "cwv", "twv",
      "teams", "compare", "conf-data", "conf-tourney", "ncaa-tourney", "seed",
    ];
    return [
      // Serve the service worker at /sw.js, the URL returning visitors'
      // browsers already have registered, so they update in place.
      { source: "/sw.js", destination: "/serwist/sw.js" },
      { source: "/sw.js.map", destination: "/serwist/sw.js.map" },
      ...seasonPages.map((page) => ({
        source: `/basketball/${page}/`,
        destination: `/basketball/2025-26/${page}/`,
      })),
      // NOTE: Do NOT rewrite /basketball/team/:teamname/ to the [season] route.
      // The [season] layout sets robots:{index:false}, which would make every
      // basketball team page noindex. The base /basketball/team/[teamname] route
      // already renders current-season data (mirrors football), so let it serve.
    ];
  },

  trailingSlash: true,
};

module.exports = withBundleAnalyzer(nextConfig);
