// src/components/layout/Navigation.tsx
"use client";

import { cn } from "@/lib/utils";
import navStyles from "@/styles/components/navigation.module.css";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import ContactModal from "./ContactModal";

function NavigationContent() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLAnchorElement>(null);
  const lastItemRef = useRef<HTMLButtonElement>(null);

  const isFootball = pathname.startsWith("/football");
  const isTeamPage = pathname.includes("/team/");

  // Helper function to add conference to URL following all rules
  const addConferenceToUrl = useCallback(
    (basePath: string) => {
      // Rule 4: If on team page, use team's conference
      const teamConf = searchParams.get("teamConf");
      if (teamConf && isTeamPage) {
        // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ FIXED: Don't encode - searchParams.get() returns decoded value
        // Link href will handle encoding automatically
        return `${basePath}?conf=${teamConf}`;
      }

      // Rule 3: Preserve current conf (but use Big 12 if All Teams)
      const currentConf = searchParams.get("conf");
      const confToUse =
        currentConf && currentConf !== "All Teams" ? currentConf : "Big 12";
      // ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ FIXED: Don't encode - Link href will handle encoding automatically
      return `${basePath}?conf=${confToUse}`;
    },
    [searchParams, isTeamPage],
  );

  const basketballNavItems = [
    {
      name: "Home",
      path: "/basketball/home",
      description: "Basketball home",
    },
    {
      name: "Wins",
      path: addConferenceToUrl("/basketball/wins"),
      description: "Conference wins distribution",
    },
    {
      name: "Standings",
      path: addConferenceToUrl("/basketball/standings"),
      description: "Projected standings",
    },
    {
      name: "CWV",
      path: addConferenceToUrl("/basketball/cwv"),
      description: "Conference win value analysis",
    },
    {
      name: "Schedule",
      path: addConferenceToUrl("/basketball/schedule"),
      description: "Team schedules and results",
    },
    {
      name: "TWV",
      path: addConferenceToUrl("/basketball/twv"),
      description: "True win value analysis",
    },
    {
      name: "Conf Tourney",
      path: addConferenceToUrl("/basketball/conf-tourney"),
      description: "Conference tournament projections",
    },
    {
      name: "Seed",
      path: addConferenceToUrl("/basketball/seed"),
      description: "NCAA tournament seed projections",
    },
    {
      name: "NCAA Tourney",
      path: addConferenceToUrl("/basketball/ncaa-tourney"),
      description: "NCAA tournament round projections",
    },
    {
      name: "Conf Data",
      path: addConferenceToUrl("/basketball/conf-data"),
      description: "Conference bid projections",
    },
    {
      name: "Teams",
      path: addConferenceToUrl("/basketball/teams"),
      description: "Teams directory",
    },
    {
      name: "Compare",
      path: addConferenceToUrl("/basketball/compare"),
      description: "Compare teams side by side",
    },
    {
      name: "What If",
      path: addConferenceToUrl("/basketball/whatif"),
      description: "What If Conference Scenarios",
    },
  ];

  const footballNavItems = [
    {
      name: "Wins",
      path: addConferenceToUrl("/football/wins"),
      description: "Conference wins distribution",
    },
    {
      name: "Standings",
      path: addConferenceToUrl("/football/standings"),
      description: "Projected standings",
    },
    {
      name: "CWV",
      path: addConferenceToUrl("/football/cwv"),
      description: "Conference win value analysis",
    },
    {
      name: "Schedule",
      path: addConferenceToUrl("/football/schedule"),
      description: "Team schedules and results",
    },
    {
      name: "TWV",
      path: addConferenceToUrl("/football/twv"),
      description: "True win value analysis",
    },
    {
      name: "Conf Champ",
      path: addConferenceToUrl("/football/conf-champ"),
      description: "Conference championship projections",
    },
    {
      name: "What If",
      path: addConferenceToUrl("/football/whatif"),
      description: "What If Conference Championship Scenarios",
    },
    {
      name: "Seed",
      path: addConferenceToUrl("/football/seed"),
      description: "CFP seed projections",
    },
    {
      name: "CFP",
      path: addConferenceToUrl("/football/cfp"),
      description: "College Football Playoff projections",
    },
    {
      name: "Conf Data",
      path: addConferenceToUrl("/football/conf-data"),
      description: "Conference CFP bid projections",
    },
    {
      name: "Teams",
      path: addConferenceToUrl("/football/teams"),
      description: "Football teams directory",
    },
    {
      name: "Compare",
      path: addConferenceToUrl("/football/compare"),
      description: "Compare teams side by side",
    },
  ];

  const navItems = isFootball ? footballNavItems : basketballNavItems;

  // Helper for sport switching links
  // Rule 2: Always use Big 12 when switching sports
  const getSportSwitchUrl = useCallback(() => {
    return isFootball
      ? `/basketball/wins?conf=Big 12`
      : `/football/wins?conf=Big 12`;
  }, [isFootball]);

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
          const isActive = pathname === item.path.split("?")[0];
          const words = item.name.split(" ");
          const isMultiWord = words.length > 1;
          return (
            <Link
              key={item.path}
              href={item.path}
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
          href={getSportSwitchUrl()}
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
              const isActive = pathname === item.path.split("?")[0];
              const isFirst = index === 0;

              return (
                <Link
                  key={item.path}
                  href={item.path}
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
              href={getSportSwitchUrl()}
              className={cn(
                navStyles.tabButton,
                "text-xs flex flex-col items-center justify-center leading-none py-1 gap-0",
              )}
              onClick={() => setMobileMenuOpen(false)}
              role="menuitem"
              tabIndex={mobileMenuOpen ? 0 : -1}
            >
              <span>Switch to </span>
              <span>{isFootball ? "Basketball" : "Football"}</span>
            </Link>
          </nav>
        </div>
      </div>
      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />
    </div>
  );
}

export default function Navigation() {
  return (
    <Suspense fallback={<div>Loading navigation...</div>}>
      <NavigationContent />
    </Suspense>
  );
}
