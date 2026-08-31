"use client";

import TableActionButtons from "@/components/common/TableActionButtons";
import TeamLogo from "@/components/ui/TeamLogo";
import {
  fetchGameImpacts,
  GameImpactRow,
} from "@/hooks/useFootballGameImpacts";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface FocusTeam {
  team_id: number;
  team_name: string;
  logo_url?: string;
}

interface FootballGameImpactBoardProps {
  conference: string;
  /** Conference teams — reuse the what-if page's `currentProjections`. */
  teams: FocusTeam[];
  className?: string;
}

const CARD_CLASS =
  "relative border border-slate-200/90 dark:border-slate-700/90 rounded-[1.25rem] bg-gradient-to-br from-white to-[#fbfdff] dark:from-[#111827] dark:to-[#0f172a] shadow-[0_22px_55px_-36px_rgb(15_23_42_/_0.36),0_8px_22px_-18px_rgb(15_23_42_/_0.24)] dark:shadow-[0_24px_58px_-34px_rgb(0_0_0_/_0.82)]";
const TITLE_CLASS =
  "text-[clamp(1.25rem,2.2vw,1.75rem)] font-bold leading-[1.1] tracking-[-0.035em] text-slate-700 dark:text-slate-300";

const BATCH_SIZE = 12;

type Metric = "cfp" | "ccg";
type SortCol = "date" | "t1" | "t2" | "swing";
type SortDir = "asc" | "desc";
type Phase = "idle" | "planning" | "simulating" | "done";

function fmtDate(raw: string): string {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function fmtDelta(delta: number): string {
  if (Math.abs(delta) < 0.1) return "·";
  return `${delta > 0 ? "+" : "−"}${Math.abs(delta).toFixed(1)}%`;
}

/** Diverging green/red heat for a signed percentage-point delta. */
function deltaStyle(delta: number): React.CSSProperties {
  if (Math.abs(delta) < 0.1) return { color: "#9ca3af" };
  const mag = Math.min(Math.abs(delta) / 15, 1);
  const a = 0.14 + mag * 0.5;
  return delta > 0
    ? { backgroundColor: `rgba(34,197,94,${a})`, color: "#14532d" }
    : { backgroundColor: `rgba(239,68,68,${a})`, color: "#7f1d1d" };
}

function outcomeDeltas(g: GameImpactRow, m: Metric) {
  // Team 1 = visitor/away, Team 2 = home.
  const d1 = m === "cfp" ? g.if_away_win.cfp_delta : g.if_away_win.ccg_delta;
  const d2 = m === "cfp" ? g.if_home_win.cfp_delta : g.if_home_win.ccg_delta;
  return { d1, d2, swing: Math.round(Math.abs(d1 - d2) * 10) / 10 };
}

/** Absolute post-game probability for the focus team under each outcome. */
function postGame(g: GameImpactRow, m: Metric) {
  const p1 = m === "cfp" ? g.if_away_win.cfp_pct : g.if_away_win.ccg_pct;
  const p2 = m === "cfp" ? g.if_home_win.cfp_pct : g.if_home_win.ccg_pct;
  return { low: Math.min(p1, p2), high: Math.max(p1, p2) };
}

/** One team in the matchup cell: logo with its win probability stacked
 *  underneath on mobile, inline on desktop. */
function GameTeam({
  logoUrl,
  teamName,
  probability,
}: {
  logoUrl: string;
  teamName: string;
  probability: number | null;
}) {
  return (
    <span className="flex flex-col items-center leading-none sm:flex-row sm:gap-1">
      <TeamLogo logoUrl={logoUrl} teamName={teamName} size={22} />
      <span className="mt-0.5 text-[10px] tabular-nums text-gray-400 sm:mt-0 sm:text-xs">
        {probability != null ? `${Math.round(probability * 100)}%` : ""}
      </span>
    </span>
  );
}

function WinnerDelta({
  delta,
  logoUrl,
  teamName,
}: {
  delta: number;
  logoUrl: string;
  teamName: string;
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      <TeamLogo logoUrl={logoUrl} teamName={teamName} size={24} />
      <span
        className="inline-flex min-w-[3.25rem] items-center justify-center rounded-md px-2 py-0.5 text-sm font-bold tabular-nums"
        style={deltaStyle(delta)}
      >
        {fmtDelta(delta)}
      </span>
    </div>
  );
}

export default function FootballGameImpactBoard({
  conference,
  teams,
  className,
}: FootballGameImpactBoardProps) {
  const [focusTeamId, setFocusTeamId] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [baseline, setBaseline] = useState<{ ccg: number; cfp: number } | null>(
    null,
  );
  const [rowsById, setRowsById] = useState<Map<number, GameImpactRow>>(new Map());
  const [pending, setPending] = useState<Set<number>>(new Set());
  const runIdRef = useRef(0);
  const prefilledTopNRef = useRef(false);

  const [metricState, setMetric] = useState<Metric>("cfp");
  const [sortCol, setSortCol] = useState<SortCol>("swing");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [topN, setTopN] = useState<string>("");

  // Independents have no conference championship game, so CCG is meaningless
  // for them - CFP only.
  const isIndependent = conference === "Independent";
  const metric: Metric = isIndependent ? "cfp" : metricState;

  const sortedTeams = useMemo(
    () =>
      [...teams].sort((a, b) =>
        (a.team_name ?? "").localeCompare(b.team_name ?? ""),
      ),
    [teams],
  );

  const reset = useCallback(() => {
    runIdRef.current += 1;
    setPhase("idle");
    setError(null);
    setBaseline(null);
    setTeamName("");
    setRowsById(new Map());
    setPending(new Set());
    setTopN("");
    prefilledTopNRef.current = false;
  }, []);

  useEffect(() => {
    setFocusTeamId(null);
    reset();
  }, [conference, reset]);

  const run = useCallback(
    async (teamId: number) => {
      const myRun = ++runIdRef.current;
      prefilledTopNRef.current = false;
      setError(null);
      setRowsById(new Map());
      setPending(new Set());
      setBaseline(null);
      setPhase("planning");

      try {
        const plan = await fetchGameImpacts({
          conference,
          team_id: teamId,
          days: 7,
          plan_only: true,
        });
        if (myRun !== runIdRef.current) return;

        setTeamName(plan.team_name);
        setBaseline({ ccg: plan.baseline.ccg_pct, cfp: plan.baseline.cfp_pct });
        const initial = new Map<number, GameImpactRow>();
        plan.games.forEach((g) => initial.set(g.game_id, g));
        setRowsById(initial);

        const simIds = plan.sim_game_ids ?? [];
        if (simIds.length === 0) {
          setPhase("done");
          return;
        }
        setPending(new Set(simIds));
        setPhase("simulating");

        for (let i = 0; i < simIds.length; i += BATCH_SIZE) {
          if (myRun !== runIdRef.current) return;
          const chunk = simIds.slice(i, i + BATCH_SIZE);
          try {
            const res = await fetchGameImpacts({
              conference,
              team_id: teamId,
              days: 7,
              game_ids: chunk,
            });
            if (myRun !== runIdRef.current) return;
            setRowsById((prev) => {
              const next = new Map(prev);
              res.games.forEach((g) => next.set(g.game_id, g));
              return next;
            });
          } catch {
            /* one slow batch shouldn't kill the run */
          }
          if (myRun !== runIdRef.current) return;
          setPending((prev) => {
            const next = new Set(prev);
            chunk.forEach((id) => next.delete(id));
            return next;
          });
        }
        if (myRun === runIdRef.current) setPhase("done");
      } catch (e) {
        if (myRun !== runIdRef.current) return;
        setError(e instanceof Error ? e.message : "Failed to load");
        setPhase("done");
      }
    },
    [conference],
  );

  useEffect(() => {
    if (focusTeamId) run(focusTeamId);
    else reset();
  }, [focusTeamId, run, reset]);

  const handleSort = (col: SortCol) => {
    if (col === sortCol) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir(col === "date" ? "asc" : "desc");
    }
  };

  const rows = useMemo(() => {
    const arr = Array.from(rowsById.values());
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      if (a.simulated !== b.simulated) return a.simulated ? -1 : 1; // pending last
      let av: number | string;
      let bv: number | string;
      if (sortCol === "date") {
        av = String(a.date);
        bv = String(b.date);
      } else if (sortCol === "swing") {
        av = outcomeDeltas(a, metric).swing;
        bv = outcomeDeltas(b, metric).swing;
      } else if (sortCol === "t1") {
        av = outcomeDeltas(a, metric).d1;
        bv = outcomeDeltas(b, metric).d1;
      } else {
        av = outcomeDeltas(a, metric).d2;
        bv = outcomeDeltas(b, metric).d2;
      }
      if (av < bv) return -dir;
      if (av > bv) return dir;
      return String(a.date).localeCompare(String(b.date));
    });
    return arr;
  }, [rowsById, sortCol, sortDir, metric]);

  const visibleRows = useMemo(() => {
    const done = rows.filter((r) => r.simulated);
    const notDone = rows.filter((r) => !r.simulated);
    const n = parseInt(topN, 10);
    const limited =
      Number.isFinite(n) && n > 0 ? done.slice(0, n) : done;
    return [...limited, ...notDone];
  }, [rows, topN]);

  const total = rows.length;
  const done = rows.filter((r) => r.simulated).length;
  const metricLabel = metric === "cfp" ? "CFP" : "CCG";
  const focusLogo =
    teams.find((t) => t.team_id === focusTeamId)?.logo_url ||
    "/images/team_logos/default.png";

  // Seed the "show top" box once per run with the full count so it reads as an
  // editable number the user can highlight, clear (→ show all), or retype.
  useEffect(() => {
    if (phase === "done" && !prefilledTopNRef.current && done > 0) {
      prefilledTopNRef.current = true;
      setTopN(String(done));
    }
  }, [phase, done]);

  const SortHead = ({
    col,
    children,
    align = "center",
    corner = false,
  }: {
    col: SortCol;
    children: React.ReactNode;
    align?: "left" | "center" | "right";
    corner?: boolean;
  }) => (
    <th
      scope="col"
      onClick={() => handleSort(col)}
      aria-sort={
        sortCol === col
          ? sortDir === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
      className={cn(
        "sticky top-0 z-20 cursor-pointer select-none whitespace-nowrap border-b-2 border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors dark:border-slate-700 dark:bg-slate-900",
        corner &&
          "left-0 z-30 shadow-[1px_0_0_0_rgba(15,23,42,0.08)] dark:shadow-[1px_0_0_0_rgba(0,0,0,0.5)]",
        align === "left" && "text-left",
        align === "center" && "text-center",
        align === "right" && "text-right",
        sortCol === col
          ? "text-slate-700 dark:text-slate-200"
          : "text-gray-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-slate-200",
      )}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <span className="text-[9px] text-cyan-600 dark:text-cyan-400">
          {sortCol === col ? (sortDir === "asc" ? "▲" : "▼") : ""}
        </span>
      </span>
    </th>
  );

  return (
    <div
      className={cn(
        CARD_CLASS,
        "game-impact-board p-3 sm:p-6",
        className,
      )}
    >
      <div className="mb-1 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h3 className={TITLE_CLASS}>Game Impact — Next 7 Days</h3>
        </div>
        {baseline && focusTeamId && (
          <div className="flex items-center gap-3">
            <TeamLogo logoUrl={focusLogo} teamName={teamName} size={44} />
            <div className="flex gap-3">
              {(
                metric === "cfp"
                  ? ([["CFP now", baseline.cfp]] as const)
                  : ([["CCG now", baseline.ccg]] as const)
              ).map(([label, val]) => (
                <div
                  key={label}
                  className="rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-1.5 text-center dark:border-slate-700/80 dark:bg-slate-800/60"
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    {label}
                  </div>
                  <div className="text-lg font-bold leading-tight tabular-nums text-slate-700 dark:text-slate-100">
                    {val.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <p className="mb-4 text-xs text-gray-600 dark:text-gray-300">
        For each upcoming game, percentage point impact each result would change{" "}
        {teamName ? <b>{teamName}</b> : "the selected team"}&apos;s probability to
        make the <b>CFP</b>
        {!isIndependent && (
          <>
            {" "}
            or reach its <b>conference championship game (CCG)</b>
          </>
        )}
        .
      </p>

      {/* Controls */}
      <div
        className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"
        data-screenshot-hide="true"
      >
        <select
          value={focusTeamId ?? ""}
          onChange={(e) =>
            setFocusTeamId(e.target.value ? parseInt(e.target.value, 10) : null)
          }
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:border-gray-400 dark:border-gray-600 dark:bg-slate-900"
        >
          <option value="">Select a team…</option>
          {sortedTeams.map((t) => (
            <option key={t.team_id} value={t.team_id}>
              {t.team_name}
            </option>
          ))}
        </select>

        {focusTeamId && (
          <>
            {!isIndependent && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Swing by
                </span>
                <div className="inline-flex overflow-hidden rounded-md border border-gray-300 dark:border-gray-600">
                  {(["cfp", "ccg"] as Metric[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMetric(m)}
                      className={cn(
                        "px-2.5 py-1 text-xs font-semibold transition-colors",
                        metric === m
                          ? "bg-cyan-600 text-white"
                          : "bg-white text-gray-600 hover:bg-gray-50 dark:bg-slate-900 dark:text-gray-300 dark:hover:bg-slate-800",
                      )}
                    >
                      {m.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Show top
              <input
                type="text"
                inputMode="numeric"
                value={topN}
                onChange={(e) =>
                  setTopN(e.target.value.replace(/[^0-9]/g, ""))
                }
                placeholder={String(done || "all")}
                className="w-16 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm font-semibold text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-gray-600 dark:bg-slate-900 dark:text-slate-100"
              />
              <span className="normal-case">swings</span>
            </label>

            {done > 0 && (
              <div className="ml-auto">
                <TableActionButtons
                  contentSelector=".game-impact-board"
                  selectedConference={conference}
                  pageName="game-impact"
                  pageTitle={`Game Impact — ${teamName}`}
                  shareTitle="Game Impact — Next 7 Days"
                />
              </div>
            )}
          </>
        )}
      </div>

      {!focusTeamId && (
        <p className="py-6 text-center text-sm text-gray-400">
          Pick a team to see which upcoming games matter most for its playoff and
          conference-title chances.
        </p>
      )}

      {focusTeamId && phase === "planning" && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500 dark:text-gray-300">
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: "rgb(0,151,178) transparent transparent" }}
          />
          Loading…
        </div>
      )}

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
          <button
            onClick={() => focusTeamId && run(focusTeamId)}
            className="ml-2 underline"
          >
            Retry
          </button>
        </div>
      )}

      {focusTeamId && phase !== "planning" && rows.length === 0 && !error && (
        <p className="py-6 text-center text-sm text-gray-400">
          No games in the next 7 days.
        </p>
      )}

      {rows.length > 0 && (
        <>
          {phase === "simulating" && (
            <div className="mb-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span
                className="h-3 w-3 animate-spin rounded-full border-2 border-t-transparent"
                style={{ borderColor: "rgb(0,151,178) transparent transparent" }}
              />
              Simulating remaining games… {done}/{total}
            </div>
          )}
          <div className="screenshot-expand max-h-[70vh] overflow-auto overscroll-contain rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <table className="w-full min-w-[520px] border-separate border-spacing-0 text-sm sm:min-w-[600px]">
              <thead>
                <tr>
                  <SortHead col="date" align="left" corner>
                    Game
                  </SortHead>
                  <SortHead col="t1">
                    If Team 1 Wins{" "}
                    <span className="font-normal">({metricLabel})</span>
                  </SortHead>
                  <SortHead col="t2">
                    If Team 2 Wins{" "}
                    <span className="font-normal">({metricLabel})</span>
                  </SortHead>
                  <SortHead col="swing" align="right">
                    {metricLabel} Swing
                  </SortHead>
                  <th className="sticky top-0 z-20 whitespace-nowrap border-b-2 border-slate-200 bg-white px-2 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-400">
                    <div>Post-Game {metricLabel} Probability</div>
                    <div className="mt-0.5 flex justify-center gap-2 text-[11px] font-bold normal-case text-gray-500 dark:text-gray-300">
                      <span className="w-12 text-center">Low</span>
                      <span className="w-12 text-center">High</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((g) => {
                  const isPending = pending.has(g.game_id) && !g.simulated;
                  const { d1, d2, swing } = outcomeDeltas(g, metric);
                  const { low, high } = postGame(g, metric);
                  return (
                    <tr
                      key={g.game_id}
                      className="border-b border-gray-100 last:border-0 dark:border-gray-800"
                    >
                      <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-2 py-1.5 align-middle shadow-[1px_0_0_0_rgba(15,23,42,0.08)] dark:bg-slate-900 dark:shadow-[1px_0_0_0_rgba(0,0,0,0.5)]">
                        <div className="flex items-center gap-1 sm:gap-1.5">
                          <GameTeam
                            logoUrl={
                              g.away_team_logo ||
                              "/images/team_logos/default.png"
                            }
                            teamName={g.away_team}
                            probability={g.away_probability}
                          />
                          <span className="text-[10px] text-gray-400 sm:text-xs">
                            @
                          </span>
                          <GameTeam
                            logoUrl={
                              g.home_team_logo ||
                              "/images/team_logos/default.png"
                            }
                            teamName={g.home_team}
                            probability={g.home_probability}
                          />
                          {g.conf_game && g.involves_focus_conf && (
                            <span className="ml-0.5 rounded bg-slate-200 px-1 text-[9px] font-semibold uppercase text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                              Conf
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                          {fmtDate(g.date)}
                        </div>
                      </td>
                      {isPending ? (
                        <td
                          colSpan={4}
                          className="px-2 py-1 text-center text-xs text-gray-400"
                        >
                          <span
                            className="mr-1 inline-block h-3 w-3 animate-spin rounded-full border-2 border-t-transparent align-[-2px]"
                            style={{
                              borderColor:
                                "rgb(0,151,178) transparent transparent",
                            }}
                          />
                          simulating…
                        </td>
                      ) : (
                        <>
                          <td className="px-2 py-1">
                            <WinnerDelta
                              delta={d1}
                              logoUrl={
                                g.away_team_logo ||
                                "/images/team_logos/default.png"
                              }
                              teamName={g.away_team}
                            />
                          </td>
                          <td className="px-2 py-1">
                            <WinnerDelta
                              delta={d2}
                              logoUrl={
                                g.home_team_logo ||
                                "/images/team_logos/default.png"
                              }
                              teamName={g.home_team}
                            />
                          </td>
                          <td className="px-2 py-1 text-right text-sm font-bold tabular-nums text-gray-700 dark:text-gray-200">
                            {swing >= 0.1 ? `${swing.toFixed(1)}%` : "·"}
                          </td>
                          <td className="px-2 py-1">
                            <div className="flex justify-center gap-2 tabular-nums text-gray-700 dark:text-gray-200">
                              <span className="w-12 text-center">
                                {low.toFixed(1)}%
                              </span>
                              <span className="w-12 text-center">
                                {high.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {baseline && rows.length > 0 && (
        <p className="mt-3 text-[10px] leading-relaxed text-gray-400">
          Each value is the change in percentage point probability for the team
          selected with the indicated game result. <b>Swing</b> is the gap
          between the two results. <b>Post-Game {metricLabel} Probability</b>{" "}
          shows the resulting probability for the selected team — <b>Low</b> is
          the worse outcome for the team, <b>High</b> the better one.
        </p>
      )}
    </div>
  );
}
