// src/hooks/useResponsive.ts
"use client";

import { InitialResponsiveContext } from "@/components/providers/ResponsiveProvider";
import {
  DESKTOP_EXPORT_WIDTH,
  isDesktopLayoutForced,
  subscribeDesktopLayout,
} from "@/lib/export/desktop-layout-state";
import { useContext, useEffect, useState, useSyncExternalStore } from "react";

export function useResponsive() {
  // When a ResponsiveProvider is present (set from the server-detected
  // User-Agent), seed isMobile so the first paint matches the device and
  // doesn't shift after hydration. Without a provider, this is `false` —
  // identical to the previous default.
  const initial = useContext(InitialResponsiveContext);
  const [dimensions, setDimensions] = useState({
    isMobile: initial?.isMobile ?? false,
    isTablet: false,
    isDesktop: false,
    width: 0,
    height: 0,
    isHydrated: false,
  });
  // While a screenshot is being taken on a narrow screen, render as desktop
  // so the image looks the same from any device (lib/export/desktop-layout).
  const forceDesktop = useSyncExternalStore(
    subscribeDesktopLayout,
    isDesktopLayoutForced,
    () => false,
  );

  useEffect(() => {
    const updateDimensions = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setDimensions({
        width,
        height,
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        isHydrated: true,
      });
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  if (forceDesktop) {
    return {
      ...dimensions,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      width: Math.max(dimensions.width, DESKTOP_EXPORT_WIDTH),
    };
  }
  return dimensions;
}

// Add default export for backwards compatibility
export default useResponsive;
