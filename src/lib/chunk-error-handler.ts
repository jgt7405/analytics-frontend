// src/lib/chunk-error-handler.ts
export function setupChunkErrorHandler() {
  if (typeof window === "undefined") return;

  // Handle chunk load errors by refreshing the page once
  const handleChunkError = () => {
    const hasReloaded = sessionStorage.getItem("chunk-reload-attempted");

    if (!hasReloaded) {
      sessionStorage.setItem("chunk-reload-attempted", "true");
      window.location.reload();
    } else {
      // If we've already reloaded once, don't try again to avoid infinite loops
      console.error("Chunk load error persisted after reload");
      sessionStorage.removeItem("chunk-reload-attempted");
    }
  };

  // Listen for chunk load errors
  window.addEventListener("error", (event) => {
    if (event.message && event.message.includes("ChunkLoadError")) {
      handleChunkError();
    }
  });

  // Also handle unhandled promise rejections that might be chunk errors
  window.addEventListener("unhandledrejection", (event) => {
    if (event.reason && event.reason.name === "ChunkLoadError") {
      event.preventDefault();
      handleChunkError();
    }
  });

  // Clear the reload flag on successful navigation
  window.addEventListener("load", () => {
    if (sessionStorage.getItem("chunk-reload-attempted")) {
      sessionStorage.removeItem("chunk-reload-attempted");
    }
  });
}
