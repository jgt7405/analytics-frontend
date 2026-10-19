// src/components/ui/TeamLogo.tsx
"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, type MouseEvent } from "react";
import { sportAndSeasonFromPath } from "@/config/seasons";

// Simple gray circle SVG
const LOGO_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='40' fill='%23cccccc'/%3E%3C/svg%3E";

interface TeamLogoProps {
  logoUrl: string;
  teamName: string;
  size?: number;
  onClick?: () => void;
  priority?: boolean;
  className?: string;
  showTooltip?: boolean; // New prop to control tooltip display
  /**
   * Disable the automatic "click the logo -> that team's page" navigation.
   * Use for a team's own logo on its own team page.
   */
  noLink?: boolean;
}

// Derive the team-page path from the current route so the logo links to the
// right sport (and archive season, when on an archived page).
// e.g. /football/2025-26/standings/ -> /football/2025-26/team/<name>/
export function teamPagePathFromRoute(
  pathname: string | null | undefined,
  teamName: string,
): string | null {
  const route = sportAndSeasonFromPath(pathname);
  if (!route) return null;
  const base = route.season ? `/${route.sport}/${route.season}` : `/${route.sport}`;
  return `${base}/team/${encodeURIComponent(teamName)}/`;
}

export default function TeamLogo({
  logoUrl,
  teamName,
  size = 24,
  onClick,
  priority = false,
  className = "",
  showTooltip = true, // Default to true - show tooltip everywhere
  noLink = false,
}: TeamLogoProps) {
  const router = useRouter();
  const pathname = usePathname();

  const autoHref =
    onClick || noLink ? null : teamPagePathFromRoute(pathname, teamName);

  const handleClick =
    onClick ??
    (autoHref
      ? (e: MouseEvent) => {
          // Navigate to the team page regardless of any wrapping anchor/button
          // (they point at the same team) and keep it a client-side push.
          e.preventDefault();
          e.stopPropagation();
          router.push(autoHref);
        }
      : undefined);

  const clickable = Boolean(handleClick);

  // A logo whose request fails (a dropped connection on a phone) is asked
  // for once more, as a fresh request, before the gray placeholder; the
  // placeholder used to stay until the page was reloaded.
  const [failed, setFailed] = useState({ url: logoUrl, count: 0 });
  const failures = failed.url === logoUrl ? failed.count : 0;
  const src =
    failures === 0
      ? logoUrl
      : failures === 1 && !logoUrl.startsWith("data:")
        ? `${logoUrl}${logoUrl.includes("?") ? "&" : "?"}retry=1`
        : LOGO_PLACEHOLDER;

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full bg-transparent dark:bg-white p-0.5 ${clickable ? "cursor-pointer" : ""} ${className}`}
      onClick={handleClick}
      style={{ width: size + 4, height: size + 4, flexShrink: 0 }}
      title={showTooltip ? teamName : undefined}
    >
      <Image
        src={src}
        alt={`${teamName} logo`}
        width={size}
        height={size}
        className="object-contain"
        priority={priority}
        sizes={`${size}px`}
        quality={75}
        onError={() => {
          if (src !== LOGO_PLACEHOLDER) setFailed({ url: logoUrl, count: failures + 1 });
        }}
      />
    </div>
  );
}
