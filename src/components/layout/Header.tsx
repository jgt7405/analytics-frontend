"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AnimatedLogo from "./AnimatedLogo";
import { LogoAnimationProvider } from "./LogoAnimationContext";
import Navigation from "./Navigation";

function Header() {
  const pathname = usePathname();
  const isFootball = pathname.includes("/football");

  // Logo always links to main page, exiting any season archive context
  const sport = isFootball ? "football" : "basketball";
  const basePage = isFootball ? "wins" : "home";
  const logoLink = `/${sport}/${basePage}`;

  return (
    <header
      className="main-header w-full"
      style={{ borderBottom: "1px solid var(--border-color)" }}
    >
      <LogoAnimationProvider>
        <div className="header-content flex items-center justify-between w-full px-4 py-0 md:justify-start md:gap-8">
          <Link href={logoLink} className="logo-link flex-shrink-0">
            <AnimatedLogo />
          </Link>
          <Navigation />
        </div>
      </LogoAnimationProvider>
    </header>
  );
}

export default Header;
