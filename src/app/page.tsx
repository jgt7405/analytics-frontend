"use client";

import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useEffect } from "react";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/basketball/wins");
  }, [router]);

  return (
    <>
      {/* Google Analytics for Search Console verification */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-R69NZJ9JM8"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-R69NZJ9JM8');
        `}
      </Script>

      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    </>
  );
}
