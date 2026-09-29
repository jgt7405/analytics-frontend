"use client";

// Schedule strip: away, neutral and home games.

import { type TeamGameData } from "@/types/gamePreview";
import { TEAL, getLogoUrl } from "../metrics";

// ─── 3-Column Schedule Strip (Away | Neutral | Home) ─────────────────────────

export function ThreeColumnSchedule({
  schedule,
  upcomingOpponent,
  upcomingDate,
}: {
  schedule: TeamGameData[];
  upcomingOpponent: string;
  upcomingDate: string;
}) {
  const nextGame = (() => {
    const chronoNext = [...schedule]
      .sort((a, b) => a.date.localeCompare(b.date))
      .find((g) => g.status !== "W" && g.status !== "L");
    if (chronoNext) return chronoNext;
    if (upcomingOpponent && upcomingDate) {
      return (
        schedule.find(
          (g) => g.opponent === upcomingOpponent && g.date === upcomingDate,
        ) || null
      );
    }
    return null;
  })();

  const grouped = {
    Away: [] as TeamGameData[],
    Neutral: [] as TeamGameData[],
    Home: [] as TeamGameData[],
  };
  const records = {
    Away: { w: 0, l: 0 },
    Neutral: { w: 0, l: 0 },
    Home: { w: 0, l: 0 },
  };

  schedule.forEach((g) => {
    const loc = g.location as "Away" | "Neutral" | "Home";
    if (grouped[loc]) {
      grouped[loc].push(g);
      if (g.status === "W") records[loc].w++;
      else if (g.status === "L") records[loc].l++;
    }
  });

  (["Away", "Neutral", "Home"] as const).forEach((loc) => {
    grouped[loc].sort((a, b) => {
      const aRank =
        !a.kenpom_rank || a.kenpom_rank === 999 ? 9999 : a.kenpom_rank;
      const bRank =
        !b.kenpom_rank || b.kenpom_rank === 999 ? 9999 : b.kenpom_rank;
      return aRank - bRank;
    });
  });

  const BOX_W = 42;
  const BOX_H = 24;
  const LOGO_SIZE = 14;

  const isNextGame = (g: TeamGameData) => {
    if (!nextGame) return false;
    return g.opponent === nextGame.opponent && g.date === nextGame.date;
  };

  const getBorderColor = (g: TeamGameData) => {
    if (isNextGame(g)) return TEAL;
    if (g.status === "W") return "#22c55e";
    if (g.status === "L") return "#ef4444";
    return "#d1d5db";
  };

  const getBgColor = (g: TeamGameData) => {
    if (isNextGame(g)) return `${TEAL}25`;
    return "white";
  };

  return (
    <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
      {(["Away", "Neutral", "Home"] as const).map((loc) => (
        <div key={loc} style={{ flexShrink: 0 }}>
          <div style={{ textAlign: "center", marginBottom: 3 }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: "#6b7280" }}>
              {loc}
            </div>
            <div style={{ fontSize: 8, color: "#9ca3af" }}>
              {records[loc].w}-{records[loc].l}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              alignItems: "center",
            }}
          >
            {grouped[loc].length > 0 ? (
              grouped[loc].map((g, idx) => {
                const nextGameMatch = isNextGame(g);
                return (
                  <div
                    key={`${g.date}-${g.opponent}-${idx}`}
                    title={`${g.opponent} ${g.kenpom_rank && g.kenpom_rank !== 999 ? `#${g.kenpom_rank}` : "Non D1"} - ${g.status === "W" ? "Win" : g.status === "L" ? "Loss" : "Upcoming"}`}
                    style={{
                      width: BOX_W,
                      height: BOX_H,
                      border: `2px solid ${getBorderColor(g)}`,
                      borderRadius: 3,
                      backgroundColor: getBgColor(g),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0 2px",
                      boxShadow: nextGameMatch ? `0 0 0 1px ${TEAL}40` : "none",
                    }}
                  >
                    {g.opponent_logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getLogoUrl(g.opponent_logo)}
                        alt={g.opponent}
                        style={{
                          width: LOGO_SIZE,
                          height: LOGO_SIZE,
                          objectFit: "contain",
                          flexShrink: 0,
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src="/images/team_logos/default.png"
                        alt={g.opponent}
                        style={{
                          width: LOGO_SIZE,
                          height: LOGO_SIZE,
                          objectFit: "contain",
                          flexShrink: 0,
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                    <span
                      style={{
                        fontSize: 7,
                        color: "#6b7280",
                        fontWeight: 600,
                        marginLeft: 1,
                        flexShrink: 0,
                      }}
                    >
                      {g.kenpom_rank && g.kenpom_rank !== 999
                        ? `#${g.kenpom_rank}`
                        : "Non D1"}
                    </span>
                  </div>
                );
              })
            ) : (
              <div
                style={{
                  width: BOX_W,
                  height: BOX_H,
                  border: "1px dashed #d1d5db",
                  borderRadius: 3,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 8,
                  color: "#9ca3af",
                }}
              >
                None
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
