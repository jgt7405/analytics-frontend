import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.jthomanalytics.com';

  // Static main pages with priorities.
  // NOTE: "/" is intentionally omitted — it 308-redirects to /football/wins/
  // (see next.config.js redirects), so listing it produced a "Page with
  // redirect" in Search Console. The redirect target is listed below instead.
  const staticPages: MetadataRoute.Sitemap = [
    // Football pages
    {
      url: `${baseUrl}/football/wins/`,
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/football/standings/`,
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/football/cfp/`,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/football/seed/`,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/football/schedule/`,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/football/teams/`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/football/compare/`,
      changeFrequency: 'weekly',
      priority: 0.75,
    },
    {
      url: `${baseUrl}/football/cwv/`,
      changeFrequency: 'daily',
      priority: 0.75,
    },
    {
      url: `${baseUrl}/football/conf-data/`,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/football/conf-champ/`,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/football/whatif/`,
      changeFrequency: 'weekly',
      priority: 0.75,
    },
    {
      url: `${baseUrl}/football/home/`,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/football/twv/`,
      changeFrequency: 'weekly',
      priority: 0.65,
    },
    // Basketball pages
    {
      url: `${baseUrl}/basketball/wins/`,
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/basketball/standings/`,
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/basketball/ncaa-tourney/`,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/basketball/seed/`,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/basketball/schedule/`,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/basketball/teams/`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/basketball/compare/`,
      changeFrequency: 'weekly',
      priority: 0.75,
    },
    {
      url: `${baseUrl}/basketball/cwv/`,
      changeFrequency: 'daily',
      priority: 0.75,
    },
    {
      url: `${baseUrl}/basketball/conf-data/`,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/basketball/conf-tourney/`,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/basketball/whatif/`,
      changeFrequency: 'weekly',
      priority: 0.75,
    },
    {
      url: `${baseUrl}/basketball/home/`,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/basketball/twv/`,
      changeFrequency: 'weekly',
      priority: 0.65,
    },
    {
      url: `${baseUrl}/basketball/game-preview/`,
      changeFrequency: 'weekly',
      priority: 0.65,
    },
  ];

  // Fetch team pages from backend
  const teamPages: MetadataRoute.Sitemap = [];

  try {
    // Fetch basketball teams
    const basketballTeamsRes = await fetch(
      'https://jthomprodbackend-production.up.railway.app/api/basketball_teams',
      { next: { revalidate: 3600 } }
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
    console.warn('Could not fetch basketball teams for sitemap:', error);
  }

  try {
    const footballTeamsRes = await fetch(
      'https://jthomprodbackend-production.up.railway.app/api/football_teams',
      { next: { revalidate: 3600 } }
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
    console.warn('Could not fetch football teams for sitemap:', error);
  }

  return [...staticPages, ...teamPages];
}
