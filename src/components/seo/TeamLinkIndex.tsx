// Server component (no "use client"): renders a crawlable, server-rendered
// index of every team on the /teams hub pages. The interactive team grid is
// client-only (it ships as an empty shell in the initial HTML), so without this
// the ~500 team pages are reachable ONLY via sitemap.xml and Google leaves them
// as "Discovered – currently not indexed". These real <a href> links give the
// team pages an internal-link path from a hub page, which is what gets them
// crawled and indexed. Hrefs use encodeURIComponent + trailing slash to match
// in-app navigation, the sitemap, and the backend /team/<name> endpoint.
import Link from "next/link";
import type { TeamListEntry } from "@/lib/server-api";

interface TeamLinkIndexProps {
  sport: "basketball" | "football";
  teams: TeamListEntry[];
}

export default function TeamLinkIndex({ sport, teams }: TeamLinkIndexProps) {
  if (!teams || teams.length === 0) return null;

  // Group teams by conference for a readable index.
  const byConference = new Map<string, TeamListEntry[]>();
  for (const team of teams) {
    const conf = team.conference || "Other";
    const group = byConference.get(conf);
    if (group) {
      group.push(team);
    } else {
      byConference.set(conf, [team]);
    }
  }
  const conferences = Array.from(byConference.keys()).sort((a, b) =>
    a.localeCompare(b),
  );

  return (
    <nav
      aria-label={`All ${sport} teams`}
      className="container mx-auto px-4 pb-10"
    >
      <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">
          All Teams
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
          {conferences.map((conf) => (
            <div key={conf}>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                {conf}
              </h3>
              <ul className="space-y-1">
                {byConference
                  .get(conf)!
                  .slice()
                  .sort((a, b) => a.team_name.localeCompare(b.team_name))
                  .map((team) => (
                    <li key={team.team_name}>
                      <Link
                        href={`/${sport}/team/${encodeURIComponent(
                          team.team_name,
                        )}/`}
                        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {team.team_name}
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}
