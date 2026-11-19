"use client";

import type { SiteStatisticsResponse } from "@/types/statistics";
import { DetailTable, type Selection } from "./DetailTable";

type Props = {
  data: SiteStatisticsResponse | undefined;
  pageFilter: string | null;
  selection: Selection | null;
  onSelect: (selection: Selection) => void;
  onSelectPage: (path: string) => void;
};

const cardClass = "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900";
const headClass = "sticky top-0 bg-slate-50 text-slate-500 dark:bg-slate-800";

/** Outside link for a stored referrer (host + path, no scheme). App referrers
 *  (android-app://...) and search engines (host only) still link to the site. */
function referrerHref(url: string) {
  return url.startsWith("android-app://") ? null : `https://${url}`;
}

/**
 * Where visits came from. Sources are recorded on a visit's first page view,
 * so these tables count visits, not page views, starting from when source
 * tracking was deployed. Choosing a source or channel filters the trend charts
 * to every page view in the visits that began there.
 */
export function TrafficSources({ data, pageFilter, selection, onSelect, onSelectPage }: Props) {
  const suffix = pageFilter ? ` · landed on ${pageFilter}` : "";
  const referrers = data?.referrers ?? [];
  const campaigns = data?.campaigns ?? [];

  return <>
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-2">
      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Traffic sources</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400">Counted per visit (its first page). Search engines don&apos;t pass on search terms, so search visits show the engine only.</p>
    </div>
    <div className="grid gap-2 lg:grid-cols-3">
      <DetailTable title={`Channels${suffix}`} dimension="channel" countLabel="Visits" selection={selection} onSelect={onSelect}
        rows={(data?.channels ?? []).map((row) => ({ label: row.channel, value: row.visits }))} />
      <DetailTable title={`Sources${suffix}`} dimension="source" countLabel="Visits" selection={selection} onSelect={onSelect}
        rows={(data?.sources ?? []).map((row) => ({ label: row.source, value: row.visits, note: row.source === "Direct" ? undefined : row.channel }))} />
      <DetailTable title="Landing pages" dimension="page" countLabel="Visits" selection={pageFilter ? { dimension: "page", value: pageFilter, label: pageFilter } : null}
        onSelect={(next) => onSelectPage(next.value)}
        rows={(data?.landing_pages ?? []).map((row) => ({ label: row.path, value: row.visits }))} />
    </div>
    <section className={cardClass}>
      <div className="border-b border-slate-200 px-3 py-2 dark:border-slate-700"><h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Referring links{suffix}</h2></div>
      <div className="max-h-96 overflow-auto">
        <table className="w-full text-xs">
          <thead className={headClass}><tr>
            <th className="px-3 py-2 text-left font-semibold">Link</th>
            <th className="px-3 py-2 text-left font-semibold">Channel</th>
            <th className="hidden px-3 py-2 text-left font-semibold sm:table-cell">Most common landing page</th>
            <th className="hidden px-3 py-2 text-left font-semibold md:table-cell">Latest visit</th>
            <th className="px-3 py-2 text-right font-semibold">Visits</th>
            <th className="px-3 py-2 text-right font-semibold">Visitors</th>
          </tr></thead>
          <tbody>
            {referrers.map((row) => {
              const href = referrerHref(row.referrer_url);
              const active = selection?.dimension === "source" && selection.value === row.source;
              return <tr key={row.referrer_url} className={`border-t border-slate-100 dark:border-slate-800 ${active ? "bg-cyan-50 dark:bg-cyan-950/40" : "hover:bg-slate-50 dark:hover:bg-slate-800/60"}`}>
                <td className="max-w-[16rem] px-3 py-1.5 font-medium text-slate-700 dark:text-slate-200 sm:max-w-md">
                  <div className="flex items-center gap-2">
                    {row.source && <button type="button" onClick={() => onSelect({ dimension: "source", value: row.source!, label: row.source! })} className="truncate text-left hover:text-cyan-700 dark:hover:text-cyan-300" title={`Show trends for visits from ${row.source}`}>{row.referrer_url}</button>}
                    {!row.source && <span className="truncate">{row.referrer_url}</span>}
                    {href && <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="shrink-0 text-cyan-700 hover:underline dark:text-cyan-300" aria-label={`Open ${row.referrer_url}`}>↗</a>}
                  </div>
                </td>
                <td className="px-3 py-1.5 text-slate-600 dark:text-slate-300">{row.channel ?? "—"}</td>
                <td className="hidden max-w-[14rem] truncate px-3 py-1.5 text-slate-600 dark:text-slate-300 sm:table-cell">{row.top_landing_page ?? "—"}</td>
                <td className="hidden whitespace-nowrap px-3 py-1.5 text-slate-600 dark:text-slate-300 md:table-cell">{row.latest_visit ? new Date(row.latest_visit).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}</td>
                <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-slate-700 dark:text-slate-200">{row.visits.toLocaleString()}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{row.visitors.toLocaleString()}</td>
              </tr>;
            })}
            {!referrers.length && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No referring links yet</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
    {campaigns.length > 0 && <section className={cardClass}>
      <div className="border-b border-slate-200 px-3 py-2 dark:border-slate-700"><h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Campaigns (utm tags){suffix}</h2></div>
      <div className="max-h-80 overflow-auto">
        <table className="w-full text-xs">
          <thead className={headClass}><tr>
            <th className="px-3 py-2 text-left font-semibold">Source</th>
            <th className="px-3 py-2 text-left font-semibold">Medium</th>
            <th className="px-3 py-2 text-left font-semibold">Campaign</th>
            <th className="px-3 py-2 text-right font-semibold">Visits</th>
            <th className="px-3 py-2 text-right font-semibold">Visitors</th>
          </tr></thead>
          <tbody>
            {campaigns.map((row) => <tr key={`${row.utm_source}|${row.utm_medium}|${row.utm_campaign}`} className="border-t border-slate-100 dark:border-slate-800">
              <td className="px-3 py-1.5 font-medium text-slate-700 dark:text-slate-200">{row.utm_source ?? "—"}</td>
              <td className="px-3 py-1.5 text-slate-600 dark:text-slate-300">{row.utm_medium ?? "—"}</td>
              <td className="px-3 py-1.5 text-slate-600 dark:text-slate-300">{row.utm_campaign ?? "—"}</td>
              <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-slate-700 dark:text-slate-200">{row.visits.toLocaleString()}</td>
              <td className="px-3 py-1.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{row.visitors.toLocaleString()}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>}
  </>;
}
