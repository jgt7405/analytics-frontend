import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { sportPageMetadata } from "@/app/metadata";
import GamePreviewPageContent from "@/components/features/basketball/game-preview";
import JsonLd, { ORGANIZATION, SITE_URL } from "@/components/seo/JsonLd";
import { teamPagePath } from "@/lib/display-names";
import {
  GAME_PREVIEW_PATH,
  chanceLabel,
  findPreviewGame,
  indexablePreviewGames,
  gameDate,
  gameFavorite,
  gamePreviewDescription,
  gamePreviewPath,
  gamePreviewTitle,
  gameSite,
  matchupName,
} from "@/lib/game-preview-seo";
import { getBasketballUpcomingGamesServer } from "@/lib/server-api";
import type { UpcomingGame } from "@/types/gamePreview";

// Rendered per request so ?game= is read on the server: each game's preview
// is its own page in the server HTML (title, canonical, heading and a written
// prediction) instead of an empty shell the browser fills in.
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const BASE_METADATA = sportPageMetadata("basketball", "game-preview");

// A ?game= naming an indexable upcoming game (indexablePreviewGames) gets its
// own title and a self-referencing canonical. Any other value (a game already
// played, one against a non-D1 team, a typo) canonicalizes to the plain page,
// which lists the upcoming games.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const raw = (await searchParams).game;
  if (!raw) return BASE_METADATA;
  const games = indexablePreviewGames((await getBasketballUpcomingGamesServer())?.games);
  const game = findPreviewGame(games, raw);
  if (!game) return BASE_METADATA;
  const title = gamePreviewTitle(game);
  const description = gamePreviewDescription(game);
  const path = gamePreviewPath(game.game_id);
  return {
    ...BASE_METADATA,
    title,
    description,
    alternates: { canonical: path },
    openGraph: { ...BASE_METADATA.openGraph, title, description, url: path },
    twitter: { ...BASE_METADATA.twitter, title, description },
  };
}

const linkClass = "underline";

// The written prediction for one game, under the interactive preview.
function GameSummary({ game }: { game: UpcomingGame }) {
  const date = gameDate(game.date_sort);
  const favorite = gameFavorite(game);
  return (
    <>
      <h2 className="mb-2 text-base font-bold text-slate-700 dark:text-slate-300">
        {matchupName(game)} prediction
      </h2>
      <p className="mb-2">
        {favorite ? (
          <>
            {favorite.team} is favored, with a {chanceLabel(favorite.pct)} chance
            to beat {favorite.opponent} ({chanceLabel(favorite.opponentPct)})
          </>
        ) : (
          <>
            {matchupName(game)} is rated a toss-up
          </>
        )}
        {" "}{gameSite(game)}
        {date && <> on {date.long}</>}
        {game.is_conference_game ? ", in a conference game" : ""}. Win
        probabilities come from a composite of college basketball ratings.
      </p>
      <p className="mb-2">
        The preview above compares the two teams&apos; ratings, records and
        projected conference finish, shows how a win or a loss moves each
        team&apos;s conference and NCAA tournament chances, and lays out both
        schedules.
      </p>
      <p>
        Team pages:{" "}
        <Link href={teamPagePath("basketball", game.away_team)} className={linkClass}>
          {game.away_team} basketball
        </Link>{" "}
        and{" "}
        <Link href={teamPagePath("basketball", game.home_team)} className={linkClass}>
          {game.home_team} basketball
        </Link>
        .{" "}
        <Link href={GAME_PREVIEW_PATH} className={linkClass}>
          All upcoming game previews
        </Link>
      </p>
    </>
  );
}

// Every upcoming game as a link to its preview: the way search engines (and
// visitors without the dropdown) reach each game's page.
function UpcomingGameList({ games }: { games: UpcomingGame[] }) {
  const byDate = new Map<string, UpcomingGame[]>();
  for (const game of [...games].sort((a, b) => a.date_sort.localeCompare(b.date_sort))) {
    const list = byDate.get(game.date_sort) ?? [];
    list.push(game);
    byDate.set(game.date_sort, list);
  }
  return (
    <>
      <h2 className="mb-2 text-base font-bold text-slate-700 dark:text-slate-300">
        Upcoming college basketball game predictions
      </h2>
      <p className="mb-3">
        Each team&apos;s next game, with the favorite&apos;s chance to win from a
        composite of college basketball ratings. Open a game for the full
        preview.
      </p>
      {[...byDate.entries()].map(([dateSort, dayGames]) => (
        <div key={dateSort} className="mb-3">
          <h3 className="mb-1 font-semibold text-slate-700 dark:text-slate-300">
            {gameDate(dateSort)?.long ?? dateSort}
          </h3>
          <ul className="grid grid-cols-1 gap-x-6 gap-y-0.5 sm:grid-cols-2">
            {dayGames.map((game) => {
              const favorite = gameFavorite(game);
              return (
                <li key={game.game_id}>
                  <Link href={gamePreviewPath(game.game_id)} className={linkClass}>
                    {matchupName(game)}
                  </Link>
                  {favorite && (
                    <span>
                      {" "}- {favorite.team} {chanceLabel(favorite.pct)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );
}

function structuredData(game: UpcomingGame | null) {
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Basketball", item: `${SITE_URL}/basketball/wins/` },
      { "@type": "ListItem", position: 3, name: "Game Previews", item: `${SITE_URL}${GAME_PREVIEW_PATH}` },
      ...(game
        ? [{
            "@type": "ListItem",
            position: 4,
            name: `${matchupName(game)} Prediction`,
            item: `${SITE_URL}${gamePreviewPath(game.game_id)}`,
          }]
        : []),
    ],
  };
  if (!game) return [breadcrumb];
  return [
    breadcrumb,
    {
      "@context": "https://schema.org",
      "@type": "AnalysisNewsArticle",
      headline: `${gamePreviewTitle(game)}`,
      description: gamePreviewDescription(game),
      url: `${SITE_URL}${gamePreviewPath(game.game_id)}`,
      author: ORGANIZATION,
      about: [
        { "@type": "SportsTeam", name: game.away_team, sport: "Basketball" },
        { "@type": "SportsTeam", name: game.home_team, sport: "Basketball" },
      ],
    },
  ];
}

export default async function GamePreviewPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [query, upcoming] = await Promise.all([
    searchParams,
    getBasketballUpcomingGamesServer(),
  ]);
  const games = indexablePreviewGames(upcoming?.games);
  const game = findPreviewGame(games, query.game);
  return (
    <>
      <JsonLd data={structuredData(game)} />
      {/* useSearchParams in the content needs the boundary. The summary is
          passed in so it renders between the preview and the footer. */}
      <Suspense fallback={<div className="min-h-screen" aria-hidden="true" />}>
        <GamePreviewPageContent initialData={upcoming} initialGame={game}>
          {(game || games.length > 0) && (
            <section className="mt-8 max-w-3xl text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              {game ? <GameSummary game={game} /> : <UpcomingGameList games={games} />}
            </section>
          )}
        </GamePreviewPageContent>
      </Suspense>
    </>
  );
}
