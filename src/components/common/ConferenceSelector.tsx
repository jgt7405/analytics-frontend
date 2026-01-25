// src/components/common/ConferenceSelector.tsx
"use client";

interface ConferenceSelectorProps {
  conferences: string[];
  selectedConference: string;
  onChange: (conference: string) => void;
  loading?: boolean;
  disabled?: boolean;
  error?: string;
  excludeConferences?: string[]; // ← NEW: Allow excluding specific conferences
}

export default function ConferenceSelector({
  conferences,
  selectedConference,
  onChange,
  loading = false,
  disabled = false,
  error,
  excludeConferences = [], // ← NEW: Default to empty array
}: ConferenceSelectorProps) {
  // Filter out FCS and any specified conferences to exclude
  const filteredConferences = conferences.filter(
    (conf) => conf !== "FCS" && !excludeConferences.includes(conf),
  );

  return (
    <div className="conference-selector">
      <div className="relative">
        <select
          id="conference-select"
          value={selectedConference}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || filteredConferences.length === 0}
          className={`px-3 py-1.5 border rounded-md bg-white min-w-[200px] transition-colors text-xs
           ${
             error
               ? "border-red-300 focus:ring-red-500 focus:border-red-500"
               : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
           }
           ${
             disabled || filteredConferences.length === 0
               ? "bg-gray-100 text-gray-400 cursor-not-allowed"
               : "hover:border-gray-400"
           }
           focus:ring-2 focus:outline-none`}
          aria-describedby={error ? "conference-error" : "conference-help"}
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
          id="conference-error"
          className="mt-1 text-sm text-red-600"
          role="alert"
        >
          {error}
        </div>
      )}
    </div>
  );
}
