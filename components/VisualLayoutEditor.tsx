"use client";

import { useEffect } from "react";

export function VisualLayoutEditor() {
  useEffect(() => {
    // Enable interactive drag, repositioning & element deletion for visual blocks
    const elements = document.querySelectorAll<HTMLElement>(
      ".intro-heading > *, .hero-picture, .intro-layout > *, .hero-services li"
    );

    elements.forEach((el) => {
      el.style.position = "relative";
      el.setAttribute("draggable", "true");

      let startY = 0;
      let startTop = 0;

      el.addEventListener("dragstart", (e) => {
        startY = e.clientY;
        const styleTop = parseInt(window.getComputedStyle(el).top || "0", 10);
        startTop = isNaN(styleTop) ? 0 : styleTop;
        el.style.opacity = "0.7";
      });

      el.addEventListener("dragend", (e) => {
        el.style.opacity = "1";
        const deltaY = e.clientY - startY;
        const newTop = startTop + deltaY;
        el.style.top = `${newTop}px`;
        el.setAttribute("data-custom-top", `${newTop}px`);
      });

      // Right-click or Alt+Click to instantly remove an element visually
      el.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        if (confirm("¿Quieres eliminar este elemento de la pantalla?")) {
          el.style.display = "none";
        }
      });
    });
  }, []);

  return null;
}
