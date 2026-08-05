"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
export interface CanvasElementEdit {
  isPrefab?: boolean;
  prefabTag?: string;
  prefabClass?: string;
  selector: string;
  text?: string;
  src?: string;
  fontSize?: string;
  fontFamily?: string;
  fontWeight?: string;
  color?: string;
  backgroundColor?: string;
  top?: string;
  left?: string;
  width?: string;
  height?: string;
  padding?: string;
  margin?: string;
  display?: string;
  opacity?: string;
  zIndex?: string;
  parallaxSpeed?: string;
  translate?: string;
  transform?: string;
  position?: string;
  lineHeight?: string;
  letterSpacing?: string;
  textAlign?: string;
  borderRadius?: string;
  boxShadow?: string;
  hidden?: boolean;
  deletedAt?: number;
}

export function VisualLayoutEditor() {
  const [mounted, setMounted] = useState<boolean>(false);
  const [keyboardOffset, setKeyboardOffset] = useState<number>(0);

  useEffect(() => { 
    setMounted(true); 
    
    // Virtual Keyboard / visualViewport observer
    const handleResize = () => {
      if (window.visualViewport) {
        const offset = window.innerHeight - window.visualViewport.height;
        setKeyboardOffset(offset > 50 ? offset : 0);
      }
    };
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
      return () => {
        window.visualViewport?.removeEventListener('resize', handleResize);
        window.visualViewport?.removeEventListener('scroll', handleResize);
      };
    }
  }, []);

  type EditorMode = "read" | "edit" | "preview" | "publish";
  type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error" | "offline";
  type EditorState = {
    mode: EditorMode;
    selectedBlockId: string | null;
    isInlineEditing: boolean;
    isDragging: boolean;
    isKeyboardOpen: boolean;
    hasUnsavedChanges: boolean;
    saveStatus: SaveStatus;
    version: number;
  };

  const [editorState, setEditorState] = useState<EditorState>({
    mode: "edit",
    selectedBlockId: null,
    isInlineEditing: false,
    isDragging: false,
    isKeyboardOpen: false,
    hasUnsavedChanges: false,
    saveStatus: "idle",
    version: 0
  });

  const editorMode = editorState.mode === "edit"; 
  const hasChanges = editorState.hasUnsavedChanges;
  const saveStatus = editorState.saveStatus;
  
  const setEditorMode = (mode: boolean) => setEditorState(s => ({ ...s, mode: mode ? "edit" : "preview" }));
  const setHasChanges = (hasUnsavedChanges: boolean) => setEditorState(s => ({ ...s, hasUnsavedChanges, saveStatus: hasUnsavedChanges ? "dirty" : s.saveStatus }));
  const setSaveStatus = (st: SaveStatus) => setEditorState(s => ({ ...s, saveStatus: st }));

  const vibrate = (pattern: number | number[]) => {
    if (typeof window !== "undefined" && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  // Selected element metadata
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [selectedSelector, setSelectedSelector] = useState<string | null>(null);
  
  const selectedEl = selectedSelector ? document.querySelector<HTMLElement>(selectedSelector) : null;

  // Tabs for mobile bottom sheet
  const [activeTab, setActiveTab] = useState<'position' | 'typography' | 'style' | '3d' | 'library' | 'export' | 'restore'>('position');
  const [sheetState, setSheetState] = useState<0 | 1 | 2>(2); // 0=Hidden, 1=Quick, 2=Full
  const isDrawerOpen = sheetState === 2;
  const setIsDrawerOpen = (open: boolean) => setSheetState(open ? 2 : 0);
  const drawerStartY = useRef<number>(0);
  const [is3DExploded, setIs3DExploded] = useState<boolean>(false);

  // Position & Layout States
  const [zIndex, setZIndex] = useState<number>(0);
  const [translateZ, setTranslateZ] = useState<number>(0);
  const [parallaxSpeed, setParallaxSpeed] = useState<number>(0);
  const [positionMode, setPositionMode] = useState<string>("relative");
  const [padding, setPadding] = useState<number>(0);
  const [margin, setMargin] = useState<number>(0);
  const [width, setWidth] = useState<string>("auto");
  const [height, setHeight] = useState<string>("auto");
  const [lockAspectRatio, setLockAspectRatio] = useState<boolean>(false);
  const [aspectRatioVal, setAspectRatioVal] = useState<number>(1);

  // Typography States
  const [fontSize, setFontSize] = useState<number>(16);

  // History State (Undo/Redo)
  const historyRef = useRef<Record<string, CanvasElementEdit>[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Apply edits to DOM (extracted for reuse in undo/redo)
  const applyEditsToDOM = useCallback((editMap: Record<string, CanvasElementEdit>, resetMissing: boolean = false) => {
    // First, if resetting, clear all current edited elements not in editMap
    if (resetMissing) {
      document.querySelectorAll<HTMLElement>("[data-edited='true'], [data-prefab='true'], [data-hidden='true'], [data-deleted-at]").forEach(el => {
        const sel = el.getAttribute("data-canvas-selector") || "";
        if (!editMap[sel]) {
          if (el.hasAttribute("data-prefab")) {
            el.remove();
          } else {
            el.removeAttribute("style");
            el.removeAttribute("data-edited");
            el.removeAttribute("data-hidden");
            el.removeAttribute("data-deleted-at");
          }
        }
      });
    }

    Object.entries(editMap).forEach(([selector, data]) => {
      let el = document.querySelector<HTMLElement>(selector);
      if (!el && data.isPrefab) {
        el = document.createElement(data.prefabTag || "div");
        if (data.prefabClass) el.className = data.prefabClass;
        el.setAttribute("data-canvas-selector", selector);
        el.setAttribute("data-prefab", "true");
        el.setAttribute("data-canvas-element", "true");
        document.getElementById("global-canvas-layer")?.appendChild(el);
      }
      if (el) {
        if (data.text !== undefined && el.tagName !== "IMG") el.textContent = data.text;
        if (data.src && el.tagName === "IMG") (el as HTMLImageElement).src = data.src;
        if (data.fontSize) el.style.setProperty("font-size", data.fontSize, "important");
        if (data.fontFamily) el.style.fontFamily = data.fontFamily;
        if (data.fontWeight) el.style.fontWeight = data.fontWeight;
        if (data.color) el.style.color = data.color;
        if (data.backgroundColor) el.style.backgroundColor = data.backgroundColor;
        if (data.top) el.style.top = data.top;
        if (data.left) el.style.left = data.left;
        if (data.width) el.style.width = data.width;
        if (data.height) el.style.height = data.height;
        if (data.padding) el.style.padding = data.padding;
        if (data.margin) el.style.margin = data.margin;
        if (data.zIndex) el.style.zIndex = data.zIndex;
        if (data.parallaxSpeed !== undefined) {
          el.style.setProperty("--parallax-speed", data.parallaxSpeed);
          if (parseFloat(data.parallaxSpeed) !== 0) {
            el.style.translate = `0 calc(var(--progress, 0) * var(--parallax-speed, 0) * 150vh)`;
          } else {
            el.style.translate = "none";
          }
        }
        if (data.transform) el.style.transform = data.transform;
        if (data.position) el.style.position = data.position;
        if (data.opacity) el.style.opacity = data.opacity;
        if (data.lineHeight) el.style.lineHeight = data.lineHeight;
        if (data.letterSpacing) el.style.letterSpacing = data.letterSpacing;
        if (data.textAlign) el.style.textAlign = data.textAlign;
        if (data.borderRadius) el.style.borderRadius = data.borderRadius;
        if (data.boxShadow) el.style.boxShadow = data.boxShadow;
        
        if (data.hidden) {
          el.setAttribute("data-hidden", "true");
        } else {
          el.removeAttribute("data-hidden");
        }
        
        if (data.deletedAt !== undefined) {
          el.setAttribute("data-deleted-at", String(data.deletedAt));
        } else {
          el.removeAttribute("data-deleted-at");
        }

        el.setAttribute("data-edited", "true");
      }
    });
  }, []);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const state = historyRef.current[historyIndexRef.current];
      applyEditsToDOM(state, true);
      localStorage.setItem("desorden_canvas_studio_edits_v2", JSON.stringify(state));
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    }
  }, [applyEditsToDOM]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const state = historyRef.current[historyIndexRef.current];
      applyEditsToDOM(state, true);
      localStorage.setItem("desorden_canvas_studio_edits_v2", JSON.stringify(state));
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    }
  }, [applyEditsToDOM]);

  const pushToHistory = useCallback((editMap: Record<string, CanvasElementEdit>) => {
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(editMap);
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  const addPrefab = useCallback((type: string) => {
    const id = "prefab-" + Date.now();
    const el = document.createElement(type === 'button' ? 'button' : 'div');
    el.setAttribute("data-canvas-selector", "#" + id);
    el.setAttribute("data-prefab", "true");
    el.setAttribute("data-canvas-element", "true");
    el.id = id;
    
    if (type === 'button') {
      el.className = "cta-button-gold";
      el.textContent = "BOTÓN NUEVO";
      el.style.position = "absolute";
      el.style.top = "50vh";
      el.style.left = "50vw";
      el.style.transform = "translate(-50%, -50%)";
      el.style.zIndex = "9999";
    } else if (type === 'badge') {
      el.className = "micro-label";
      el.textContent = "( NUEVO BADGE )";
      el.style.position = "absolute";
      el.style.top = "50vh";
      el.style.left = "50vw";
      el.style.transform = "translate(-50%, -50%)";
      el.style.zIndex = "9999";
    } else if (type === 'text') {
      el.className = "hero-subtitle";
      el.textContent = "Nuevo bloque de texto editable para componer tu sección.";
      el.style.position = "absolute";
      el.style.top = "50vh";
      el.style.left = "50vw";
      el.style.transform = "translate(-50%, -50%)";
      el.style.zIndex = "9999";
      el.style.maxWidth = "80vw";
    }

    document.getElementById("global-canvas-layer")?.appendChild(el);
    // Initialize interaction if necessary, wait for next save
  }, []);
;
  const [fontFamily, setFontFamily] = useState<string>("inherit");
  const [fontWeight, setFontWeight] = useState<string>("400");
  const [textColor, setTextColor] = useState<string>("#f5f5f5");
  const [lineHeight, setLineHeight] = useState<number>(1.2);
  const [letterSpacing, setLetterSpacing] = useState<number>(0);
  const [textAlign, setTextAlign] = useState<string>("left");

  // Visual Style States
  const [bgColor, setBgColor] = useState<string>("transparent");
  const [borderRadius, setBorderRadius] = useState<number>(0);
  const [boxShadow, setBoxShadow] = useState<string>("none");
  const [opacity, setOpacity] = useState<number>(1);

  // Inline editing state
  const [isEditingInline, setIsEditingInline] = useState<boolean>(false);

  // Status message
  const [statusMessage, setStatusMessage] = useState<string>("");

  const boundingBoxRef = useRef<HTMLDivElement>(null);
  const touchStartPos = useRef<{ x: number; y: number; left: number; top: number }>({ x: 0, y: 0, left: 0, top: 0 });
  const touchLastTap = useRef<number>(0);

  // Unique selector generator for DOM elements
  const getUniqueSelector = useCallback((el: HTMLElement): string => {
    if (el.id) return `#${el.id}`;
    if (el.classList.contains("hero-picture")) return ".hero-picture";
    if (el.classList.contains("intro-heading")) return ".intro-heading";
    if (el.classList.contains("cta-button-gold")) return ".cta-button-gold";
    if (el.classList.contains("display-name")) return ".display-name";

    let path: string[] = [];
    let current: HTMLElement | null = el;

    while (current && current.nodeType === Node.ELEMENT_NODE && current.tagName !== "BODY") {
      let selector = current.tagName.toLowerCase();
      if (current.className && typeof current.className === "string" && current.className.trim()) {
        const firstClass = current.className.trim().split(/\s+/)[0];
        if (firstClass && !firstClass.startsWith("canvas-")) {
          selector += `.${firstClass}`;
        }
      }
      path.unshift(selector);
      current = current.parentElement;
    }
    return path.join(" > ");
  }, []);

  const saveTimeout = useRef<any>(null);

  const getEditMap = useCallback(() => {
    const editMap: Record<string, CanvasElementEdit> = {};
    const elements = document.querySelectorAll<HTMLElement>("[data-canvas-element]");

    elements.forEach((el) => {
      const selector = el.getAttribute("data-canvas-selector") || getUniqueSelector(el);
      const isPrefab = el.hasAttribute("data-prefab");
      const isHidden = el.getAttribute("data-hidden") === "true";
      const deletedAtStr = el.getAttribute("data-deleted-at");
      const isDeleted = !!deletedAtStr;
      
      if (el.style.length > 0 || el.getAttribute("data-edited") === "true" || isPrefab || isHidden || isDeleted) {
        editMap[selector] = {
          isPrefab: isPrefab ? true : undefined,
          prefabTag: isPrefab ? el.tagName.toLowerCase() : undefined,
          prefabClass: isPrefab ? el.className : undefined,
          selector,
          text: el.tagName !== "IMG" ? el.textContent || "" : undefined,
          src: el.tagName === "IMG" ? (el as HTMLImageElement).src : undefined,
          fontSize: el.style.fontSize || undefined,
          fontFamily: el.style.fontFamily || undefined,
          fontWeight: el.style.fontWeight || undefined,
          color: el.style.color || undefined,
          backgroundColor: el.style.backgroundColor || undefined,
          top: el.style.top || undefined,
          left: el.style.left || undefined,
          width: el.style.width || undefined,
          height: el.style.height || undefined,
          padding: el.style.padding || undefined,
          margin: el.style.margin || undefined,
          opacity: el.style.opacity || undefined,
          zIndex: el.style.zIndex || undefined,
          parallaxSpeed: el.style.getPropertyValue("--parallax-speed") || undefined,
          transform: el.style.transform || undefined,
          position: el.style.position || undefined,
          lineHeight: el.style.lineHeight || undefined,
          letterSpacing: el.style.letterSpacing || undefined,
          textAlign: el.style.textAlign || undefined,
          borderRadius: el.style.borderRadius || undefined,
          boxShadow: el.style.boxShadow || undefined,
          hidden: isHidden ? true : undefined,
          deletedAt: isDeleted ? parseInt(deletedAtStr, 10) : undefined,
        };
      }
    });
    return editMap;
  }, [getUniqueSelector]);

  // Save to LocalStorage
  const saveToLocalStorage = useCallback(() => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      const editMap = getEditMap();
      localStorage.setItem("desorden_canvas_studio_edits_v2", JSON.stringify(editMap));
      pushToHistory(editMap);
    }, 1500);
  }, [getEditMap, pushToHistory]);

  // Load edits from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem("desorden_canvas_studio_edits_v2");
    if (saved) {
      try {
        const editMap: Record<string, CanvasElementEdit> = JSON.parse(saved);
        applyEditsToDOM(editMap, false);
        historyRef.current = [editMap];
        historyIndexRef.current = 0;
      } catch (e) {
        console.error("Failed loading local canvas studio edits", e);
      }
    } else {
      historyRef.current = [{}];
      historyIndexRef.current = 0;
    }
  }, [applyEditsToDOM]);
  useEffect(() => {
    if (editorMode) {
      document.body.classList.add("canvas-editor-active");
    } else {
      document.body.classList.remove("canvas-editor-active");
    }
    return () => document.body.classList.remove("canvas-editor-active");
  }, [editorMode]);

  // Initialize Canvas Selectors & Event Listeners
  useEffect(() => {
    if (!editorMode) {
      document.querySelectorAll<HTMLElement>("[data-canvas-element]").forEach((el) => {
        el.style.outline = "none";
      });
      setSelectedSelector(null);
      return;
    }

    const elements = document.querySelectorAll<HTMLElement>(
      ".intro-heading, .intro-heading > *, .hero-picture, .intro-layout > *, .hero-services li, .cta-button-gold, .display-name, .outline-word, .micro-label, .hero-subtitle, .scene-deck > *, section, h1, h2, h3, p, a, button"
    );

    elements.forEach((el) => {
      if (el.closest("#canvas-studio-toolbar") || el.closest(".resize-handle") || el.closest("#canvas-mode-toggle") || el.closest("#canvas-undo-redo-container")) return;

      const sel = getUniqueSelector(el);
      el.setAttribute("data-canvas-element", "true");
      el.setAttribute("data-canvas-selector", sel);

      const comp = window.getComputedStyle(el);
      if (comp.position === "static") {
        el.style.position = "relative";
      }

      // Selection handler
      const handleSelect = (e: Event) => {
        e.stopPropagation();
        if (!editorMode) return;

        document.querySelectorAll<HTMLElement>("[data-canvas-element]").forEach((other) => {
          other.style.outline = "none";
          other.style.touchAction = "";
        });

        el.style.outline = "2px dashed #E3A008";
        el.style.outlineOffset = "4px";
        el.style.touchAction = "none";

        setSelectedSelector(sel);
        setSelectedTag(el.className ? `.${el.className.split(" ")[0]}` : el.tagName.toLowerCase());

        const currentStyle = window.getComputedStyle(el);
        setFontSize(parseFloat(currentStyle.fontSize) || 16);
        setFontFamily(currentStyle.fontFamily || "inherit");
        setFontWeight(currentStyle.fontWeight || "400");
        setTextColor(currentStyle.color || "#f5f5f5");
        setBgColor(currentStyle.backgroundColor || "transparent");
        setLineHeight(parseFloat(currentStyle.lineHeight) || 1.2);
        setLetterSpacing(parseFloat(currentStyle.letterSpacing) || 0);
        setTextAlign(currentStyle.textAlign || "left");

        setZIndex(parseInt(currentStyle.zIndex) || 0);
        const pSpeed = el.style.getPropertyValue("--parallax-speed");
        setParallaxSpeed(pSpeed ? parseFloat(pSpeed) : 0);
        setPositionMode(currentStyle.position === "absolute" ? "absolute" : "relative");
        setPadding(parseFloat(currentStyle.padding) || 0);
        setMargin(parseFloat(currentStyle.margin) || 0);
        setWidth(currentStyle.width);
        setHeight(currentStyle.height);
        setBorderRadius(parseFloat(currentStyle.borderRadius) || 0);
        setBoxShadow(currentStyle.boxShadow || "none");
        setOpacity(parseFloat(currentStyle.opacity) || 1);

        const rect = el.getBoundingClientRect();
        if (rect.height > 0) {
          setAspectRatioVal(rect.width / rect.height);
        }

        const tzMatch = el.style.transform ? el.style.transform.match(/translateZ\(([-\d.]+)px\)/) : null;
        setTranslateZ(tzMatch ? parseFloat(tzMatch[1]) : 0);
      };

      el.onclick = handleSelect;

      // Double tap / double click inline editing handler
      // Double tap has been removed in favor of explicit 'Editar Texto' button.

      // Touch Drag & Drop support for mobile
      let activeAnimationFrame: number | null = null;
      let dragDeltaX = 0;
      let dragDeltaY = 0;

      const handleTouchStart = (e: TouchEvent) => {
        if (!editorMode || e.touches.length > 1) return;
        handleSelect(e);

        const touch = e.touches[0];
        const styleLeft = parseInt(window.getComputedStyle(el).left || "0", 10);
        const styleTop = parseInt(window.getComputedStyle(el).top || "0", 10);

        touchStartPos.current = {
          x: touch.clientX,
          y: touch.clientY,
          left: isNaN(styleLeft) ? 0 : styleLeft,
          top: isNaN(styleTop) ? 0 : styleTop,
        };
        
        el.setAttribute("data-original-transform", el.style.transform || "");
        dragDeltaX = 0;
        dragDeltaY = 0;
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (!editorMode || e.touches.length > 1 || el.contentEditable === "true") return;
        
        const touch = e.touches[0];
        dragDeltaX = touch.clientX - touchStartPos.current.x;
        dragDeltaY = touch.clientY - touchStartPos.current.y;

        if (Math.abs(dragDeltaX) > 5 || Math.abs(dragDeltaY) > 5) {
          // Bloqueo estricto del gesto (Scroll vs Drag)
          e.preventDefault(); 

          if (!activeAnimationFrame) {
            activeAnimationFrame = requestAnimationFrame(() => {
              const baseTransform = el.getAttribute("data-original-transform") || '';
              el.style.transform = `${baseTransform} translate3d(${dragDeltaX}px, ${dragDeltaY}px, 0)`.trim();
              activeAnimationFrame = null;
            });
          }
        }
      };

      const handleTouchEnd = () => {
        if (activeAnimationFrame) {
          cancelAnimationFrame(activeAnimationFrame);
          activeAnimationFrame = null;
        }
        if (Math.abs(dragDeltaX) > 5 || Math.abs(dragDeltaY) > 5) {
          const newLeft = touchStartPos.current.left + dragDeltaX;
          const newTop = touchStartPos.current.top + dragDeltaY;
          
          let parentW = 1;
          let parentH = 1;
          const parent = (el.offsetParent || el.parentElement) as HTMLElement;
          if (parent) {
            parentW = parent.offsetWidth || window.innerWidth;
            parentH = parent.offsetHeight || window.innerHeight;
          } else {
            parentW = window.innerWidth;
            parentH = window.innerHeight;
          }
          const leftPercent = (newLeft / parentW) * 100;
          const topPercent = (newTop / parentH) * 100;

          el.style.left = `${leftPercent}%`;
          el.style.top = `${topPercent}%`;
          
          el.style.transform = el.getAttribute("data-original-transform") || "";
          el.setAttribute("data-edited", "true");
          dragDeltaX = 0;
          dragDeltaY = 0;
        }
        if (editorMode) saveToLocalStorage();
      };

      (el as any)._ts = handleTouchStart;
      (el as any)._tm = handleTouchMove;
      (el as any)._te = handleTouchEnd;
      
      el.addEventListener("touchstart", handleTouchStart as any, { passive: false });
      el.addEventListener("touchmove", handleTouchMove as any, { passive: false });
      el.addEventListener("touchend", handleTouchEnd as any);
    });

    // Deselect click outside
    const handleDeselect = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest("#canvas-studio-toolbar") &&
        !target.closest(".resize-handle") &&
        !target.closest("[data-canvas-element]") &&
        !target.closest("#canvas-mode-toggle") &&
        !target.closest("#canvas-undo-redo-container")
      ) {
        document.querySelectorAll<HTMLElement>("[data-canvas-element]").forEach((other) => {
          other.style.outline = "none";
        });
        setSelectedSelector(null);
      }
    };

    window.addEventListener("click", handleDeselect);
    return () => {
      window.removeEventListener("click", handleDeselect);
      elements.forEach((el) => {
        el.onclick = null;
        if ((el as any)._ts) el.removeEventListener("touchstart", (el as any)._ts);
        if ((el as any)._tm) el.removeEventListener("touchmove", (el as any)._tm);
        if ((el as any)._te) el.removeEventListener("touchend", (el as any)._te);
      });
    };
  }, [editorMode, getUniqueSelector, saveToLocalStorage]);

  // Sync Bounding Box Overlay
  useEffect(() => {
    if (!editorMode || !selectedEl) return;

    let animFrame: number;
    const updateBox = () => {
      if (selectedEl && boundingBoxRef.current) {
        const rect = selectedEl.getBoundingClientRect();
        boundingBoxRef.current.style.top = `${rect.top + window.scrollY}px`;
        boundingBoxRef.current.style.left = `${rect.left + window.scrollX}px`;
        boundingBoxRef.current.style.width = `${rect.width}px`;
        boundingBoxRef.current.style.height = `${rect.height}px`;
      }
      animFrame = requestAnimationFrame(updateBox);
    };

    updateBox();
    return () => cancelAnimationFrame(animFrame);
  }, [editorMode, selectedEl]);

  // Update Element Style helper
  const updateStyle = (property: string, value: string) => {
    if (selectedEl) {
      selectedEl.style.setProperty(property, value, "important");
      if (["color", "font-size", "font-family"].includes(property)) {
        selectedEl.querySelectorAll<HTMLElement>("*").forEach((child) => {
          child.style.setProperty(property, value, "important");
        });
      }
      selectedEl.setAttribute("data-edited", "true");
      saveToLocalStorage();
    }
  };

  
  const handleParallaxChange = (val: number) => {
    setParallaxSpeed(val);
    if (selectedEl) {
      selectedEl.style.setProperty("--parallax-speed", String(val));
      if (val !== 0) {
        selectedEl.style.translate = `0 calc(var(--progress, 0) * var(--parallax-speed, 0) * 150vh)`;
      } else {
        selectedEl.style.translate = "none";
      }
      selectedEl.setAttribute("data-edited", "true");
      saveToLocalStorage();
    }
  };

  // 3D Depth Handler
  const handleTranslateZChange = (val: number) => {
    setTranslateZ(val);
    if (selectedEl) {
      const currentTransform = selectedEl.style.transform || "";
      const cleanTransform = currentTransform.replace(/translateZ\([^)]+\)/g, "").trim();
      selectedEl.style.transform = `${cleanTransform} translateZ(${val}px)`.trim();
      selectedEl.setAttribute("data-edited", "true");
      saveToLocalStorage();
    }
  };

  // Z-Index hierarchy fast actions
  const adjustZIndex = (delta: number) => {
    const nextZ = zIndex + delta;
    setZIndex(nextZ);
    updateStyle("z-index", `${nextZ}`);
  };

  const setZIndexAbsolute = (val: number) => {
    setZIndex(val);
    updateStyle("z-index", `${val}`);
  };

  const handleHideElement = () => {
    if (selectedEl) {
      selectedEl.setAttribute("data-hidden", "true");
      selectedEl.setAttribute("data-edited", "true");
      setHasChanges(true);
      saveToLocalStorage();
      vibrate([20, 20]);
    }
  };

  const handleDeleteElement = () => {
    if (selectedEl && window.confirm("¿Seguro que deseas eliminar este elemento?")) {
      selectedEl.setAttribute("data-deleted-at", Date.now().toString());
      selectedEl.setAttribute("data-edited", "true");
      setHasChanges(true);
      saveToLocalStorage();
      setSelectedSelector(null);
      setIsDrawerOpen(false);
      vibrate([30, 30, 30]);
    }
  };

  const enableInlineEdit = () => {
    if (!selectedSelector) return;
    const el = document.querySelector<HTMLElement>(selectedSelector);
    if (!el || el.tagName === "IMG") return;
    
    el.contentEditable = "true";
    el.focus();
    el.classList.add("editing-inline");
    setIsEditingInline(true);
    vibrate(12);
    (window as any).isTouchEditingActive = true;
    
    const handleInput = () => setHasChanges(true);
    el.addEventListener("input", handleInput);
    
    // iOS auto-zoom prevention
    const computedFont = window.getComputedStyle(el).fontSize;
    let originalFontSize = "";
    if (parseFloat(computedFont) < 16) {
       originalFontSize = el.style.fontSize;
       el.style.fontSize = "16px";
    }
    
    setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData?.getData("text/plain") || "";
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    };
    (el as any)._pasteHandler = handlePaste;
    el.addEventListener("paste", handlePaste as any);

    const finishEditing = () => {
      if (originalFontSize !== "") {
         el.style.fontSize = originalFontSize;
      }
      el.contentEditable = "false";
      el.classList.remove("editing-inline");
      setIsEditingInline(false);
      el.setAttribute("data-edited", "true");
      setHasChanges(true);
      saveToLocalStorage();
      el.removeEventListener("blur", finishEditing);
      el.removeEventListener("input", handleInput);
      el.removeEventListener("paste", (el as any)._pasteHandler);
      (window as any).isTouchEditingActive = false;
    };

    el.addEventListener("blur", finishEditing);
  };

  // 3D Exploded Inspector Toggle
  const toggle3DExplodedInspector = () => {
    const nextState = !is3DExploded;
    setIs3DExploded(nextState);

    const root = document.querySelector<HTMLElement>("main") || document.body;
    if (nextState) {
      root.classList.add("canvas-3d-exploded-active");

      document.querySelectorAll<HTMLElement>("[data-canvas-element]").forEach((el) => {
        const comp = window.getComputedStyle(el);
        const z = parseInt(comp.zIndex) || 0;
        const currentTransform = el.style.transform || "";
        const cleanTransform = currentTransform.replace(/translateZ\([^)]+\)/g, "").trim();
        const explodedZ = z * 25 + 30;
        el.style.transform = `${cleanTransform} translateZ(${explodedZ}px)`.trim();
      });
      setStatusMessage("🌐 ¡Inspector 3D Activo!");
    } else {
      root.classList.remove("canvas-3d-exploded-active");
      document.querySelectorAll<HTMLElement>("[data-canvas-element]").forEach((el) => {
        const comp = window.getComputedStyle(el);
        const tzMatch = el.style.transform ? el.style.transform.match(/translateZ\(([-\d.]+)px\)/) : null;
        const tz = tzMatch ? parseFloat(tzMatch[1]) : 0;
        const cleanTransform = (el.style.transform || "").replace(/translateZ\([^)]+\)/g, "").trim();
        el.style.transform = tz !== 0 ? `${cleanTransform} translateZ(${tz}px)`.trim() : cleanTransform;
      });
      setStatusMessage("📐 Vista Normal Restaurada");
    }
    setTimeout(() => setStatusMessage(""), 3000);
  };

  // Resize Handlers (Mouse & Touch)
  const startResize = (e: React.MouseEvent | React.TouchEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedEl) return;

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const rect = selectedEl.getBoundingClientRect();
    const startWidth = rect.width;
    const startHeight = rect.height;

    const doResize = (moveEvent: MouseEvent | TouchEvent) => {
      moveEvent.preventDefault(); // Bloqueo estricto del gesto en resize
      const curX = "touches" in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const curY = "touches" in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      const deltaX = curX - clientX;
      const deltaY = curY - clientY;

      let newW = startWidth;
      let newH = startHeight;

      if (direction.includes("e")) newW = startWidth + deltaX;
      if (direction.includes("w")) newW = startWidth - deltaX;
      if (direction.includes("s")) newH = startHeight + deltaY;
      if (direction.includes("n")) newH = startHeight - deltaY;

      if (lockAspectRatio && aspectRatioVal) {
        newH = newW / aspectRatioVal;
      }

      let parentW = 1;
      let parentH = 1;
      const parent = (selectedEl.offsetParent || selectedEl.parentElement) as HTMLElement;
      if (parent) {
        parentW = parent.offsetWidth || window.innerWidth;
        parentH = parent.offsetHeight || window.innerHeight;
      } else {
        parentW = window.innerWidth;
        parentH = window.innerHeight;
      }
      
      if (newW > 20) {
        const widthPercent = (newW / parentW) * 100;
        selectedEl.style.width = `${widthPercent}%`;
        setWidth(`${widthPercent.toFixed(1)}%`);
      }
      if (newH > 20) {
        const heightPercent = (newH / parentH) * 100;
        selectedEl.style.height = `${heightPercent}%`;
        setHeight(`${heightPercent.toFixed(1)}%`);
      }

      selectedEl.setAttribute("data-edited", "true");
    };

    const stopResize = () => {
      saveToLocalStorage();
      window.removeEventListener("mousemove", doResize);
      window.removeEventListener("mouseup", stopResize);
      window.removeEventListener("touchmove", doResize as any);
      window.removeEventListener("touchend", stopResize);
    };

    window.addEventListener("mousemove", doResize);
    window.addEventListener("mouseup", stopResize);
    window.addEventListener("touchmove", doResize as any, { passive: false });
    window.addEventListener("touchend", stopResize);
  };

  // Draft & Publish
  const handleSaveDraft = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    vibrate(30);
    setStatusMessage('Guardando...');
    setSaveStatus("saving");
    
    try {
      const editMap = getEditMap();
      
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editMap, version: editorState.version })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 409) {
          setStatusMessage("⚠️ Conflicto de versión. Otra sesión ha modificado el documento.");
          setSaveStatus("error");
          vibrate([100, 50, 100]);
        } else {
          throw new Error("Save failed");
        }
        return;
      }
      
      if (data.saved) {
        setEditorState(s => ({ ...s, version: data.version }));
        setStatusMessage('¡Guardado!');
        setHasChanges(false);
        setSaveStatus("saved");
        vibrate([10, 50, 10]);
        // Also save to localStorage as fallback/cache
        localStorage.setItem("desorden_canvas_studio_edits_v2", JSON.stringify(editMap));
      }
    } catch (err) {
      console.warn("Network error, falling back to LocalStorage", err);
      setStatusMessage('Guardado en LocalStorage (Offline)');
      const editMap = getEditMap();
      localStorage.setItem("desorden_canvas_studio_edits_v2", JSON.stringify(editMap));
      setHasChanges(false);
      setSaveStatus("offline");
      vibrate([50, 50, 50]);
    }
    
    setTimeout(() => setStatusMessage(''), 2000);
  };

  const handlePublish = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (editorState.saveStatus === "offline") {
      setStatusMessage("⚠️ No puedes publicar sin conexión");
      vibrate([50, 50, 50]);
      setTimeout(() => setStatusMessage(""), 3000);
      return;
    }

    // Only allow publish if there are no unsaved changes or we just saved.
    if (editorState.hasUnsavedChanges || (editorState.saveStatus !== "saved" && editorState.saveStatus !== "offline" && editorState.saveStatus !== "idle")) {
      setStatusMessage("⚠️ Guarda los cambios primero");
      return;
    }
    
    if (window.confirm("¿Estás seguro de que deseas publicar los cambios y hacerlos visibles para todos?")) {
      vibrate(50);
      setStatusMessage("🚀 Publicando...");
      
      try {
        const res = await fetch("/api/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ version: editorState.version })
        });
        
        if (res.ok) {
          // Permanently remove elements with data-deleted-at from DOM in the live preview
          document.querySelectorAll('[data-deleted-at]').forEach(el => el.remove());
          
          setStatusMessage("✅ Cambios publicados correctamente.");
          vibrate([30, 30, 30]);
        } else {
          throw new Error("Publish failed");
        }
      } catch (err) {
        setStatusMessage("❌ Error de red al publicar.");
        vibrate([100, 50, 100]);
      }
      setTimeout(() => setStatusMessage(""), 4000);
    }
  };

  // Exporters
  const handleExportJSON = () => {
    const elements = document.querySelectorAll<HTMLElement>("[data-canvas-element]");
    const exportMap: Record<string, any> = {};

    elements.forEach((el) => {
      const sel = el.getAttribute("data-canvas-selector") || getUniqueSelector(el);
      if (el.getAttribute("data-edited") === "true" || el.style.length > 0) {
        exportMap[sel] = {
          selector: sel,
          tagName: el.tagName.toLowerCase(),
          text: el.tagName !== "IMG" ? el.textContent : undefined,
          styles: el.style.cssText,
        };
      }
    });

    const blob = new Blob([JSON.stringify(exportMap, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "canvas-studio-layout-export.json";
    a.click();

    setStatusMessage("✅ JSON Exportado Correctamente");
    setTimeout(() => setStatusMessage(""), 4000);
  };

  const handleExportHTML = () => {
    const clone = document.documentElement.cloneNode(true) as HTMLElement;
    clone.querySelector("#canvas-studio-toolbar")?.remove();
    clone.querySelector("#canvas-mode-toggle")?.remove();
    clone.querySelector("#canvas-bounding-box")?.remove();

    const blob = new Blob([clone.outerHTML], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "canvas-studio-portfolio.html";
    a.click();

    setStatusMessage("✅ HTML Exportado Correctamente");
    setTimeout(() => setStatusMessage(""), 4000);
  };

  const handleResetLayout = () => {
    if (window.confirm("¿Seguro que deseas restablecer todas las modificaciones y volver al diseño original?")) {
      localStorage.removeItem("desorden_canvas_studio_edits_v2");
      window.location.reload();
    }
  };

  if (!mounted) return null;

  return createPortal(
    <>
      {editorMode && (
        <>
          <div className="mobile-only-message">
            EDITOR DISPONIBLE SOLO EN MÓVIL<br/>
            <span style={{fontSize: '14px', marginTop: '12px', display: 'block', opacity: 0.7, fontFamily: 'sans-serif'}}>Abre esta dirección desde un teléfono en posición vertical.</span>
          </div>
          <div className="orientation-warning">
            GIRA EL TELÉFONO<br/>
            <span style={{fontSize: '14px', marginTop: '12px', display: 'block', opacity: 0.7, fontFamily: 'sans-serif'}}>El editor está optimizado para utilizarse en posición vertical.</span>
          </div>
        </>
      )}
      <div id="canvas-editor-ui-root" style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 2147483647, pointerEvents: "none" }}>
      {editorMode && (
        <div className="mobile-editor-header" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, minHeight: "52px", display: "grid", gridTemplateColumns: "72px 1fr 72px", alignItems: "center", padding: "8px 12px 8px", background: "rgba(0, 0, 0, 0.94)", borderBottom: "1px solid rgba(245, 158, 11, 0.25)" }}>
          <button style={{ color: "#f59e0b", background: "transparent", border: "none", fontSize: "11px", fontWeight: 700, pointerEvents: "auto", cursor: "pointer" }} onClick={() => setEditorMode(false)}>SALIR</button>
          <div className="mobile-editor-header__title" style={{ overflow: "hidden", color: "#ffffff", textAlign: "center", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "12px", fontWeight: "bold" }}>
            EDITOR MÓVIL
          </div>
          <div style={{ textAlign: "right" }}>
             <button style={{ color: "#fff", background: "transparent", border: "none", fontSize: "16px", fontWeight: 700, pointerEvents: "auto", cursor: "pointer" }}>···</button>
          </div>
        </div>
      )}

      {editorMode && (
        <div className="touch-toolbar" style={{ position: "fixed", left: "50%", bottom: `${12 + keyboardOffset}px`, zIndex: 1000, width: "calc(100% - 24px)", maxWidth: "430px", display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", alignItems: "center", gap: "8px", padding: "8px", transform: "translateX(-50%)", background: "rgba(18, 22, 32, 0.94)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "24px", boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6), 0 0 1px rgba(245, 158, 11, 0.4)", pointerEvents: "auto", transition: "bottom 0.1s ease-out" }}>
          <button type="button" onClick={handleUndo} disabled={!canUndo} style={{ color: "#fff", background: "transparent", border: "none", fontSize: "18px", opacity: canUndo ? 1 : 0.35, cursor: "pointer" }}>↩️</button>
          <button type="button" onClick={handleRedo} disabled={!canRedo} style={{ color: "#fff", background: "transparent", border: "none", fontSize: "18px", opacity: canRedo ? 1 : 0.35, cursor: "pointer" }}>↪️</button>
          <button type="button" onClick={() => setEditorMode(false)} style={{ color: "#fff", background: "transparent", border: "none", fontSize: "18px", cursor: "pointer" }}>👁️</button>
          <button type="button" onClick={handleSaveDraft} style={{ color: "#fff", background: "transparent", border: "none", fontSize: "18px", cursor: "pointer" }}>💾</button>
          <button type="button" onClick={handlePublish} style={{ color: "#000", background: "#f59e0b", border: "none", fontSize: "10px", fontWeight: 700, borderRadius: "12px", padding: "8px 4px", cursor: "pointer", opacity: editorState.saveStatus === "offline" ? 0.5 : 1 }}>PUBLICAR</button>
        </div>
      )}

      {/* Status Banner Notification */}
      {statusMessage && (
        <div
          style={{
            position: "fixed",
            top: "60px",
            right: "16px",
            background: "#E3A008",
            pointerEvents: "auto",
            color: "#0a0a0a",
            padding: "6px 14px",
            borderRadius: "8px",
            fontWeight: "bold",
            fontSize: "12px",
            boxShadow: "0 4px 18px rgba(0,0,0,0.5)",
          }}
        >
          {statusMessage}
        </div>
      )}

      {/* Bounding Box Overlay for Resizing & Drag Feedback */}
      {editorMode && selectedEl && (
        <div
          id="canvas-bounding-box"
          ref={boundingBoxRef}
          style={{
            position: "absolute",
            pointerEvents: "none",
            boxShadow: "0 0 0 2px #E3A008, 0 0 15px rgba(227, 160, 8, 0.4)",
            borderRadius: "2px",
          }}
        >
          {(["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const).map((dir) => (
            <div
              key={dir}
              className={`resize-handle ${dir}`}
              style={{ pointerEvents: "auto", touchAction: "none" }}
              onMouseDown={(e) => startResize(e, dir)}
              onTouchStart={(e) => startResize(e, dir)}
            />
          ))}
        </div>
      )}

      {/* Touch-First Bottom Sheet Drawer Toolbar */}
      {editorMode && (
        <div
          id="canvas-studio-toolbar"
          style={{
            position: "fixed",
            bottom: `${keyboardOffset}px`,
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: "560px",
            pointerEvents: "auto",
            background: "rgba(14, 14, 14, 0.96)",
            backdropFilter: "blur(20px)",
            borderTop: "1px solid #E3A008",
            borderLeft: "1px solid rgba(227, 160, 8, 0.3)",
            borderRight: "1px solid rgba(227, 160, 8, 0.3)",
            borderTopLeftRadius: "18px",
            borderTopRightRadius: "18px",
            padding: isDrawerOpen ? "14px 16px 18px 16px" : "10px 16px",
            color: "#f5f5f5",
            boxShadow: "0 -10px 50px rgba(0,0,0,0.9)",
            fontFamily: "'Inter', sans-serif",
            fontSize: "12px",
            boxSizing: "border-box",
            transition: "all 0.3s ease",
          }}
        >
          {/* Header & Drawer Collapse Toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isDrawerOpen ? "10px" : "0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "#E3A008", fontWeight: "900", letterSpacing: "0.5px" }}>✦ CANVAS STUDIO</span>
              {selectedTag && (
                <span style={{ background: "#E3A008", color: "#000", fontSize: "10px", padding: "2px 8px", borderRadius: "10px", fontWeight: "700" }}>
                  {selectedTag}
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {isEditingInline && <span style={{ color: "#E3A008", fontSize: "11px" }}>✍️ Editando Texto...</span>}
              {selectedEl && selectedEl.tagName !== "IMG" && !isEditingInline && (
                <button
                  type="button"
                  onClick={enableInlineEdit}
                  style={{ background: "#E3A008", border: "none", color: "#000", padding: "4px 8px", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}
                >
                  ✏️ Editar Texto
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                style={{ background: "none", border: "none", color: "#E3A008", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}
              >
                {isDrawerOpen ? "▼ Ocultar" : "▲ Panel de Edición"}
              </button>
            </div>
          </div>

          {isDrawerOpen && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {/* Navigation Tabs */}
              <div style={{ display: "flex", gap: "4px", overflowX: "auto", borderBottom: "1px solid #2a2a2a", paddingBottom: "6px" }}>
                {[
                  { id: "library", label: "📦 Librería" },
                  { id: "position", label: "📌 Posición & Z" },
                  { id: "typography", label: "🔤 Tipografía" },
                  { id: "style", label: "🎨 Estilos" },
                  { id: "3d", label: "🧊 Inspección 3D" },
                  { id: "export", label: "📤 Exportar" },
                  { id: "restore", label: "♻️ Restaurar" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    style={{
                      background: activeTab === tab.id ? "#262626" : "transparent",
                      color: activeTab === tab.id ? "#E3A008" : "#a3a3a3",
                      border: activeTab === tab.id ? "1px solid #E3A008" : "1px solid transparent",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      fontWeight: activeTab === tab.id ? "bold" : "normal",
                      fontSize: "11px",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === "restore" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <span style={{ color: "#E3A008", fontWeight: "bold" }}>Elementos Ocultos / Eliminados</span>
                  {Array.from(document.querySelectorAll('[data-hidden="true"], [data-deleted-at]')).length === 0 ? (
                    <span style={{ color: "#888" }}>No hay elementos para restaurar.</span>
                  ) : (
                    Array.from(document.querySelectorAll('[data-hidden="true"], [data-deleted-at]')).map((el, i) => {
                      const isDeleted = el.hasAttribute("data-deleted-at");
                      return (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#222", padding: "8px", borderRadius: "4px" }}>
                          <span style={{ fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>
                            {el.tagName.toLowerCase()} {isDeleted ? "(Eliminado)" : "(Oculto)"} {el.textContent ? `- ${el.textContent.substring(0, 10)}...` : ""}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              el.removeAttribute("data-hidden");
                              el.removeAttribute("data-deleted-at");
                              el.setAttribute("data-edited", "true");
                              setHasChanges(true);
                              vibrate([20, 20]);
                            }}
                            style={{ 
                              background: "transparent", border: "1px solid #E3A008", color: "#E3A008",
                              padding: "4px 8px", borderRadius: "4px", cursor: "pointer", fontSize: "11px"
                            }}
                          >
                            Restaurar
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              {!selectedEl && activeTab !== "export" && activeTab !== "3d" && activeTab !== "restore" && (
                <div style={{ color: "#a3a3a3", fontStyle: "italic", textAlign: "center", padding: "12px 0" }}>
                  💡 Haz clic o toca cualquier elemento en la pantalla para editarlo. (Doble toque para texto inline).
                </div>
              )}

              {/* TAB 1: POSITION & Z-AXIS */}
              {selectedEl && activeTab === "position" && (
                <div style={{ display: "grid", gap: "10px" }}>
                  {/* Z-Index Controls */}
                  <div style={{ background: "#1c1c1c", padding: "8px 10px", borderRadius: "8px", border: "1px solid #333" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", alignItems: "center" }}>
                      <span style={{ color: "#E3A008", fontWeight: "bold" }}>Stacking Order (Z-Index): {zIndex}</span>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button type="button" onClick={() => adjustZIndex(1)} style={btnStyle}>
                          +1 Z
                        </button>
                        <button type="button" onClick={() => adjustZIndex(-1)} style={btnStyle}>
                          -1 Z
                        </button>
                        <button type="button" onClick={() => setZIndexAbsolute(9999)} style={{ ...btnStyle, background: "#E3A008", color: "#000" }}>
                          Frente Abs.
                        </button>
                        <button type="button" onClick={() => setZIndexAbsolute(-1)} style={btnStyle}>
                          Fondo Abs.
                        </button>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                      <button type="button" onClick={handleHideElement} style={{ ...btnStyle, flex: 1 }}>
                        👻 Ocultar
                      </button>
                      <button type="button" onClick={handleDeleteElement} style={{ ...btnStyle, flex: 1, color: "#ef4444", borderColor: "#ef4444" }}>
                        🗑️ Eliminar
                      </button>
                    </div>
                    <input
                      type="range"
                      min="-10"
                      max="1000"
                      value={zIndex}
                      onChange={(e) => {
                        const v = parseInt(e.target.value);
                        setZIndex(v);
                        updateStyle("z-index", `${v}`);
                      }}
                      style={{ width: "100%", accentColor: "#E3A008" }}
                    />
                  </div>

                  {/* Parallax Scroll Speed */}
                  <div style={{ background: "#1c1c1c", padding: "8px 10px", borderRadius: "8px", border: "1px solid #333", marginTop: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ color: "#888" }}>Scroll Parallax (Velocidad):</span>
                      <span style={{ color: "#E3A008" }}>{parallaxSpeed}x</span>
                    </div>
                    <input
                      type="range"
                      min="-5"
                      max="5"
                      step="0.1"
                      value={parallaxSpeed}
                      onChange={(e) => handleParallaxChange(parseFloat(e.target.value))}
                      style={{ width: "100%", accentColor: "#E3A008" }}
                    />
                  </div>

                  {/* 3D Depth TranslateZ */}
                  <div style={{ background: "#1c1c1c", padding: "8px 10px", borderRadius: "8px", border: "1px solid #333" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ color: "#888" }}>Profundidad 3D (translateZ):</span>
                      <span style={{ color: "#E3A008" }}>{translateZ}px</span>
                    </div>
                    <input
                      type="range"
                      min="-500"
                      max="500"
                      step="5"
                      value={translateZ}
                      onChange={(e) => handleTranslateZChange(parseInt(e.target.value))}
                      style={{ width: "100%", accentColor: "#E3A008" }}
                    />
                  </div>

                  {/* Flow / Position Mode & Dimensions */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <div>
                      <label style={{ color: "#888", display: "block", marginBottom: "2px" }}>Modo Posición:</label>
                      <select
                        value={positionMode}
                        onChange={(e) => {
                          setPositionMode(e.target.value);
                          updateStyle("position", e.target.value);
                        }}
                        style={inputStyle}
                      >
                        <option value="relative">Relativo (Flujo Grid/Flex)</option>
                        <option value="absolute">Absoluto (Libre X/Y)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ color: "#888", display: "block", marginBottom: "2px" }}>Aspect Ratio:</label>
                      <button
                        type="button"
                        onClick={() => setLockAspectRatio(!lockAspectRatio)}
                        style={{ ...btnStyle, width: "100%", background: lockAspectRatio ? "#E3A008" : "#262626", color: lockAspectRatio ? "#000" : "#fff" }}
                      >
                        {lockAspectRatio ? "🔒 Bloqueado" : "🔓 Libre"}
                      </button>
                    </div>
                  </div>

                  {/* Width & Height sliders */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <div>
                      <label style={{ color: "#888", display: "block", marginBottom: "2px" }}>Padding (px): {padding}</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={padding}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          setPadding(v);
                          updateStyle("padding", `${v}px`);
                        }}
                        style={{ width: "100%", accentColor: "#E3A008" }}
                      />
                    </div>
                    <div>
                      <label style={{ color: "#888", display: "block", marginBottom: "2px" }}>Margin (px): {margin}</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={margin}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          setMargin(v);
                          updateStyle("margin", `${v}px`);
                        }}
                        style={{ width: "100%", accentColor: "#E3A008" }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TYPOGRAPHY */}
              {selectedEl && activeTab === "typography" && (
                <div style={{ display: "grid", gap: "10px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "8px" }}>
                    <div>
                      <label style={{ color: "#888", display: "block", marginBottom: "2px" }}>Tipografía (Google Fonts):</label>
                      <select
                        value={fontFamily}
                        onChange={(e) => {
                          setFontFamily(e.target.value);
                          updateStyle("font-family", e.target.value);
                        }}
                        style={inputStyle}
                      >
                        <option value="'Inter', sans-serif">Inter</option>
                        <option value="Anton, sans-serif">Anton</option>
                        <option value="'Space Grotesk', sans-serif">Space Grotesk</option>
                        <option value="'Unbounded', sans-serif">Unbounded</option>
                        <option value="'Outfit', sans-serif">Outfit</option>
                        <option value="'Roboto', sans-serif">Roboto</option>
                        <option value="'Cinzel', serif">Cinzel</option>
                        <option value="'Fira Code', monospace">Fira Code</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ color: "#888", display: "block", marginBottom: "2px" }}>Color Texto:</label>
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => {
                          setTextColor(e.target.value);
                          updateStyle("color", e.target.value);
                        }}
                        style={{ width: "100%", height: "28px", border: "none", borderRadius: "4px", cursor: "pointer", background: "none" }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <div>
                      <label style={{ color: "#888", display: "block", marginBottom: "2px" }}>Tamaño Fuente: {fontSize}px</label>
                      <input
                        type="range"
                        min="10"
                        max="120"
                        value={fontSize}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          setFontSize(v);
                          updateStyle("font-size", `${v}px`);
                        }}
                        style={{ width: "100%", accentColor: "#E3A008" }}
                      />
                    </div>

                    <div>
                      <label style={{ color: "#888", display: "block", marginBottom: "2px" }}>Peso (Font Weight):</label>
                      <select
                        value={fontWeight}
                        onChange={(e) => {
                          setFontWeight(e.target.value);
                          updateStyle("font-weight", e.target.value);
                        }}
                        style={inputStyle}
                      >
                        <option value="300">Light (300)</option>
                        <option value="400">Regular (400)</option>
                        <option value="600">SemiBold (600)</option>
                        <option value="700">Bold (700)</option>
                        <option value="900">Black (900)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                    <div>
                      <label style={{ color: "#888", display: "block", marginBottom: "2px" }}>Interlínea:</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.8"
                        max="3"
                        value={lineHeight}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          setLineHeight(v);
                          updateStyle("line-height", `${v}`);
                        }}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ color: "#888", display: "block", marginBottom: "2px" }}>Espaciado:</label>
                      <input
                        type="number"
                        step="0.5"
                        min="-2"
                        max="20"
                        value={letterSpacing}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          setLetterSpacing(v);
                          updateStyle("letter-spacing", `${v}px`);
                        }}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ color: "#888", display: "block", marginBottom: "2px" }}>Alineación:</label>
                      <select
                        value={textAlign}
                        onChange={(e) => {
                          setTextAlign(e.target.value);
                          updateStyle("text-align", e.target.value);
                        }}
                        style={inputStyle}
                      >
                        <option value="left">Izquierda</option>
                        <option value="center">Centro</option>
                        <option value="right">Derecha</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: STYLES */}
              {selectedEl && activeTab === "style" && (
                <div style={{ display: "grid", gap: "10px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <div>
                      <label style={{ color: "#888", display: "block", marginBottom: "2px" }}>Fondo Color:</label>
                      <input
                        type="text"
                        placeholder="rgba(0,0,0,0.5) o #hex"
                        value={bgColor}
                        onChange={(e) => {
                          setBgColor(e.target.value);
                          updateStyle("background-color", e.target.value);
                        }}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ color: "#888", display: "block", marginBottom: "2px" }}>Border Radius: {borderRadius}px</label>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={borderRadius}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          setBorderRadius(v);
                          updateStyle("border-radius", `${v}px`);
                        }}
                        style={{ width: "100%", accentColor: "#E3A008" }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <div>
                      <label style={{ color: "#888", display: "block", marginBottom: "2px" }}>Opacidad: {Math.round(opacity * 100)}%</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={opacity}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          setOpacity(v);
                          updateStyle("opacity", `${v}`);
                        }}
                        style={{ width: "100%", accentColor: "#E3A008" }}
                      />
                    </div>
                    <div>
                      <label style={{ color: "#888", display: "block", marginBottom: "2px" }}>Box Shadow Preset:</label>
                      <select
                        value={boxShadow}
                        onChange={(e) => {
                          setBoxShadow(e.target.value);
                          updateStyle("box-shadow", e.target.value);
                        }}
                        style={inputStyle}
                      >
                        <option value="none">Sin Sombra</option>
                        <option value="0 10px 30px rgba(0,0,0,0.5)">Suave (0 10px 30px)</option>
                        <option value="0 20px 50px rgba(227,160,8,0.3)">Dorado Glow</option>
                        <option value="0 0 25px rgba(255,255,255,0.2)">Neón Blanco</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: 3D EXPLODED LAYER INSPECTOR */}
              {activeTab === "3d" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ background: "#1c1c1c", padding: "10px", borderRadius: "8px", border: "1px solid #E3A008" }}>
                    <h4 style={{ margin: "0 0 6px 0", color: "#E3A008", fontSize: "13px" }}>🌐 Inspector de Capas 3D Explotadas</h4>
                    <p style={{ margin: "0 0 10px 0", color: "#a3a3a3", fontSize: "11px" }}>
                      Activa la vista tridimensional explotada para visualizar y manipular físicamente las capas superpuestas de la página en el espacio 3D.
                    </p>
                    <button
                      type="button"
                      onClick={toggle3DExplodedInspector}
                      style={{
                        ...btnStyle,
                        width: "100%",
                        padding: "10px",
                        fontSize: "12px",
                        background: is3DExploded ? "#ef4444" : "#E3A008",
                        color: is3DExploded ? "#fff" : "#000",
                      }}
                    >
                      {is3DExploded ? "✖️ Desactivar Vista 3D Explotada" : "🚀 Activar Inspector 3D Explotado"}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 5: EXPORT & SAVE */}
              {activeTab === "export" && (
                <div style={{ display: "grid", gap: "8px" }}>
                  <p style={{ color: "#a3a3a3", fontSize: "11px", margin: "0 0 4px 0", textAlign: "center" }}>
                    Guarda tus cambios o exporta el proyecto final en JSON o HTML/CSS listo para producción.
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <button type="button" onClick={handleExportJSON} style={{ ...btnStyle, padding: "10px", background: "#262626" }}>
                      📥 Exportar JSON
                    </button>
                    <button type="button" onClick={handleExportHTML} style={{ ...btnStyle, padding: "10px", background: "#262626" }}>
                      🌐 Exportar HTML/CSS
                    </button>
                  </div>
                  <button type="button" onClick={handleResetLayout} style={{ ...btnStyle, padding: "8px", background: "#7f1d1d", color: "#fca5a5" }}>
                    🔄 Restablecer Plantilla Original
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Contextual Toolbar */}
      {editorMode && selectedEl && sheetState !== 2 && (
        <div style={{
          position: "fixed",
          top: Math.max(10, selectedEl.getBoundingClientRect().top - 60) + "px",
          left: Math.max(10, selectedEl.getBoundingClientRect().left) + "px",
          display: "flex",
          gap: "8px",
          pointerEvents: "auto",
          background: "#1a1a1a",
          padding: "8px",
          borderRadius: "8px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
          border: "1px solid #444",
        }}>
          <button style={{ ...btnStyle, padding: "0 12px" }} onClick={(e) => {
             e.preventDefault();
             e.stopPropagation();
             const clone = selectedEl.cloneNode(true) as HTMLElement;
             const selector = selectedEl.getAttribute("data-canvas-selector");
             if(selector) clone.setAttribute("data-canvas-selector", selector + "_" + Date.now());
             selectedEl.parentNode?.insertBefore(clone, selectedEl.nextSibling);
             saveToLocalStorage();
          }}>📑</button>
          <button style={{ ...btnStyle, padding: "0 12px" }} onClick={(e) => {
             e.preventDefault();
             e.stopPropagation();
             handleDeleteElement();
          }}>🗑️</button>
        </div>
      )}
      
      </div>
    </>,
    document.body
  );
}

const btnStyle: React.CSSProperties = {
  minWidth: "48px",
  minHeight: "48px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#262626",
  color: "#fff",
  border: "1px solid #444",
  borderRadius: "6px",
  padding: "4px 8px",
  cursor: "pointer",
  fontSize: "11px",
  fontWeight: "bold",
  transition: "all 0.2s ease",
};

const inputStyle: React.CSSProperties = {
  minHeight: "48px",
  background: "#1a1a1a",
  color: "#fff",
  border: "1px solid #333",
  borderRadius: "6px",
  padding: "6px 8px",
  fontSize: "11px",
  width: "100%",
  boxSizing: "border-box",
};
