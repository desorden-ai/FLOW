"use client";

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
  const [open, setOpen] = useState(false);

  const closeMenu = () => setOpen(false);

  return (
    <header className="site-nav" data-open={open ? "true" : "false"}>
      <a className="site-nav__brand" href="/" onClick={closeMenu} aria-label="DESORDEN, pàgina d'inici">
        <span>DES</span><span>OR</span><span>DEN</span>
      </a>

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
          <a href={href} key={href} onClick={closeMenu}>{label}</a>
        ))}
      </nav>

      <div className="site-nav__actions">
        <a className="site-nav__phone" href="tel:+34640925788">Truca&apos;ns</a>
        <a className="site-nav__audit" href="/#contact" onClick={closeMenu}>Sol·licitar auditoria</a>
      </div>
    </header>
  );
}
