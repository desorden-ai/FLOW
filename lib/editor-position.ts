export const EDITOR_MOVE_STEPS = [1, 4, 10, 20] as const;

export type EditorMoveStep = (typeof EDITOR_MOVE_STEPS)[number];

export function parsePixelValue(value: string | undefined, fallback = 0): number {
  if (!value || value === "auto") return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function nudgePixelValue(value: string | undefined, delta: number): string {
  const next = parsePixelValue(value) + delta;
  return `${Math.round(next * 100) / 100}px`;
}

export function scalePixelValue(baseSize: number, percentage: number): string {
  const safeBase = Number.isFinite(baseSize) ? Math.max(1, baseSize) : 1;
  const safePercentage = Number.isFinite(percentage)
    ? Math.min(200, Math.max(25, percentage))
    : 100;
  const next = safeBase * (safePercentage / 100);
  return `${Math.round(next * 100) / 100}px`;
}
