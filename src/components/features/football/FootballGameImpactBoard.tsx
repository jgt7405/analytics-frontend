"use client";

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

const BATCH_SIZE = 12;

function fmtDate(raw: string): string {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function deltaStyle(delta: number): React.CSSProperties {
  if (Math.abs(delta) < 0.1) return { color: "#9ca3af" };
  const mag = Math.min(Math.abs(delta) / 15, 1);
  const alpha = 0.14 + mag * 0.5;
  return delta > 0
    ? { backgroundColor: `rgba(34,197,94,${alpha})`, color: "#14532d" }
    : { backgroundColor: `rgba(239,68,68,${alpha})`, color: "#7f1d1d" };
}

function fmtDelta(delta: number): string {
  if (Math.abs(delta) < 0.1) return "·";
  return `${delta > 0 ? "+" : "−"}${Math.abs(delta).toFixed(1)}`;
}

function OutcomeCell({ ccg, cfp }: { ccg: number; cfp: number }) {
  return (
    <div className="flex justify-center gap-1">
      <span
        className="inline-flex min-w-[2.6rem] items-center justify-center rounded px-1 py-0.5 text-xs font-semibold tabular-nums"
        style={deltaStyle(ccg)}
        title={`Conference championship game: ${fmtDelta(ccg)} pts`}
      >
        {fmtDelta(ccg)}
      </span>
      <span
        className="inline-flex min-w-[2.6rem] items-center justify-center rounded px-1 py-0.5 text-xs font-semibold tabular-nums"
        style={deltaStyle(cfp)}
        title={`CFP: ${fmtDelta(cfp)} pts`}
      >
        {fmtDelta(cfp)}
      </span>
    </div>
  );
}

type Phase = "idle" | "planning" | "simulating" | "done";

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
  const [computedAt, setComputedAt] = useState<string | null>(null);
  const [rowsById, setRowsById] = useState<Map<number, GameImpactRow>>(new Map());
  const [pending, setPending] = useState<Set<number>>(new Set());
  const runIdRef = useRef(0);

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
    setComputedAt(null);
    setTeamName("");
    setRowsById(new Map());
    setPending(new Set());
  }, []);

  // Conference changed out from under us → clear everything.
  useEffect(() => {
    setFocusTeamId(null);
    reset();
  }, [conference, reset]);

  const run = useCallback(
    async (teamId: number) => {
      const myRun = ++runIdRef.current;
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
        setComputedAt(plan.computed_at ?? null);
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
            // one slow batch shouldn't kill the run — leave those rows pending
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

  const rows = useMemo(() => {
    const arr = Array.from(rowsById.values());
    arr.sort((a, b) => {
      // done rows first (ranked by swing), then still-to-come by date
      if (a.simulated !== b.simulated) return a.simulated ? -1 : 1;
      if (a.simulated && b.max_abs_delta !== a.max_abs_delta)
        return b.max_abs_delta - a.max_abs_delta;
      return String(a.date).localeCompare(String(b.date));
    });
    return arr;
  }, [rowsById]);

  const simTotal = rows.length;
  const simDone = rows.filter((r) => r.simulated).length;

  return (
    <div className={cn(CARD_CLASS, "p-6", className)}>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[clamp(1.1rem,2vw,1.5rem)] font-bold leading-[1.1] tracking-[-0.03em] text-slate-700 dark:text-slate-300">
          Game Impact — Next 7 Days
        </h3>
        {baseline && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {teamName}: conf-title-game{" "}
            <b className="tabular-nums">{baseline.ccg.toFixed(1)}%</b> · CFP{" "}
            <b className="tabular-nums">{baseline.cfp.toFixed(1)}%</b> now
          </span>
        )}
      </div>
      <p className="mb-3 text-xs text-gray-600 dark:text-gray-300">
        Every upcoming game, simulated both ways — how each result moves{" "}
        {teamName || "the selected team"}&apos;s probability to reach its{" "}
        <b>conference championship game (CCG)</b> and make the <b>CFP</b>, sorted
        by biggest swing.
        {computedAt
          ? ` Precomputed ${new Date(computedAt).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}.`
          : ""}
      </p>

      <div className="mb-4">
        <select
          value={focusTeamId ?? ""}
          onChange={(e) =>
            setFocusTeamId(e.target.value ? parseInt(e.target.value, 10) : null)
          }
          className="w-full max-w-xs rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:border-gray-400 dark:border-gray-600 dark:bg-slate-900"
        >
          <option value="">Select a team…</option>
          {sortedTeams.map((t) => (
            <option key={t.team_id} value={t.team_id}>
              {t.team_name}
            </option>
          ))}
        </select>
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
          Finding upcoming games…
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
              Simulating every game… {simDone}/{simTotal} — you can leave this
              open, results are saved as they finish
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-500 dark:border-gray-600 dark:text-gray-400">
                  <th className="py-2 pr-2 text-left font-medium">Date</th>
                  <th className="py-2 pr-2 text-left font-medium">Game</th>
                  <th className="py-2 pr-2 text-center font-medium">
                    If away wins
                    <div className="font-normal normal-case text-gray-400">
                      CCG · CFP
                    </div>
                  </th>
                  <th className="py-2 pr-2 text-center font-medium">
                    If home wins
                    <div className="font-normal normal-case text-gray-400">
                      CCG · CFP
                    </div>
                  </th>
                  <th className="py-2 text-right font-medium">Swing</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((g) => {
                  const isFocusGame = g.is_focus_game;
                  const isQueued = !g.simulated;
                  const isActive = pending.has(g.game_id) && !g.simulated;
                  return (
                    <tr
                      key={g.game_id}
                      className={cn(
                        "border-b border-gray-100 dark:border-gray-800",
                        isFocusGame && "bg-cyan-50/60 dark:bg-cyan-950/20",
                        isQueued && !isActive && "opacity-50",
                      )}
                    >
                      <td className="whitespace-nowrap py-2 pr-2 text-xs text-gray-500 dark:text-gray-400">
                        {fmtDate(g.date)}
                      </td>
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-1.5">
                          <TeamLogo
                            logoUrl={
                              g.away_team_logo ||
                              "/images/team_logos/default.png"
                            }
                            teamName={g.away_team}
                            size={18}
                          />
                          <span className="text-xs tabular-nums text-gray-500">
                            {g.away_probability != null
                              ? `${Math.round(g.away_probability * 100)}%`
                              : ""}
                          </span>
                          <span className="text-[10px] text-gray-400">@</span>
                          <TeamLogo
                            logoUrl={
                              g.home_team_logo ||
                              "/images/team_logos/default.png"
                            }
                            teamName={g.home_team}
                            size={18}
                          />
                          <span className="text-xs tabular-nums text-gray-500">
                            {g.home_probability != null
                              ? `${Math.round(g.home_probability * 100)}%`
                              : ""}
                          </span>
                          {g.conf_game && g.involves_focus_conf && (
                            <span className="ml-1 rounded bg-slate-200 px-1 text-[9px] font-semibold uppercase text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                              Conf
                            </span>
                          )}
                        </div>
                      </td>
                      {isQueued ? (
                        <td
                          colSpan={3}
                          className="py-2 text-center text-xs text-gray-400"
                        >
                          {isActive ? (
                            <>
                              <span
                                className="mr-1 inline-block h-3 w-3 animate-spin rounded-full border-2 border-t-transparent align-[-2px]"
                                style={{
                                  borderColor:
                                    "rgb(0,151,178) transparent transparent",
                                }}
                              />
                              simulating…
                            </>
                          ) : (
                            "queued"
                          )}
                        </td>
                      ) : (
                        <>
                          <td className="py-2 pr-2 text-center">
                            <OutcomeCell
                              ccg={g.if_away_win.ccg_delta}
                              cfp={g.if_away_win.cfp_delta}
                            />
                          </td>
                          <td className="py-2 pr-2 text-center">
                            <OutcomeCell
                              ccg={g.if_home_win.ccg_delta}
                              cfp={g.if_home_win.cfp_delta}
                            />
                          </td>
                          <td className="py-2 text-right text-xs font-bold tabular-nums text-gray-700 dark:text-gray-200">
                            {g.max_abs_delta >= 0.1
                              ? g.max_abs_delta.toFixed(1)
                              : "·"}
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
        <p className="mt-3 border-t border-gray-100 pt-2 text-[10px] leading-relaxed text-gray-400 dark:border-gray-800">
          Each cell is the change in percentage points if that result happens,
          assuming every other game plays out per the model — the same as
          picking that winner in the left panel and hitting Calculate. CCG =
          probability to play in the conference championship game. <b>Swing</b>{" "}
          is the gap between the two results. A dot (·) means the result barely
          moves {teamName || "the team"}&apos;s odds.
        </p>
      )}
    </div>
  );
}
