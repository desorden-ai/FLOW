const REFERENCE_FRAME_MS = 1000 / 60;
const REFERENCE_EASING = 0.09;

export function clampFinite(value: number, min = 0, max = 1, fallback = min) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

export function finiteOr(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

export function interpolateProgress(
  current: number,
  target: number,
  deltaMs: number,
) {
  const safeCurrent = clampFinite(current, 0, 1, 0);
  const safeTarget = clampFinite(target, 0, 1, safeCurrent);
  const safeDelta = clampFinite(deltaMs, 0, 250, REFERENCE_FRAME_MS);
  const alpha = 1 - Math.pow(1 - REFERENCE_EASING, safeDelta / REFERENCE_FRAME_MS);

  return clampFinite(
    safeCurrent + (safeTarget - safeCurrent) * alpha,
    0,
    1,
    safeTarget,
  );
}
