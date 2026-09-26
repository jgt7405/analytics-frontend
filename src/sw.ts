/// <reference lib="webworker" />
// Service worker, bundled by the Serwist route handler
// (src/app/serwist/[path]/route.ts) and served at /sw.js.
//
// Replaces next-pwa with the same behavior: take over immediately, precache
// the build's static JS/CSS, and cache images on first view (CacheFirst,
// 24 h, 64 entries). API data is never cached here; the CDN and React Query
// handle freshness (docs/data-flow.md).
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Caches created by the old next-pwa worker. Serwist uses its own cache
// names, so these would otherwise sit in visitors' browsers indefinitely.
const LEGACY_CACHE_PREFIXES = ["workbox-precache", "image-cache", "api-cache"];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: { cleanupOutdatedCaches: true },
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching: [
    {
      matcher: ({ request, url }) =>
        request.destination === "image" ||
        /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i.test(url.pathname),
      handler: new CacheFirst({
        cacheName: "images",
        plugins: [
          new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 }),
        ],
      }),
    },
  ],
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => LEGACY_CACHE_PREFIXES.some((prefix) => name.startsWith(prefix)))
            .map((name) => caches.delete(name)),
        ),
      ),
  );
});

serwist.addEventListeners();
