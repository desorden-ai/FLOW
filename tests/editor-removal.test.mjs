import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const deletedPaths = [
  "app/editor/page.tsx",
  "app/editor/editor.css",
  "app/editor/position-controls.css",
  "app/api/auth/route.ts",
  "app/api/draft/route.ts",
  "app/api/publish/route.ts",
  "components/VisualLayoutEditor.tsx",
  "components/EditorPositionControls.tsx",
  "lib/editor-model.ts",
  "lib/editor-server.ts",
  "lib/editor-position.ts",
  "tests/editor-position.test.mjs",
  "fix-sizes.sh",
  "fix-braces.sh",
];

const forbiddenRuntimePatterns = [
  /\/editor\b/,
  /\/api\/(?:auth|draft|publish)\b/,
  /VisualLayoutEditor/,
  /EditorPositionControls/,
  /editor-(?:model|server|position)/,
  /enableEditor/,
  /data-canvas-selector/,
  /canvas-editor-active/,
  /canvas-3d-exploded-active/,
  /resize-handle/,
  /editing-inline/,
  /EDITOR_PASSWORD/,
  /EDITOR_SESSION_SECRET/,
];

async function collectFiles(directory) {
  const directoryUrl = new URL(`${directory}/`, root);
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = `${directory}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await collectFiles(relativePath));
    else if (/\.(?:css|mjs|ts|tsx|yml)$/.test(entry.name)) files.push(relativePath);
  }

  return files;
}

test("removes the public editor and its runtime surface", async () => {
  for (const path of deletedPaths) {
    await assert.rejects(access(new URL(path, root)), { code: "ENOENT" });
  }

  const runtimeFiles = [
    ...await collectFiles("app"),
    ...await collectFiles("components"),
    ...await collectFiles("lib"),
    ...await collectFiles(".github/workflows"),
  ];

  for (const path of runtimeFiles) {
    const content = await readFile(new URL(path, root), "utf8");
    for (const pattern of forbiddenRuntimePatterns) {
      assert.doesNotMatch(content, pattern, `${path} still contains editor residue: ${pattern}`);
    }
  }
});
