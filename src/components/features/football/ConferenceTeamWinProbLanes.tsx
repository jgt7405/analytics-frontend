"use client";

// One swim lane per conference with every team's logo placed at its win
// probability vs an average FBS team - the teams behind the box-and-whisker
// chart above it on /football/conf-data/. Logos that would overlap are spread
// sideways by layoutLaneLogos; the dashed line is the conference median.

import { useResponsive } from "@/hooks/useResponsive";
import { layoutLaneLogos } from "@/lib/lane-logo-layout";
import type { FootballConferenceData } from "@/types/football";
import Image from "next/image";
import { useMemo, useState } from "react";

interface ConferenceTeamWinProbLanesProps {
  conferenceData: FootballConferenceData[];
}

const Y_TICKS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const EXCLUDED_CONFERENCES = ["FCS"];

function withAlpha(color: string | null | undefined, alpha: number, fallback: string): string {
  const hex = (color || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return fallback;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function LaneConferenceLogo({ conf, size }: { conf: FootballConferenceData; size: number }) {
  const [failed, setFailed] = useState(false);
  if (!conf.logo_url || failed) {
    return (
      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
        {conf.conference_name.substring(0, 3).toUpperCase()}
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full p-0.5 dark:bg-white">
      <Image
        src={conf.logo_url}
        alt={conf.conference_name}
        width={size}
        height={size}
        className="object-contain"
        style={{ width: size, height: size }}
        onError={() => setFailed(true)}
      />
    </span>
  );
}

export default function ConferenceTeamWinProbLanes({
  conferenceData,
}: ConferenceTeamWinProbLanesProps) {
  const { isMobile } = useResponsive();

  const logoPx = isMobile ? 22 : 26;
  const laneWidth = isMobile ? 72 : 86;
  const laneGap = isMobile ? 6 : 10;
  const headerHeight = isMobile ? 44 : 52;
  const plotHeight = isMobile ? 600 : 760;
  const axisWidth = 44;
  // Inset so a logo at 0% or 100% stays inside its lane.
  const plotInset = logoPx / 2 + 4;

  const lanes = useMemo(
    () =>
      (conferenceData || [])
        .filter(
          (conf) =>
            !EXCLUDED_CONFERENCES.includes(conf.conference_name) &&
            (conf.team_winprobs?.length ?? 0) > 0,
        )
        .sort((a, b) => b.winprob_median - a.winprob_median),
    [conferenceData],
  );

  const scale = (value: number) =>
    plotInset + (1 - value / 100) * (plotHeight - 2 * plotInset);

  if (lanes.length === 0) return null;

  const laneHeight = headerHeight + plotHeight;
  const contentWidth = lanes.length * laneWidth + (lanes.length - 1) * laneGap;

  return (
    <section className="relative rounded-[1.25rem] border border-slate-200/90 bg-gradient-to-br from-white to-[#fbfdff] shadow-[0_22px_55px_-36px_rgb(15_23_42_/_0.36),0_8px_22px_-18px_rgb(15_23_42_/_0.24)] dark:border-slate-700/90 dark:from-[#111827] dark:to-[#0f172a]">
      <div className="px-[1.35rem] pb-4 pt-5 max-md:px-[0.9rem] max-md:pb-3 max-md:pt-4" data-screenshot-hide="true">
        <h2 className="m-0 text-[clamp(1.25rem,2.2vw,1.75rem)] font-bold leading-[1.1] tracking-[-0.035em] text-slate-700 dark:text-slate-300">
          Team Win Probability by Conference
        </h2>
      </div>
      <div className="relative pb-4 max-md:pb-2">
        {/* Y-axis pinned outside the horizontal scroll (same as the box chart). */}
        <div
          className="absolute left-0 top-0 z-20 bg-white dark:bg-[#111827] max-md:left-0"
          style={{ width: axisWidth, height: laneHeight }}
          aria-hidden="true"
        >
          {Y_TICKS.map((tick) => (
            <div
              key={tick}
              className="absolute right-1 -translate-y-1/2 text-[13px] font-semibold tabular-nums text-slate-600 dark:text-slate-400 md:text-[15px]"
              style={{ top: headerHeight + scale(tick) }}
            >
              {tick}%
            </div>
          ))}
        </div>

        <div
          className="overflow-x-auto px-[0.9rem] [overscroll-behavior-inline:contain] max-md:px-[0.35rem]"
          role="region"
          aria-label="Team win probability vs an average team, one lane per conference. Scroll horizontally to see every conference."
          tabIndex={0}
        >
          <div
            className="relative"
            style={{ marginLeft: axisWidth, width: contentWidth, height: laneHeight }}
          >
            {Y_TICKS.map((tick) => (
              <div
                key={tick}
                className="absolute left-0 right-0 border-t border-slate-200 dark:border-slate-700"
                style={{ top: headerHeight + scale(tick) }}
                aria-hidden="true"
              />
            ))}

            <div className="relative flex" style={{ gap: laneGap }}>
              {lanes.map((conf) => {
                const teams = conf.team_winprobs ?? [];
                const placed = layoutLaneLogos(
                  teams.map((team) => ({ id: team.team_name, y: scale(team.win_prob) })),
                  logoPx,
                );
                const byName = new Map(teams.map((team) => [team.team_name, team]));
                const accent = withAlpha(conf.primary_color, 0.85, "rgb(100, 116, 139)");

                return (
                  <div
                    key={conf.conference_name}
                    className="relative shrink-0 rounded-xl"
                    style={{
                      width: laneWidth,
                      height: laneHeight,
                      // Inset shadow, not a border, so the lane's contents share
                      // the gridlines' coordinates.
                      boxShadow: `inset 0 0 0 2px ${withAlpha(conf.primary_color, 0.55, "rgb(148, 163, 184)")}`,
                      backgroundColor: withAlpha(conf.primary_color, 0.06, "rgba(148, 163, 184, 0.06)"),
                    }}
                  >
                    <div
                      className="flex items-center justify-center border-b"
                      style={{
                        height: headerHeight,
                        borderColor: withAlpha(conf.primary_color, 0.3, "rgb(226, 232, 240)"),
                      }}
                    >
                      <LaneConferenceLogo conf={conf} size={isMobile ? 26 : 32} />
                    </div>

                    {/* Conference median */}
                    <div
                      className="absolute left-1 right-1 border-t-2 border-dashed"
                      style={{ top: headerHeight + scale(conf.winprob_median) - 1, borderColor: accent }}
                      title={`${conf.conference_name} median: ${conf.winprob_median.toFixed(1)}%`}
                    />

                    {placed.map((pos) => {
                      const team = byName.get(pos.id);
                      if (!team) return null;
                      return (
                        <div
                          key={pos.id}
                          className="absolute hover:z-10"
                          style={{
                            left: laneWidth / 2 + pos.x - logoPx / 2,
                            top: headerHeight + pos.y - logoPx / 2,
                            width: logoPx,
                            height: logoPx,
                          }}
                          title={`${team.team_name}: ${team.win_prob.toFixed(1)}%`}
                        >
                          <Image
                            src={team.logo_url}
                            alt={`${team.team_name} ${team.win_prob.toFixed(1)}%`}
                            width={logoPx}
                            height={logoPx}
                            className="object-contain drop-shadow-[0_1px_1px_rgba(15,23,42,0.35)]"
                            style={{ width: logoPx, height: logoPx }}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
