"use client";

import { useMonitoring } from "@/lib/unified-monitoring";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function PageTracker() {
  const pathname = usePathname();
  const { trackEvent } = useMonitoring(); // Remove trackPageView

  useEffect(() => {
    trackEvent({
      name: "page_view",
      properties: { page: pathname },
    });
  }, [pathname, trackEvent]);

  return null;
}
