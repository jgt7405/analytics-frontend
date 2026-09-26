// Builds and serves the service worker (src/sw.ts) at /serwist/sw.js; a
// rewrite in next.config.js exposes it at /sw.js. Prerendered at build time.
import { createSerwistRoute } from "@serwist/turbopack";

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: "src/sw.ts",
    useNativeEsbuild: true,
    // Precache the app's own JS/CSS only. The old worker also precached all
    // of public/ (~18 MB of logos) on every first visit; images are cached
    // on first view instead (see runtimeCaching in src/sw.ts).
    globPatterns: [
      ".next/static/**/*.{js,css}",
      "public/{manifest.json,site.webmanifest}",
      "public/images/{favicon.ico,favicon-16x16.png,apple-touch-icon.png,JThom_Logo.png,JThom_Logo_Football.png}",
    ],
  });
