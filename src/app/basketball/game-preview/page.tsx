"use client";

import GamePreviewPageContent from "@/components/features/basketball/game-preview";
import { Suspense } from "react";

// useSearchParams (?game=) needs a Suspense boundary; without one Next 16
// fails the build (Next 14 silently client-rendered the whole page instead).
export default function GamePreviewPage() {
  return (
    <Suspense fallback={null}>
      <GamePreviewPageContent />
    </Suspense>
  );
}
