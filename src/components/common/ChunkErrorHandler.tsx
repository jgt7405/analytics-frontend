"use client";

import { useEffect } from "react";
import { setupChunkErrorHandler } from "@/lib/chunk-error-handler";

// Reloads the page once when a JS chunk fails to load (a visitor holding a
// tab open across a deploy). Must be a client component: the previous inline
// version lived in the server layout, so it never ran in the browser.
export default function ChunkErrorHandler() {
  useEffect(() => {
    setupChunkErrorHandler();
  }, []);
  return null;
}
