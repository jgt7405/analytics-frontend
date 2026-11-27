// Server-rendered JSON-LD. Goes in the page's server HTML, so crawlers see it
// on the first fetch instead of only after client JavaScript adds it.

const SITE = "https://www.jthomanalytics.com";

export default function JsonLd({ data }: { data: object | object[] }) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          // "<" escaped so a value can never close the script tag.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(item).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  );
}

/** Home > Football > {name} breadcrumb for a football page at `path`. */
export function footballBreadcrumb(name: string, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Football",
        item: `${SITE}/football/wins/`,
      },
      { "@type": "ListItem", position: 3, name, item: `${SITE}${path}` },
    ],
  };
}

export const ORGANIZATION = { "@type": "Organization", name: "JThom Analytics" };
export const SITE_URL = SITE;

// Site name for Google's results. The alternate names are how people search
// for the site ("j thom", "jthom"); "j thom" ranked only ~4.6 (GSC, Nov 2026).
const ALTERNATE_NAMES = ["JThom", "J Thom Analytics", "J Thom"];

/** WebSite + Organization identity, rendered once per page by the root layout. */
export const SITE_IDENTITY = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "JThom Analytics",
    alternateName: ALTERNATE_NAMES,
    url: `${SITE}/`,
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "JThom Analytics",
    alternateName: ALTERNATE_NAMES,
    url: `${SITE}/`,
    logo: `${SITE}/images/apple-touch-icon.png`,
  },
];
