"use client";

// Supplies a server-detected initial `isMobile` to useResponsive so the first
// (SSR + first client) render already uses the right sizing on phones — no
// post-hydration flip, no layout shift, and SSR/client agree so there's no
// hydration mismatch. Components rendered outside this provider keep the old
// desktop-default behavior (fully backward-compatible).
import { createContext } from "react";

export const InitialResponsiveContext = createContext<{
  isMobile: boolean;
} | null>(null);

export function ResponsiveProvider({
  initialIsMobile,
  children,
}: {
  initialIsMobile: boolean;
  children: React.ReactNode;
}) {
  return (
    <InitialResponsiveContext.Provider value={{ isMobile: initialIsMobile }}>
      {children}
    </InitialResponsiveContext.Provider>
  );
}
