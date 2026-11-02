"use client";

import { useState } from "react";
import { RANKING_OPTIONS, RankedLists, RankingKey, selectRankRange } from "./rank-select";

interface RankQuickSelectProps {
  rankings: RankedLists;
  isLoading: boolean;
  maxTeams: number;
  /** Replaces the current selection with these teams, in rank order. */
  onSelect: (teamNames: string[]) => void;
}

const EMPTY_MESSAGE: Record<RankingKey, string> = {
  rating: "Ratings aren't available right now.",
  twv: "TWV isn't available right now.",
  ap: "The AP poll isn't available yet.",
  cfp: "CFP rankings haven't been released yet.",
};

const INPUT_CLASS =
  "h-9 rounded-xl border border-slate-200/90 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[rgb(0,151,178)] dark:border-slate-700/90 dark:bg-slate-900 dark:text-slate-200";

/**
 * "Show ranks 1 to 5 by AP" - selects that slice of a ranking on the
 * compare page, in rank order. Teams can then be added or removed as usual.
 */
export default function RankQuickSelect({ rankings, isLoading, maxTeams, onSelect }: RankQuickSelectProps) {
  const [ranking, setRanking] = useState<RankingKey>("rating");
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(5);

  const list = rankings[ranking];
  const isEmpty = !isLoading && list.length === 0;
  const requested = Math.abs(to - from) + 1;
  const capped = requested > maxTeams;

  return (
    <div className="mb-3 rounded-xl border border-slate-200/80 bg-white p-3 dark:border-slate-700/80 dark:bg-slate-800">
      <form
        className="flex flex-wrap items-end gap-x-3 gap-y-2 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          onSelect(selectRankRange(list, from, to, maxTeams));
        }}
      >
        <span className="w-full text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:w-auto sm:self-center">
          Quick select
        </span>
        <label className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
          Ranking
          <select
            value={ranking}
            onChange={(e) => setRanking(e.target.value as RankingKey)}
            className={INPUT_CLASS}
          >
            {RANKING_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
          From rank
          <input
            type="number"
            min={1}
            value={from}
            onChange={(e) => setFrom(Number(e.target.value))}
            className={INPUT_CLASS + " w-20"}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
          To rank
          <input
            type="number"
            min={1}
            value={to}
            onChange={(e) => setTo(Number(e.target.value))}
            className={INPUT_CLASS + " w-20"}
          />
        </label>
        <button
          type="submit"
          disabled={isLoading || isEmpty}
          className="h-9 rounded-xl bg-[rgb(0,151,178)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[rgb(0,130,153)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Loading…" : "Select teams"}
        </button>
        <p className="w-full text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
          {isEmpty
            ? EMPTY_MESSAGE[ranking]
            : capped
              ? `Up to ${maxTeams} teams at a time: selects ranks ${Math.min(from, to)}-${Math.min(from, to) + maxTeams - 1}.`
              : "Replaces the current selection. Add or remove teams afterward as usual."}
        </p>
      </form>
    </div>
  );
}
