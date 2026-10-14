import { BasketballTableSkeleton } from "@/components/ui/LoadingSkeleton";

// Shown as soon as a menu click starts the server render, instead of the old
// page staying on screen until the TWV data has loaded.
export default function Loading() {
  return (
    <div className="container mx-auto px-4 pt-6">
      <BasketballTableSkeleton
        tableType="standings"
        rows={15}
        teamCols={5}
        showSummaryRows={false}
      />
    </div>
  );
}
