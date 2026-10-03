"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keyboard and focus behavior for a modal dialog (step 10 accessibility):
 * while open, focus moves into the dialog, Tab and Shift+Tab stay inside it
 * and Escape closes it; when it closes, focus returns to whatever had it
 * before (usually the button that opened it).
 *
 * The dialog element gets focus itself (it needs tabIndex={-1}), not its
 * first control, so opening it by mouse shows no focus ring.
 */
export function useDialog(
  dialogRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
  onClose: () => void,
  { canClose = true }: { canClose?: boolean } = {},
) {
  const onCloseRef = useRef(onClose);
  const canCloseRef = useRef(canClose);
  useEffect(() => {
    onCloseRef.current = onClose;
    canCloseRef.current = canClose;
  });

  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      if (event.key === "Escape") {
        if (canCloseRef.current) {
          event.preventDefault();
          onCloseRef.current();
        }
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      // Skip an opener that's gone or hidden (the mobile menu closes when
      // Contact is picked).
      if (opener?.isConnected && opener.getClientRects().length > 0) opener.focus();
    };
  }, [isOpen, dialogRef]);
}
