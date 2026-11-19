"use client";

import { useId } from "react";

// The options above each non-conference table: whether games between two
// teams of the same conference are counted (Include / Exclude), and whether
// the Exp Win % and TWV 50 columns are shown (Yes / No). The active option is
// shaded in the site's teal with white text, the other plain gray.

interface ChoiceToggleProps {
  label: string;
  options: readonly (readonly [string, boolean])[];
  value: boolean;
  onChange: (value: boolean) => void;
}

function ChoiceToggle({ label, options, value, onChange }: ChoiceToggleProps) {
  // Unique per instance: the page has a set of options above each table
  const labelId = useId();
  return (
    <div role="group" aria-labelledby={labelId} className="flex items-center gap-2">
      <span id={labelId}>{label}</span>
      <div className="inline-flex overflow-hidden rounded border border-solid border-gray-300 bg-white text-xs dark:border-slate-600 dark:bg-slate-800">
        {options.map(([optionLabel, optionValue]) => {
          const active = value === optionValue;
          return (
            <button
              key={optionLabel}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(optionValue)}
              className={`border-0 px-2 py-0.5 shadow-none transition-colors first:border-r first:border-solid first:border-gray-300 dark:first:border-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#007a91] ${
                active
                  ? "bg-[#0097b2] font-semibold text-white"
                  : "bg-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {optionLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const INCLUDE_EXCLUDE = [
  ["Include", true],
  ["Exclude", false],
] as const;

const YES_NO = [
  ["Yes", true],
  ["No", false],
] as const;

interface TableOptionsProps {
  includeSameConf: boolean;
  onIncludeSameConfChange: (includeSameConf: boolean) => void;
  showTwv: boolean;
  onShowTwvChange: (showTwv: boolean) => void;
}

export default function TableOptions({
  includeSameConf,
  onIncludeSameConfChange,
  showTwv,
  onShowTwvChange,
}: TableOptionsProps) {
  return (
    // Label text matches the explainer under the table (text-xs gray)
    <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-600 dark:text-gray-300">
      <ChoiceToggle
        label="Games vs Same Conference Opponents:"
        options={INCLUDE_EXCLUDE}
        value={includeSameConf}
        onChange={onIncludeSameConfChange}
      />
      <ChoiceToggle
        label="Show Exp Win % and TWV 50:"
        options={YES_NO}
        value={showTwv}
        onChange={onShowTwvChange}
      />
    </div>
  );
}
