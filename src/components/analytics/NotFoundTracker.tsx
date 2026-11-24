"use client";

import { useEffect } from "react";

/** Counts a missing page in the site statistics (rendered by not-found.tsx). */
export function NotFoundTracker() {
  useEffect(() => {
    void import("@/lib/usage-tracking")
      .then(({ trackError }) => trackError("not_found", window.location.pathname))
      .catch(() => undefined);
  }, []);
  return null;
}
