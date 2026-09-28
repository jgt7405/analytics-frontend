"use client";

// One labelled row of toggle buttons ("Compare against", "Show games",
// "Location").

interface FilterGroupProps<T extends string> {
  label: string;
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
  isMobile: boolean;
  /** Let the buttons wrap onto a second line. */
  wrap?: boolean;
}

export default function FilterGroup<T extends string>({
  label,
  options,
  selected,
  onSelect,
  isMobile,
  wrap = false,
}: FilterGroupProps<T>) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
      <div className={wrap ? "flex flex-wrap gap-2" : "flex gap-2"}>
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onSelect(option.value)}
            className={`${isMobile ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"} rounded-md border transition-colors ${
              selected === option.value
                ? "bg-[rgb(0,151,178)] text-white border-[rgb(0,151,178)]"
                : "bg-white hover:bg-gray-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
