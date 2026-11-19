"use client";

// Include / Exclude control above the non-conference table: whether games
// between two teams of the same conference are counted. The active word is
// in the site's teal, the other gray.

const OPTIONS = [
  ["Include", true],
  ["Exclude", false],
] as const;

interface SameConfToggleProps {
  includeSameConf: boolean;
  onChange: (includeSameConf: boolean) => void;
}

export default function SameConfToggle({ includeSameConf, onChange }: SameConfToggleProps) {
  return (
    <div
      role="group"
      aria-labelledby="same-conf-games-label"
      className="mb-3 flex flex-wrap items-center gap-2 text-sm text-gray-700 dark:text-gray-200"
    >
      <span id="same-conf-games-label">Show Games vs Same Conference Opponents:</span>
      <div className="inline-flex overflow-hidden rounded border border-solid border-gray-300 bg-white text-xs dark:border-slate-600 dark:bg-slate-800">
        {OPTIONS.map(([label, value]) => {
          const active = includeSameConf === value;
          return (
            <button
              key={label}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(value)}
              className={`border-0 bg-transparent px-2 py-0.5 shadow-none transition-colors first:border-r first:border-solid first:border-gray-300 dark:first:border-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#007a91] ${
                active
                  ? "font-semibold text-[#0097b2]"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
