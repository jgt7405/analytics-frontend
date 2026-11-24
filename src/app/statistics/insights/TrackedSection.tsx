"use client";

import type { SiteStatisticsInsights } from "@/types/statistics";
import { BarList, Card, DataTable, duration, num, pageLabel, pct, SectionHeading, sinceLabel, Tile } from "./ui";

// Google's thresholds: good up to the first number, poor above the second.
const VITALS: Record<string, { name: string; good: number; poor: number; unit: "ms" | "" }> = {
  LCP: { name: "Largest Contentful Paint", good: 2500, poor: 4000, unit: "ms" },
  INP: { name: "Interaction to Next Paint", good: 200, poor: 500, unit: "ms" },
  CLS: { name: "Cumulative Layout Shift", good: 0.1, poor: 0.25, unit: "" },
  FCP: { name: "First Contentful Paint", good: 1800, poor: 3000, unit: "ms" },
  TTFB: { name: "Time to First Byte", good: 800, poor: 1800, unit: "ms" },
};
const VITAL_ORDER = ["LCP", "INP", "CLS", "FCP", "TTFB"];
const ERROR_KINDS: Record<string, string> = { js_error: "Script errors", api_error: "Failed data requests", not_found: "Missing pages (404)" };

function vitalValue(metric: string, value: number) {
  if (VITALS[metric]?.unit !== "ms") return value.toFixed(2);
  return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`;
}

function VitalBadge({ metric, value }: { metric: string; value: number }) {
  const limits = VITALS[metric];
  const rating = !limits ? "" : value <= limits.good ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : value <= limits.poor ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300";
  return <span className={`inline-block rounded px-1.5 py-0.5 font-semibold tabular-nums ${rating}`}>{vitalValue(metric, value)}</span>;
}

function countryName(code: string) {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

const US_ZONES: Array<[RegExp, string]> = [
  [/^America\/(New_York|Detroit|Indiana\/(?!Knox|Tell_City)|Kentucky\/|Toronto)/, "US Eastern"],
  [/^America\/(Chicago|Indiana\/(Knox|Tell_City)|Menominee|North_Dakota\/|Winnipeg)/, "US Central"],
  [/^America\/(Denver|Boise|Phoenix|Edmonton)/, "US Mountain"],
  [/^America\/(Los_Angeles|Vancouver)/, "US Pacific"],
  [/^America\/(Anchorage|Juneau|Sitka|Nome|Yakutat|Metlakatla)/, "US Alaska"],
  [/^Pacific\/Honolulu/, "US Hawaii"],
];

function zoneLabel(zone: string) {
  return US_ZONES.find(([pattern]) => pattern.test(zone))?.[1] ?? zone.replace(/_/g, " ");
}

/** Devices, time on page, features, web vitals, errors, location, bots and
 *  outbound links: everything from the tracking added with this section. */
export function TrackedSection({ data }: { data: SiteStatisticsInsights }) {
  const { devices, engagement, features, web_vitals: vitals, errors, locations, bots, outbound } = data;
  const overall = engagement.overall && "views" in engagement.overall ? engagement.overall : null;
  const vitalsByPage = new Map<string, Record<string, number>>();
  for (const row of vitals.pages) vitalsByPage.set(row.path, { ...(vitalsByPage.get(row.path) ?? {}), [row.metric]: row.p75 });
  const zones = new Map<string, number>();
  for (const row of locations.time_zones) zones.set(zoneLabel(row.time_zone), (zones.get(zoneLabel(row.time_zone)) ?? 0) + row.views);

  return <>
    <SectionHeading title="Devices, time on page, features and site health" description="These start counting when this release goes out; each card says when its data begins. Nothing personal is kept: location is the country and state from the CDN (never the IP address), and only a yes/no bot flag is kept from the browser's user agent." />
    <div className="grid gap-2 lg:grid-cols-3">
      <Card title="Devices" note={sinceLabel(devices.since)}>
        <BarList rows={devices.devices.map((row) => ({ label: row.device[0].toUpperCase() + row.device.slice(1), value: row.views }))} format={(value) => `${num(value)} views`} />
      </Card>
      <Card title="Installed app" note={`Page views in the installed app (home-screen PWA) against the browser. ${sinceLabel(devices.since)}`}>
        <BarList rows={devices.display_modes.map((row) => ({ label: row.display_mode === "standalone" ? "Installed app" : "Browser", value: row.views }))} format={(value) => `${num(value)} views`} />
        <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">App installs in this period: <strong>{num(devices.installs)}</strong></p>
      </Card>
      <Card title="Bots and scripted browsers" note={`Crawler user agents and automated browsers (monitoring, tests). ${sinceLabel(bots.since)}`}>
        <div className="flex flex-wrap gap-1 p-2">
          <Tile label="Of page views" value={pct(bots.view_share)} sub={`${num(bots.bot_views ?? 0)} of ${num(bots.checked_views ?? 0)}`} />
          <Tile label="Of visits" value={pct(bots.visit_share)} sub={`${num(bots.bot_visits ?? 0)} of ${num(bots.checked_visits ?? 0)}`} />
        </div>
        <DataTable maxHeight="max-h-40" rows={bots.pages} rowKey={(row) => row.path} empty="None" columns={[
          { label: "Pages bots load", render: (row) => pageLabel(row.path), className: "max-w-48 truncate" },
          { label: "Views", align: "right", render: (row) => num(row.views) },
        ]} />
      </Card>
    </div>
    <Card title="Time on page and scroll depth" note={`Time the page was visible (capped at 30 minutes per view) and how far down it was scrolled; a page that fits on screen counts as fully scrolled. ${sinceLabel(engagement.since)}`}>
      {overall && <div className="flex flex-wrap gap-1 p-2">
        <Tile label="Median time on page" value={duration((overall.median_engaged_ms ?? 0) / 1000)} sub={`average ${duration((overall.avg_engaged_ms ?? 0) / 1000)}`} />
        <Tile label="Reached halfway" value={pct(overall.scroll_50)} sub={`25%: ${pct(overall.scroll_25)}`} />
        <Tile label="Reached 75%" value={pct(overall.scroll_75)} />
        <Tile label="Reached the end (90%+)" value={pct(overall.scroll_90)} />
      </div>}
      <DataTable rows={engagement.pages} rowKey={(row) => row.path} columns={[
        { label: "Page", render: (row) => pageLabel(row.path), className: "max-w-64 truncate" },
        { label: "Views", align: "right", render: (row) => num(row.views) },
        { label: "Median time", align: "right", render: (row) => duration((row.median_engaged_ms ?? 0) / 1000) },
        { label: "Average time", align: "right", render: (row) => duration((row.avg_engaged_ms ?? 0) / 1000) },
        { label: "Avg scroll", align: "right", render: (row) => (row.avg_scroll_pct === null ? "–" : `${Math.round(row.avg_scroll_pct)}%`) },
        { label: "Reached 75%", align: "right", render: (row) => pct(row.scroll_75) },
      ]} />
    </Card>
    <div className="grid gap-2 lg:grid-cols-2">
      <Card title="Features used" note={`Buttons and controls by their label (Download, Share, sort headers, what-if picks…), and file downloads. ${sinceLabel(features.since)}`}>
        <DataTable rows={features.features} rowKey={(row) => row.feature} columns={[
          { label: "Control", render: (row) => row.feature, className: "max-w-56 truncate" },
          { label: "Uses", align: "right", render: (row) => num(row.uses) },
          { label: "Visitors", align: "right", render: (row) => num(row.visitors) },
          { label: "Mostly on", render: (row) => pageLabel(row.top_page), className: "max-w-40 truncate" },
        ]} />
      </Card>
      <Card title="Outbound links" note={`Links to other sites that visitors followed (query strings removed). ${sinceLabel(outbound.since)}`}>
        <DataTable rows={outbound.links} rowKey={(row) => row.url} columns={[
          { label: "Link", render: (row) => row.url, className: "max-w-64 truncate" },
          { label: "Clicks", align: "right", render: (row) => num(row.clicks) },
          { label: "Visitors", align: "right", render: (row) => num(row.visitors) },
          { label: "From", render: (row) => pageLabel(row.top_page), className: "max-w-40 truncate" },
        ]} />
      </Card>
    </div>
    <Card title="Page speed for real visitors" note={`75th percentile of each Core Web Vital (Google's measure): green good, amber needs improvement, red poor. ${sinceLabel(vitals.since)}`}>
      <div className="flex flex-wrap gap-1 p-2">
        {VITAL_ORDER.map((metric) => { const row = vitals.overall.find((item) => item.metric === metric); return <Tile key={metric} label={`${metric} · ${VITALS[metric].name}`} value={row ? <VitalBadge metric={metric} value={row.p75} /> : "–"} sub={row ? `${num(row.samples)} samples` : undefined} />; })}
      </div>
      <DataTable rows={[...vitalsByPage.entries()]} rowKey={([path]) => path} empty="No samples yet" columns={[
        { label: "Page", render: ([path]) => pageLabel(path), className: "max-w-56 truncate" },
        ...VITAL_ORDER.map((metric) => ({ label: metric, align: "right" as const, render: ([, values]: [string, Record<string, number>]) => (values[metric] === undefined ? "–" : <VitalBadge metric={metric} value={values[metric]} />) })),
      ]} />
    </Card>
    <Card title="Errors" note={`Script errors, data requests that failed after retries, and missing pages. ${sinceLabel(errors.since)}`}>
      <div className="flex flex-wrap gap-1 p-2">
        {Object.entries(ERROR_KINDS).map(([kind, label]) => { const row = errors.kinds.find((item) => item.kind === kind); return <Tile key={kind} label={label} value={num(row?.errors ?? 0)} sub={`in ${num(row?.visits ?? 0)} visits`} />; })}
      </div>
      <div className="grid gap-2 p-2 pt-0 lg:grid-cols-2">
        <DataTable rows={errors.messages} rowKey={(row, index) => `${row.kind}-${row.path}-${index}`} empty="No errors" columns={[
          { label: "Error", render: (row) => <span title={row.message}>{row.message || "(no message)"}</span>, className: "max-w-64 truncate" },
          { label: "Page", render: (row) => pageLabel(row.path), className: "max-w-40 truncate" },
          { label: "Count", align: "right", render: (row) => num(row.errors) },
        ]} />
        <DataTable rows={errors.not_found} rowKey={(row) => row.path} empty="No missing pages" columns={[
          { label: "Missing page", render: (row) => row.path, className: "max-w-64 truncate" },
          { label: "Hits", align: "right", render: (row) => num(row.hits) },
          { label: "Latest", render: (row) => new Date(row.latest).toLocaleDateString("en-US", { month: "short", day: "numeric" }) },
        ]} />
      </div>
    </Card>
    <div className="grid gap-2 lg:grid-cols-3">
      <Card title="Countries" note={sinceLabel(locations.since)}>
        <BarList rows={locations.countries.map((row) => ({ label: countryName(row.country), value: row.views }))} format={(value) => `${num(value)} views`} />
      </Card>
      <Card title="US states" note="From the CDN's region code.">
        <DataTable rows={locations.us_regions} rowKey={(row) => row.region} empty="No data yet" columns={[
          { label: "State", render: (row) => row.region },
          { label: "Views", align: "right", render: (row) => num(row.views) },
          { label: "Visitors", align: "right", render: (row) => num(row.visitors) },
        ]} />
      </Card>
      <Card title="Time zones" note="From the browser's clock setting; works where the CDN location is missing.">
        <BarList rows={[...zones.entries()].sort((a, b) => b[1] - a[1]).map(([label, views]) => ({ label, value: views }))} format={(value) => `${num(value)} views`} />
      </Card>
    </div>
  </>;
}
