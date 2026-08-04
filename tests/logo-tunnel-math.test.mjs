import assert from "node:assert/strict";
import test from "node:test";
import {
  clampFinite,
  finiteOr,
  interpolateProgress,
} from "../hooks/logoTunnelMath.ts";

test("clampFinite rejects NaN and Infinity", () => {
  assert.equal(clampFinite(Number.NaN, 0, 1, 0.25), 0.25);
  assert.equal(clampFinite(Number.POSITIVE_INFINITY, 0, 1, 0.4), 0.4);
  assert.equal(clampFinite(-2), 0);
  assert.equal(clampFinite(2), 1);
});

test("finiteOr rejects invalid Z coordinates", () => {
  assert.equal(finiteOr(Number.NaN, -1000), -1000);
  assert.equal(finiteOr(-2500, -1000), -2500);
});

function simulate(refreshRate) {
  const frameMs = 1000 / refreshRate;
  let progress = 0;

  for (let elapsed = 0; elapsed < 1000; elapsed += frameMs) {
    progress = interpolateProgress(progress, 1, frameMs);
  }

  return progress;
}

test("tunnel easing is stable at 60, 90 and 120 Hz", () => {
  const sixty = simulate(60);
  const ninety = simulate(90);
  const oneTwenty = simulate(120);

  assert.ok(Math.abs(sixty - ninety) < 0.003);
  assert.ok(Math.abs(sixty - oneTwenty) < 0.003);
});
