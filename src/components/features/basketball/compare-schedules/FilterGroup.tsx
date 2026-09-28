"use client";

// One labelled row of toggle buttons ("Compare against", "Show games",
// "Location").

interface FilterGroupProps<T extends string> {
  label: string;
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
}

export default function FilterGroup<T extends string>({
  label,
  options,
  selected,
  onSelect,
}: FilterGroupProps<T>) {
  return (
    <div>
      <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <div className="flex flex-wrap gap-0.5 md:gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onSelect(option.value)}
            className={`px-1 md:px-4 py-0.5 md:py-1 text-xs md:text-base rounded-md border transition-colors ${
              selected === option.value
                ? "bg-[rgb(0,151,178)] text-white border-[rgb(0,151,178)]"
                : "bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
