"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ReelToastSequence.module.css";

type ToastPhase = "entering" | "visible" | "exiting";

type ReelToast = {
  id: string;
  username: string;
  message: string;
  avatar: string;
  href: string;
};

const TOASTS: ReelToast[] = [
  {
    id: "rosalia",
    username: "@rosalia.vt",
    message: "A rosalia.vt li ha agradat el teu reel.",
    avatar: "/rosalia.webp",
    href: "#",
  },
  {
    id: "rozalen",
    username: "@rozalenmusic",
    message: "rozalenmusic ha comentat el teu reel.",
    avatar: "/rozalen.webp",
    href: "#",
  },
  {
    id: "leire",
    username: "@leiremo_oficial",
    message: "A leiremo_oficial li ha agradat la teva publicació.",
    avatar: "/leire.webp",
    href: "#",
  },
];

const VISIBLE_DURATION = 4_000;
const EXIT_DURATION = 480;
const BETWEEN_TOASTS_DELAY = 1_000;

function wait(milliseconds: number, timers: Set<number>): Promise<void> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      resolve();
    }, milliseconds);

    timers.add(timer);
  });
}

function VerifiedBadge() {
  return (
    <svg
      className={styles.verified}
      viewBox="0 0 24 24"
      role="img"
      aria-label="Compte verificat"
    >
      <path
        fill="#0095f6"
        d="M12 1.75c1.01 0 1.76 1.12 2.67 1.42.94.3 2.2-.19 2.99.39.8.59.73 1.94 1.31 2.74.57.79 1.88 1.13 2.19 2.08.3.91-.57 1.95-.57 2.96s.87 2.05.57 2.96c-.31.95-1.62 1.29-2.19 2.08-.58.8-.51 2.15-1.31 2.74-.79.58-2.05.09-2.99.39-.91.3-1.66 1.42-2.67 1.42s-1.76-1.12-2.67-1.42c-.94-.3-2.2.19-2.99-.39-.8-.59-.73-1.94-1.31-2.74-.57-.79-1.88-1.13-2.19-2.08-.3-.91.57-1.95.57-2.96s-.87-2.05-.57-2.96c.31-.95 1.62-1.29 2.19-2.08.58-.8.51-2.15 1.31-2.74.79-.58 2.05-.09 2.99-.39.91-.3 1.66-1.42 2.67-1.42Z"
      />
      <path
        fill="#fff"
        d="m10.48 15.72-3.17-3.17 1.34-1.34 1.83 1.83 4.87-4.87 1.34 1.34-6.21 6.21Z"
      />
    </svg>
  );
}

export function ReelToastSequence() {
  const [started, setStarted] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [phase, setPhase] = useState<ToastPhase>("entering");
  const hasStarted = useRef(false);

  useEffect(() => {
    const startSequence = () => {
      if (hasStarted.current) return;
      hasStarted.current = true;
      setStarted(true);
    };

    const handleScroll = () => {
      if (window.scrollY >= window.innerHeight * 0.72) {
        startSequence();
        window.removeEventListener("scroll", handleScroll);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!started) return;

    let cancelled = false;
    const timers = new Set<number>();

    const runSequence = async () => {
      for (let index = 0; index < TOASTS.length; index += 1) {
        if (cancelled) return;

        setActiveIndex(index);
        setPhase("entering");
        await wait(35, timers);
        if (cancelled) return;

        setPhase("visible");
        await wait(VISIBLE_DURATION, timers);
        if (cancelled) return;

        setPhase("exiting");
        await wait(EXIT_DURATION, timers);
        if (cancelled) return;

        setActiveIndex(null);
        if (index < TOASTS.length - 1) {
          await wait(BETWEEN_TOASTS_DELAY, timers);
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

  const activeToast = activeIndex === null ? null : TOASTS[activeIndex];

  return (
    <div className={styles.region} aria-live="polite" aria-atomic="true">
      {activeToast && (
        <a
          key={activeToast.id}
          className={`${styles.toast} ${styles[phase]}`}
          href={activeToast.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${activeToast.username}. ${activeToast.message}`}
        >
          <img
            className={styles.avatar}
            src={activeToast.avatar}
            alt=""
            width={52}
            height={52}
          />
          <span className={styles.content}>
            <span className={styles.identity}>
              <strong>{activeToast.username}</strong>
              <VerifiedBadge />
            </span>
            <span className={styles.message}>{activeToast.message}</span>
          </span>
        </a>
      )}
    </div>
  );
}
