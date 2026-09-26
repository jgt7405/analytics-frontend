// src/components/providers/Providers.tsx
"use client";

import { SerwistProvider } from "@serwist/turbopack/react";
import { QueryProvider } from "./QueryProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // Registers the service worker (src/sw.ts, served at /sw.js) in
    // production builds only, like next-pwa did.
    <SerwistProvider
      swUrl="/sw.js"
      disable={process.env.NODE_ENV !== "production"}
    >
      <QueryProvider>{children}</QueryProvider>
    </SerwistProvider>
  );
}
