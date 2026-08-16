// src/components/common/TeamMultiSearch.tsx
"use client";

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
        <div className="mb-1.5 flex flex-wrap gap-1">
          {selectedTeams.map((team) => (
            <span
              key={team}
              className="inline-flex items-center gap-1 rounded-full bg-teal-50 dark:bg-teal-900/40 border border-teal-200 dark:border-teal-700 px-2 py-0.5 text-xs text-teal-800 dark:text-teal-200"
            >
              {team}
              <button
                type="button"
                onClick={() => removeTeam(team)}
                aria-label={`Remove ${team}`}
                className="leading-none text-teal-600 hover:text-teal-900 dark:text-teal-300 dark:hover:text-white"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
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
          className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1"
          style={{ "--tw-ring-color": "rgb(0, 151, 178)" } as React.CSSProperties}
        />

        {isOpen && suggestions.length > 0 && (
          <ul
            role="listbox"
            className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-800 shadow-lg"
          >
            {suggestions.map((team, index) => (
              <li key={team} role="option" aria-selected={index === highlightedIndex}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addTeam(team)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`block w-full text-left px-2 py-1.5 text-xs ${
                    index === highlightedIndex
                      ? "bg-teal-50 dark:bg-teal-900/40 text-teal-900 dark:text-teal-100"
                      : "text-gray-800 dark:text-gray-100"
                  }`}
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
