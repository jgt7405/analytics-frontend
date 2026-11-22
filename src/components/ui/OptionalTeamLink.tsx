// src/components/ui/OptionalTeamLink.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { teamPagePathFromRoute } from "@/components/ui/TeamLogo";

interface OptionalTeamLinkProps {
  teamName: string;
  /** False for opponents without a team page (FCS, non-D1, TBD). */
  enabled: boolean;
  className?: string;
  style?: CSSProperties;
  title?: string;
  children: ReactNode;
}

/**
 * A real `<a href>` to a team's page, or a plain `<div>` when the team has
 * none. Same classes either way, so it looks the same as the old
 * `div onClick={navigateToTeam}`, but crawlers can follow it: team pages
 * used to link to no other team page. Prefetch is off so a team page doesn't
 * preload ~30 opponent pages from the backend.
 */
export default function OptionalTeamLink({
  teamName,
  enabled,
  className,
  style,
  title,
  children,
}: OptionalTeamLinkProps) {
  const pathname = usePathname();
  const href = enabled ? teamPagePathFromRoute(pathname, teamName) : null;
  if (!href) {
    return (
      <div className={className} style={style} title={title}>
        {children}
      </div>
    );
  }
  // Tailwind preflight is off on this site, so a bare <a> gets the browser's
  // blue + underline; neutralize both so the link looks like the old div.
  // (`hover:text-*` classes from callers still win on hover.)
  return (
    <Link
      href={href}
      prefetch={false}
      className={`no-underline text-inherit ${className ?? ""}`}
      style={style}
      title={title}
    >
      {children}
    </Link>
  );
}
