import { BasketballTableSkeleton } from "@/components/ui/LoadingSkeleton";

// What a page shows while its server-side data loads: the loading.tsx of
// every page that fetches on the server, and team pages' <Suspense>. Without
// it a click left the old page on screen, with no sign it had registered,
// until the backend answered (e2e/nav-speed.e2e.ts). At least a screen tall,
// so the footer stays below the fold when the page replaces it.
export default function PageLoading() {
  return (
    <div
      className="container mx-auto px-4 pt-6 min-h-screen"
      data-page-loading
      role="status"
      aria-label="Loading"
    >
      <div className="h-7 w-64 max-w-full bg-gray-300 dark:bg-gray-700 rounded mb-6 animate-pulse" />
      <BasketballTableSkeleton
        tableType="standings"
        rows={15}
        teamCols={5}
        showSummaryRows={false}
      />
    </div>
  );
}
