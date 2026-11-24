"use client";

import { useMemo, useState } from "react";
import type { SiteStatisticsInsights } from "@/types/statistics";
import { BarList, Card, DataTable, duration, num, pageLabel, pct, SectionHeading, Tile } from "./ui";

const selectClass = "rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium dark:border-slate-600 dark:bg-slate-800";

/** Pages per visit, bounce rate, visit length, landing and exit pages,
 *  page flow and how much each page is used. */
export function EngagementSection({ data }: { data: SiteStatisticsInsights }) {
  const v = data.visits;
  const fromPages = useMemo(() => {
    const totals = new Map<string, number>();
    for (const row of data.page_flow) totals.set(row.from_page, (totals.get(row.from_page) ?? 0) + row.transitions);
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([page]) => page);
  }, [data.page_flow]);
  const [chosenFrom, setFromPage] = useState<string | null>(null);
  const fromPage = chosenFrom && fromPages.includes(chosenFrom) ? chosenFrom : fromPages[0] ?? null;
  const nextPages = data.page_flow.filter((row) => row.from_page === fromPage);
  const nextTotal = nextPages.reduce((sum, row) => sum + row.transitions, 0);

  return <>
    <SectionHeading title="Engagement" description="A visit is one browser tab: someone using two tabs counts as two visits. Visit length runs from the first to the last page view or filter change, so a one-page visit counts as 0s." />
    <div className="flex flex-wrap gap-1">
      <Tile label="Visits" value={num(v.visits)} />
      <Tile label="Pages per visit" value={num(v.pages_per_visit, 2)} />
      <Tile label="Bounce rate" value={pct(v.bounce_rate)} sub="visits with one page view" />
      <Tile label="Median visit length" value={duration(v.median_seconds)} sub={`${duration(v.median_seconds_engaged)} for visits that did more than land`} />
      <Tile label="Filter changes per visit" value={num(v.filter_changes_per_visit, 2)} sub={`${pct(v.interacting_share)} of visits changed a filter`} />
    </div>
    <div className="grid gap-2 lg:grid-cols-2">
      <Card title="Pages per visit">
        <BarList rows={[
          { label: "1 page", value: v.pages_1 }, { label: "2–3 pages", value: v.pages_2_3 },
          { label: "4–9 pages", value: v.pages_4_9 }, { label: "10+ pages", value: v.pages_10_plus },
        ]} />
      </Card>
      <Card title="Visit length">
        <BarList rows={[
          { label: "Under 10 seconds", value: v.seconds_under_10 }, { label: "10–60 seconds", value: v.seconds_10_60 },
          { label: "1–3 minutes", value: v.seconds_60_180 }, { label: "3–10 minutes", value: v.seconds_180_600 },
          { label: "10–30 minutes", value: v.seconds_600_1800 }, { label: "30 minutes or more", value: v.seconds_1800_plus },
        ]} />
      </Card>
    </div>
    <div className="grid gap-2 lg:grid-cols-2">
      <Card title="Landing pages: bounce rate" note="The page each visit started on, and how those visits went.">
        <DataTable rows={data.landing_pages} rowKey={(row) => row.path} columns={[
          { label: "Landing page", render: (row) => pageLabel(row.path), className: "max-w-56 truncate" },
          { label: "Visits", align: "right", render: (row) => num(row.visits) },
          { label: "Bounce rate", align: "right", render: (row) => pct(row.bounce_rate) },
          { label: "Pages/visit", align: "right", render: (row) => num(row.pages_per_visit, 1) },
        ]} />
      </Card>
      <Card title="Exit pages" note="The last page of each visit. Exit rate: the share of that page's views that ended the visit.">
        <DataTable rows={data.exit_pages} rowKey={(row) => row.path} columns={[
          { label: "Exit page", render: (row) => pageLabel(row.path), className: "max-w-56 truncate" },
          { label: "Exits", align: "right", render: (row) => num(row.exits) },
          { label: "Views", align: "right", render: (row) => num(row.views) },
          { label: "Exit rate", align: "right", render: (row) => pct(row.exit_rate) },
        ]} />
      </Card>
    </div>
    <div className="grid gap-2 lg:grid-cols-2">
      <Card title="Page flow" note={<>Where visitors go next from <select aria-label="Page flow starting page" value={fromPage ?? ""} onChange={(event) => setFromPage(event.target.value)} className={selectClass}>{fromPages.map((page) => <option key={page} value={page}>{pageLabel(page)}</option>)}</select></>}>
        <DataTable rows={nextPages} rowKey={(row) => row.to_page} empty="No page views" columns={[
          { label: "Next page", render: (row) => row.to_page === "(exit)" ? <em className="text-slate-500">Left the site</em> : pageLabel(row.to_page), className: "max-w-64 truncate" },
          { label: "Visits", align: "right", render: (row) => num(row.transitions) },
          { label: "Share", align: "right", render: (row) => pct(row.transitions / (nextTotal || 1)) },
        ]} />
      </Card>
      <Card title="Interaction by page" note="Filter changes (conference, team and other selectors) per page view: which pages people use rather than glance at.">
        <DataTable rows={data.interaction} rowKey={(row) => row.path} columns={[
          { label: "Page", render: (row) => pageLabel(row.path), className: "max-w-56 truncate" },
          { label: "Views", align: "right", render: (row) => num(row.views) },
          { label: "Changes/view", align: "right", render: (row) => num(row.filter_changes / (row.views || 1), 2) },
          { label: "Visits using it", align: "right", render: (row) => pct(row.interacting_visits / (row.visits || 1)) },
        ]} />
      </Card>
    </div>
  </>;
}
