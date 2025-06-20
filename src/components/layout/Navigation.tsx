"use client";

import { cn } from "@/lib/utils";
import navStyles from "@/styles/components/navigation.module.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLAnchorElement>(null);
  const lastItemRef = useRef<HTMLAnchorElement>(null);

  const navItems = [
    {
      name: "Wins",
      path: "/basketball/wins",
      description: "Conference wins distribution",
    },
    {
      name: "Standings",
      path: "/basketball/standings",
      description: "Projected standings",
    },
    {
      name: "CWV",
      path: "/basketball/cwv",
      description: "Conference win value analysis",
    },
    {
      name: "Schedule",
      path: "/basketball/schedule",
      description: "Team schedules and results",
    },
    {
      name: "TWV", // Add this new item
      path: "/basketball/twv",
      description: "True win value analysis",
    },
    {
      name: "Conf Tourney",
      path: "/basketball/conf-tourney",
      description: "Conference tournament projections",
    },
    {
      name: "Seed",
      path: "/basketball/seed",
      description: "NCAA tournament seed projections",
    },
    {
      name: "Conf Data",
      path: "/basketball/conf-data",
      description: "Conference bid projections",
    },
    {
      name: "NCAA Tourney", // ADD THIS
      path: "/basketball/ncaa-tourney",
      description: "NCAA tournament round projections",
    },
    {
      name: "Teams",
      path: "/basketball/teams",
      description: "Teams directory",
    },
  ];

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
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
  };

  useEffect(() => {
    if (mobileMenuOpen) {
      document.addEventListener("keydown", handleKeyDown);
      firstItemRef.current?.focus();
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [mobileMenuOpen]);

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
      {/* Desktop Navigation */}
      <nav
        className="navigation-tabs hidden md:flex"
        role="navigation"
        aria-label="Main navigation"
      >
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                navStyles.tabButton,
                isActive && navStyles.tabButtonActive
              )}
              aria-current={isActive ? "page" : undefined}
              aria-label={`${item.name} - ${item.description}`}
            >
              {isActive && <span className="sr-only">Current page: </span>}
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Mobile Navigation */}
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
          className={cn(navStyles.hamburgerButton, mobileMenuOpen && "active")}
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
            mobileMenuOpen && navStyles.mobileNavActive
          )}
          role="menu"
          aria-hidden={!mobileMenuOpen}
        >
          <nav role="navigation" aria-label="Mobile navigation">
            {navItems.map((item, index) => {
              const isActive = pathname === item.path;
              const isFirst = index === 0;
              const isLast = index === navItems.length - 1;

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  ref={
                    isFirst ? firstItemRef : isLast ? lastItemRef : undefined
                  }
                  className={cn(
                    navStyles.tabButton,
                    isActive && navStyles.tabButtonActive
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
          </nav>
        </div>
      </div>
    </div>
  );
}
