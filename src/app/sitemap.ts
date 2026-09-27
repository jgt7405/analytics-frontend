import { MetadataRoute } from 'next';
import { BACKEND_API_URL } from '@/config/env';
import { CACHE_POLICIES } from '@/lib/cache-policy';
import { logger } from "@/lib/logger";
import { SPORT_IDS } from "@/config/seasons";
import { SPORTS, sportPagePath } from "@/config/sports";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.jthomanalytics.com';

  // Seasonless pages from src/config/sports.ts (docs/decisions/url-policy.md).
  // NOTE: "/" is intentionally omitted — it redirects (see next.config.js
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
          // Use the raw team name, URL-encoded (spaces -> %20, & -> %26).
          // The backend team endpoint expects the name with spaces, NOT
          // underscores (underscore slugs 404). This matches in-app links and
          // also keeps the sitemap valid XML (no raw &).
          const slug = encodeURIComponent(team.team_name);
          teamPages.push({
            url: `${baseUrl}/basketball/team/${slug}/`,
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
          // Use the raw team name, URL-encoded (spaces -> %20, & -> %26).
          // The backend team endpoint expects the name with spaces, NOT
          // underscores (underscore slugs 404). This matches in-app links and
          // also keeps the sitemap valid XML (no raw &).
          const slug = encodeURIComponent(team.team_name);
          teamPages.push({
            url: `${baseUrl}/football/team/${slug}/`,
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
