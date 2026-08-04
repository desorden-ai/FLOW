"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ToastPhase = "entering" | "visible" | "leaving";

type PushNotification = {
  id: string;
  username: string;
  message: string;
  avatar: string;
  href: string;
};

const notifications: PushNotification[] = [
  {
    id: "rosalia-like",
    username: "@rosalia.vt",
    message: "A rosalia.vt li ha agradat el teu reel.",
    avatar: "/media/social-proof/rosalia.webp",
    href: "#",
  },
  {
    id: "rozalen-comment",
    username: "@rozalenmusic",
    message: "rozalenmusic ha comentat el teu reel.",
    avatar: "/media/social-proof/rozalen.webp",
    href: "#",
  },
];

const ENTER_FRAME_MS = 60;
const VISIBLE_DURATION_MS = 4_000;
const EXIT_DURATION_MS = 560;
const PAUSE_BETWEEN_TOASTS_MS = 1_000;

function VerifiedBadge() {
  return (
    <svg
      className="push-toast__verified"
      viewBox="0 0 24 24"
      role="img"
      aria-label="Compte verificat"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M12 1.75 14.2 3.2l2.6-.28.92 2.45 2.45.92-.28 2.6L21.35 12l-1.46 2.2.28 2.6-2.45.92-.92 2.45-2.6-.28L12 21.35l-2.2-1.46-2.6.28-.92-2.45-2.45-.92.28-2.6L2.65 12l1.46-2.2-.28-2.6 2.45-.92.92-2.45 2.6.28L12 1.75Z"
      />
      <path
        fill="#fff"
        d="m9.85 15.55-3.2-3.2 1.45-1.45 1.75 1.75 6.05-6.05 1.45 1.45-7.5 7.5Z"
      />
    </svg>
  );
}

export function SocialProofPushNotifications({ heroSelector = "#intro" }: { heroSelector?: string }) {
  const [mounted, setMounted] = useState(false);
  const [started, setStarted] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [phase, setPhase] = useState<ToastPhase>("entering");
  const startedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (startedRef.current) return;

    const hero = document.querySelector<HTMLElement>(heroSelector);

    const trigger = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      setStarted(true);
    };

    if (!hero) {
      let ticking = false;
      const onScroll = () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            if (window.scrollY >= window.innerHeight * 0.6) {
              trigger();
              window.removeEventListener("scroll", onScroll);
            }
            ticking = false;
          });
          ticking = true;
        }
      };

      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      return () => window.removeEventListener("scroll", onScroll);
    }

    const heroHasPassed = () => {
      const state = hero.dataset.state;
      const rect = hero.getBoundingClientRect();
      return state === "past" || rect.bottom <= 0;
    };

    if (heroHasPassed()) trigger();

    const stateObserver = new MutationObserver(() => {
      if (heroHasPassed()) {
        trigger();
        stateObserver.disconnect();
      }
    });

    stateObserver.observe(hero, {
      attributes: true,
      attributeFilter: ["data-state"],
    });

    const intersectionObserver = "IntersectionObserver" in window
      ? new IntersectionObserver(
          ([entry]) => {
            if (!entry) return;
            if (!entry.isIntersecting && entry.boundingClientRect.bottom <= 0) {
              trigger();
              intersectionObserver.disconnect();
            }
          },
          { threshold: [0, 0.05] },
        )
      : null;

    intersectionObserver?.observe(hero);

    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (heroHasPassed()) {
            trigger();
            window.removeEventListener("scroll", onScroll);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      stateObserver.disconnect();
      intersectionObserver?.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [heroSelector]);

  useEffect(() => {
    if (!started) return;

    let cancelled = false;
    const timers = new Set<number>();

    const wait = (milliseconds: number) => new Promise<void>((resolve) => {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        resolve();
      }, milliseconds);
      timers.add(timer);
    });

    const runSequence = async () => {
      for (let index = 0; index < notifications.length; index += 1) {
        if (cancelled) return;

        setActiveIndex(index);
        setPhase("entering");

        await wait(ENTER_FRAME_MS);
        if (cancelled) return;
        setPhase("visible");

        await wait(VISIBLE_DURATION_MS);
        if (cancelled) return;
        setPhase("leaving");

        await wait(EXIT_DURATION_MS);
        if (cancelled) return;
        setActiveIndex(null);

        if (index < notifications.length - 1) {
          await wait(PAUSE_BETWEEN_TOASTS_MS);
        }
      }
    };

    void runSequence();

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, [started]);

  if (!mounted || activeIndex === null) return null;

  const notification = notifications[activeIndex];

  return createPortal(
    <div className="push-toast-layer" aria-live="polite" aria-atomic="true">
      <a
        className={`push-toast push-toast--${phase}`}
        href={notification.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${notification.username}: ${notification.message}`}
      >
        <img
          className="push-toast__avatar"
          src={notification.avatar}
          alt=""
          width={52}
          height={52}
          decoding="async"
        />

        <span className="push-toast__content">
          <span className="push-toast__identity">
            <strong>{notification.username}</strong>
            <VerifiedBadge />
          </span>
          <span className="push-toast__message">{notification.message}</span>
        </span>
      </a>
    </div>,
    document.body,
  );
}
