"use client";

import { useEffect, useState } from "react";

export function VisualLayoutEditor() {
  const [selectedEl, setSelectedEl] = useState<HTMLElement | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [fontSize, setFontSize] = useState<number>(16);
  const [fontFamily, setFontFamily] = useState<string>("inherit");
  const [textColor, setTextColor] = useState<string>("#f5f5f5");
  const [bgOpacity, setBgOpacity] = useState<number>(0.38);
  const [bgPosTop, setBgPosTop] = useState<number>(20);
  const [statusMessage, setStatusMessage] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(true);

  useEffect(() => {
    // Restore saved edits, sizes, colors and positions from localStorage if available
    const savedContent = localStorage.getItem("desorden_studio_edits");
    if (savedContent) {
      try {
        const edits = JSON.parse(savedContent);
        Object.entries(edits).forEach(([selector, data]: [string, any]) => {
          const el = document.querySelector<HTMLElement>(selector);
          if (el) {
            if (data.text !== undefined && el.tagName !== "IMG") el.textContent = data.text;
            if (data.fontSize) el.style.fontSize = data.fontSize;
            if (data.fontFamily) el.style.fontFamily = data.fontFamily;
            if (data.color) el.style.color = data.color;
            if (data.top) el.style.top = data.top;
            if (data.left) el.style.left = data.left;
            if (data.display) el.style.display = data.display;
            if (data.opacity && el.classList.contains("hero-picture")) el.style.opacity = data.opacity;
          }
        });
      } catch (e) {
        console.error(e);
      }
    }

    // Enable 2D position dragging & selection on all blocks
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
        setSelectedTag(el.className || el.tagName);

        const comp = window.getComputedStyle(el);
        setFontSize(parseFloat(comp.fontSize) || 16);
        setFontFamily(comp.fontFamily || "inherit");
        setTextColor(comp.color || "#f5f5f5");

        if (el.classList.contains("hero-picture")) {
          setBgOpacity(parseFloat(comp.opacity) || 0.38);
        }
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
    });

    const handleDeselect = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("#visual-editor-toolbar")) {
        setSelectedEl(null);
      }
    };

    window.addEventListener("click", handleDeselect);
    return () => window.removeEventListener("click", handleDeselect);
  }, []);

  // Control Handlers
  const handleFontSizeChange = (newSize: number) => {
    setFontSize(newSize);
    if (selectedEl) {
      selectedEl.style.fontSize = `${newSize}px`;
    }
  };

  const handleFontFamilyChange = (font: string) => {
    setFontFamily(font);
    if (selectedEl) {
      selectedEl.style.fontFamily = font;
    }
  };

  const handleTextColorChange = (color: string) => {
    setTextColor(color);
    if (selectedEl) {
      selectedEl.style.color = color;
    }
  };

  const handleMove = (dx: number, dy: number) => {
    if (!selectedEl) return;
    const currentLeft = parseInt(selectedEl.style.left || "0", 10);
    const currentTop = parseInt(selectedEl.style.top || "0", 10);
    selectedEl.style.left = `${currentLeft + dx}px`;
    selectedEl.style.top = `${currentTop + dy}px`;
  };

  const handleBgOpacityChange = (opacity: number) => {
    setBgOpacity(opacity);
    const pic = document.querySelector<HTMLElement>(".hero-picture");
    if (pic) pic.style.opacity = `${opacity}`;
  };

  const handleBgPosChange = (posPercent: number) => {
    setBgPosTop(posPercent);
    const img = document.querySelector<HTMLElement>(".hero-picture img");
    if (img) img.style.objectPosition = `center ${posPercent}%`;
  };

  const handleDeleteSelected = () => {
    if (selectedEl && confirm("¿Eliminar este elemento de la pantalla?")) {
      selectedEl.style.display = "none";
      setSelectedEl(null);
    }
  };

  const handleSaveAll = () => {
    const editSelectors = [
      ".micro-label",
      ".outline-word",
      ".display-name",
      ".hero-subtitle",
      ".hero-services li:nth-child(1)",
      ".hero-services li:nth-child(2)",
      ".hero-services li:nth-child(3)",
      ".cta-button-gold",
      ".hero-picture",
    ];

    const edits: Record<string, any> = {};
    editSelectors.forEach((sel) => {
      const el = document.querySelector<HTMLElement>(sel);
      if (el) {
        edits[sel] = {
          text: el.textContent,
          fontSize: el.style.fontSize,
          fontFamily: el.style.fontFamily,
          color: el.style.color,
          top: el.style.top,
          left: el.style.left,
          display: el.style.display,
          opacity: el.style.opacity,
        };
      }
    });

    localStorage.setItem("desorden_studio_edits", JSON.stringify(edits));
    setStatusMessage("¡Edición completa guardada! Avísame por chat para sincronizar con GitHub.");
    setTimeout(() => setStatusMessage(""), 4000);
  };

  return (
    <div
      id="visual-editor-toolbar"
      style={{
        position: "fixed",
        bottom: "16px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 99999,
        width: "92%",
        maxWidth: "430px",
        background: "rgba(18, 18, 18, 0.95)",
        backdropFilter: "blur(16px)",
        border: "1px solid #E3A008",
        borderRadius: "12px",
        padding: "12px 14px",
        color: "#f5f5f5",
        boxShadow: "0 10px 32px rgba(0,0,0,0.85)",
        fontFamily: "'Inter', sans-serif",
        fontSize: "12px",
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: isMenuOpen ? "10px" : "0",
          borderBottom: isMenuOpen ? "1px solid rgba(227,160,8,0.2)" : "none",
          paddingBottom: isMenuOpen ? "8px" : "0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "#E3A008", fontWeight: "bold" }}>🛠️ ESTUDIO DESORDEN</span>
          {selectedTag && (
            <span style={{ background: "#E3A008", color: "#0a0a0a", fontSize: "10px", padding: "2px 6px", borderRadius: "3px", fontWeight: "bold" }}>
              {selectedTag.split(" ")[0]}
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{ background: "none", border: "none", color: "#a3a3a3", cursor: "pointer" }}
          >
            {isMenuOpen ? "▼" : "▲"}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Active Element Controls */}
          {selectedEl ? (
            <>
              {/* Typography & Size */}
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <label style={{ color: "#a3a3a3" }}>Tipografía:</label>
                <select
                  value={fontFamily}
                  onChange={(e) => handleFontFamilyChange(e.target.value)}
                  style={{
                    background: "#262626",
                    color: "#fff",
                    border: "1px solid #444",
                    borderRadius: "4px",
                    padding: "4px",
                    fontSize: "11px",
                  }}
                >
                  <option value="Anton, sans-serif">Anton (Impacto Titulares)</option>
                  <option value="'Space Grotesk', sans-serif">Space Grotesk</option>
                  <option value="'Unbounded', sans-serif">Unbounded</option>
                  <option value="'Inter', sans-serif">Inter (Limpio Lectura)</option>
                  <option value="system-ui, sans-serif">Sistema</option>
                </select>

                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginLeft: "auto" }}>
                  <label style={{ color: "#a3a3a3" }}>Tamaño:</label>
                  <button type="button" onClick={() => handleFontSizeChange(Math.max(8, fontSize - 2))} style={btnStyle}>-</button>
                  <span style={{ width: "24px", textAlign: "center", fontWeight: "bold" }}>{Math.round(fontSize)}</span>
                  <button type="button" onClick={() => handleFontSizeChange(fontSize + 2)} style={btnStyle}>+</button>
                </div>
              </div>

              {/* Text Color & Positioning */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <label style={{ color: "#a3a3a3" }}>Color:</label>
                  {["#E3A008", "#F5F5F5", "#A3A3A3", "#0A0A0A", "#FF4444"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleTextColorChange(c)}
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        background: c,
                        border: textColor === c ? "2px solid #fff" : "1px solid #444",
                        cursor: "pointer",
                      }}
                    />
                  ))}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <label style={{ color: "#a3a3a3" }}>Posición:</label>
                  <button type="button" onClick={() => handleMove(0, -5)} style={btnStyle}>⬆️</button>
                  <button type="button" onClick={() => handleMove(0, 5)} style={btnStyle}>⬇️</button>
                  <button type="button" onClick={() => handleMove(-5, 0)} style={btnStyle}>⬅️</button>
                  <button type="button" onClick={() => handleMove(5, 0)} style={btnStyle}>➡️</button>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  style={{ background: "#3a1212", color: "#ff6666", border: "1px solid #ff4444", padding: "4px 8px", borderRadius: "4px", cursor: "pointer" }}
                >
                  🗑️ Eliminar Elemento
                </button>
              </div>
            </>
          ) : (
            <div style={{ color: "#a3a3a3", fontStyle: "italic", textAlign: "center", padding: "4px 0" }}>
              💡 Haz clic en cualquier texto, viñeta o botón para modificar su tipografía, tamaño o posición.
            </div>
          )}

          {/* Background Image Controls */}
          <div style={{ borderTop: "1px dashed rgba(245,245,245,0.15)", paddingTop: "8px", marginTop: "2px" }}>
            <div style={{ fontWeight: "bold", color: "#E3A008", marginBottom: "6px" }}>🖼️ Imagen B/N de Fondo:</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div>
                <label style={{ color: "#a3a3a3", display: "block", marginBottom: "2px" }}>Opacidad ({Math.round(bgOpacity * 100)}%):</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={bgOpacity}
                  onChange={(e) => handleBgOpacityChange(parseFloat(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={{ color: "#a3a3a3", display: "block", marginBottom: "2px" }}>Encuadre Vertical ({bgPosTop}%):</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={bgPosTop}
                  onChange={(e) => handleBgPosChange(parseInt(e.target.value, 10))}
                  style={{ width: "100%" }}
                />
              </div>
            </div>
          </div>

          {/* Footer Save Actions */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
            <span style={{ color: "#E3A008", fontSize: "11px", fontWeight: "bold" }}>{statusMessage}</span>
            <button
              type="button"
              onClick={handleSaveAll}
              style={{
                background: "#E3A008",
                color: "#0a0a0a",
                fontFamily: "Anton, sans-serif",
                fontSize: "13px",
                padding: "8px 16px",
                borderRadius: "4px",
                border: "none",
                cursor: "pointer",
                fontWeight: "bold",
                boxShadow: "0 4px 14px rgba(227,160,8,0.4)",
              }}
            >
              💾 GUARDAR TODO
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: "#262626",
  color: "#fff",
  border: "1px solid #444",
  borderRadius: "4px",
  padding: "3px 7px",
  cursor: "pointer",
  fontSize: "11px",
  fontWeight: "bold",
};
