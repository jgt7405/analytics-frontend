// src/components/common/TeamMultiSearch.tsx
"use client";

import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface TeamMultiSearchProps {
  /** Full pool of team names to suggest from (deduped upstream is fine either way). */
  teamNames: string[];
  /** Currently selected teams. */
  selectedTeams: string[];
  onChange: (teams: string[]) => void;
  placeholder?: string;
  /** Fires once, the first time the input is focused - use to lazy-load the suggestion pool. */
  onActivate?: () => void;
  className?: string;
}

const MAX_SUGGESTIONS = 8;

export default function TeamMultiSearch({
  teamNames,
  selectedTeams,
  onChange,
  placeholder = "Search by team...",
  onActivate,
  className,
}: TeamMultiSearchProps) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasActivatedRef = useRef(false);

  const suggestions = useMemo(() => {
    const query = inputValue.trim().toLowerCase();
    const selectedSet = new Set(selectedTeams);
    const unique = Array.from(new Set(teamNames)).filter(
      (name) => !selectedSet.has(name),
    );
    const matches = query
      ? unique.filter((name) => name.toLowerCase().includes(query))
      : unique;
    return matches
      .sort((a, b) => a.localeCompare(b))
      .slice(0, MAX_SUGGESTIONS);
  }, [teamNames, selectedTeams, inputValue]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [suggestions.length, inputValue]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addTeam = (team: string) => {
    if (!selectedTeams.includes(team)) {
      onChange([...selectedTeams, team]);
    }
    setInputValue("");
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const removeTeam = (team: string) => {
    onChange(selectedTeams.filter((t) => t !== team));
  };

  const handleFocus = () => {
    if (!hasActivatedRef.current) {
      hasActivatedRef.current = true;
      onActivate?.();
    }
    setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = suggestions[highlightedIndex];
      if (pick) addTeam(pick);
    } else if (e.key === "Backspace" && inputValue === "" && selectedTeams.length > 0) {
      removeTeam(selectedTeams[selectedTeams.length - 1]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className={className ? className : "relative"}>
      {selectedTeams.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selectedTeams.map((team) => (
            <span
              key={team}
              className="inline-flex items-center gap-1 rounded-full bg-teal-50 dark:bg-teal-900/30 px-2.5 py-1 text-xs font-medium text-teal-800 dark:text-teal-200 shadow-[inset_0_0_0_1px_rgb(13_148_136_/_0.28)] dark:shadow-[inset_0_0_0_1px_rgb(45_212_191_/_0.35)]"
            >
              {team}
              <button
                type="button"
                onClick={() => removeTeam(team)}
                aria-label={`Remove ${team}`}
                className="rounded-full p-0.5 text-teal-600 hover:bg-teal-100 hover:text-teal-900 dark:text-teal-300 dark:hover:bg-teal-800/60 dark:hover:text-white transition-colors"
              >
                <X className="h-3 w-3" strokeWidth={2.5} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500"
          strokeWidth={2}
        />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 py-1.5 pl-8 pr-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-[0_1px_2px_rgb(15_23_42_/_0.06)] transition-shadow focus:outline-none focus:ring-2 focus:ring-offset-0"
          style={{ "--tw-ring-color": "rgb(0 151 178 / 0.45)" } as React.CSSProperties}
        />

        {isOpen && suggestions.length > 0 && (
          <ul
            role="listbox"
            className="absolute z-20 mt-1.5 w-full max-h-56 overflow-y-auto rounded-xl border border-slate-200/90 dark:border-slate-700/90 bg-white dark:bg-slate-800 p-1 shadow-[0_16px_36px_-18px_rgb(15_23_42_/_0.35),0_4px_12px_-6px_rgb(15_23_42_/_0.18)] dark:shadow-[0_18px_40px_-16px_rgb(0_0_0_/_0.65)]"
          >
            {suggestions.map((team, index) => (
              <li key={team} role="option" aria-selected={index === highlightedIndex}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addTeam(team)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`block w-full rounded-lg text-left px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    index === highlightedIndex
                      ? "text-teal-900 dark:text-teal-100"
                      : "text-slate-700 dark:text-slate-200"
                  }`}
                  style={
                    index === highlightedIndex
                      ? { backgroundColor: "rgb(0 151 178 / 0.12)" }
                      : undefined
                  }
                >
                  {team}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
