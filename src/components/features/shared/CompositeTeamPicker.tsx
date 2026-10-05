"use client";

interface CompositeTeamPickerProps {
  teams: string[];
  selected: string[];
  onChange: (teams: string[]) => void;
  label?: string;
}

export default function CompositeTeamPicker({
  teams,
  selected,
  onChange,
  label = "Teams",
}: CompositeTeamPickerProps) {
  const available = teams.filter((team) => !selected.includes(team));

  return (
    <div className="min-w-0 flex-1">
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
        {label}
      </label>
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/15 dark:border-slate-700 dark:bg-slate-900">
        {selected.map((team) => (
          <button
            key={team}
            type="button"
            onClick={() => onChange(selected.filter((value) => value !== team))}
            className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-800 transition hover:border-cyan-400 dark:border-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-200"
            aria-label={`Remove ${team}`}
          >
            {team}<span aria-hidden="true">×</span>
          </button>
        ))}
        <select
          value=""
          onChange={(event) => {
            if (event.target.value) onChange([...selected, event.target.value]);
          }}
          className="min-w-36 flex-1 bg-transparent px-1 py-1 text-sm text-slate-600 outline-none dark:text-slate-300"
          aria-label={`Add ${label.toLowerCase()}`}
        >
          <option value="">{selected.length ? "Add another team…" : "Select teams…"}</option>
          {available.map((team) => <option key={team} value={team}>{team}</option>)}
        </select>
        {selected.length > 0 ? (
          <button type="button" onClick={() => onChange([])} className="px-1 text-xs font-medium text-slate-500 hover:text-cyan-700 dark:hover:text-cyan-300">
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}
