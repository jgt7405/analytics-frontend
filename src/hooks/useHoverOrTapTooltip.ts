"use client";

// Tooltip state for charts whose marks are also links (e.g. the schedule
// difficulty logos, which open the opponent's team page).
//
//   mouse   hover shows the tooltip, leaving hides it, click follows the link
//   touch   first tap shows the tooltip and keeps it open ("pinned"); tapping
//           the same mark again follows the link; tapping anywhere outside
//           the chart closes it
//
// Without this a tap fired the emulated mouseenter and the click together, so
// the tooltip flashed for a frame before the page navigated away.

import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

export function useHoverOrTapTooltip<T>(isSame: (a: T, b: T) => boolean) {
  const [active, setActive] = useState<T | null>(null);
  const [pinned, setPinned] = useState(false);
  const lastPointerType = useRef<string>("mouse");
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setActive(null);
    setPinned(false);
  }, []);

  // A pinned tooltip closes on a tap anywhere outside the chart.
  useEffect(() => {
    if (!pinned) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [pinned, close]);

  /** Event handlers for one mark; `follow` runs its link. */
  const markHandlers = (item: T, follow: () => void) => ({
    onPointerDown: (event: ReactPointerEvent) => {
      lastPointerType.current = event.pointerType;
    },
    onPointerEnter: (event: ReactPointerEvent) => {
      if (event.pointerType === "mouse" && !pinned) setActive(item);
    },
    onPointerLeave: (event: ReactPointerEvent) => {
      if (event.pointerType === "mouse" && !pinned) setActive(null);
    },
    onClick: (event: ReactMouseEvent) => {
      event.stopPropagation();
      const isTouch = lastPointerType.current !== "mouse";
      lastPointerType.current = "mouse";
      if (!isTouch || (pinned && active !== null && isSame(active, item))) {
        follow();
        return;
      }
      setActive(item);
      setPinned(true);
    },
  });

  return { active, pinned, close, rootRef, markHandlers };
}
