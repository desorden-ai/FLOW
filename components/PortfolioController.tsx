"use client";

import { useEffect, useRef, type ReactNode } from "react";

const MEDIA_START = 7;
const MEDIA_END = 12;
const WHEEL_LOCK_MS = 560;

export function PortfolioController({ children, sceneCount }: { children: ReactNode; sceneCount: number }) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const scenes = Array.from(root.querySelectorAll<HTMLElement>("[data-scene]"));
    const navigationButtons = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-go]"));
    const menu = root.querySelector<HTMLOListElement>("[data-section-menu]");
    const menuToggle = root.querySelector<HTMLButtonElement>("[data-menu-toggle]");
    const activeLabel = root.querySelector<HTMLElement>("[data-active-label]");
    const counter = root.querySelector<HTMLElement>("[data-scene-counter]");
    const progressBar = root.querySelector<HTMLElement>("[data-progress-bar]");
    const scrollCue = root.querySelector<HTMLElement>("[data-scroll-cue]");
    const marquee = root.querySelector<HTMLElement>("[data-media-marquee]");
    const modal = root.querySelector<HTMLElement>("[data-modal]");
    const modalTitle = root.querySelector<HTMLElement>("[data-modal-title]");

    let active = 0;
    let wheelLocked = false;
    let touchStart: number | null = null;

    const closeMenu = () => {
      if (menu) menu.hidden = true;
      menuToggle?.setAttribute("aria-expanded", "false");
      menuToggle?.querySelector("i")?.classList.remove("open");
    };

    const closeModal = () => {
      if (!modal) return;
      modal.hidden = true;
      document.body.classList.remove("modal-open");
    };

    const openModal = (title: string) => {
      if (!modal || !modalTitle) return;
      modalTitle.textContent = title;
      modal.hidden = false;
      document.body.classList.add("modal-open");
      modal.querySelector<HTMLButtonElement>("[data-modal-close]")?.focus();
    };

    const updateScene = (next: number) => {
      active = Math.max(0, Math.min(sceneCount - 1, next));
      const progress = sceneCount > 1 ? active / (sceneCount - 1) : 0;
      const activeScene = scenes[active];
      const label = activeScene?.dataset.label ?? "section";

      scenes.forEach((scene, index) => {
        const distance = index - active;
        scene.dataset.state = distance === 0 ? "current" : distance < 0 ? "past" : "future";
        scene.dataset.distance = String(Math.min(Math.abs(distance), 3));
        scene.setAttribute("aria-hidden", String(distance !== 0));
      });

      navigationButtons.forEach((button) => {
        const target = Number(button.dataset.go);
        button.classList.toggle("active", target === active);
        if (target === active) button.setAttribute("aria-current", "step");
        else button.removeAttribute("aria-current");
      });

      root.style.setProperty("--progress", String(progress));
      root.style.setProperty("--orbit-a-x", `${active * -7.5}vw`);
      root.style.setProperty("--orbit-b-x", `${active * 5.2}vw`);
      root.style.setProperty("--nebula-a-x", `${active * 1.8}vw`);
      root.style.setProperty("--nebula-b-x", `${active * -1.3}vw`);

      if (activeLabel) activeLabel.textContent = label;
      if (counter) counter.textContent = `${String(active + 1).padStart(2, "0")} / ${String(sceneCount).padStart(2, "0")}`;
      if (progressBar) progressBar.style.top = `calc(${progress * 100}% - ${progress * 76}px)`;
      if (scrollCue) scrollCue.hidden = active !== 0;
      if (marquee) marquee.hidden = active < MEDIA_START || active > MEDIA_END;

      closeMenu();
    };

    const onWheel = (event: WheelEvent) => {
      if (!modal?.hidden || wheelLocked || Math.abs(event.deltaY) < 12) return;
      event.preventDefault();
      wheelLocked = true;
      updateScene(active + (event.deltaY > 0 ? 1 : -1));
      window.setTimeout(() => {
        wheelLocked = false;
      }, WHEEL_LOCK_MS);
    };

    const onTouchStart = (event: TouchEvent) => {
      touchStart = event.touches[0]?.clientY ?? null;
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (touchStart === null || !modal?.hidden) return;
      const currentY = event.changedTouches[0]?.clientY ?? touchStart;
      const delta = touchStart - currentY;
      if (Math.abs(delta) > 42) updateScene(active + (delta > 0 ? 1 : -1));
      touchStart = null;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
        closeMenu();
        return;
      }
      if (!modal?.hidden) return;
      if (["ArrowDown", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        updateScene(active + 1);
      } else if (["ArrowUp", "PageUp"].includes(event.key)) {
        event.preventDefault();
        updateScene(active - 1);
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
      const modalButton = target.closest<HTMLElement>("[data-modal-open]");

      if (goButton) {
        updateScene(Number(goButton.dataset.go));
        return;
      }
      if (target.closest("[data-menu-toggle]")) {
        const shouldOpen = menu?.hidden ?? true;
        if (menu) menu.hidden = !shouldOpen;
        menuToggle?.setAttribute("aria-expanded", String(shouldOpen));
        menuToggle?.querySelector("i")?.classList.toggle("open", shouldOpen);
        return;
      }
      if (modalButton) {
        openModal(modalButton.dataset.modalOpen ?? "Project detail");
        return;
      }
      if (target.closest("[data-modal-close]") || target.matches("[data-modal]")) {
        closeModal();
      }
    };

    root.addEventListener("wheel", onWheel, { passive: false });
    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchend", onTouchEnd, { passive: true });
    root.addEventListener("click", onClick);
    window.addEventListener("keydown", onKeyDown);
    updateScene(0);

    return () => {
      root.removeEventListener("wheel", onWheel);
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchend", onTouchEnd);
      root.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("modal-open");
    };
  }, [sceneCount]);

  return <div ref={rootRef} className="site-shell">{children}</div>;
}
