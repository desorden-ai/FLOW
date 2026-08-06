"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import styles from "./TextPrism3D.module.css";

const WORDS = ["DESORDEN", "DESCOBRIR", "ORDENAR", "DENOTAR"] as const;
const ROTATION_DEGREES = 90;
const ROTATION_THROTTLE_MS = 364;
const TOUCH_THRESHOLD_PX = 30;

function normalizeFace(step: number) {
  return ((step % WORDS.length) + WORDS.length) % WORDS.length;
}

export function TextPrism3D() {
  const sceneRef = useRef<HTMLButtonElement | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const blockedUntilRef = useRef(0);
  const [step, setStep] = useState(0);

  const rotate = useCallback((direction: 1 | -1) => {
    const now = performance.now();
    if (now < blockedUntilRef.current) return;

    blockedUntilRef.current = now + ROTATION_THROTTLE_MS;
    setStep((current) => current + direction);
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < 8) return;
      event.preventDefault();
      event.stopPropagation();
      rotate(event.deltaY > 0 ? 1 : -1);
    };

    const handleTouchStart = (event: TouchEvent) => {
      touchStartYRef.current = event.touches[0]?.clientY ?? null;
      event.stopPropagation();
    };

    const handleTouchEnd = (event: TouchEvent) => {
      const startY = touchStartYRef.current;
      touchStartYRef.current = null;
      if (startY === null) return;

      const endY = event.changedTouches[0]?.clientY ?? startY;
      const distance = startY - endY;
      if (Math.abs(distance) < TOUCH_THRESHOLD_PX) return;

      event.preventDefault();
      event.stopPropagation();
      rotate(distance > 0 ? 1 : -1);
    };

    const handleTouchCancel = () => {
      touchStartYRef.current = null;
    };

    scene.addEventListener("wheel", handleWheel, { passive: false });
    scene.addEventListener("touchstart", handleTouchStart, { passive: true });
    scene.addEventListener("touchend", handleTouchEnd, { passive: false });
    scene.addEventListener("touchcancel", handleTouchCancel, { passive: true });

    return () => {
      scene.removeEventListener("wheel", handleWheel);
      scene.removeEventListener("touchstart", handleTouchStart);
      scene.removeEventListener("touchend", handleTouchEnd);
      scene.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [rotate]);

  const activeFace = normalizeFace(step);
  const activeWord = WORDS[activeFace];
  const prismStyle = {
    transform: `rotateX(${step * ROTATION_DEGREES}deg)`,
  } satisfies CSSProperties;

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (["ArrowDown", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      rotate(1);
    } else if (["ArrowUp", "ArrowLeft"].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      rotate(-1);
    }
  };

  return (
    <div className={styles.wrapper} data-text-prism>
      <button
        ref={sceneRef}
        type="button"
        className={styles.scene}
        onClick={() => rotate(1)}
        onKeyDown={handleKeyDown}
        aria-label={`Rotar prisma tipogràfic. Paraula visible: ${activeWord}`}
        data-prism-step={step}
        data-prism-active-word={activeWord}
      >
        <span className={styles.prism} style={prismStyle} aria-hidden="true">
          <span className={`${styles.face} ${styles.front}`}>DESORDEN</span>
          <span className={`${styles.face} ${styles.bottom}`}>DESCOBRIR</span>
          <span className={`${styles.face} ${styles.back}`}>ORDENAR</span>
          <span className={`${styles.face} ${styles.top}`}>DENOTAR</span>
        </span>
      </button>

      <p className={styles.hint}>Toca, gira o desliza sobre el prisma</p>
      <span className={styles.live} aria-live="polite">
        {activeWord}
      </span>
    </div>
  );
}
