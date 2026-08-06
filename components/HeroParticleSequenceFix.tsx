"use client";

import { useEffect, useSyncExternalStore } from "react";

const HERO_PHASE_ONE_PROGRESS = 0.5;
const HERO_HANDOFF_PROGRESS = 0.72;
const GESTURE_PHASE_ONE_PROGRESS = 0.34;
const BLOCK_THREE_HIDE_DELAY_MS = 1_650;
const subscribeToHydration = () => () => undefined;

type HeroProgressDetail = {
  progress: number;
  active: boolean;
  sceneIndex: number;
};

type GestureSource = "gesture" | "keyboard" | "other";

function isHeroProgressEvent(event: Event): event is CustomEvent<HeroProgressDetail> {
  const detail = (event as CustomEvent<HeroProgressDetail>).detail;

  return Boolean(
    detail &&
    Number.isFinite(detail.progress) &&
    Number.isFinite(detail.sceneIndex),
  );
}

export function HeroParticleSequenceFix() {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!hydrated) return;

    const shell = document.querySelector<HTMLElement>(".site-shell");
    if (!shell) return;

    let lastInput: GestureSource = "other";
    let pitchRequested = false;
    let pitchRequestFrame = 0;
    let hideTimer: number | null = null;

    const portrait = () =>
      shell.querySelector<HTMLElement>(".hero-particle-portrait");

    const clearHideTimer = () => {
      if (hideTimer === null) return;
      window.clearTimeout(hideTimer);
      hideTimer = null;
    };

    const markGesture = () => {
      lastInput = "gesture";
    };

    const markKeyboard = () => {
      lastInput = "keyboard";
    };

    const applyFirstGestureVisuals = () => {
      const layer = portrait();
      if (!layer) return;

      layer.dataset.phase = "hero-particles";
      layer.dataset.renderSource = "webgl";
      layer.style.setProperty("--hero-layer-opacity", "1");
      layer.style.setProperty("--hero-fallback-opacity", "0.14");
      layer.style.setProperty("--hero-canvas-opacity", "1");
      layer.style.setProperty("--hero-veil-opacity", "0.58");
    };

    const applyPitchVisuals = () => {
      clearHideTimer();
      const layer = portrait();
      if (!layer) return;

      layer.dataset.overlay = "pitch";
      layer.dataset.phase = "pitch-particles";
      layer.dataset.renderSource = "webgl";
      layer.dataset.sceneIndex = "1";
      layer.style.setProperty("--hero-layer-opacity", "1");
      layer.style.setProperty("--hero-fallback-opacity", "0");
      layer.style.setProperty("--hero-canvas-opacity", "1");
      layer.style.setProperty("--hero-veil-opacity", "0");
    };

    const applyBlockThreeFade = () => {
      clearHideTimer();
      const layer = portrait();
      if (!layer) return;

      layer.dataset.overlay = "leaving";
      layer.dataset.phase = "block-3-fade";
      layer.dataset.renderSource = "webgl";
      layer.dataset.sceneIndex = "2";
      layer.style.setProperty("--hero-layer-opacity", "1");
      layer.style.setProperty("--hero-fallback-opacity", "0");
      layer.style.setProperty("--hero-canvas-opacity", "1");
      layer.style.setProperty("--hero-veil-opacity", "0");

      hideTimer = window.setTimeout(() => {
        layer.dataset.overlay = "hidden";
        layer.dataset.phase = "hidden";
        layer.style.setProperty("--hero-layer-opacity", "0");
        layer.style.setProperty("--hero-canvas-opacity", "0");
        hideTimer = null;
      }, BLOCK_THREE_HIDE_DELAY_MS);
    };

    const requestPitchScene = () => {
      if (pitchRequested) return;
      pitchRequested = true;
      window.cancelAnimationFrame(pitchRequestFrame);

      pitchRequestFrame = window.requestAnimationFrame(() => {
        shell.querySelector<HTMLButtonElement>('[data-go="1"]')?.click();
      });
    };

    const handleProgressCapture = (event: Event) => {
      if (!isHeroProgressEvent(event)) return;

      const detail = event.detail;
      const actualSceneIndex = detail.sceneIndex;
      const actualProgress = detail.progress;

      if (actualSceneIndex === 0) {
        clearHideTimer();

        if (actualProgress < 0.001) {
          pitchRequested = false;
          lastInput = "other";
          return;
        }

        if (
          lastInput === "gesture" &&
          actualProgress >= HERO_HANDOFF_PROGRESS - 0.001
        ) {
          detail.progress = HERO_PHASE_ONE_PROGRESS;
          queueMicrotask(() => {
            applyPitchVisuals();
            requestPitchScene();
          });
          return;
        }

        if (
          lastInput === "gesture" &&
          actualProgress >= HERO_PHASE_ONE_PROGRESS - 0.001
        ) {
          detail.progress = GESTURE_PHASE_ONE_PROGRESS;
          queueMicrotask(applyFirstGestureVisuals);
        }

        return;
      }

      if (actualSceneIndex === 1) {
        detail.sceneIndex = 0;
        detail.progress = HERO_PHASE_ONE_PROGRESS;
        queueMicrotask(applyPitchVisuals);
        return;
      }

      detail.sceneIndex = 1;
      detail.progress = HERO_HANDOFF_PROGRESS;
      queueMicrotask(applyBlockThreeFade);
    };

    shell.addEventListener("wheel", markGesture, { capture: true, passive: true });
    shell.addEventListener("touchend", markGesture, { capture: true, passive: true });
    window.addEventListener("keydown", markKeyboard, { capture: true });
    shell.addEventListener(
      "desorden:hero-progress",
      handleProgressCapture,
      { capture: true },
    );

    return () => {
      shell.removeEventListener("wheel", markGesture, { capture: true });
      shell.removeEventListener("touchend", markGesture, { capture: true });
      window.removeEventListener("keydown", markKeyboard, { capture: true });
      shell.removeEventListener(
        "desorden:hero-progress",
        handleProgressCapture,
        { capture: true },
      );
      window.cancelAnimationFrame(pitchRequestFrame);
      clearHideTimer();
    };
  }, [hydrated]);

  return null;
}
