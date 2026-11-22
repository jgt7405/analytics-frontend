"use client";

import Script from "next/script";

// Hosts whose visits count. Local builds (`npm run dev`, `next start` in the
// screenshot and smoke tests) carry the real measurement ID from .env.local,
// and every Playwright test is a fresh browser, so one visual comparison run
// showed up in Analytics as ~50 "users" from the developer's city. Vercel
// preview deployments are excluded too.
const COUNTED_HOSTS = ["www.jthomanalytics.com", "jthomanalytics.com"];

export default function GoogleAnalytics() {
  const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  if (!GA_MEASUREMENT_ID) {
    return null;
  }

  // The host check runs in the browser, inside the script, so the server and
  // client render the same markup. gtag.js is only requested on a counted host.
  return (
    <Script id="google-analytics" strategy="lazyOnload">
      {`
        if (${JSON.stringify(COUNTED_HOSTS)}.indexOf(window.location.hostname) !== -1) {
          var s = document.createElement('script');
          s.async = true;
          s.src = 'https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}';
          document.head.appendChild(s);
          window.dataLayer = window.dataLayer || [];
          window.gtag = function(){window.dataLayer.push(arguments);};
          window.gtag('js', new Date());
          window.gtag('config', '${GA_MEASUREMENT_ID}', {
            page_title: document.title,
            page_location: window.location.href,
          });
        }
      `}
    </Script>
  );
}
