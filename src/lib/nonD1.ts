/**
 * The backend groups non-Division I opponents into a pseudo-conference
 * ("Non-D1", sometimes "Non D1"). It is not a real conference, so pages that
 * chart conferences side by side (e.g. basketball/conf-data) drop it.
 */
const NON_D1_NAMES = new Set(["non-d1", "non d1", "nond1"]);

export function isNonD1Conference(name: string | null | undefined): boolean {
  return !!name && NON_D1_NAMES.has(name.trim().toLowerCase());
}

interface ConfDataLike {
  conferenceData?: { data?: { conference_name: string }[] };
  nonconfData?: { data?: { team_conf: string }[]; conferences?: string[] };
}

/** Remove the Non-D1 pseudo-conference from a combined basketball conf-data response (mutates and returns it). */
export function stripNonD1ConfData<T extends ConfDataLike>(response: T): T {
  const conf = response.conferenceData;
  if (conf?.data) conf.data = conf.data.filter((c) => !isNonD1Conference(c.conference_name));
  const nonconf = response.nonconfData;
  if (nonconf?.data) nonconf.data = nonconf.data.filter((c) => !isNonD1Conference(c.team_conf));
  if (nonconf?.conferences) nonconf.conferences = nonconf.conferences.filter((c) => !isNonD1Conference(c));
  return response;
}
