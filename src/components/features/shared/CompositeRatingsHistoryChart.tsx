"use client";

import "@/lib/chartjs-setup";
import type { ChartData, ChartOptions } from "chart.js";
import { Line } from "react-chartjs-2";
import CompositeTeamPicker from "./CompositeTeamPicker";

export interface CompositeHistoryPoint {
  date: string;
  team_name: string;
  ratings: Record<string, number | null>;
}

interface RatingOption { key: string; label: string }

interface CompositeRatingsHistoryChartProps {
  points: CompositeHistoryPoint[];
  teams: string[];
  selectedTeams: string[];
  onSelectedTeamsChange: (teams: string[]) => void;
  ratings: RatingOption[];
  selectedRating: string;
  onSelectedRatingChange: (rating: string) => void;
  isLoading?: boolean;
}

const COLORS = ["#0891b2", "#f97316", "#8b5cf6", "#16a34a", "#e11d48", "#2563eb"];
const CARD_CLASS = "relative border border-slate-200/90 dark:border-slate-700/90 rounded-[1.25rem] bg-gradient-to-br from-white to-[#fbfdff] dark:from-[#111827] dark:to-[#0f172a] shadow-[0_22px_55px_-36px_rgb(15_23_42_/_0.36),0_8px_22px_-18px_rgb(15_23_42_/_0.24)] dark:shadow-[0_24px_58px_-34px_rgb(0_0_0_/_0.82)]";

function shortDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function CompositeRatingsHistoryChart(props: CompositeRatingsHistoryChartProps) {
  // History reads chronologically from the earliest snapshot on the left to
  // the latest snapshot on the right, matching the site's other §8 charts.
  const dates = Array.from(new Set(props.points.map((point) => point.date))).sort((a, b) => a.localeCompare(b));
  const datasets = props.selectedTeams.map((team, index) => {
    const byDate = new Map(
      props.points.filter((point) => point.team_name === team).map((point) => [point.date, point.ratings[props.selectedRating]]),
    );
    const color = COLORS[index % COLORS.length];
    return {
      label: team,
      data: dates.map((date) => byDate.get(date) ?? null),
      borderColor: color,
      backgroundColor: color,
      pointRadius: 2.5,
      pointHoverRadius: 5,
      borderWidth: 2.5,
      tension: 0.22,
      spanGaps: true,
    };
  });
  const data: ChartData<"line"> = { labels: dates.map(shortDate), datasets };
  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8, padding: 18 } },
      tooltip: { callbacks: { title: (items) => dates[items[0]?.dataIndex ?? 0] ?? "" } },
    },
    scales: {
      x: { grid: { display: false }, title: { display: true, text: "Oldest → most recent" }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 9 } },
      y: { grid: { color: "rgba(148,163,184,.18)" }, title: { display: true, text: props.ratings.find((rating) => rating.key === props.selectedRating)?.label ?? "Rating" } },
    },
  };

  return (
    <section className={`${CARD_CLASS} mt-7 p-4 sm:p-5`}>
      <div className="mb-4">
        <h2 className="text-[clamp(1.25rem,2.2vw,1.75rem)] font-bold leading-[1.1] tracking-[-0.035em] text-slate-700 dark:text-slate-300">Rating history</h2>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Compare multiple teams using one rating, from the earliest update through the latest.</p>
      </div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <CompositeTeamPicker teams={props.teams} selected={props.selectedTeams} onChange={props.onSelectedTeamsChange} />
        <label className="block sm:w-56">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Rating</span>
          <select value={props.selectedRating} onChange={(event) => props.onSelectedRatingChange(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
            {props.ratings.map((rating) => <option key={rating.key} value={rating.key}>{rating.label}</option>)}
          </select>
        </label>
      </div>
      <div className="h-[22rem] rounded-xl border border-slate-100 bg-white/60 p-2 dark:border-slate-800 dark:bg-slate-950/25">
        {props.selectedTeams.length === 0 ? <div className="flex h-full items-center justify-center text-sm text-slate-500">Select one or more teams to chart.</div> : props.isLoading ? <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading rating history…</div> : dates.length === 0 ? <div className="flex h-full items-center justify-center text-sm text-slate-500">No history is available for this selection yet.</div> : <Line data={data} options={options} />}
      </div>
    </section>
  );
}
