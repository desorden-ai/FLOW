import { useEffect, type RefObject } from "react";
import { clampFinite, finiteOr, interpolateProgress } from "./logoTunnelMath";

const INTRO_END = 0.15;
const TOTAL_Z_TRAVEL = 12_000;
const FLOW_X_PX = 18;
const FLOW_Y_PX = 12;
const FLOW_ROTATION_DEG = 2.4;

type Block3ProgressDetail = {
  progress?: number;
  active?: boolean;
};

export function useLogoTunnelAnimation(sectionRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const section = sectionRef.current;
    const root = section?.closest<HTMLElement>(".site-shell");
    const intro = section?.querySelector<HTMLElement>("[data-logo-tunnel-intro]");
    const logos = section
      ? Array.from(section.querySelectorAll<HTMLImageElement>("[data-logo-3d-item]")).map((logo, index) => ({
          element: logo,
          initialZ: finiteOr(Number(logo.dataset.z), 0),
          flowDirection: index % 2 === 0 ? 1 : -1,
          flowPhase: index * 1.17,
        }))
      : [];

    if (!section || !root || !intro || logos.length === 0) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const parentScene = section.closest<HTMLElement>("[data-scene]");
    const initialProgress = clampFinite(
      Number.parseFloat(root.style.getPropertyValue("--block-3-progress")),
      0,
      1,
      0,
    );

    let currentProgress = initialProgress;
    let targetProgress = initialProgress;
    let frameId = 0;
    let active = parentScene?.dataset.state === "current";
    let pageVisible = !document.hidden;
    let previousTimestamp: number | null = null;

    const render = (progress: number) => {
      const safeProgress = clampFinite(progress, 0, 1, 0);
      const introOpacity = clampFinite(1 - safeProgress / INTRO_END, 0, 1, 0);
      const introShift = safeProgress * -100;

      intro.style.opacity = String(introOpacity);
      intro.style.transform = `translate3d(-50%, ${introShift}px, 0)`;

      const logosEnabled = safeProgress > INTRO_END;
      const logoProgress = clampFinite((safeProgress - INTRO_END) / (1 - INTRO_END), 0, 1, 0);
      const currentZAdvance = logoProgress * TOTAL_Z_TRAVEL;

      logos.forEach(({ element: logo, initialZ, flowDirection, flowPhase }) => {
        const newZ = initialZ + currentZAdvance;
        const visiblePathProgress = clampFinite((newZ + 3000) / 3000, 0, 1, 0);
        const motionEnvelope = Math.sin(visiblePathProgress * Math.PI);
        const travelPhase = logoProgress * Math.PI * 1.75 + flowPhase;
        const offsetX = Math.sin(travelPhase) * FLOW_X_PX * motionEnvelope * flowDirection;
        const offsetY = Math.cos(travelPhase * 0.78) * FLOW_Y_PX * motionEnvelope;
        const rotation = Math.sin(travelPhase * 0.62) * FLOW_ROTATION_DEG * motionEnvelope;

        logo.style.transform = `translate(-50%, -50%) translate3d(${offsetX}px, ${offsetY}px, ${newZ}px) rotateZ(${rotation}deg)`;

        let opacity = 0;
        if (logosEnabled && newZ > -3000 && newZ <= 0) {
          if (newZ < -1500) opacity = (newZ + 3000) / 1500;
          else if (newZ <= -800) opacity = 1;
          else opacity = Math.abs(newZ) / 800;
        }

        logo.style.opacity = String(clampFinite(opacity, 0, 1, 0));
      });
    };

    const animate = (timestamp: number) => {
      frameId = 0;
      if (!active || !pageVisible) {
        previousTimestamp = null;
        return;
      }

      const deltaMs = previousTimestamp === null ? 1000 / 60 : timestamp - previousTimestamp;
      previousTimestamp = timestamp;
      currentProgress = interpolateProgress(currentProgress, targetProgress, deltaMs);
      render(currentProgress);

      if (Math.abs(targetProgress - currentProgress) > 0.001 && !reducedMotion.matches) {
        frameId = window.requestAnimationFrame(animate);
        return;
      }

      currentProgress = targetProgress;
      previousTimestamp = null;
      render(currentProgress);
    };

    const startAnimation = () => {
      if (frameId || !active || !pageVisible) return;

      if (reducedMotion.matches) {
        currentProgress = targetProgress;
        previousTimestamp = null;
        render(currentProgress);
        return;
      }

      frameId = window.requestAnimationFrame(animate);
    };

    const handleProgress = (event: Event) => {
      const detail = (event as CustomEvent<Block3ProgressDetail>).detail;
      if (!detail) return;

      active = detail.active === true;
      targetProgress = clampFinite(Number(detail.progress), 0, 1, currentProgress);
      section.dataset.tunnelActive = String(active);
      section.style.setProperty("--logo-tunnel-progress", String(targetProgress));

      if (!active) {
        if (frameId) window.cancelAnimationFrame(frameId);
        frameId = 0;
        previousTimestamp = null;
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
        previousTimestamp = null;
      } else if (pageVisible) {
        startAnimation();
      }
    };

    const handleReducedMotion = () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
      previousTimestamp = null;
      currentProgress = targetProgress;
      render(currentProgress);
    };

    root.addEventListener("desorden:block-3-progress", handleProgress);
    document.addEventListener("visibilitychange", handleVisibility);
    reducedMotion.addEventListener("change", handleReducedMotion);
    render(initialProgress);

    return () => {
      root.removeEventListener("desorden:block-3-progress", handleProgress);
      document.removeEventListener("visibilitychange", handleVisibility);
      reducedMotion.removeEventListener("change", handleReducedMotion);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [sectionRef]);
}
