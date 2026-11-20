import Link from "next/link";
import { sportPageMetadata } from "@/app/metadata";
import JsonLd, { ORGANIZATION, SITE_URL } from "@/components/seo/JsonLd";
import BasketballWhatIfContent from "./BasketballWhatIfContent";

export const metadata = sportPageMetadata("basketball", "whatif");

const STRUCTURED_DATA = [
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Basketball",
        item: `${SITE_URL}/basketball/wins/`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "What-If Simulator",
        item: `${SITE_URL}/basketball/whatif/`,
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "College Basketball What-If Simulator",
    description:
      "Pick the winners of upcoming college basketball games and see how conference standings, conference tournament seeds and NCAA tournament chances change.",
    applicationCategory: "SportsApplication",
    url: `${SITE_URL}/basketball/whatif/`,
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    author: ORGANIZATION,
  },
];

// Plain-language description of the tool. The tool itself waits for the
// conference list in the browser, so this is the page's text in the server
// HTML. It sits between the tool and the footer (BasketballWhatIfContent
// renders the footer, so it is passed in as a child there).
function AboutSimulator() {
  return (
    <section className="container mx-auto px-4 pb-8">
      <div className="max-w-3xl text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        <h2 className="mb-2 text-base font-bold text-slate-700 dark:text-slate-300">
          How the college basketball what-if simulator works
        </h2>
        <p className="mb-2">
          Choose a conference and pick winners for any of its remaining games.
          The rest of the season is re-simulated with your results locked in,
          and the results show how each team&apos;s projected conference
          standing, conference tournament seed and NCAA tournament chances
          change compared with the current projections.
        </p>
        <p>
          Games you don&apos;t pick are played out using win probabilities from
          a composite of college basketball ratings. Projections without any
          picks are on the{" "}
          <Link href="/basketball/home/" className="underline">
            NCAA tournament projections
          </Link>{" "}
          and{" "}
          <Link href="/basketball/seed/" className="underline">
            conference tournament seeding
          </Link>{" "}
          pages.
        </p>
      </div>
    </section>
  );
}

export default function BasketballWhatIfPage() {
  return (
    <>
      <JsonLd data={STRUCTURED_DATA} />
      <BasketballWhatIfContent>
        <AboutSimulator />
      </BasketballWhatIfContent>
    </>
  );
}
