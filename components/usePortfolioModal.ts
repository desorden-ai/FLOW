import { useCallback, useEffect, useRef, type RefObject } from "react";

type BackgroundState = {
  element: HTMLElement;
  inert: boolean;
  ariaHidden: string | null;
};

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hidden && !element.closest("[hidden]"));
}

export function usePortfolioModal(rootRef: RefObject<HTMLElement | null>) {
  const triggerRef = useRef<HTMLElement | null>(null);
  const backgroundStateRef = useRef<BackgroundState[]>([]);

  const restoreBackground = useCallback(() => {
    backgroundStateRef.current.forEach(({ element, inert, ariaHidden }) => {
      element.inert = inert;
      if (ariaHidden === null) element.removeAttribute("aria-hidden");
      else element.setAttribute("aria-hidden", ariaHidden);
    });
    backgroundStateRef.current = [];
  }, []);

  const closeModal = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const modalBackdrop = root.querySelector<HTMLElement>("[data-modal]");

    if (!modalBackdrop || modalBackdrop.hidden) return;

    modalBackdrop.hidden = true;
    document.body.classList.remove("modal-open");
    restoreBackground();

    const trigger = triggerRef.current;
    triggerRef.current = null;
    if (trigger?.isConnected) trigger.focus();
  }, [rootRef, restoreBackground]);

  const openModal = useCallback((title: string, trigger?: HTMLElement | null) => {
    const root = rootRef.current;
    if (!root) return;
    const modalBackdrop = root.querySelector<HTMLElement>("[data-modal]");
    const modal = modalBackdrop?.querySelector<HTMLElement>("[role='dialog']");
    const modalTitle = modalBackdrop?.querySelector<HTMLElement>("[data-modal-title]");

    if (!modalBackdrop || !modal || !modalTitle) return;

    triggerRef.current = trigger ?? document.activeElement as HTMLElement | null;
    modalTitle.textContent = title;

    backgroundStateRef.current = Array.from(root.children)
      .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== modalBackdrop)
      .map((element) => ({
        element,
        inert: element.inert,
        ariaHidden: element.getAttribute("aria-hidden"),
      }));

    backgroundStateRef.current.forEach(({ element }) => {
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    });

    modalBackdrop.hidden = false;
    document.body.classList.add("modal-open");

    const focusable = getFocusableElements(modal);
    (focusable[0] ?? modal).focus();
  }, [rootRef]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const modalButton = target.closest<HTMLElement>("[data-modal-open]");
      const modalBackdrop = root.querySelector<HTMLElement>("[data-modal]");

      if (modalButton) {
        openModal(modalButton.dataset.modalOpen ?? "Detall del projecte", modalButton);
        return;
      }

      if (target.closest("[data-modal-close]") || target === modalBackdrop) {
        closeModal();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const modalBackdrop = root.querySelector<HTMLElement>("[data-modal]");
      if (!modalBackdrop || modalBackdrop.hidden) return;

      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
      }

      if (event.key !== "Tab") return;

      const modal = modalBackdrop.querySelector<HTMLElement>("[role='dialog']");
      if (!modal) return;

      const focusable = getFocusableElements(modal);
      if (focusable.length === 0) {
        event.preventDefault();
        modal.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    root.addEventListener("click", onClick);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      root.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("modal-open");
      restoreBackground();
    };
  }, [rootRef, closeModal, openModal, restoreBackground]);

  return { closeModal, openModal };
}
