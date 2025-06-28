"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Navigation from "./Navigation";

function Header() {
  const pathname = usePathname();
  const isFootball = pathname.includes("/football");
  const logoSrc = isFootball
    ? "/images/JThom_Logo_Football.png"
    : "/images/JThom_Logo.png";

  return (
    <header
      className="main-header w-full"
      style={{ borderBottom: "1px solid #d1d5db" }}
    >
      <div className="header-content flex items-center justify-between w-full px-4 py-0 md:justify-start md:gap-8">
        <Link href="/basketball/wins" className="logo-link flex-shrink-0">
          <Image
            src={logoSrc}
            alt="JThom Analytics Logo"
            width={0}
            height={0}
            className="header-logo"
            style={{ width: "100px", height: "auto", marginTop: "4px" }}
            priority={true}
            sizes="100px"
            quality={90}
          />
        </Link>
        <Navigation />
      </div>
    </header>
  );
}

export default Header;
