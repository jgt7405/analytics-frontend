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
        config.watchOptions = {
          poll: 1000,
          aggregateTimeout: 300,
        };

        config.output = {
          ...config.output,
          chunkLoadTimeout: 300000,
        };

        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          path: false,
          os: false,
        };
      }
      return config;
    },
  }),

  // Production optimizations with CSS error fixes
  ...(process.env.NODE_ENV === "production" && {
    compress: true,
    webpack: (config, { dev, isServer }) => {
      if (!dev && !isServer) {
        config.optimization = {
          ...config.optimization,
          splitChunks: {
            ...config.optimization.splitChunks,
            cacheGroups: {
              ...config.optimization.splitChunks.cacheGroups,
              styles: false, // Prevent CSS chunk splitting that causes errors
            },
          },
        };
      }
      return config;
    },
  }),

  // Universal settings
  poweredByHeader: false,
  reactStrictMode: true,

  // Experimental features
  experimental: {
    optimizePackageImports: ["lucide-react"],
    optimizeCss: false, // Disable CSS optimization that creates bad selectors
  },

  // Image optimization
  images: {
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Headers
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
    ];
  },

  // Redirects
  async redirects() {
    return [
      {
        source: "/",
        destination: "/basketball/wins",
        permanent: false,
      },
    ];
  },
};

module.exports = withPWA(withBundleAnalyzer(nextConfig));
