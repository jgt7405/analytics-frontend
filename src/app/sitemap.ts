import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://jthomanalytics.com';

  // Static main pages with priorities
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      changeFrequency: 'weekly',
      priority: 1.0,
      lastModified: new Date(),
    },
    // Football pages
    {
      url: `${baseUrl}/football/wins/`,
      changeFrequency: 'daily',
      priority: 0.95,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/football/standings/`,
      changeFrequency: 'daily',
      priority: 0.95,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/football/cfp/`,
      changeFrequency: 'daily',
      priority: 0.9,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/football/seed/`,
      changeFrequency: 'daily',
      priority: 0.85,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/football/schedule/`,
      changeFrequency: 'daily',
      priority: 0.85,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/football/teams/`,
      changeFrequency: 'weekly',
      priority: 0.8,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/football/compare/`,
      changeFrequency: 'weekly',
      priority: 0.75,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/football/cwv/`,
      changeFrequency: 'daily',
      priority: 0.75,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/football/conf-data/`,
      changeFrequency: 'weekly',
      priority: 0.7,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/football/conf-champ/`,
      changeFrequency: 'daily',
      priority: 0.8,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/football/whatif/`,
      changeFrequency: 'weekly',
      priority: 0.75,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/football/home/`,
      changeFrequency: 'weekly',
      priority: 0.7,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/football/twv/`,
      changeFrequency: 'weekly',
      priority: 0.65,
      lastModified: new Date(),
    },
    // Basketball pages
    {
      url: `${baseUrl}/basketball/wins/`,
      changeFrequency: 'daily',
      priority: 0.95,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/basketball/standings/`,
      changeFrequency: 'daily',
      priority: 0.95,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/basketball/ncaa-tourney/`,
      changeFrequency: 'daily',
      priority: 0.9,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/basketball/seed/`,
      changeFrequency: 'daily',
      priority: 0.85,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/basketball/schedule/`,
      changeFrequency: 'daily',
      priority: 0.85,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/basketball/teams/`,
      changeFrequency: 'weekly',
      priority: 0.8,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/basketball/compare/`,
      changeFrequency: 'weekly',
      priority: 0.75,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/basketball/cwv/`,
      changeFrequency: 'daily',
      priority: 0.75,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/basketball/conf-data/`,
      changeFrequency: 'weekly',
      priority: 0.7,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/basketball/conf-tourney/`,
      changeFrequency: 'daily',
      priority: 0.8,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/basketball/whatif/`,
      changeFrequency: 'weekly',
      priority: 0.75,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/basketball/home/`,
      changeFrequency: 'weekly',
      priority: 0.7,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/basketball/twv/`,
      changeFrequency: 'weekly',
      priority: 0.65,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/basketball/game-preview/`,
      changeFrequency: 'weekly',
      priority: 0.65,
      lastModified: new Date(),
    },
  ];

  // Fetch team pages from backend
  let teamPages: MetadataRoute.Sitemap = [];

  try {
    // Fetch basketball teams
    const basketballTeamsRes = await fetch(
      'https://jthomprodbackend-production.up.railway.app/api/basketball_teams',
      { next: { revalidate: 3600 } }
    );

    if (basketballTeamsRes.ok) {
      const basketballTeams = await basketballTeamsRes.json();
      if (Array.isArray(basketballTeams)) {
        basketballTeams.forEach((team: { team_name: string }) => {
          const slug = team.team_name.replace(/ /g, '_');
          teamPages.push({
            url: `${baseUrl}/basketball/team/${slug}/`,
            changeFrequency: 'weekly',
            priority: 0.7,
            lastModified: new Date(),
          });
        });
      }
    }
  } catch (error) {
    console.warn('Could not fetch basketball teams for sitemap:', error);
  }

  try {
    // Fetch football teams - try multiple potential endpoints
    let footballTeamsRes = await fetch(
      'https://jthomprodbackend-production.up.railway.app/api/football_teams',
      { next: { revalidate: 3600 } }
    );

    // Fallback endpoint if the first fails
    if (!footballTeamsRes.ok) {
      footballTeamsRes = await fetch(
        'https://jthomprodbackend-production.up.railway.app/api/football/teams',
        { next: { revalidate: 3600 } }
      );
    }

    if (footballTeamsRes.ok) {
      const footballTeams = await footballTeamsRes.json();
      if (Array.isArray(footballTeams)) {
        footballTeams.forEach((team: { team_name: string }) => {
          const slug = team.team_name.replace(/ /g, '_');
          teamPages.push({
            url: `${baseUrl}/football/team/${slug}/`,
            changeFrequency: 'weekly',
            priority: 0.7,
            lastModified: new Date(),
          });
        });
      }
    }
  } catch (error) {
    console.warn('Could not fetch football teams for sitemap:', error);
  }

  return [...staticPages, ...teamPages];
}
