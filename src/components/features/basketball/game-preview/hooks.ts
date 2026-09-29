// Screen-size hook used by the game preview.

import { useEffect, useState } from "react";

// ─── Responsive Hook (inline) ────────────────────────────────────────────────

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}
