"use client";

import { useEffect, useState } from "react";

export function VisualLayoutEditor() {
  const [selectedEl, setSelectedEl] = useState<HTMLElement | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    // Restore saved edits, sizes, and positions from localStorage if available
    const savedContent = localStorage.getItem("desorden_visual_edits");
    if (savedContent) {
      try {
        const edits = JSON.parse(savedContent);
        Object.entries(edits).forEach(([selector, data]: [string, any]) => {
          const el = document.querySelector<HTMLElement>(selector);
          if (el) {
            if (data.text !== undefined) el.textContent = data.text;
            if (data.fontSize) el.style.fontSize = data.fontSize;
            if (data.top) el.style.top = data.top;
            if (data.left) el.style.left = data.left;
          }
        });
      } catch (e) {
        console.error(e);
      }
    }

    // Enable 2D position dragging, size scaling & click selection
    const elements = document.querySelectorAll<HTMLElement>(
      ".intro-heading > *, .hero-picture, .intro-layout > *, .hero-services li, .cta-button-gold"
    );

    elements.forEach((el) => {
      el.style.position = "relative";
      el.setAttribute("draggable", "true");

      let startX = 0;
      let startY = 0;
      let startLeft = 0;
      let startTop = 0;

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelectedEl(el);
      });

      el.addEventListener("dragstart", (e) => {
        startX = e.clientX;
        startY = e.clientY;
        const styleLeft = parseInt(window.getComputedStyle(el).left || "0", 10);
        const styleTop = parseInt(window.getComputedStyle(el).top || "0", 10);
        startLeft = isNaN(styleLeft) ? 0 : styleLeft;
        startTop = isNaN(styleTop) ? 0 : styleTop;
        el.style.opacity = "0.7";
      });

      el.addEventListener("dragend", (e) => {
        el.style.opacity = "1";
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        const newLeft = startLeft + deltaX;
        const newTop = startTop + deltaY;
        el.style.left = `${newLeft}px`;
        el.style.top = `${newTop}px`;
      });

      // Right-click to instantly remove an element visually
      el.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        if (confirm("¿Quieres eliminar este elemento de la pantalla?")) {
          el.style.display = "none";
          setSelectedEl(null);
        }
      });
    });

    const handleDeselect = () => setSelectedEl(null);
    window.addEventListener("click", handleDeselect);
    return () => window.removeEventListener("click", handleDeselect);
  }, []);

  const changeFontSize = (delta: number) => {
    if (!selectedEl) return;
    const currentSize = parseFloat(window.getComputedStyle(selectedEl).fontSize) || 16;
    const newSize = Math.max(8, currentSize + delta);
    selectedEl.style.fontSize = `${newSize}px`;
  };

  const handleSave = () => {
    const editSelectors = [
      ".micro-label",
      ".outline-word",
      ".display-name",
      ".hero-subtitle",
      ".hero-services li:nth-child(1)",
      ".hero-services li:nth-child(2)",
      ".hero-services li:nth-child(3)",
      ".cta-button-gold",
    ];

    const edits: Record<string, any> = {};
    editSelectors.forEach((sel) => {
      const el = document.querySelector<HTMLElement>(sel);
      if (el) {
        edits[sel] = {
          text: el.textContent,
          fontSize: el.style.fontSize,
          top: el.style.top,
          left: el.style.left,
        };
      }
    });

    localStorage.setItem("desorden_visual_edits", JSON.stringify(edits));
    setStatusMessage("¡Posiciones, tamaños y textos guardados! Notifícame por chat para commit.");
    setTimeout(() => setStatusMessage(""), 4000);
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "8px",
      }}
    >
      {/* Selection Control Panel for Font Size & Position */}
      {selectedEl && (
        <div
          style={{
            background: "#121212",
            border: "1px solid #E3A008",
            borderRadius: "6px",
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.8)",
            color: "#fff",
            fontSize: "12px",
          }}
        >
          <span style={{ color: "#E3A008", fontWeight: "bold" }}>Tamaño Texto:</span>
          <button
            type="button"
            onClick={() => changeFontSize(-2)}
            style={{
              background: "#262626",
              color: "#fff",
              border: "1px solid #444",
              borderRadius: "4px",
              padding: "4px 8px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            A-
          </button>
          <button
            type="button"
            onClick={() => changeFontSize(2)}
            style={{
              background: "#262626",
              color: "#fff",
              border: "1px solid #444",
              borderRadius: "4px",
              padding: "4px 8px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            A+
          </button>
        </div>
      )}

      {statusMessage && (
        <div
          style={{
            background: "#121212",
            color: "#E3A008",
            padding: "8px 16px",
            borderRadius: "4px",
            border: "1px solid #E3A008",
            fontSize: "12px",
            fontWeight: "bold",
          }}
        >
          {statusMessage}
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        style={{
          background: "#E3A008",
          color: "#0a0a0a",
          fontFamily: "Anton, sans-serif",
          fontSize: "14px",
          letterSpacing: "0.05em",
          padding: "10px 20px",
          borderRadius: "4px",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(227, 160, 8, 0.4)",
          fontWeight: "bold",
        }}
      >
        💾 GUARDAR CAMBIOS
      </button>
    </div>
  );
}
