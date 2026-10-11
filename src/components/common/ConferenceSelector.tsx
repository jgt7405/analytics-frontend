// src/components/common/ConferenceSelector.tsx
"use client";

import { useId } from "react";

interface ConferenceSelectorProps {
  conferences: string[];
  selectedConference: string;
  onChange: (conference: string) => void;
  loading?: boolean;
  disabled?: boolean;
  error?: string;
  excludeConferences?: string[]; // ← NEW: Allow excluding specific conferences
  /**
   * Render in normal document flow instead of the default absolute
   * top-right positioning. Use when placing the selector inline next to a
   * card's own title (e.g. a bold section heading) rather than in
   * PageLayoutWrapper's page-header.
   */
  inline?: boolean;
}

export default function ConferenceSelector({
  conferences,
  selectedConference,
  onChange,
  loading = false,
  disabled = false,
  error,
  excludeConferences = [], // ← NEW: Default to empty array
  inline = false,
}: ConferenceSelectorProps) {
  // Filter out FCS and any specified conferences to exclude
  const filteredConferences = conferences.filter(
    (conf) => conf !== "FCS" && conf !== "Non D1" && conf !== "Non-D1" && !excludeConferences.includes(conf),
  );

  // A page can show the selector more than once (the standings page puts the
  // same one in the table header and in both history charts), so each copy
  // gets its own id for its label. (The error message is announced through
  // role="alert"; aria-describedby pointed at ids that were missing or
  // shared between copies.)
  const selectId = useId();

  return (
    <div className={inline ? "conference-selector-inline" : "conference-selector"}>
      <label htmlFor={selectId} className="sr-only">
        Select conference
      </label>
      <div className="relative">
        <select
          id={selectId}
          value={selectedConference}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || filteredConferences.length === 0}
          className={`px-3 py-1.5 border rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white min-w-[200px] transition-colors text-xs
           ${
             error
               ? "border-red-300 focus:ring-red-500 focus:border-red-500"
               : "border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
           }
           ${
             disabled || filteredConferences.length === 0
               ? "bg-gray-100 dark:bg-slate-700 text-gray-400 cursor-not-allowed"
               : "hover:border-gray-400"
           }
           focus:ring-2 focus:outline-none`}
          aria-invalid={!!error}
        >
          {filteredConferences.length === 0 ? (
            <option value="">Loading conferences...</option>
          ) : (
            filteredConferences.map((conference) => (
              <option key={conference} value={conference} className="text-xs">
                {conference}
              </option>
            ))
          )}
        </select>

        {loading && (
          <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {error && (
        <div
          className="mt-1 text-sm text-red-600"
          role="alert"
        >
          {error}
        </div>
      )}
    </div>
  );
}
