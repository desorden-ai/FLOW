"use client";

import { useEffect, useState } from "react";

export function VisualLayoutEditor() {
  const [hasChanges, setHasChanges] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    // Restore saved edits from localStorage if available
    const savedContent = localStorage.getItem("desorden_visual_edits");
    if (savedContent) {
      try {
        const edits = JSON.parse(savedContent);
        if (edits.microLabel) {
          const el = document.querySelector(".micro-label");
          if (el) el.textContent = edits.microLabel;
        }
        if (edits.outlineWord) {
          const el = document.querySelector(".outline-word");
          if (el) el.textContent = edits.outlineWord;
        }
        if (edits.displayName) {
          const el = document.querySelector(".display-name");
          if (el) el.textContent = edits.displayName;
        }
        if (edits.subtitle) {
          const el = document.querySelector(".hero-subtitle");
          if (el) el.textContent = edits.subtitle;
        }
      } catch (e) {
        console.error(e);
      }
    }

    // Enable interactive drag, repositioning & element deletion for visual blocks
    const elements = document.querySelectorAll<HTMLElement>(
      ".intro-heading > *, .hero-picture, .intro-layout > *, .hero-services li"
    );

    elements.forEach((el) => {
      el.style.position = "relative";
      el.setAttribute("draggable", "true");

      let startY = 0;
      let startTop = 0;

      el.addEventListener("input", () => {
        setHasChanges(true);
      });

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
        setHasChanges(true);
      });

      // Right-click to instantly remove an element visually
      el.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        if (confirm("¿Quieres eliminar este elemento de la pantalla?")) {
          el.style.display = "none";
          setHasChanges(true);
        }
      });
    });
  }, []);

  const handleSave = () => {
    const edits = {
      microLabel: document.querySelector(".micro-label")?.textContent || "",
      outlineWord: document.querySelector(".outline-word")?.textContent || "",
      displayName: document.querySelector(".display-name")?.textContent || "",
      subtitle: document.querySelector(".hero-subtitle")?.textContent || "",
    };

    localStorage.setItem("desorden_visual_edits", JSON.stringify(edits));
    setStatusMessage("¡Cambios guardados en tu navegador! Escribe en el chat para sincronizar con GitHub.");
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
