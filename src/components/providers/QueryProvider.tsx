// src/components/providers/QueryProvider.tsx
"use client";

import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { queryCachePolicy } from "@/lib/cache-policy";

/** Counts a failed data request in the site statistics, by what was being
 *  loaded (the query key's first parts) and the status. Loaded on first use. */
function reportQueryError(error: unknown, queryKey: readonly unknown[]) {
  const status = (error as { status?: number } | null)?.status;
  const what = queryKey.slice(0, 3).filter((part) => typeof part === "string").join(" / ");
  void import("@/lib/usage-tracking")
    .then(({ trackError }) => trackError("api_error", `${what}${status ? ` (${status})` : ""}`))
    .catch(() => undefined);
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error, query) => reportQueryError(error, query.queryKey),
        }),
        defaultOptions: {
          queries: {
            // Hooks set their own class; this covers queries that don't.
            ...queryCachePolicy("currentStandings"),
            retry: (failureCount: number, error: unknown) => {
              const status = (error as { status?: number } | null)?.status;
              // Don't retry on client errors (4xx), including 404s
              if (status !== undefined && status >= 400 && status < 500) return false;
              // Retry up to 2 times on server errors
              return failureCount < 2;
            },
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            // Add request deduplication
            refetchInterval: false,
            refetchIntervalInBackground: false,
            // Add error retry delay
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            retry: 1,
            retryDelay: 1000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} position="bottom" />
      )}
    </QueryClientProvider>
  );
}
