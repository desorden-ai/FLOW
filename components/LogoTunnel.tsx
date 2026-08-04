"use client";

import { useEffect, useRef } from "react";
import { LOGO_TUNNEL_ASSETS } from "./logoTunnelAssets";

const INTRO_END = 0.15;
const TOTAL_Z_TRAVEL = 12_000;
const EASING = 0.09;

type Block3ProgressDetail = {
  progress: number;
  active: boolean;
};

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

export function LogoTunnel() {
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const root = section?.closest<HTMLElement>(".site-shell");
    const intro = section?.querySelector<HTMLElement>("[data-logo-tunnel-intro]");
    const logos = section
      ? Array.from(section.querySelectorAll<HTMLImageElement>("[data-logo-3d-item]"))
      : [];

    if (!section || !root || !intro || logos.length === 0) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let currentProgress = 0;
    let targetProgress = 0;
    let frameId = 0;
    let active = false;
    let pageVisible = !document.hidden;

    const render = (progress: number) => {
      const safeProgress = clamp(progress);
      const introOpacity = clamp(1 - safeProgress / INTRO_END);
      const introShift = safeProgress * -100;

      intro.style.opacity = String(introOpacity);
      intro.style.transform = `translate3d(-50%, ${introShift}px, 0)`;

      const logosEnabled = safeProgress > INTRO_END;
      const logoProgress = clamp((safeProgress - INTRO_END) / (1 - INTRO_END));
      const currentZAdvance = logoProgress * TOTAL_Z_TRAVEL;

      logos.forEach((logo) => {
        const initialZ = Number(logo.dataset.z ?? 0);
        const newZ = initialZ + currentZAdvance;

        logo.style.transform = `translate(-50%, -50%) translate3d(0, 0, ${newZ}px)`;

        let opacity = 0;
        if (logosEnabled && newZ > -3000 && newZ <= 0) {
          if (newZ < -1500) {
            opacity = (newZ + 3000) / 1500;
          } else if (newZ <= -800) {
            opacity = 1;
          } else {
            opacity = Math.abs(newZ) / 800;
          }
        }

        logo.style.opacity = String(clamp(opacity));
      });
    };

    const animate = () => {
      frameId = 0;

      if (!active || !pageVisible) return;

      const delta = targetProgress - currentProgress;
      currentProgress += delta * EASING;
      render(currentProgress);

      if (Math.abs(delta) > 0.001 && !reducedMotion.matches) {
        frameId = window.requestAnimationFrame(animate);
        return;
      }

      currentProgress = targetProgress;
      render(currentProgress);
    };

    const startAnimation = () => {
      if (frameId || !active || !pageVisible) return;

      if (reducedMotion.matches) {
        currentProgress = targetProgress;
        render(currentProgress);
        return;
      }

      frameId = window.requestAnimationFrame(animate);
    };

    const handleProgress = (event: Event) => {
      const detail = (event as CustomEvent<Block3ProgressDetail>).detail;
      if (!detail) return;

      active = detail.active;
      targetProgress = clamp(detail.progress);
      section.dataset.tunnelActive = String(active);
      section.style.setProperty("--logo-tunnel-progress", String(targetProgress));

      if (!active) {
        if (frameId) window.cancelAnimationFrame(frameId);
        frameId = 0;
        currentProgress = targetProgress;
        render(currentProgress);
        return;
      }

      startAnimation();
    };

    const handleVisibility = () => {
      pageVisible = !document.hidden;

      if (!pageVisible && frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      } else if (pageVisible) {
        startAnimation();
      }
    };

    const handleReducedMotion = () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
      currentProgress = targetProgress;
      render(currentProgress);
    };

    root.addEventListener("desorden:block-3-progress", handleProgress);
    document.addEventListener("visibilitychange", handleVisibility);
    reducedMotion.addEventListener("change", handleReducedMotion);
    render(0);

    return () => {
      root.removeEventListener("desorden:block-3-progress", handleProgress);
      document.removeEventListener("visibilitychange", handleVisibility);
      reducedMotion.removeEventListener("change", handleReducedMotion);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, []);

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
