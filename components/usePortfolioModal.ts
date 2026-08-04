import { useEffect, useCallback } from "react";

export function usePortfolioModal(rootRef: React.RefObject<HTMLElement | null>) {
  const closeModal = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const modal = root.querySelector<HTMLElement>("[data-modal]");

    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("modal-open");
  }, [rootRef]);

  const openModal = useCallback((title: string) => {
    const root = rootRef.current;
    if (!root) return;
    const modal = root.querySelector<HTMLElement>("[data-modal]");
    const modalTitle = root.querySelector<HTMLElement>("[data-modal-title]");

    if (!modal || !modalTitle) return;
    modalTitle.textContent = title;
    modal.hidden = false;
    document.body.classList.add("modal-open");
    modal.querySelector<HTMLButtonElement>("[data-modal-close]")?.focus();
  }, [rootRef]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const modalButton = target.closest<HTMLElement>("[data-modal-open]");

      if (modalButton) {
        openModal(modalButton.dataset.modalOpen ?? "Project detail");
        return;
      }

      if (target.closest("[data-modal-close]") || target.matches("[data-modal]")) {
        closeModal();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    root.addEventListener("click", onClick);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      root.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [rootRef, closeModal, openModal]);

  return { closeModal, openModal };
}
