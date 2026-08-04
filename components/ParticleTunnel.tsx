"use client";

import { useEffect, useRef } from "react";

const PARTICLE_COUNT = 109;
const BASE_SIZE = 0.6;
const SPEED_FACTOR = 1.2;
const MIN_Z = -3000;
const MAX_Z = 800;
const Z_RANGE = MAX_Z - MIN_Z;
const EASING = 0.08;

type SceneProgressDetail = {
  active: number;
  progress: number;
  virtualScroll: number;
  isContact: boolean;
};

type TunnelParticle = {
  element: HTMLDivElement;
  initialZ: number;
  baseOpacity: number;
};

function wrapDepth(value: number) {
  return ((((value - MIN_Z) % Z_RANGE) + Z_RANGE) % Z_RANGE) + MIN_Z;
}

export function ParticleTunnel() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const root = container?.closest<HTMLElement>(".site-shell");

    if (!container || !root) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fragment = document.createDocumentFragment();
    const particles: TunnelParticle[] = [];

    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      const element = document.createElement("div");
      element.className = "particle";

      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const initialZ = Math.random() * MIN_Z;
      const size = Math.random() * 0.4 + BASE_SIZE;
      const baseOpacity = Math.random() * 0.5 + 0.3;
      const initialScale = Math.max(0.08, Math.min(1.35, (initialZ - MIN_Z) / -MIN_Z));

      element.style.setProperty("--x", `${x}vw`);
      element.style.setProperty("--y", `${y}vh`);
      element.style.setProperty("--size", `${size}px`);
      element.style.setProperty("--base-opacity", String(baseOpacity));
      element.style.setProperty("--dynamic-opacity", String(baseOpacity));
      element.style.transform = `translate3d(0, 0, ${initialZ}px) scale(${initialScale})`;

      fragment.appendChild(element);
      particles.push({ element, initialZ, baseOpacity });
    }

    container.replaceChildren(fragment);

    let currentScroll = 0;
    let targetScroll = 0;
    let frameId = 0;
    let isAnimating = false;
    let isContact = false;
    let pageVisible = !document.hidden;

    const renderParticles = () => {
      for (const particle of particles) {
        const newZ = wrapDepth(particle.initialZ + currentScroll * SPEED_FACTOR);
        const dynamicScale = Math.max(0.08, Math.min(1.35, (newZ - MIN_Z) / -MIN_Z));

        let depthOpacity = 1;
        if (newZ < -2000) {
          depthOpacity = (newZ - MIN_Z) / 1000;
        } else if (newZ > 0) {
          depthOpacity = (MAX_Z - newZ) / MAX_Z;
        }

        const finalOpacity = Math.max(0, Math.min(1, depthOpacity)) * particle.baseOpacity;
        particle.element.style.transform = `translate3d(0, 0, ${newZ}px) scale(${dynamicScale})`;
        particle.element.style.opacity = String(finalOpacity);
      }
    };

    const animate = () => {
      frameId = 0;

      if (!pageVisible || isContact) {
        isAnimating = false;
        return;
      }

      const delta = targetScroll - currentScroll;
      currentScroll += delta * EASING;
      renderParticles();

      if (Math.abs(delta) > 0.2 && !reducedMotion.matches) {
        frameId = window.requestAnimationFrame(animate);
        return;
      }

      currentScroll = targetScroll;
      renderParticles();
      isAnimating = false;
    };

    const startAnimation = () => {
      if (isAnimating || !pageVisible || isContact) return;
      isAnimating = true;
      frameId = window.requestAnimationFrame(animate);
    };

    const handleSceneProgress = (event: Event) => {
      const detail = (event as CustomEvent<SceneProgressDetail>).detail;
      if (!detail) return;

      targetScroll = detail.virtualScroll;
      isContact = detail.isContact;
      container.dataset.paused = String(isContact);

      if (isContact) {
        if (frameId) window.cancelAnimationFrame(frameId);
        frameId = 0;
        isAnimating = false;
        return;
      }

      if (reducedMotion.matches) {
        currentScroll = targetScroll;
        renderParticles();
        return;
      }

      startAnimation();
    };

    const handleVisibility = () => {
      pageVisible = !document.hidden;
      if (!pageVisible && frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
        isAnimating = false;
      } else if (pageVisible && !isContact) {
        startAnimation();
      }
    };

    const handleReducedMotion = () => {
      if (reducedMotion.matches) {
        if (frameId) window.cancelAnimationFrame(frameId);
        frameId = 0;
        isAnimating = false;
        currentScroll = targetScroll;
        renderParticles();
      } else {
        startAnimation();
      }
    };

    root.addEventListener("desorden:scene-progress", handleSceneProgress);
    document.addEventListener("visibilitychange", handleVisibility);
    reducedMotion.addEventListener("change", handleReducedMotion);

    renderParticles();

    return () => {
      root.removeEventListener("desorden:scene-progress", handleSceneProgress);
      document.removeEventListener("visibilitychange", handleVisibility);
      reducedMotion.removeEventListener("change", handleReducedMotion);
      if (frameId) window.cancelAnimationFrame(frameId);
      container.replaceChildren();
    };
  }, []);

  return <div id="particle-tunnel" ref={containerRef} aria-hidden="true" />;
}
