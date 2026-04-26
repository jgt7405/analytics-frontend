"use client";

import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useEffect } from "react";

export default function HomePage() {
  const router = useRouter();
  const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  useEffect(() => {
    console.log("🔄 HomePage useEffect triggered");
    console.log("📍 Current location:", window.location.href);
    console.log("🎯 About to redirect to /basketball/home");

    router.replace("/basketball/home");

    // Add a timeout to check if redirect happened
    setTimeout(() => {
      console.log("📍 Location after redirect attempt:", window.location.href);
    }, 100);
  }, [router]);

  console.log("🏠 HomePage component rendering");

  return (
    <>
      {GA_MEASUREMENT_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}');
            `}
          </Script>
        </>
      )}

      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    </>
  );
}
