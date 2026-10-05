import type { KeyboardEvent } from "react";

/**
 * Arrow-key navigation for a search box and its result buttons, all inside
 * the element that gets this handler: Down moves from the box to the first
 * result and on to the next one, Up moves back and from the first result to
 * the box. Disabled results are skipped. Tab and Enter work as before.
 */
export function handleListArrowKeys(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  const container = event.currentTarget;
  const items = Array.from(container.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
  if (items.length === 0) return;
  const index = items.indexOf(document.activeElement as HTMLButtonElement);
  event.preventDefault();
  if (event.key === "ArrowDown") {
    items[Math.min(index + 1, items.length - 1)].focus();
  } else if (index <= 0) {
    container.querySelector("input")?.focus();
  } else {
    items[index - 1].focus();
  }
}
