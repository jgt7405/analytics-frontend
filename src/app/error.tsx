"use client"; // Error boundaries must be Client Components

import Link from "next/link";
import { useEffect } from "react";
import { logger } from "@/lib/logger";

// Shown inside the site layout (header stays) when a page fails to render.
// Without it visitors got Next's bare default error screen.
export default function PageError({
  error,
  retry,
  reset,
}: {
  error: Error & { digest?: string };
  retry?: () => void;
  reset?: () => void;
}) {
  useEffect(() => {
    logger.error("Page render failed", { message: error.message, digest: error.digest });
  }, [error]);

  const tryAgain = () => {
    if (retry) retry();
    else if (reset) reset();
    else window.location.reload();
  };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h2 className="mb-4 text-2xl font-semibold">Something went wrong</h2>
      <p className="mb-6 text-gray-600 dark:text-gray-300">
        This page could not be loaded. It is usually temporary.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={tryAgain}
          className="rounded bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded border border-gray-300 px-4 py-2 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-slate-800"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
