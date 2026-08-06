import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const workflows = [
  ".github/workflows/quality-audit.yml",
  ".github/workflows/cloudflare-deploy.yml",
];

const IMMUTABLE_ACTION =
  /^\s*uses:\s+[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+@[0-9a-f]{40}(?:\s+#.*)?$/;

test("pins every third-party GitHub Action to an immutable commit SHA", async () => {
  for (const workflow of workflows) {
    const content = await readFile(new URL(workflow, root), "utf8");
    const actionLines = content
      .split("\n")
      .filter((line) => /^\s*uses:\s+/.test(line));

    assert.ok(actionLines.length > 0, `${workflow} should contain actions`);

    for (const line of actionLines) {
      assert.match(
        line,
        IMMUTABLE_ACTION,
        `${workflow} contains a mutable or invalid action reference: ${line.trim()}`,
      );
    }
  }
});
