"use client";

import { useRef } from "react";
import { LOGO_TUNNEL_ASSETS } from "./logoTunnelAssets";
import { useLogoTunnelAnimation } from "../hooks/useLogoTunnelAnimation";

export function LogoTunnel() {
  const sectionRef = useRef<HTMLElement | null>(null);

  useLogoTunnelAnimation(sectionRef);

  return (
    <section
      ref={sectionRef}
      className="logo-tunnel-section"
      id="bloque-3-clientes"
      aria-labelledby="bloque-3-title"
      data-tunnel-active="false"
    >
      <div className="partners-copy bloque-3-intro" data-logo-tunnel-intro>
        <p className="eyebrow">Selected work</p>
        <h2 id="bloque-3-title">
          Imatges aèries espectaculars i desenvolupament web ultraràpid. Aquests són els projectes amb què hem trencat el mercat.
        </h2>
      </div>

      <div
        className="logo-tunnel-sticky"
        aria-label="Clients i projectes seleccionats de DESORDEN"
      >
        {LOGO_TUNNEL_ASSETS.map((logo) => (
          <img
            key={logo.name}
            src={logo.src}
            className="logo-3d-item"
            data-logo-3d-item
            data-z={logo.initialZ}
            data-client={logo.name}
            style={{
              left: `${logo.x}%`,
              top: `${logo.y}%`,
              transform: `translate(-50%, -50%) translate3d(0, 0, ${logo.initialZ}px)`,
            }}
            width={logo.width}
            height={logo.height}
            alt={logo.alt}
            decoding="async"
            loading="eager"
          />
        ))}
      </div>

      <p className="logo-tunnel-client-names">
        Clients i projectes: Pugnator, Castell, The Club Padel, VIU Sant Vicenç de Castellet, Pata Negra, NTK i Nutrikom.
      </p>
    </section>
  );
}
