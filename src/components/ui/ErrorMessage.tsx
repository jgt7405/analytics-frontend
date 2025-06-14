"use client";

import {} from "@/components/ui/icons";
import { BasketballApiError } from "@/types/errors";

interface ErrorMessageProps {
  message?: string;
  error?: BasketballApiError | Error;
  onRetry?: () => void;
  retryLabel?: string;
  title?: string;
}

export default function ErrorMessage({
  message,
  error,
  onRetry,
  retryLabel = "Try again",
  title = "Error",
}: ErrorMessageProps) {
  const isApiError = error instanceof BasketballApiError;
  const displayMessage = isApiError
    ? error.apiError.userMessage
    : message || error?.message || "An error occurred";
  const canRetry = isApiError ? error.apiError.retryable : true;

  return (
    <div
      className="rounded-md bg-red-50 p-4 border border-red-200"
      role="alert"
      aria-live="polite"
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-red-400"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">{title}</h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{displayMessage}</p>
          </div>
          {canRetry && onRetry && (
            <div className="mt-3">
              <button
                onClick={onRetry}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-800 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                aria-label={`${retryLabel}: ${displayMessage}`}
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {retryLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
