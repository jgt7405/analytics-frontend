// src/components/layout/Navigation.tsx
"use client";

import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import navStyles from "@/styles/components/navigation.module.css";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { MouseEvent as ReactMouseEvent } from "react";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { isArchivedSeason, sportAndSeasonFromPath, type Sport } from "@/config/seasons";
import { navPages, sportPagePath } from "@/config/sports";
import { useLogoAnimation } from "./LogoAnimationContext";

// Loaded when first opened, so it stays out of every page's first load.
const ContactModal = dynamic(() => import("./ContactModal"), { ssr: false });

function NavigationContent() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  // Stays mounted after the first open so a half-typed message survives closing.
  const [contactLoaded, setContactLoaded] = useState(false);
  if (isContactModalOpen && !contactLoaded) setContactLoaded(true);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLAnchorElement>(null);
  const lastItemRef = useRef<HTMLButtonElement>(null);

  const isFootball = pathname.startsWith("/football");
  const sport: Sport = isFootball ? "football" : "basketball";
  const isTeamPage = pathname.includes("/team/");

  // Archive mode: /football/2025-26/wins/, /basketball/2025-26/team/BYU/.
  // Nav links then stay in that season (src/config/sports.ts decides which
  // pages have an archive version; the rest link to the current season).
  const archiveSeason = sportAndSeasonFromPath(pathname)?.season ?? null;

  // Pathname without the archive season or trailing slash, for the active tab.
  const getBasePath = useCallback(() => {
    const path = archiveSeason
      ? pathname.replace(`/${sport}/${archiveSeason}`, `/${sport}`)
      : pathname;
    return path.replace(/\/$/, "");
  }, [pathname, sport, archiveSeason]);

  const addConferenceToUrl = useCallback(
    (path: string) => {
      // Rule 4: If on team page, use team's conference
      const teamConf = searchParams.get("teamConf");
      if (teamConf && isTeamPage) {
        return `${path}?conf=${teamConf}`;
      }

      // Rule 3: Preserve current conf (but use Big 12 if All Teams)
      const currentConf = searchParams.get("conf");
      const confToUse =
        currentConf && currentConf !== "All Teams" ? currentConf : "Big 12";

      // Don't encode - Link href will handle encoding automatically
      return `${path}?conf=${confToUse}`;
    },
    [searchParams, isTeamPage],
  );

  const navItems = navPages(sport).map((page) => ({
    name: page.navLabel,
    description: page.navDescription ?? page.navLabel,
    basePath: `/${sport}/${page.slug}`,
    path: sportPagePath(sport, page.slug, archiveSeason),
  }));

  // Helper for sport switching links
  // Rule 2: Always use Big 12 when switching sports
  // In archive mode, switch to the other sport's archive of the same season
  // when it has one, otherwise to its current season.
  const getSportSwitchUrl = useCallback(() => {
    const targetSport: Sport = isFootball ? "basketball" : "football";
    const season = isArchivedSeason(targetSport, archiveSeason) ? archiveSeason : null;
    return `${sportPagePath(targetSport, "wins", season)}?conf=Big 12`;
  }, [isFootball, archiveSeason]);

  // Trigger the logo fly-out animation, then navigate to the other sport.
  // Falls back to the Link's default navigation when the animation is
  // unavailable (e.g. before the logo has mounted).
  const logoAnim = useLogoAnimation();
  const handleSportSwitch = useCallback(
    (e: ReactMouseEvent) => {
      if (!logoAnim) return;
      e.preventDefault();
      logoAnim.switchSport(
        isFootball ? "basketball" : "football",
        getSportSwitchUrl(),
      );
    },
    [logoAnim, isFootball, getSportSwitchUrl],
  );

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!mobileMenuOpen) return;

      if (e.key === "Tab") {
        if (e.shiftKey) {
          if (document.activeElement === firstItemRef.current) {
            e.preventDefault();
            lastItemRef.current?.focus();
          }
        } else {
          if (document.activeElement === lastItemRef.current) {
            e.preventDefault();
            firstItemRef.current?.focus();
          }
        }
      }
    },
    [mobileMenuOpen],
  );

  useEffect(() => {
    if (mobileMenuOpen) {
      document.addEventListener("keydown", handleKeyDown);
      firstItemRef.current?.focus();
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [mobileMenuOpen, handleKeyDown]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
        toggleButtonRef.current?.focus();
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mobileMenuOpen &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        !toggleButtonRef.current?.contains(event.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileMenuOpen]);

  return (
    <div className="flex items-center">
      <nav
        className="navigation-tabs hidden md:flex"
        role="navigation"
        aria-label="Main navigation"
      >
        {navItems.map((item) => {
          const basePath = getBasePath();
          const isActive = basePath === item.basePath;
          const words = item.name.split(" ");
          const isMultiWord = words.length > 1;
          const href = addConferenceToUrl(item.path);
          return (
            <Link
              prefetch={false}
              key={item.basePath}
              href={href}
              className={cn(
                navStyles.tabButton,
                isActive && navStyles.tabButtonActive,
                isMultiWord &&
                  "text-xs flex flex-col items-center justify-center leading-none py-1",
              )}
              aria-current={isActive ? "page" : undefined}
              aria-label={`${item.name} - ${item.description}`}
            >
              {isActive && <span className="sr-only">Current page: </span>}
              {isMultiWord ? (
                <>
                  <span>{words.slice(0, -1).join(" ")}</span>
                  <span>{words[words.length - 1]}</span>
                </>
              ) : (
                item.name
              )}
            </Link>
          );
        })}

        <Link
          prefetch={false}
          href={getSportSwitchUrl()}
          onClick={handleSportSwitch}
          className={cn(
            navStyles.tabButton,
            "text-xs flex flex-col items-center justify-center leading-none py-1",
          )}
        >
          <span>Switch to </span>
          <span>{isFootball ? "Basketball" : "Football"}</span>
        </Link>
      </nav>

      <div className={navStyles.mobileNavToggle}>
        <button
          ref={toggleButtonRef}
          onClick={toggleMobileMenu}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggleMobileMenu();
            }
          }}
          className={cn(
            navStyles.hamburgerButton,
            mobileMenuOpen && navStyles.hamburgerButtonActive,
          )}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
          aria-label="Toggle navigation menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div
          ref={mobileMenuRef}
          id="mobile-menu"
          className={cn(
            navStyles.mobileNav,
            mobileMenuOpen && navStyles.mobileNavActive,
          )}
          role="menu"
          aria-hidden={!mobileMenuOpen}
        >
          <nav role="navigation" aria-label="Mobile navigation">
            {navItems.map((item, index) => {
              const basePath = getBasePath();
              const isActive = basePath === item.basePath;
              const isFirst = index === 0;
              const href = addConferenceToUrl(item.path);

              return (
                <Link
                  prefetch={false}
                  key={item.basePath}
                  href={href}
                  ref={isFirst ? firstItemRef : undefined}
                  className={cn(
                    navStyles.tabButton,
                    isActive && navStyles.tabButtonActive,
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                  role="menuitem"
                  aria-current={isActive ? "page" : undefined}
                  tabIndex={mobileMenuOpen ? 0 : -1}
                >
                  {item.name}
                </Link>
              );
            })}

            <button
              onClick={() => {
                setIsContactModalOpen(true);
                setMobileMenuOpen(false);
              }}
              ref={lastItemRef}
              className={navStyles.tabButton}
              style={{
                all: "unset",
                display: "block",
                width: "calc(100% - 16px)",
                textAlign: "left",
                padding: "8px 20px",
                margin: "0 8px",
                borderBottom: "1px solid var(--border-color)",
                position: "relative",
                color: "var(--text-secondary)",
                fontWeight: "400",
                cursor: "pointer",
                fontSize: "14px",
              }}
              role="menuitem"
              tabIndex={mobileMenuOpen ? 0 : -1}
            >
              Contact
            </button>

            <Link
              prefetch={false}
              href={getSportSwitchUrl()}
              className={cn(
                navStyles.tabButton,
                "text-xs flex flex-col items-center justify-center leading-none py-1 gap-0",
              )}
              onClick={(e) => {
                setMobileMenuOpen(false);
                handleSportSwitch(e);
              }}
              role="menuitem"
              tabIndex={mobileMenuOpen ? 0 : -1}
            >
              <span>Switch to </span>
              <span>{isFootball ? "Basketball" : "Football"}</span>
            </Link>
          </nav>
        </div>
      </div>
      {contactLoaded && (
        <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
      )}
    </div>
  );
}

export default function Navigation() {
  return (
    <Suspense fallback={<div className="h-10 w-full" aria-hidden />}>
      <NavigationContent />
    </Suspense>
  );
}
