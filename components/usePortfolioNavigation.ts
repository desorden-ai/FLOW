import { useCallback, useEffect, useRef, type RefObject } from "react";

const MEDIA_START = 6;
const MEDIA_END = 7;
const LOGO_TUNNEL_INDEX = 2;
const LOGO_TUNNEL_STEP = 0.14;
const WHEEL_LOCK_MS = 560;
const TUNNEL_WHEEL_LOCK_MS = 170;

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function usePortfolioNavigation(
  rootRef: RefObject<HTMLElement | null>,
  sceneCount: number,
  closeMenu: () => void,
) {
  const activeRef = useRef(0);
  const logoTunnelProgressRef = useRef(0);
  const wheelLockedRef = useRef(false);
  const wheelUnlockTimerRef = useRef<number | null>(null);
  const touchStartRef = useRef<number | null>(null);

  const emitLogoTunnelProgress = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;

    const progress = clamp(logoTunnelProgressRef.current, 0, 1);
    const active = activeRef.current;

    root.style.setProperty("--block-3-progress", String(progress));
    root.dispatchEvent(
      new CustomEvent("desorden:block-3-progress", {
        detail: {
          progress,
          active: active === LOGO_TUNNEL_INDEX,
        },
      }),
    );
  }, [rootRef]);

  const updateProgressUI = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;

    const active = activeRef.current;
    const logoTunnelProgress = logoTunnelProgressRef.current;
    const visualIndex = active === LOGO_TUNNEL_INDEX
      ? active + logoTunnelProgress
      : active;
    const progress = sceneCount > 1
      ? clamp(visualIndex / (sceneCount - 1), 0, 1)
      : 0;

    root.style.setProperty("--progress", String(progress));

    const progressBar = root.querySelector<HTMLElement>("[data-progress-bar]");
    if (progressBar) {
      progressBar.style.top = `calc(${progress * 100}% - ${progress * 76}px)`;
    }
  }, [rootRef, sceneCount]);

  const setLogoTunnelProgress = useCallback((next: number) => {
    logoTunnelProgressRef.current = clamp(next, 0, 1);
    updateProgressUI();
    emitLogoTunnelProgress();
  }, [updateProgressUI, emitLogoTunnelProgress]);

  const updateScene = useCallback((next: number) => {
    const root = rootRef.current;
    if (!root) return;

    const scenes = Array.from(root.querySelectorAll<HTMLElement>("[data-scene]"));
    const navigationButtons = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-go]"));
    const activeLabel = root.querySelector<HTMLElement>("[data-active-label]");
    const liveLabel = root.querySelector<HTMLElement>("[data-live-scene-label]");
    const counter = root.querySelector<HTMLElement>("[data-scene-counter]");
    const scrollCue = root.querySelector<HTMLElement>("[data-scroll-cue]");
    const marquee = root.querySelector<HTMLElement>("[data-media-marquee]");

    const previousActive = activeRef.current;
    const nextActive = clamp(next, 0, Math.max(0, sceneCount - 1));

    if (nextActive === LOGO_TUNNEL_INDEX && previousActive !== LOGO_TUNNEL_INDEX) {
      logoTunnelProgressRef.current = previousActive > LOGO_TUNNEL_INDEX ? 1 : 0;
    }

    activeRef.current = nextActive;
    const active = activeRef.current;
    const activeScene = scenes[active];
    const label = activeScene?.dataset.label ?? "secció";

    scenes.forEach((scene, index) => {
      const distance = index - active;
      const isCurrent = distance === 0;

      scene.dataset.state = isCurrent ? "current" : distance < 0 ? "past" : "future";
      scene.dataset.distance = String(Math.min(Math.abs(distance), 3));
      scene.setAttribute("aria-hidden", String(!isCurrent));
      scene.inert = !isCurrent;
    });

    navigationButtons.forEach((button) => {
      const target = Number(button.dataset.go);
      const isCurrent = Number.isFinite(target) && target === active;

      button.classList.toggle("active", isCurrent);
      if (isCurrent) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });

    root.style.setProperty("--orbit-a-x", `${active * -7.5}vw`);
    root.style.setProperty("--orbit-b-x", `${active * 5.2}vw`);
    root.style.setProperty("--nebula-a-x", `${active * 1.8}vw`);
    root.style.setProperty("--nebula-b-x", `${active * -1.3}vw`);

    if (activeLabel) activeLabel.textContent = label;
    if (liveLabel) liveLabel.textContent = `Secció ${active + 1} de ${sceneCount}: ${label}`;
    if (counter) counter.textContent = `${String(active + 1).padStart(2, "0")} / ${String(sceneCount).padStart(2, "0")}`;
    if (scrollCue) scrollCue.hidden = active !== 0;
    if (marquee) marquee.hidden = active < MEDIA_START || active > MEDIA_END;

    updateProgressUI();
    emitLogoTunnelProgress();
    closeMenu();
  }, [rootRef, sceneCount, updateProgressUI, emitLogoTunnelProgress, closeMenu]);

  const advance = useCallback((direction: 1 | -1, intensity = 1) => {
    const active = activeRef.current;
    const logoTunnelProgress = logoTunnelProgressRef.current;

    if (active === LOGO_TUNNEL_INDEX) {
      const atStart = logoTunnelProgress <= 0.001;
      const atEnd = logoTunnelProgress >= 0.999;

      if (direction > 0 && !atEnd) {
        setLogoTunnelProgress(logoTunnelProgress + LOGO_TUNNEL_STEP * intensity);
        return;
      }

      if (direction < 0 && !atStart) {
        setLogoTunnelProgress(logoTunnelProgress - LOGO_TUNNEL_STEP * intensity);
        return;
      }
    }

    updateScene(active + direction);
  }, [setLogoTunnelProgress, updateScene]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const isModalOpen = () => document.body.classList.contains("modal-open");

    const unlockWheel = () => {
      wheelLockedRef.current = false;
      wheelUnlockTimerRef.current = null;
    };

    const onWheel = (event: WheelEvent) => {
      if (isModalOpen() || wheelLockedRef.current || Math.abs(event.deltaY) < 12) return;
      event.preventDefault();

      const direction: 1 | -1 = event.deltaY > 0 ? 1 : -1;
      const intensity = activeRef.current === LOGO_TUNNEL_INDEX
        ? clamp(Math.abs(event.deltaY) / 150, 0.8, 1.5)
        : 1;

      wheelLockedRef.current = true;
      advance(direction, intensity);

      if (wheelUnlockTimerRef.current !== null) {
        window.clearTimeout(wheelUnlockTimerRef.current);
      }
      wheelUnlockTimerRef.current = window.setTimeout(
        unlockWheel,
        activeRef.current === LOGO_TUNNEL_INDEX ? TUNNEL_WHEEL_LOCK_MS : WHEEL_LOCK_MS,
      );
    };

    const onTouchStart = (event: TouchEvent) => {
      touchStartRef.current = event.touches[0]?.clientY ?? null;
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (touchStartRef.current === null || isModalOpen()) return;
      const currentY = event.changedTouches[0]?.clientY ?? touchStartRef.current;
      const delta = touchStartRef.current - currentY;

      if (Math.abs(delta) > 25) {
        advance(delta > 0 ? 1 : -1, activeRef.current === LOGO_TUNNEL_INDEX ? 1.15 : 1);
      }

      touchStartRef.current = null;
    };

    const onTouchCancel = () => {
      touchStartRef.current = null;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isModalOpen()) return;

      if (["ArrowDown", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        advance(1, activeRef.current === LOGO_TUNNEL_INDEX ? 1.15 : 1);
      } else if (["ArrowUp", "PageUp"].includes(event.key)) {
        event.preventDefault();
        advance(-1, activeRef.current === LOGO_TUNNEL_INDEX ? 1.15 : 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        updateScene(0);
      } else if (event.key === "End") {
        event.preventDefault();
        updateScene(sceneCount - 1);
      }
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const goButton = target.closest<HTMLButtonElement>("[data-go]");
      if (!goButton) return;

      const next = Number(goButton.dataset.go);
      if (Number.isFinite(next)) updateScene(next);
    };

    root.addEventListener("wheel", onWheel, { passive: false });
    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchend", onTouchEnd, { passive: true });
    root.addEventListener("touchcancel", onTouchCancel, { passive: true });
    root.addEventListener("click", onClick);
    window.addEventListener("keydown", onKeyDown);

    updateScene(0);

    return () => {
      root.removeEventListener("wheel", onWheel);
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchend", onTouchEnd);
      root.removeEventListener("touchcancel", onTouchCancel);
      root.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKeyDown);

      if (wheelUnlockTimerRef.current !== null) {
        window.clearTimeout(wheelUnlockTimerRef.current);
      }
    };
  }, [rootRef, sceneCount, advance, updateScene]);
}
