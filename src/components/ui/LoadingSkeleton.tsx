// src/components/ui/LoadingSkeleton.tsx
"use client";

export function TableSkeleton({
  rows = 5,
  cols = 6,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="border border-border rounded-md overflow-hidden">
      <div className="bg-muted/30 p-4 border-b">
        <div className="flex gap-4">
          <div className="h-4 w-20 bg-muted animate-pulse rounded" />
          {Array.from({ length: cols - 1 }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-8 bg-muted animate-pulse rounded-full"
            />
          ))}
        </div>
      </div>

      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-b last:border-b-0">
          <div className="h-4 w-6 bg-muted animate-pulse rounded" />
          {Array.from({ length: cols - 1 }).map((_, j) => (
            <div key={j} className="h-4 w-12 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function BoxWhiskerSkeleton() {
  return (
    <div className="h-96 border border-border rounded-md bg-card p-6">
      <div className="flex items-end justify-center gap-8 h-full">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div
              className="w-12 bg-muted animate-pulse"
              style={{ height: `${Math.random() * 200 + 50}px` }}
            />
            <div className="w-8 h-8 bg-muted animate-pulse rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// New enhanced basketball-specific skeletons with FIXED heights
export function BasketballTableSkeleton({
  rows = 8,
  teamCols = 10,
  tableType = "standings",
  showSummaryRows = true,
}: {
  rows?: number;
  teamCols?: number;
  tableType?: "standings" | "wins" | "cwv" | "schedule";
  showSummaryRows?: boolean;
}) {
  return (
    <div className="overflow-x-auto border border-gray-200 rounded-md bg-white">
      <div className="min-w-full">
        {/* Header skeleton */}
        <div className="bg-gray-50 border-b border-gray-200 p-3 sticky top-0 z-10">
          <div className="flex gap-4 items-center">
            <div className="h-4 w-32 bg-gray-300 animate-pulse rounded flex-shrink-0" />
            {Array.from({ length: teamCols }).map((_, i) => (
              <div
                key={i}
                className="h-8 w-8 bg-gray-300 animate-pulse rounded-full flex-shrink-0"
              />
            ))}
          </div>
        </div>

        {/* Row skeletons */}
        <div className="divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="p-3 hover:bg-gray-50">
              <div className="flex gap-4 items-center">
                <div className="h-4 w-6 bg-gray-200 animate-pulse rounded flex-shrink-0" />
                {Array.from({ length: teamCols }).map((_, j) => (
                  <div
                    key={j}
                    className={`h-6 bg-gray-200 animate-pulse rounded flex-shrink-0 ${
                      tableType === "cwv" ? "w-8" : "w-12"
                    }`}
                    style={{
                      animationDelay: `${(i * teamCols + j) * 50}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Summary rows skeleton */}
        {showSummaryRows && (
          <div className="bg-gray-50 border-t-2 border-gray-400">
            {Array.from({ length: tableType === "standings" ? 2 : 3 }).map(
              (_, i) => (
                <div
                  key={i}
                  className="p-3 border-b border-gray-200 last:border-b-0"
                >
                  <div className="flex gap-4 items-center">
                    <div className="h-4 w-24 bg-gray-300 animate-pulse rounded flex-shrink-0" />
                    {Array.from({ length: teamCols }).map((_, j) => (
                      <div
                        key={j}
                        className="h-4 w-8 bg-gray-300 animate-pulse rounded flex-shrink-0"
                      />
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-6">
        <div className="h-8 w-64 bg-gray-300 rounded mb-4" />
        <div className="h-10 w-48 bg-gray-200 rounded" />
      </div>

      {/* Content skeleton */}
      <div className="space-y-6">
        <BasketballTableSkeleton />
      </div>
    </div>
  );
}

export function ConferenceSelectorSkeleton() {
  return (
    <div className="conference-selector">
      <div className="relative">
        <div className="px-3 py-2 border border-gray-300 rounded-md bg-white min-w-[200px] text-xs">
          <div className="h-4 w-32 bg-gray-300 animate-pulse rounded" />
        </div>
      </div>
      {/* Hidden help text to match real component */}
      <div className="sr-only">Loading conferences...</div>
    </div>
  );
}

// FIXED BoxWhiskerChartSkeleton with deterministic heights
export function BoxWhiskerChartSkeleton() {
  // Predefined heights to avoid hydration mismatch
  const predefinedHeights = [
    120, 180, 90, 150, 200, 110, 160, 80, 140, 170, 100, 190,
  ];

  return (
    <div className="relative w-full overflow-x-auto bg-white rounded-md border border-gray-200 p-6">
      <div className="flex items-end justify-center gap-4 h-80">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            {/* Whisker skeleton with fixed height */}
            <div
              className="w-8 bg-gray-300 animate-pulse rounded"
              style={{
                height: `${predefinedHeights[i] || 120}px`,
                animationDelay: `${i * 100}ms`,
              }}
            />
            {/* Logo skeleton */}
            <div className="w-8 h-8 bg-gray-300 animate-pulse rounded-full" />
          </div>
        ))}
      </div>

      {/* Y-axis skeleton */}
      <div className="absolute left-2 top-6 space-y-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-3 w-4 bg-gray-300 animate-pulse rounded" />
        ))}
      </div>
    </div>
  );
}
