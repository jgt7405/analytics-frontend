// Screen-size hook used by the game preview.

import { useResponsive } from "@/hooks/useResponsive";

/** Phone layout at 768 px and below (useResponsive's isMobile is < 768);
 *  false until hydrated, as before. */
export function useIsMobile() {
  const { width, isHydrated } = useResponsive();
  return isHydrated && width <= 768;
}
