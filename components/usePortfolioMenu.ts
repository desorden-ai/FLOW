import { useEffect, useCallback } from "react";

export function usePortfolioMenu(rootRef: React.RefObject<HTMLElement | null>) {
  const closeMenu = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const menu = root.querySelector<HTMLOListElement>("[data-section-menu]");
    const menuToggle = root.querySelector<HTMLButtonElement>("[data-menu-toggle]");

    if (menu) menu.hidden = true;
    menuToggle?.setAttribute("aria-expanded", "false");
    menuToggle?.querySelector("i")?.classList.remove("open");
  }, [rootRef]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-menu-toggle]")) {
        const menu = root.querySelector<HTMLOListElement>("[data-section-menu]");
        const menuToggle = root.querySelector<HTMLButtonElement>("[data-menu-toggle]");

        const shouldOpen = menu?.hidden ?? true;
        if (menu) menu.hidden = !shouldOpen;
        menuToggle?.setAttribute("aria-expanded", String(shouldOpen));
        menuToggle?.querySelector("i")?.classList.toggle("open", shouldOpen);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    root.addEventListener("click", onClick);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      root.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [rootRef, closeMenu]);

  return { closeMenu };
}
