// src/components/SeasonWrapper.tsx
"use client";

import { SeasonContextProvider } from "@/context/SeasonContext";

/**
 * SeasonWrapper is a client component that wraps your page content
 * with the SeasonContext provider.
 *
 * Usage in layout.tsx:
 * ```tsx
 * export default function Layout({ children }) {
 *   return (
 *     <SeasonWrapper>
 *       {children}
 *     </SeasonWrapper>
 *   );
 * }
 * ```
 */
export function SeasonWrapper({ children }: { children: React.ReactNode }) {
  return <SeasonContextProvider>{children}</SeasonContextProvider>;
}