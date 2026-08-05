import assert from "node:assert/strict";
import test from "node:test";
import {
  nudgePixelValue,
  parsePixelValue,
  scalePixelValue,
} from "../lib/editor-position.ts";

test("parsePixelValue handles pixels, auto and invalid values", () => {
  assert.equal(parsePixelValue("12px"), 12);
  assert.equal(parsePixelValue("-4.5px"), -4.5);
  assert.equal(parsePixelValue("auto"), 0);
  assert.equal(parsePixelValue("invalid", 7), 7);
});

test("nudgePixelValue moves in both directions", () => {
  assert.equal(nudgePixelValue("10px", 4), "14px");
  assert.equal(nudgePixelValue("auto", -10), "-10px");
  assert.equal(nudgePixelValue("1.25px", 0.5), "1.75px");
});

test("scalePixelValue clamps the slider range", () => {
  assert.equal(scalePixelValue(200, 50), "100px");
  assert.equal(scalePixelValue(200, 100), "200px");
  assert.equal(scalePixelValue(200, 250), "400px");
  assert.equal(scalePixelValue(200, 10), "50px");
});
