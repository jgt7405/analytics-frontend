// src/hooks/useResponsive.ts
"use client";

import { useEffect, useState } from "react";

export function useResponsive() {
  const [dimensions, setDimensions] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    width: 0,
    height: 0,
    isHydrated: false,
  });

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

  return dimensions;
}

// Add default export for backwards compatibility
export default useResponsive;
