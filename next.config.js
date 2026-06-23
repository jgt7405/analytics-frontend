/* eslint-disable @typescript-eslint/no-var-requires */
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

// Conditional PWA setup
const withPWA =
  process.env.NODE_ENV === "production"
    ? require("next-pwa")({
        dest: "public",
        disable: false,
        register: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern:
              /^https:\/\/analytics-backend-production\.up\.railway\.app\/api\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 64,
                maxAgeSeconds: 5 * 60,
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: {
                maxEntries: 64,
                maxAgeSeconds: 24 * 60 * 60,
              },
            },
          },
        ],
      })
    : (config) => config;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Development optimizations
  ...(process.env.NODE_ENV === "development" && {
    webpack: (config, { dev, isServer }) => {
      if (dev && !isServer) {
        config.output = {
          ...config.output,
          chunkLoadTimeout: 600000,
        };
        config.watchOptions = {
          poll: 1000,
          aggregateTimeout: 300,
          ignored: ["**/node_modules", "**/.git", "**/.next"],
        };
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          path: false,
          os: false,
        };
        config.resolve.symlinks = false;
        config.cache = {
          type: "filesystem",
          cacheDirectory: require("path").resolve(".next/cache/webpack"),
        };
      }
      return config;
    },
  }),

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
  reactStrictMode: true,

  // Experimental features
  experimental: {
    optimizePackageImports: ["lucide-react", "chart.js", "react-chartjs-2"],
    optimizeCss: process.env.NODE_ENV === "production",
    webpackBuildWorker: true,
    missingSuspenseWithCSRBailout: false,
  },

  // Middleware options (moved out of experimental in Next.js 14.2)
  skipMiddlewareUrlNormalize: true,

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
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
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

module.exports = withPWA(withBundleAnalyzer(nextConfig));
