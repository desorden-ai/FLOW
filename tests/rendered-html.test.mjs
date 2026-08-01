import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("is a mobile-first semantic portfolio with minimal hydration", async () => {
  const [page, layout, controller, picture, worker, wrangler, headers] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("components/PortfolioController.tsx", root), "utf8"),
    readFile(new URL("components/ProjectPicture.tsx", root), "utf8"),
    readFile(new URL("worker/index.ts", root), "utf8"),
    readFile(new URL("wrangler.jsonc", root), "utf8"),
    readFile(new URL("public/_headers", root), "utf8"),
  ]);

  assert.doesNotMatch(page, /^"use client"/);
  assert.doesNotMatch(page, /makeStars\(210\)|className="cosmic-star"/);
  assert.match(page, /PortfolioController/);
  assert.match(page, /QuantitativeValue/);
  assert.match(page, /itemType="https:\/\/schema\.org\/ItemList"/);
  assert.match(page, /data-media-marquee/);
  assert.equal((page.match(/media-marquee__track/g) ?? []).length, 1);

  assert.match(controller, /^"use client"/);
  assert.match(controller, /addEventListener\("wheel"/);
  assert.match(controller, /dataset\.state/);

  assert.match(picture, /<picture/);
  assert.match(picture, /image\/avif/);
  assert.match(picture, /image\/webp/);
  assert.match(picture, /decoding="async"/);

  assert.match(worker, /env\.IMAGES/);
  assert.match(worker, /env\.ASSETS/);
  assert.match(wrangler, /"binding": "IMAGES"/);
  assert.match(wrangler, /"enabled": true/);
  assert.match(headers, /immutable/);

  assert.doesNotMatch(layout, /Immersive Editable Portfolio/);
  assert.match(layout, /application\/ld\+json/);
  assert.match(layout, /<html lang="en">/);
});
