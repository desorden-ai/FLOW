import { useEffect, useRef, useState } from "react";

export function useVisibilityTrigger(selector: string) {
  const [started, setStarted] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;

    const element = document.querySelector<HTMLElement>(selector);

    const trigger = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      setStarted(true);
    };

    if (!element) {
      const onScroll = () => {
        if (window.scrollY >= window.innerHeight * 0.6) {
          trigger();
          window.removeEventListener("scroll", onScroll);
        }
      };

      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      return () => window.removeEventListener("scroll", onScroll);
    }

    const elementHasPassed = () => {
      const state = element.dataset.state;
      const rect = element.getBoundingClientRect();
      return state === "past" || rect.bottom <= 0;
    };

    if (elementHasPassed()) trigger();

    const stateObserver = new MutationObserver(() => {
      if (elementHasPassed()) {
        trigger();
        stateObserver.disconnect();
      }
    });

    stateObserver.observe(element, {
      attributes: true,
      attributeFilter: ["data-state"],
    });

    const intersectionObserver = "IntersectionObserver" in window
      ? new IntersectionObserver(
          ([entry]) => {
            if (!entry) return;
            if (!entry.isIntersecting && entry.boundingClientRect.bottom <= 0) {
              trigger();
              if (intersectionObserver) {
                intersectionObserver.disconnect();
              }
            }
          },
          { threshold: [0, 0.05] },
        )
      : null;

    if (intersectionObserver) {
      intersectionObserver.observe(element);
    }

    const onScroll = () => {
      if (elementHasPassed()) {
        trigger();
        window.removeEventListener("scroll", onScroll);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      stateObserver.disconnect();
      intersectionObserver?.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [selector]);

  return started;
}
