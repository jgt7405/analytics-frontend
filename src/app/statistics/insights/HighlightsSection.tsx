"use client";

import type { SiteStatisticsInsights } from "@/types/statistics";
import { bucketLabel, Card, Change, DataTable, METRIC_LABELS, type Metric, num, pageLabel, SectionHeading, Tile } from "./ui";

const WINDOWS = [
  ["year", "Past year", "prior year"],
  ["month", "Past 30 days", "prior 30 days"],
  ["week", "Past 7 days", "prior 7 days"],
  ["day", "Past 24 hours", "prior 24 hours"],
  ["hour", "Past hour", "prior hour"],
] as const;
const RECORD_UNITS = [["hour", "Busiest hour"], ["day", "Busiest day"], ["week", "Busiest week (from Monday)"], ["month", "Busiest month"]] as const;

/** Change against the previous window, all-time records and who is on the
 *  site right now. */
export function HighlightsSection({ data, metric }: { data: SiteStatisticsInsights; metric: Metric }) {
  const metricLabel = METRIC_LABELS[metric].toLowerCase();
  const bestDay = data.records.best.day?.[metric]?.value ?? 0;
  const today = data.records.today[metric] ?? 0;
  const asOf = new Date(data.generated_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return <>
    <SectionHeading title="Compared with the previous period" description={`${METRIC_LABELS[metric]} in each window against the window of the same length just before it.`} />
    <div className="flex flex-wrap gap-1">
      {WINDOWS.map(([key, label, prior]) => {
        const change = data.period_changes[key]?.[metric];
        return <Tile key={key} label={label} value={num(change?.current)} sub={<><Change value={change?.change_pct} /> vs {num(change?.previous)} {prior}</>} />;
      })}
    </div>
    <div className="grid gap-2 lg:grid-cols-3">
      <Card title="Records" note={`All-time highs for ${metricLabel}, with the current filters.`}>
        <DataTable rows={[...RECORD_UNITS]} rowKey={([unit]) => unit} columns={[
          { label: "Record", render: ([, label]) => label },
          { label: "When", render: ([unit]) => { const best = data.records.best[unit]?.[metric]; return best ? bucketLabel(best.bucket) : "–"; } },
          { label: METRIC_LABELS[metric], align: "right", render: ([unit]) => num(data.records.best[unit]?.[metric]?.value) },
        ]} />
        <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
          Today so far: <strong className="tabular-nums">{num(today)}</strong>
          {bestDay > 0 && <> · {Math.round((today / bestDay) * 100)}% of the record day</>}
        </p>
      </Card>
      <Card title="Active now" note={`Visits with activity in the five minutes before ${asOf} (refreshes every five minutes).`} className="lg:col-span-2">
        <div className="flex flex-wrap gap-1 p-2">
          <Tile label="Visits" value={num(data.active_now.visits ?? 0)} />
          <Tile label="Visitors" value={num(data.active_now.visitors ?? 0)} />
        </div>
        <DataTable maxHeight="max-h-48" rows={data.active_now.pages} rowKey={(row) => row.path} empty="Nobody right now" columns={[
          { label: "Page they're on", render: (row) => pageLabel(row.path) },
          { label: "Visits", align: "right", render: (row) => num(row.visits) },
        ]} />
      </Card>
    </div>
  </>;
}
