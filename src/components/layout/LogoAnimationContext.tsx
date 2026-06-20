"use client";

import { useRouter } from "next/navigation";
import { createContext, ReactNode, useCallback, useContext, useRef } from "react";

export type Sport = "basketball" | "football";
type Switcher = (sport: Sport, url: string) => void;

interface LogoAnimationContextValue {
  // The AnimatedLogo registers the function that plays the fly-out animation.
  registerSwitcher: (fn: Switcher | null) => void;
  // The nav calls this to switch sports; falls back to a plain navigation when
  // the animation isn't available (e.g. before the logo has mounted).
  switchSport: (sport: Sport, url: string) => void;
}

const LogoAnimationContext = createContext<LogoAnimationContextValue | null>(null);

export function LogoAnimationProvider({ children }: { children: ReactNode }) {
  const switcherRef = useRef<Switcher | null>(null);
  const router = useRouter();

  const registerSwitcher = useCallback((fn: Switcher | null) => {
    switcherRef.current = fn;
  }, []);

  const switchSport = useCallback(
    (sport: Sport, url: string) => {
      if (switcherRef.current) {
        switcherRef.current(sport, url);
      } else {
        router.push(url);
      }
    },
    [router],
  );

  return (
    <LogoAnimationContext.Provider value={{ registerSwitcher, switchSport }}>
      {children}
    </LogoAnimationContext.Provider>
  );
}

// Returns null when used outside the provider so callers can fall back to
// default navigation rather than crashing.
export function useLogoAnimation() {
  return useContext(LogoAnimationContext);
}
