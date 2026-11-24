"use client";

import type { ReactNode } from "react";

// Building blocks for the statistics page's second section (StatisticsInsights).

export type Metric = "views" | "total_visitors" | "unique_visitors";
export const METRIC_LABELS: Record<Metric, string> = {
  views: "Views",
  total_visitors: "Total visitors",
  unique_visitors: "Unique visitors",
};

export const cardClass = "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900";
const headClass = "sticky top-0 bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400";

export function pct(value: number | null | undefined, digits?: number) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "–";
  const places = digits ?? (Math.abs(value) < 0.1 && value !== 0 ? 1 : 0);
  return `${(value * 100).toFixed(places)}%`;
}

export function num(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "–";
  return value.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function duration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return "–";
  const total = Math.round(seconds);
  if (total < 60) return `${total}s`;
  if (total < 3600) return `${Math.floor(total / 60)}m ${String(total % 60).padStart(2, "0")}s`;
  return `${Math.floor(total / 3600)}h ${String(Math.floor((total % 3600) / 60)).padStart(2, "0")}m`;
}

/** "/basketball/team/*" and friends as readable labels. */
export function pageLabel(path: string | null | undefined) {
  if (!path) return "–";
  if (path === "/basketball/team/*") return "Basketball team pages";
  if (path === "/football/team/*") return "Football team pages";
  return path;
}

/** Backend hour buckets ("2026-11-24 13") as "Nov 24, 1 PM". */
export function bucketLabel(bucket: string) {
  const hour = /^(\d{4})-(\d{2})-(\d{2}) (\d{2})$/.exec(bucket);
  if (hour) {
    const date = new Date(Date.UTC(+hour[1], +hour[2] - 1, +hour[3], +hour[4]));
    return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", timeZone: "UTC" });
  }
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(bucket);
  if (day) {
    return new Date(Date.UTC(+day[1], +day[2] - 1, +day[3])).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  }
  const month = /^(\d{4})-(\d{2})$/.exec(bucket);
  if (month) {
    return new Date(Date.UTC(+month[1], +month[2] - 1, 1)).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  }
  return bucket;
}

export function sinceLabel(since: string | null) {
  if (!since) return "No data yet: tracking starts with this release.";
  return `Tracked since ${new Date(since).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.`;
}

export function Change({ value, invert = false }: { value: number | null | undefined; invert?: boolean }) {
  if (value === null || value === undefined) return <span className="text-slate-400">new</span>;
  if (value === 0) return <span className="text-slate-500">0%</span>;
  const good = invert ? value < 0 : value > 0;
  return <span className={`font-semibold tabular-nums ${good ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>{value > 0 ? "▲" : "▼"} {pct(Math.abs(value))}</span>;
}

export function SectionHeading({ title, description }: { title: string; description?: string }) {
  return <div className="!mt-6 border-t border-slate-200 pt-4 dark:border-slate-700">
    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h2>
    {description && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
  </div>;
}

export function Card({ title, note, children, className = "" }: { title: string; note?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`${cardClass} ${className}`}>
    <div className="border-b border-slate-200 px-3 py-2 dark:border-slate-700">
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h3>
      {note && <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">{note}</p>}
    </div>
    {children}
  </section>;
}

export function Tile({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return <div className="min-w-[7rem] flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
    <p className="text-[11px] font-semibold leading-tight text-slate-500 dark:text-slate-400">{label}</p>
    <p className="text-xl font-bold leading-tight tabular-nums text-slate-900 dark:text-white">{value}</p>
    {sub && <p className="text-[11px] leading-tight tabular-nums text-slate-500 dark:text-slate-400">{sub}</p>}
  </div>;
}

export type Column<T> = { label: string; render: (row: T) => ReactNode; align?: "left" | "right"; className?: string };

export function DataTable<T>({ columns, rows, rowKey, empty = "No data", maxHeight = "max-h-80" }: { columns: Column<T>[]; rows: T[]; rowKey: (row: T, index: number) => string; empty?: string; maxHeight?: string }) {
  return <div className={`${maxHeight} overflow-auto`}>
    <table className="w-full text-xs">
      <thead className={headClass}>
        <tr>{columns.map((column) => <th key={column.label} scope="col" className={`whitespace-nowrap px-3 py-2 font-semibold ${column.align === "right" ? "text-right" : "text-left"}`}>{column.label}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, index) => <tr key={rowKey(row, index)} className="border-t border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60">
          {columns.map((column) => <td key={column.label} className={`px-3 py-1.5 text-slate-700 dark:text-slate-200 ${column.align === "right" ? "text-right tabular-nums" : ""} ${column.className ?? ""}`}>{column.render(row)}</td>)}
        </tr>)}
        {!rows.length && <tr><td colSpan={columns.length} className="px-3 py-6 text-center text-slate-500">{empty}</td></tr>}
      </tbody>
    </table>
  </div>;
}

/** Labelled horizontal bars, for distributions. */
export function BarList({ rows, format = (value: number) => num(value) }: { rows: Array<{ label: string; value: number; note?: string }>; format?: (value: number) => string }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return <ul className="list-none space-y-1.5 p-3">
    {rows.map((row) => <li key={row.label} className="text-xs">
      <div className="flex justify-between gap-2 text-slate-600 dark:text-slate-300">
        <span className="truncate">{row.label}</span>
        <span className="shrink-0 tabular-nums">{format(row.value)}{total > 0 && <span className="ml-1 text-slate-400">({pct(row.value / total)})</span>}{row.note && <span className="ml-1 text-slate-400">{row.note}</span>}</span>
      </div>
      <div className="mt-0.5 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-1.5 rounded-full bg-cyan-600" style={{ width: `${(row.value / max) * 100}%` }} />
      </div>
    </li>)}
    {!rows.length && <li className="py-4 text-center text-xs text-slate-500">No data</li>}
  </ul>;
}

/** Background for a heat-map cell: cyan at the given strength (0–1). */
export function heat(strength: number) {
  const alpha = Math.max(0, Math.min(1, strength));
  return { backgroundColor: `rgba(8, 145, 178, ${(0.08 + alpha * 0.8).toFixed(3)})`, color: alpha > 0.55 ? "white" : undefined };
}
