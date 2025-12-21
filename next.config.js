/* eslint-disable @typescript-eslint/no-var-requires */
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});
const path = require("path");

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
        // Increase chunk load timeout for development
        config.output = {
          ...config.output,
          chunkLoadTimeout: 600000, // 10 minutes instead of 2 minutes
        };

        // Improve watch options
        config.watchOptions = {
          poll: 1000,
          aggregateTimeout: 300,
          ignored: ["**/node_modules", "**/.git", "**/.next"],
        };

        // Better resolve configuration
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          path: false,
          os: false,
        };

        // Improve module resolution
        config.resolve.symlinks = false;

        // Better cache configuration - FIX: Use absolute path
        config.cache = {
          type: "filesystem",
          cacheDirectory: path.resolve(".next/cache/webpack"),
        };
      }
      return config;
    },
  }),

  // Production optimizations
  ...(process.env.NODE_ENV === "production" && {
    compress: true,
    webpack: (config) => {
      // Production webpack optimizations
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: "all",
          cacheGroups: {
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: "vendors",
              priority: -10,
              chunks: "all",
            },
          },
        },
      };
      return config;
    },
  }),

  // Universal settings
  poweredByHeader: false,
  reactStrictMode: true,

  // MOVED: These options are no longer experimental
  skipMiddlewareUrlNormalize: true,
  skipTrailingSlashRedirect: true,

  // Force disable type checking and linting during builds
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Experimental features - FIXED: Removed moved options
  experimental: {
    optimizePackageImports: ["lucide-react"],
    optimizeCss: process.env.NODE_ENV === "production",
    webpackBuildWorker: true,
    missingSuspenseWithCSRBailout: false,
  },

  // Image optimization - conditional unoptimized for production only
  images: {
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    ...(process.env.NODE_ENV === "production" && {
      unoptimized: true,
    }),
  },

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Headers with better caching
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
      // Cache static assets longer
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
};

module.exports = withPWA(withBundleAnalyzer(nextConfig));
