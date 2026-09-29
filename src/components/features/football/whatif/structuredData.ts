// Breadcrumb and SoftwareApplication JSON-LD for the what-if page, added to
// <head> on mount; returns a cleanup that removes them.

export function injectStructuredData() {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.jthomanalytics.com/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Football",
        item: "https://www.jthomanalytics.com/football/wins/",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "What-If Simulator",
        item: "https://www.jthomanalytics.com/football/whatif/",
      },
    ],
  };

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "College Football What-If Simulator",
    description:
      "Interactive simulator to explore game outcomes and their impact on college football standings, seeding, and CFP playoff chances.",
    applicationCategory: "UtilityApplication",
    url: "https://www.jthomanalytics.com/football/whatif/",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    author: {
      "@type": "Organization",
      name: "JThom Analytics",
    },
    dateModified: new Date().toISOString().split("T")[0],
  };

  const script1 = document.createElement("script");
  script1.type = "application/ld+json";
  script1.innerHTML = JSON.stringify(breadcrumbSchema);
  document.head.appendChild(script1);

  const script2 = document.createElement("script");
  script2.type = "application/ld+json";
  script2.innerHTML = JSON.stringify(softwareSchema);
  document.head.appendChild(script2);

  return () => {
    script1.remove();
    script2.remove();
  };
}
