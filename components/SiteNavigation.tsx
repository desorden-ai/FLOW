"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navigationItems = [
  ["Inici", "/"],
  ["IA i Automatització", "/ia-automatitzacio"],
  ["Disseny Web", "/disseny-web"],
  ["Drons", "/drons"],
  ["Ajuts", "/ajuts"],
  ["Preus", "/preus"],
] as const;

export function SiteNavigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (pathname === "/" || pathname.startsWith("/editor")) return null;

  const closeMenu = () => setOpen(false);

  return (
    <header className="site-nav" data-open={open ? "true" : "false"}>
      <Link className="site-nav__brand" href="/" onClick={closeMenu} aria-label="DESORDEN, pàgina d'inici">
        <span>DES</span><span>OR</span><span>DEN</span>
      </Link>

      <button
        type="button"
        className="site-nav__toggle"
        aria-expanded={open}
        aria-controls="main-navigation"
        onClick={() => setOpen((current) => !current)}
      >
        <span>{open ? "Tancar" : "Menú"}</span>
        <i aria-hidden="true" />
      </button>

      <nav id="main-navigation" className="site-nav__links" aria-label="Navegació principal">
        {navigationItems.map(([label, href]) => (
          <Link href={href} key={href} onClick={closeMenu}>{label}</Link>
        ))}
      </nav>

      <div className="site-nav__actions">
        <a className="site-nav__phone" href="tel:+34640925788">Truca&apos;ns</a>
        <Link className="site-nav__audit" href="/#contact" onClick={closeMenu}>Sol·licitar auditoria</Link>
      </div>
    </header>
  );
}
