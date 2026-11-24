import type { ConferenceData } from "@/hooks/useBasketballConfData";

/** Bids as the conference bids table shows them (one decimal). */
const shownBids = (conf: ConferenceData) =>
  Math.round(conf.average_bids * 10) / 10;

/** Median win probability vs the #100 team; archived seasons without it
 * fall back to the conference's median net rating (same direction). */
const strength = (conf: ConferenceData) =>
  conf.winprob?.rk100?.median ?? conf.netrtg_median ?? 0;

/**
 * Basketball conf-data order, which also picks the "Top 12": most projected
 * NCAA bids first, as shown to one decimal, then the stronger conference.
 * Without the tiebreak the last top-12 spots went to whichever one-bid
 * league led by a few thousandths of a bid that day.
 */
export function sortConferencesByBids(
  conferences: readonly ConferenceData[],
): ConferenceData[] {
  return [...conferences].sort(
    (a, b) => shownBids(b) - shownBids(a) || strength(b) - strength(a),
  );
}
