"use client";

import type { CSSProperties, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  EDITOR_DOCUMENT_ID,
  EDITOR_STORAGE_KEY,
  applyEditorDocument,
  cloneEditorDocument,
  findCanvasElement,
  parseEditorDocument,
  parseStoredEditorDocument,
  type CanvasElementEdit,
  type EditableStyleProperty,
  type EditorDocument,
} from "../lib/editor-model";

type EditorMode = "edit" | "preview";
type EditorTab = "content" | "style" | "position" | "restore";
type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "offline" | "conflict" | "error";

interface SelectionDefaults {
  selector: string;
  label: string;
  tagName: string;
  text: string;
  styles: Partial<Record<EditableStyleProperty, string>>;
}

interface EditorWindow extends Window {
  isTouchEditingActive?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readLocalDraft(): EditorDocument {
  if (typeof window === "undefined") return {};
  return parseEditorDocument(window.localStorage.getItem(EDITOR_STORAGE_KEY));
}

function documentHasEdits(value: EditorDocument): boolean {
  return Object.keys(value).length > 0;
}

function safeVibrate(pattern: number | number[]): void {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(pattern);
  }
}

function numberFromStyle(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function makeSelectionDefaults(element: HTMLElement, selector: string): SelectionDefaults {
  const computed = window.getComputedStyle(element);
  const classLabel = typeof element.className === "string" ? element.className.split(/\s+/)[0] : "";

  return {
    selector,
    label: classLabel ? `.${classLabel}` : element.tagName.toLowerCase(),
    tagName: element.tagName,
    text: element.textContent ?? "",
    styles: {
      "background-color": computed.backgroundColor,
      "border-radius": computed.borderRadius,
      color: computed.color,
      "font-family": computed.fontFamily,
      "font-size": computed.fontSize,
      "font-weight": computed.fontWeight,
      height: computed.height,
      left: computed.left,
      opacity: computed.opacity,
      position: computed.position,
      top: computed.top,
      width: computed.width,
      "z-index": computed.zIndex === "auto" ? "0" : computed.zIndex,
    },
  };
}

function statusLabel(status: SaveStatus): string {
  const labels: Record<SaveStatus, string> = {
    idle: "Sin cambios",
    dirty: "Cambios pendientes",
    saving: "Guardando…",
    saved: "Guardado remoto",
    offline: "Copia local pendiente",
    conflict: "Conflicto de versión",
    error: "Error de guardado",
  };
  return labels[status];
}

export function VisualLayoutEditor() {
  const [mode, setMode] = useState<EditorMode>("edit");
  const [activeTab, setActiveTab] = useState<EditorTab>("content");
  const [panelOpen, setPanelOpen] = useState(true);
  const [editMap, setEditMap] = useState<EditorDocument>({});
  const [selectedSelector, setSelectedSelector] = useState<string | null>(null);
  const [selectionDefaults, setSelectionDefaults] = useState<SelectionDefaults | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [version, setVersion] = useState(0);
  const [message, setMessage] = useState("");
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [history, setHistory] = useState<EditorDocument[]>([{}]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const selectedEdit = selectedSelector ? editMap[selectedSelector] : undefined;
  const restorableItems = useMemo(
    () => Object.values(editMap).filter((edit) => edit.hidden || Boolean(edit.deletedAt)),
    [editMap],
  );
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const installDocument = useCallback(
    (documentValue: EditorDocument, nextVersion: number, nextStatus: SaveStatus) => {
      const cloned = cloneEditorDocument(documentValue);
      setEditMap(cloned);
      setVersion(nextVersion);
      setSaveStatus(nextStatus);
      setHistory([cloneEditorDocument(cloned)]);
      setHistoryIndex(0);
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    void (async () => {
      const localDraft = readLocalDraft();
      let remoteVersion = 0;
      let remoteDraft: EditorDocument = {};

      try {
        const response = await fetch("/api/draft", {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });

        if (response.ok) {
          const payload: unknown = await response.json();
          if (isRecord(payload)) {
            const stored = parseStoredEditorDocument(payload.draft);
            if (stored) {
              remoteVersion = stored.version;
              remoteDraft = stored.data;
            }
          }
        }
      } catch (error: unknown) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Unable to load remote editor draft", error);
        }
      }

      await Promise.resolve();
      if (!active) return;

      if (documentHasEdits(localDraft)) {
        installDocument(localDraft, remoteVersion, "dirty");
      } else {
        installDocument(remoteDraft, remoteVersion, remoteVersion > 0 ? "saved" : "idle");
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [installDocument]);

  useEffect(() => {
    applyEditorDocument(editMap, mode === "edit");

    if (selectedSelector && mode === "edit") {
      findCanvasElement(selectedSelector)?.setAttribute("data-editor-selected", "true");
    }
  }, [editMap, mode, selectedSelector]);

  useEffect(() => {
    document.body.classList.toggle("canvas-editor-active", mode === "edit");
    const editorWindow = window as EditorWindow;
    editorWindow.isTouchEditingActive = mode === "edit";

    return () => {
      document.body.classList.remove("canvas-editor-active");
      editorWindow.isTouchEditingActive = false;
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== "edit") return;

    const handleSelection = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || target.closest("[data-editor-ui]")) return;

      const element = target.closest<HTMLElement>("[data-canvas-selector]");
      const selector = element?.dataset.canvasSelector;
      if (!element || !selector) return;

      event.preventDefault();
      event.stopPropagation();
      setSelectedSelector(selector);
      setSelectionDefaults(makeSelectionDefaults(element, selector));
      setPanelOpen(true);
    };

    document.addEventListener("click", handleSelection, true);
    return () => document.removeEventListener("click", handleSelection, true);
  }, [mode]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const handleViewportChange = () => {
      const offset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setKeyboardOffset(offset > 80 ? offset : 0);
    };

    viewport.addEventListener("resize", handleViewportChange);
    viewport.addEventListener("scroll", handleViewportChange);
    return () => {
      viewport.removeEventListener("resize", handleViewportChange);
      viewport.removeEventListener("scroll", handleViewportChange);
    };
  }, []);

  useEffect(() => {
    if (saveStatus === "saved" || saveStatus === "idle") {
      window.localStorage.removeItem(EDITOR_STORAGE_KEY);
      return;
    }

    const timer = window.setTimeout(() => {
      window.localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(editMap));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [editMap, saveStatus]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!["dirty", "offline", "conflict", "error"].includes(saveStatus)) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveStatus]);

  const commitDocument = useCallback(
    (nextDocument: EditorDocument) => {
      const cloned = cloneEditorDocument(nextDocument);
      const nextHistory = history.slice(0, historyIndex + 1);
      nextHistory.push(cloneEditorDocument(cloned));
      if (nextHistory.length > 30) nextHistory.shift();

      setEditMap(cloned);
      setHistory(nextHistory);
      setHistoryIndex(nextHistory.length - 1);
      setSaveStatus("dirty");
    },
    [history, historyIndex],
  );

  const updateSelected = useCallback(
    (patch: Partial<CanvasElementEdit>) => {
      if (!selectedSelector) return;

      const current = editMap[selectedSelector] ?? { selector: selectedSelector };
      const nextEdit: CanvasElementEdit = {
        ...current,
        ...patch,
        selector: selectedSelector,
      };

      commitDocument({ ...editMap, [selectedSelector]: nextEdit });
    },
    [commitDocument, editMap, selectedSelector],
  );

  const updateSelectedStyle = useCallback(
    (property: EditableStyleProperty, value: string) => {
      if (!selectedSelector) return;
      const current = editMap[selectedSelector] ?? { selector: selectedSelector };
      const styles = { ...current.styles };

      if (value.trim()) styles[property] = value.trim();
      else delete styles[property];

      updateSelected({ styles });
    },
    [editMap, selectedSelector, updateSelected],
  );

  const undo = () => {
    if (!canUndo) return;
    const nextIndex = historyIndex - 1;
    setHistoryIndex(nextIndex);
    setEditMap(cloneEditorDocument(history[nextIndex]));
    setSaveStatus("dirty");
  };

  const redo = () => {
    if (!canRedo) return;
    const nextIndex = historyIndex + 1;
    setHistoryIndex(nextIndex);
    setEditMap(cloneEditorDocument(history[nextIndex]));
    setSaveStatus("dirty");
  };

  const hideSelected = () => {
    updateSelected({ hidden: true, deletedAt: null });
    safeVibrate([15, 25]);
  };

  const deleteSelected = () => {
    if (!selectedSelector || !window.confirm("¿Eliminar este objeto? Podrás restaurarlo antes de publicar.")) return;
    updateSelected({ hidden: false, deletedAt: Date.now() });
    setSelectedSelector(null);
    setSelectionDefaults(null);
    safeVibrate([30, 30, 30]);
  };

  const restoreItem = (selector: string) => {
    const current = editMap[selector];
    if (!current) return;
    commitDocument({
      ...editMap,
      [selector]: { ...current, hidden: false, deletedAt: null },
    });
    safeVibrate([15, 25]);
  };

  const saveDraft = async () => {
    setSaveStatus("saving");
    setMessage("Guardando borrador…");

    try {
      const response = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: EDITOR_DOCUMENT_ID,
          version,
          editMap,
        }),
      });

      const payload: unknown = await response.json();
      if (response.status === 409) {
        setSaveStatus("conflict");
        setMessage("Conflicto: existe una versión remota más reciente.");
        safeVibrate([100, 50, 100]);
        return;
      }

      if (!response.ok || !isRecord(payload) || payload.saved !== true || typeof payload.version !== "number") {
        throw new Error("Draft save was not confirmed");
      }

      setVersion(payload.version);
      setSaveStatus("saved");
      setMessage("Borrador guardado.");
      safeVibrate([10, 40, 10]);
    } catch (error: unknown) {
      console.error("Unable to save editor draft", error);
      window.localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(editMap));
      setSaveStatus(navigator.onLine ? "error" : "offline");
      setMessage(navigator.onLine ? "No se pudo guardar en el servidor." : "Copia local pendiente de sincronizar.");
      safeVibrate([60, 40, 60]);
    }
  };

  const publish = async () => {
    if (saveStatus !== "saved") {
      setMessage("Guarda el borrador antes de publicar.");
      return;
    }

    if (!window.confirm("¿Publicar esta versión en la web pública?")) return;
    setMessage("Publicando…");

    try {
      const response = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: EDITOR_DOCUMENT_ID, version }),
      });
      const payload: unknown = await response.json();

      if (!response.ok || !isRecord(payload) || payload.published !== true) {
        throw new Error("Publication was not confirmed");
      }

      setMessage("Versión publicada correctamente.");
      safeVibrate([20, 40, 20]);
    } catch (error: unknown) {
      console.error("Unable to publish editor document", error);
      setMessage("No se pudo publicar.");
      safeVibrate([100, 50, 100]);
    }
  };

  const exitEditor = () => {
    if (["dirty", "offline", "conflict", "error"].includes(saveStatus)) {
      const shouldExit = window.confirm("Hay cambios que no están guardados en el servidor. ¿Salir igualmente?");
      if (!shouldExit) return;
    }
    window.location.assign("/");
  };

  const handleTextSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const text = formData.get("content");
    if (typeof text === "string") updateSelected({ text });
  };

  const portalTarget = typeof document === "undefined" ? null : document.body;
  if (!portalTarget) return null;

  const effectiveText = selectedEdit?.text ?? selectionDefaults?.text ?? "";
  const effectiveStyles = selectedEdit?.styles ?? {};
  const defaultStyles = selectionDefaults?.styles ?? {};
  const getStyleValue = (property: EditableStyleProperty) => effectiveStyles[property] ?? defaultStyles[property] ?? "";
  const publishDisabled = saveStatus !== "saved";

  return createPortal(
    <>
      <div className="mobile-only-message" data-editor-ui>
        <strong>EDITOR DISPONIBLE SOLO EN MÓVIL</strong>
        <span>Abre esta dirección desde un teléfono en posición vertical.</span>
      </div>
      <div className="orientation-warning" data-editor-ui>
        <strong>GIRA EL TELÉFONO</strong>
        <span>El editor está optimizado para posición vertical.</span>
      </div>

      {mode === "preview" ? (
        <button
          type="button"
          data-editor-ui
          className="editor-preview-return"
          onClick={() => setMode("edit")}
        >
          VOLVER A EDITAR
        </button>
      ) : (
        <div data-editor-ui className="mobile-editor-shell" style={{ "--keyboard-offset": `${keyboardOffset}px` } as CSSProperties}>
          <header className="mobile-editor-header">
            <button type="button" onClick={exitEditor}>SALIR</button>
            <strong>EDITOR MÓVIL</strong>
            <button type="button" onClick={() => setPanelOpen((open) => !open)} aria-expanded={panelOpen}>AJUSTES</button>
          </header>

          <div className={`editor-status editor-status--${saveStatus}`} role="status" aria-live="polite">
            {message || statusLabel(saveStatus)}
          </div>

          {panelOpen && (
            <section className="editor-sheet" aria-label="Panel de edición">
              <nav className="editor-tabs" aria-label="Herramientas">
                {(["content", "style", "position", "restore"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={activeTab === tab ? "is-active" : ""}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab === "content" ? "CONTENIDO" : tab === "style" ? "ESTILO" : tab === "position" ? "POSICIÓN" : "RESTAURAR"}
                  </button>
                ))}
              </nav>

              {activeTab !== "restore" && !selectedSelector && (
                <p className="editor-empty">Toca un texto, imagen, botón o bloque para seleccionarlo.</p>
              )}

              {selectedSelector && activeTab === "content" && (
                <form className="editor-form" onSubmit={handleTextSubmit}>
                  <label>
                    OBJETO
                    <input value={selectionDefaults?.label ?? selectedSelector} readOnly />
                  </label>
                  {selectionDefaults?.tagName !== "PICTURE" && (
                    <label>
                      TEXTO
                      <textarea name="content" key={`${selectedSelector}:${effectiveText}`} defaultValue={effectiveText} rows={4} />
                    </label>
                  )}
                  <button type="submit" className="editor-primary">APLICAR TEXTO</button>
                  <div className="editor-danger-row">
                    <button type="button" onClick={hideSelected}>OCULTAR</button>
                    <button type="button" onClick={deleteSelected}>ELIMINAR</button>
                  </div>
                </form>
              )}

              {selectedSelector && activeTab === "style" && (
                <div className="editor-form">
                  <label>
                    TAMAÑO DE TEXTO
                    <input
                      type="text"
                      value={getStyleValue("font-size")}
                      onChange={(event) => updateSelectedStyle("font-size", event.target.value)}
                      placeholder="16px"
                    />
                  </label>
                  <label>
                    COLOR
                    <input
                      type="text"
                      value={getStyleValue("color")}
                      onChange={(event) => updateSelectedStyle("color", event.target.value)}
                      placeholder="#ffffff"
                    />
                  </label>
                  <label>
                    FONDO
                    <input
                      type="text"
                      value={getStyleValue("background-color")}
                      onChange={(event) => updateSelectedStyle("background-color", event.target.value)}
                      placeholder="transparent"
                    />
                  </label>
                  <label>
                    OPACIDAD
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={numberFromStyle(getStyleValue("opacity"), 1)}
                      onChange={(event) => updateSelectedStyle("opacity", event.target.value)}
                    />
                  </label>
                  <label>
                    RADIO
                    <input
                      type="text"
                      value={getStyleValue("border-radius")}
                      onChange={(event) => updateSelectedStyle("border-radius", event.target.value)}
                      placeholder="0px"
                    />
                  </label>
                </div>
              )}

              {selectedSelector && activeTab === "position" && (
                <div className="editor-form editor-form--grid">
                  {(["left", "top", "width", "height", "z-index"] as const).map((property) => (
                    <label key={property}>
                      {property.toUpperCase()}
                      <input
                        type="text"
                        value={getStyleValue(property)}
                        onChange={(event) => updateSelectedStyle(property, event.target.value)}
                        placeholder={property === "z-index" ? "0" : "auto"}
                      />
                    </label>
                  ))}
                  <label>
                    POSICIÓN
                    <select
                      value={getStyleValue("position") || "relative"}
                      onChange={(event) => updateSelectedStyle("position", event.target.value)}
                    >
                      <option value="relative">Relativa</option>
                      <option value="absolute">Absoluta</option>
                      <option value="fixed">Fija</option>
                    </select>
                  </label>
                </div>
              )}

              {activeTab === "restore" && (
                <div className="editor-restore-list">
                  {restorableItems.length === 0 ? (
                    <p className="editor-empty">No hay objetos ocultos o eliminados.</p>
                  ) : (
                    restorableItems.map((edit) => (
                      <div key={edit.selector}>
                        <span>{edit.selector} · {edit.deletedAt ? "eliminado" : "oculto"}</span>
                        <button type="button" onClick={() => restoreItem(edit.selector)}>RESTAURAR</button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>
          )}

          <footer className="editor-toolbar">
            <button type="button" onClick={undo} disabled={!canUndo} aria-label="Deshacer">↶</button>
            <button type="button" onClick={redo} disabled={!canRedo} aria-label="Rehacer">↷</button>
            <button type="button" onClick={() => setMode("preview")}>VISTA</button>
            <button type="button" onClick={saveDraft} disabled={saveStatus === "saving"}>GUARDAR</button>
            <button type="button" className="editor-publish" onClick={publish} disabled={publishDisabled}>PUBLICAR</button>
          </footer>
        </div>
      )}
    </>,
    portalTarget,
  );
}
