// src/components/ui/TeamLogo.tsx
"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type { MouseEvent } from "react";

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
// e.g. /football/2025-26/standings -> /football/2025-26/team/<name>
export function teamPagePathFromRoute(
  pathname: string | null | undefined,
  teamName: string,
): string | null {
  if (!pathname) return null;
  const segs = pathname.split("/").filter(Boolean);
  const sport = segs[0];
  if (sport !== "football" && sport !== "basketball") return null;
  const seasonSeg = segs[1] && /^\d{4}-\d{2}$/.test(segs[1]) ? segs[1] : null;
  const base = seasonSeg ? `/${sport}/${seasonSeg}` : `/${sport}`;
  return `${base}/team/${encodeURIComponent(teamName)}`;
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

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full bg-transparent dark:bg-white p-0.5 ${clickable ? "cursor-pointer" : ""} ${className}`}
      onClick={handleClick}
      style={{ width: size + 4, height: size + 4, flexShrink: 0 }}
      title={showTooltip ? teamName : undefined}
    >
      <Image
        src={logoUrl}
        alt={`${teamName} logo`}
        width={size}
        height={size}
        className="object-contain"
        priority={priority}
        sizes={`${size}px`}
        quality={75}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          // Simple gray circle SVG as base64
          target.src =
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='40' fill='%23cccccc'/%3E%3C/svg%3E";
        }}
      />
    </div>
  );
}
