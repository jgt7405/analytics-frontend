"use client";

// Multi-select team filter.

import { type WhatIfTeamResult } from "@/hooks/useBasketballWhatIf";
import { Check, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { TEAL_COLOR } from "./helpers";
import { TeamLogo } from "./icons";

// Team Filter Dropdown (multi-select with checkboxes)
// UPDATED: Teams sorted alphabetically, unchecked boxes have gray outline with white background
export function TeamFilterDropdown({
  teams,
  selectedIds,
  onChange,
  isDark,
}: {
  teams: WhatIfTeamResult[];
  selectedIds: Set<number>;
  onChange: (ids: Set<number>) => void;
  isDark: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const allSelected = teams.length > 0 && selectedIds.size === teams.length;
  const noneSelected = selectedIds.size === 0;

  const handleSelectAll = () => {
    onChange(allSelected ? new Set() : new Set(teams.map((t) => t.team_id)));
  };

  const handleToggleTeam = (teamId: number) => {
    const next = new Set(selectedIds);
    if (next.has(teamId)) next.delete(teamId);
    else next.add(teamId);
    onChange(next);
  };

  const label = allSelected
    ? "All Teams"
    : noneSelected
      ? "Select Teams"
      : `${selectedIds.size} of ${teams.length} Teams`;

  // CHANGE 1: Sort teams alphabetically
  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => a.team_name.localeCompare(b.team_name));
  }, [teams]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-xs hover:border-gray-400 transition-colors min-w-[200px]"
        style={{ backgroundColor: "#ffffff" }}
      >
        <span className="truncate">{label}</span>
        <ChevronDown
          size={14}
          className={`ml-1 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div
          className="absolute z-30 mt-1 w-full rounded-md shadow-lg max-h-[240px] overflow-y-auto"
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid var(--border-color)",
          }}
        >
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs"
            style={{
              backgroundColor: "#ffffff",
              border: "none",
              borderBottom: "none",
            }}
          >
            <span
              className="flex items-center justify-center w-4 h-4 rounded transition-colors"
              style={{
                backgroundColor: allSelected ? TEAL_COLOR : "#ffffff",
                border: allSelected
                  ? `2px solid ${TEAL_COLOR}`
                  : "2px solid #9ca3af",
              }}
            >
              {allSelected && <Check size={12} strokeWidth={3} color="white" />}
            </span>
            <span className="font-medium">Select All</span>
          </button>
          {sortedTeams.map((t) => {
            const checked = selectedIds.has(t.team_id);
            return (
              <button
                key={t.team_id}
                onClick={() => handleToggleTeam(t.team_id)}
                className="flex items-center gap-2 w-full px-3 py-1 text-xs"
                style={{
                  backgroundColor: "#ffffff",
                  border: "none",
                  borderBottom: "none",
                }}
              >
                <span
                  className="flex items-center justify-center w-4 h-4 rounded transition-colors"
                  style={{
                    backgroundColor: checked ? TEAL_COLOR : "#ffffff",
                    border: checked
                      ? `2px solid ${TEAL_COLOR}`
                      : "2px solid #9ca3af",
                  }}
                >
                  {checked && <Check size={12} strokeWidth={3} color="white" />}
                </span>
                {t.logo_url && (
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      backgroundColor:
                        checked && isDark ? "white" : "transparent",
                    }}
                  >
                    <TeamLogo src={t.logo_url} alt={t.team_name} size={16} />
                  </div>
                )}
                <span>{t.team_name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
