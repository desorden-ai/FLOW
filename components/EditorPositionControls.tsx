"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  EDITOR_MOVE_STEPS,
  nudgePixelValue,
  scalePixelValue,
  type EditorMoveStep,
} from "../lib/editor-position";

interface PositionContext {
  target: HTMLElement;
  selector: string;
  baseWidth: number;
}

type Axis = "left" | "top";

function firstLabelText(label: HTMLLabelElement): string {
  const textNode = Array.from(label.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
  return textNode?.textContent?.trim().toUpperCase() ?? "";
}

function findInput(property: string): HTMLInputElement | null {
  const form = document.querySelector<HTMLElement>(".editor-form--grid");
  if (!form) return null;

  for (const label of form.querySelectorAll<HTMLLabelElement>("label")) {
    if (firstLabelText(label) === property.toUpperCase()) {
      return label.querySelector<HTMLInputElement>("input");
    }
  }

  return null;
}

function findPositionSelect(): HTMLSelectElement | null {
  const form = document.querySelector<HTMLElement>(".editor-form--grid");
  if (!form) return null;

  for (const label of form.querySelectorAll<HTMLLabelElement>("label")) {
    if (firstLabelText(label) === "POSICIÓN") {
      return label.querySelector<HTMLSelectElement>("select");
    }
  }

  return null;
}

function setNativeValue(element: HTMLInputElement | HTMLSelectElement, value: string): void {
  const prototype = element instanceof HTMLInputElement
    ? HTMLInputElement.prototype
    : HTMLSelectElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");

  if (descriptor?.set) descriptor.set.call(element, value);
  else element.value = value;

  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function ensureMovablePosition(): void {
  const select = findPositionSelect();
  if (!select || (select.value && select.value !== "static")) return;
  setNativeValue(select, "relative");
}

function vibrate(): void {
  if (typeof navigator.vibrate === "function") navigator.vibrate(8);
}

export function EditorPositionControls() {
  const [context, setContext] = useState<PositionContext | null>(null);
  const [moveStep, setMoveStep] = useState<EditorMoveStep>(4);
  const [sizePercent, setSizePercent] = useState(100);
  const selectorRef = useRef<string | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let frame = 0;

    const sync = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const activeTab = document.querySelector<HTMLButtonElement>(".editor-tabs button.is-active");
        const target = document.querySelector<HTMLElement>(".editor-form--grid");
        const selected = document.querySelector<HTMLElement>("[data-canvas-selector][data-editor-selected='true']");
        const selector = selected?.dataset.canvasSelector ?? null;
        const positionTabActive = activeTab?.textContent?.trim().toUpperCase() === "POSICIÓN";

        if (!positionTabActive || !target || !selected || !selector) {
          selectorRef.current = null;
          targetRef.current = null;
          setContext(null);
          return;
        }

        if (selectorRef.current === selector && targetRef.current === target) return;

        selectorRef.current = selector;
        targetRef.current = target;
        setSizePercent(100);
        setContext({
          target,
          selector,
          baseWidth: Math.max(1, selected.getBoundingClientRect().width),
        });
      });
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class", "data-editor-selected"],
    });
    sync();

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  const move = useCallback((axis: Axis, delta: number) => {
    const input = findInput(axis);
    if (!input) return;

    ensureMovablePosition();
    setNativeValue(input, nudgePixelValue(input.value, delta));
    vibrate();
  }, []);

  const resize = useCallback((percentage: number) => {
    if (!context) return;
    const widthInput = findInput("width");
    if (!widthInput) return;

    setSizePercent(percentage);
    setNativeValue(widthInput, scalePixelValue(context.baseWidth, percentage));
  }, [context]);

  if (!context) return null;

  return createPortal(
    <section className="editor-position-controls" data-editor-ui aria-label="Mover y cambiar tamaño">
      <div className="editor-position-controls__heading">
        <strong>MOVER OBJETO</strong>
        <label>
          PASO
          <select
            value={moveStep}
            onChange={(event) => setMoveStep(Number(event.target.value) as EditorMoveStep)}
          >
            {EDITOR_MOVE_STEPS.map((step) => (
              <option key={step} value={step}>{step}px</option>
            ))}
          </select>
        </label>
      </div>

      <div className="editor-direction-pad" role="group" aria-label="Flechas de posición">
        <span aria-hidden="true" />
        <button type="button" onClick={() => move("top", -moveStep)} aria-label={`Mover arriba ${moveStep} píxeles`}>↑</button>
        <span aria-hidden="true" />
        <button type="button" onClick={() => move("left", -moveStep)} aria-label={`Mover izquierda ${moveStep} píxeles`}>←</button>
        <output aria-live="polite">{moveStep}px</output>
        <button type="button" onClick={() => move("left", moveStep)} aria-label={`Mover derecha ${moveStep} píxeles`}>→</button>
        <span aria-hidden="true" />
        <button type="button" onClick={() => move("top", moveStep)} aria-label={`Mover abajo ${moveStep} píxeles`}>↓</button>
        <span aria-hidden="true" />
      </div>

      <label className="editor-size-control">
        <span>
          <strong>TAMAÑO</strong>
          <output>{sizePercent}%</output>
        </span>
        <input
          type="range"
          min="25"
          max="200"
          step="5"
          value={sizePercent}
          onChange={(event) => resize(Number(event.target.value))}
          aria-label="Tamaño del objeto"
        />
      </label>

      <button type="button" className="editor-size-reset" onClick={() => resize(100)}>
        RESTABLECER TAMAÑO
      </button>
    </section>,
    context.target,
  );
}
