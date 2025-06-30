import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import PerformancePanel from "@/components/debug/PerformancePanel";
import Header from "@/components/layout/Header";
import { Providers } from "@/components/providers/Providers";
import { robotoCondensed } from "@/lib/fonts";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { baseMetadata } from "./metadata";

export const metadata: Metadata = {
  ...baseMetadata,
  description:
    "Advanced basketball and football analytics and projections for D1 college conferences and teams.",
};

// Client component for chunk error handling
function ChunkErrorHandler() {
  if (typeof window !== "undefined") {
    import("@/lib/chunk-error-handler").then(({ setupChunkErrorHandler }) => {
      setupChunkErrorHandler();
    });
  }
  return null;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isProduction = process.env.NODE_ENV === "production";

  return (
    <html lang="en" className={robotoCondensed.variable}>
      <head>
        <link
          rel="preconnect"
          href="https://analytics-backend-production.up.railway.app"
        />
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="Referrer-Policy" content="origin-when-cross-origin" />
        <meta name="theme-color" content="#ffffff" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />

        {/* Favicon and icon links */}
        <link rel="icon" href="/images/favicon.ico" sizes="any" />
        <link
          rel="icon"
          href="/images/favicon-16x16.png"
          type="image/png"
          sizes="16x16"
        />
        <link
          rel="icon"
          href="/images/favicon-32x32.png"
          type="image/png"
          sizes="32x32"
        />
        <link rel="apple-touch-icon" href="/images/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />

        {/* ✅ REMOVED: Don't preload logo here since it's already priority in Header component */}
      </head>
      <body className={`min-h-screen bg-gray-50 ${robotoCondensed.className}`}>
        <GoogleAnalytics />
        <ChunkErrorHandler />
        <Providers>
          <div className="main-content">
            <Header />
            <main className="-mt-6 min-h-screen" id="main-content" role="main">
              {children}
            </main>
          </div>
          {isProduction && <Analytics />}
          {isProduction && <SpeedInsights />}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#363636",
                color: "#fff",
                fontSize: "14px",
              },
              success: {
                iconTheme: {
                  primary: "#10b981",
                  secondary: "#fff",
                },
              },
              error: {
                iconTheme: {
                  primary: "#ef4444",
                  secondary: "#fff",
                },
              },
            }}
          />
          <PerformancePanel />
        </Providers>
      </body>
    </html>
  );
}
