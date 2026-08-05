export const EDITOR_DOCUMENT_ID = "portfolio";
export const EDITOR_STORAGE_KEY = "desorden_mobile_editor_draft_v3";

const EDITABLE_STYLE_PROPERTIES = [
  "background-color",
  "border-radius",
  "box-shadow",
  "color",
  "font-family",
  "font-size",
  "font-weight",
  "height",
  "left",
  "letter-spacing",
  "line-height",
  "margin",
  "opacity",
  "padding",
  "position",
  "text-align",
  "top",
  "transform",
  "width",
  "z-index",
] as const;

export type EditableStyleProperty = (typeof EDITABLE_STYLE_PROPERTIES)[number];
export type EditableStyles = Partial<Record<EditableStyleProperty, string>>;

export interface CanvasElementEdit {
  selector: string;
  text?: string;
  src?: string;
  styles?: EditableStyles;
  hidden?: boolean;
  deletedAt?: number | null;
}

export type EditorDocument = Record<string, CanvasElementEdit>;

export interface StoredEditorDocument {
  documentId: string;
  version: number;
  data: EditorDocument;
  updatedAt: string;
  publishedAt?: string;
}

interface OriginalElementSnapshot {
  html: string;
  styleCssText: string;
  hidden: boolean;
  ariaHidden: string | null;
  src: string | null;
}

const originalSnapshots = new WeakMap<HTMLElement, OriginalElementSnapshot>();
const editableStyleSet = new Set<string>(EDITABLE_STYLE_PROPERTIES);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeSelector(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 128 &&
    /^[A-Za-z0-9][A-Za-z0-9:_-]*$/.test(value)
  );
}

function sanitizeText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.slice(0, 5_000);
}

function sanitizeSource(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 2_048) return undefined;
  if (value.startsWith("/") || value.startsWith("https://")) return value;
  return undefined;
}

function sanitizeStyleValue(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 256) return undefined;
  if (/url\s*\(|expression\s*\(|javascript:/i.test(value)) return undefined;
  return value;
}

function parseStyles(value: unknown): EditableStyles | undefined {
  if (!isRecord(value)) return undefined;

  const styles: EditableStyles = {};
  for (const [property, rawValue] of Object.entries(value)) {
    if (!editableStyleSet.has(property)) continue;
    const safeValue = sanitizeStyleValue(rawValue);
    if (safeValue !== undefined) {
      styles[property as EditableStyleProperty] = safeValue;
    }
  }

  return Object.keys(styles).length > 0 ? styles : undefined;
}

function parseCanvasElementEdit(key: string, value: unknown): CanvasElementEdit | null {
  if (!isRecord(value)) return null;

  const selector = isSafeSelector(value.selector) ? value.selector : key;
  if (!isSafeSelector(selector)) return null;

  const edit: CanvasElementEdit = { selector };
  const text = sanitizeText(value.text);
  const src = sanitizeSource(value.src);
  const styles = parseStyles(value.styles);

  if (text !== undefined) edit.text = text;
  if (src !== undefined) edit.src = src;
  if (styles !== undefined) edit.styles = styles;
  if (typeof value.hidden === "boolean") edit.hidden = value.hidden;

  if (value.deletedAt === null) {
    edit.deletedAt = null;
  } else if (
    typeof value.deletedAt === "number" &&
    Number.isSafeInteger(value.deletedAt) &&
    value.deletedAt > 0
  ) {
    edit.deletedAt = value.deletedAt;
  }

  return edit;
}

export function parseEditorDocument(value: unknown): EditorDocument {
  let candidate = value;

  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate) as unknown;
    } catch {
      return {};
    }
  }

  if (!isRecord(candidate)) return {};

  const result: EditorDocument = {};
  for (const [key, rawEdit] of Object.entries(candidate)) {
    const edit = parseCanvasElementEdit(key, rawEdit);
    if (edit) result[edit.selector] = edit;
  }
  return result;
}

export function parseStoredEditorDocument(value: unknown): StoredEditorDocument | null {
  let candidate = value;

  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate) as unknown;
    } catch {
      return null;
    }
  }

  if (!isRecord(candidate)) return null;
  if (candidate.documentId !== EDITOR_DOCUMENT_ID) return null;
  if (typeof candidate.version !== "number" || !Number.isSafeInteger(candidate.version)) return null;
  if (typeof candidate.updatedAt !== "string") return null;

  const parsed: StoredEditorDocument = {
    documentId: EDITOR_DOCUMENT_ID,
    version: Math.max(0, candidate.version),
    data: parseEditorDocument(candidate.data),
    updatedAt: candidate.updatedAt,
  };

  if (typeof candidate.publishedAt === "string") {
    parsed.publishedAt = candidate.publishedAt;
  }

  return parsed;
}

export function cloneEditorDocument(value: EditorDocument): EditorDocument {
  return parseEditorDocument(JSON.stringify(value));
}

export function findCanvasElement(selector: string): HTMLElement | null {
  if (typeof document === "undefined") return null;

  for (const element of document.querySelectorAll<HTMLElement>("[data-canvas-selector]")) {
    if (element.dataset.canvasSelector === selector) return element;
  }

  return null;
}

function captureOriginalSnapshot(element: HTMLElement): OriginalElementSnapshot {
  const existing = originalSnapshots.get(element);
  if (existing) return existing;

  const snapshot: OriginalElementSnapshot = {
    html: element.innerHTML,
    styleCssText: element.style.cssText,
    hidden: element.hidden,
    ariaHidden: element.getAttribute("aria-hidden"),
    src: element instanceof HTMLImageElement ? element.getAttribute("src") : null,
  };

  originalSnapshots.set(element, snapshot);
  return snapshot;
}

function restoreOriginalElement(element: HTMLElement): void {
  const snapshot = captureOriginalSnapshot(element);

  element.innerHTML = snapshot.html;
  element.style.cssText = snapshot.styleCssText;
  element.hidden = snapshot.hidden;

  if (snapshot.ariaHidden === null) {
    element.removeAttribute("aria-hidden");
  } else {
    element.setAttribute("aria-hidden", snapshot.ariaHidden);
  }

  if (element instanceof HTMLImageElement && snapshot.src !== null) {
    element.setAttribute("src", snapshot.src);
  }

  element.removeAttribute("data-editor-hidden");
  element.removeAttribute("data-editor-deleted");
  element.removeAttribute("data-editor-selected");
}

export function applyEditorDocument(value: EditorDocument, editing: boolean): void {
  if (typeof document === "undefined") return;

  const elements = Array.from(
    document.querySelectorAll<HTMLElement>("[data-canvas-selector]"),
  );

  for (const element of elements) restoreOriginalElement(element);

  for (const edit of Object.values(value)) {
    const element = findCanvasElement(edit.selector);
    if (!element) continue;

    if (edit.text !== undefined && !(element instanceof HTMLImageElement)) {
      element.textContent = edit.text;
    }

    if (edit.src !== undefined && element instanceof HTMLImageElement) {
      element.src = edit.src;
    }

    if (edit.styles) {
      for (const [property, styleValue] of Object.entries(edit.styles)) {
        if (styleValue !== undefined && editableStyleSet.has(property)) {
          element.style.setProperty(property, styleValue);
        }
      }
    }

    if (edit.deletedAt) {
      element.setAttribute("data-editor-deleted", "true");
      element.setAttribute("aria-hidden", "true");
      element.hidden = true;
      continue;
    }

    if (edit.hidden) {
      element.setAttribute("data-editor-hidden", "true");
      element.setAttribute("aria-hidden", "true");
      element.hidden = !editing;
    }
  }
}

export function serializeEditorDocument(value: EditorDocument): string {
  return JSON.stringify(parseEditorDocument(value));
}
