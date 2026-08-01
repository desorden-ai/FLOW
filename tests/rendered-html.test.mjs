import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("is a neutral image-placeholder portfolio", async () => {
  const [page, layout, readme, wrangler] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("wrangler.jsonc", root), "utf8"),
  ]);

  assert.match(page, /ImagePlaceholder/);
  assert.match(page, /number="01"/);
  assert.match(page, /\["19", "Media title 06"/);
  assert.doesNotMatch(page, /<img\b|<iframe\b|https?:\/\/|mailto:/i);
  assert.doesNotMatch(page, /Daniel|Dungyov|CleverTap|Workboard|Furever/i);
  assert.doesNotMatch(page, /50%|60%|1,500|10,000|40k/i);
  assert.match(page, /const scenes: SceneDefinition\[\]/);
  assert.match(page, /className="progress-rail"/);
  assert.match(layout, /Immersive Editable Portfolio/);
  assert.match(readme, /Cloudflare Workers/);
  assert.match(wrangler, /2026-05-22/);
});
