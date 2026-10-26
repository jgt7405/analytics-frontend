import { MetadataRoute } from 'next';
import { BACKEND_API_URL } from '@/config/env';
import { CACHE_POLICIES } from '@/lib/cache-policy';
import { teamPagePath } from "@/lib/display-names";
import { logger } from "@/lib/logger";
import { SPORT_IDS } from "@/config/seasons";
import { SPORTS, sportPagePath } from "@/config/sports";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.jthomanalytics.com';

  // Seasonless pages from src/config/sports.ts (docs/decisions/url-policy.md).
  // NOTE: "/" is intentionally omitted — it redirects (see next.config.ts
  // redirects), so listing it produced a "Page with redirect" in Search
  // Console. Archive-season pages are noindex and never listed.
  const staticPages: MetadataRoute.Sitemap = SPORT_IDS.flatMap((sport) =>
    SPORTS[sport].pages.flatMap((page) =>
      page.indexed && page.sitemap
        ? [{ url: `${baseUrl}${sportPagePath(sport, page.slug)}`, ...page.sitemap }]
        : [],
    ),
  );

  // Fetch team pages from backend
  const teamPages: MetadataRoute.Sitemap = [];

  try {
    // Fetch basketball teams
    const basketballTeamsRes = await fetch(
      `${BACKEND_API_URL}/basketball_teams`,
      { next: { revalidate: CACHE_POLICIES.referenceData.revalidate } }
    );

    if (basketballTeamsRes.ok) {
      // Backend returns { data: [{ team_name, ... }] }, not a bare array.
      const basketballTeams = (await basketballTeamsRes.json())?.data;
      if (Array.isArray(basketballTeams)) {
        basketballTeams.forEach((team: { team_name: string }) => {
          // The team page URL as in-app links build it: the name with
          // spaces, URL-encoded (valid XML, no raw &), and the display name
          // where there is one (src/lib/display-names.ts).
          teamPages.push({
            url: `${baseUrl}${teamPagePath("basketball", team.team_name)}`,
            changeFrequency: 'weekly',
            priority: 0.7,
          });
        });
      }
    }
  } catch (error) {
    logger.warn('Could not fetch basketball teams for sitemap:', error);
  }

  try {
    const footballTeamsRes = await fetch(
      `${BACKEND_API_URL}/football_teams`,
      { next: { revalidate: CACHE_POLICIES.referenceData.revalidate } }
    );

    if (footballTeamsRes.ok) {
      // Backend returns { data: [{ team_name, ... }] }, not a bare array.
      const footballTeams = (await footballTeamsRes.json())?.data;
      if (Array.isArray(footballTeams)) {
        footballTeams.forEach((team: { team_name: string }) => {
          // The team page URL as in-app links build it: the name with
          // spaces, URL-encoded (valid XML, no raw &), and the display name
          // where there is one (src/lib/display-names.ts).
          teamPages.push({
            url: `${baseUrl}${teamPagePath("football", team.team_name)}`,
            changeFrequency: 'weekly',
            priority: 0.7,
          });
        });
      }
    }
  } catch (error) {
    logger.warn('Could not fetch football teams for sitemap:', error);
  }

  return [...staticPages, ...teamPages];
}
