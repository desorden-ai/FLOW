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

function restoreBackgroundElements(state: BackgroundState[]) {
  state.forEach(({ element, inert, ariaHidden }) => {
    element.inert = inert;
    if (ariaHidden === null) element.removeAttribute("aria-hidden");
    else element.setAttribute("aria-hidden", ariaHidden);
  });
}

function isolateBackgroundElements(root: HTMLElement, modalBackdrop: HTMLElement): BackgroundState[] {
  const state = Array.from(root.children)
    .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== modalBackdrop)
    .map((element) => ({
      element,
      inert: element.inert,
      ariaHidden: element.getAttribute("aria-hidden"),
    }));

  state.forEach(({ element }) => {
    element.inert = true;
    element.setAttribute("aria-hidden", "true");
  });

  return state;
}

export function usePortfolioModal(rootRef: RefObject<HTMLElement | null>) {
  const triggerRef = useRef<HTMLElement | null>(null);
  const backgroundStateRef = useRef<BackgroundState[]>([]);

  const modalBackdropRef = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLElement | null>(null);
  const modalTitleRef = useRef<HTMLElement | null>(null);

  const getModalElements = useCallback(() => {
    const root = rootRef.current;
    if (!root) return null;

    let backdrop = modalBackdropRef.current;
    if (!backdrop || !backdrop.isConnected || !root.contains(backdrop)) {
      backdrop = root.querySelector<HTMLElement>("[data-modal]");
      modalBackdropRef.current = backdrop;
    }

    if (!backdrop) return null;

    let modal = modalRef.current;
    if (!modal || !modal.isConnected || !backdrop.contains(modal)) {
      modal = backdrop.querySelector<HTMLElement>("[role='dialog']");
      modalRef.current = modal;
    }

    let title = modalTitleRef.current;
    if (!title || !title.isConnected || !backdrop.contains(title)) {
      title = backdrop.querySelector<HTMLElement>("[data-modal-title]");
      modalTitleRef.current = title;
    }

    return { backdrop, modal, title };
  }, [rootRef]);

  const restoreBackground = useCallback(() => {
    restoreBackgroundElements(backgroundStateRef.current);
    backgroundStateRef.current = [];
  }, []);

  const closeModal = useCallback(() => {
    const elements = getModalElements();
    if (!elements) return;
    const { backdrop } = elements;

    if (backdrop.hidden) return;

    backdrop.hidden = true;
    document.body.classList.remove("modal-open");
    restoreBackground();

    const trigger = triggerRef.current;
    triggerRef.current = null;
    if (trigger?.isConnected) trigger.focus();
  }, [getModalElements, restoreBackground]);

  const openModal = useCallback((title: string, trigger?: HTMLElement | null) => {
    const root = rootRef.current;
    if (!root) return;
    const elements = getModalElements();
    if (!elements) return;
    const { backdrop, modal, title: modalTitle } = elements;

    if (!modal || !modalTitle) return;

    triggerRef.current = trigger ?? (document.activeElement as HTMLElement | null);
    modalTitle.textContent = title;

    backgroundStateRef.current = isolateBackgroundElements(root, backdrop);

    backdrop.hidden = false;
    document.body.classList.add("modal-open");

    const focusable = getFocusableElements(modal);
    (focusable[0] ?? modal).focus();
  }, [rootRef, getModalElements]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onClick = (event: MouseEvent) => {
      const elements = getModalElements();
      if (!elements) return;
      const { backdrop } = elements;

      const target = event.target as HTMLElement;
      const modalButton = target.closest<HTMLElement>("[data-modal-open]");

      if (modalButton) {
        openModal(modalButton.dataset.modalOpen ?? "Detall del projecte", modalButton);
        return;
      }

      if (target.closest("[data-modal-close]") || target === backdrop) {
        closeModal();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const elements = getModalElements();
      if (!elements) return;
      const { backdrop, modal } = elements;

      if (backdrop.hidden) return;

      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
      }

      if (event.key !== "Tab") return;
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
  }, [rootRef, closeModal, openModal, restoreBackground, getModalElements]);

  return { closeModal, openModal };
}
