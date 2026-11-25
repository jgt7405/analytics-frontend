import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False on the server and during hydration, true on every render after that
 * (and from the first render for components mounted later on the client).
 *
 * Data that only the browser fetches must not change what a component
 * renders while it hydrates: the server rendered its loading state, so the
 * hydration render has to as well. Code-split components (next/dynamic)
 * hydrate late, by which time a query another component started may already
 * have data; rendering it then is a hydration mismatch (React error #418).
 */
export function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
