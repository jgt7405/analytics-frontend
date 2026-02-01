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
          cacheDirectory: ".next/cache/webpack",
        };
      }
      return config;
    },
  }),

  // Production optimizations
  ...(process.env.NODE_ENV === "production" && {
    compress: true,
    webpack: (config) => {
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

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  experimental: {
    optimizePackageImports: ["lucide-react"],
    optimizeCss: process.env.NODE_ENV === "production",
    webpackBuildWorker: true,
    missingSuspenseWithCSRBailout: false,
    skipMiddlewareUrlNormalize: true,
    skipTrailingSlashRedirect: true,
  },

  images: {
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
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
        destination: "/basketball/wins",
        permanent: false,
      },
      {
        source: "/sitemap.xml",
        destination:
          "https://jthomprodbackend-production.up.railway.app/api/sitemap.xml",
        permanent: false,
      },
    ];
  },

  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

module.exports = withPWA(withBundleAnalyzer(nextConfig));
