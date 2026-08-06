import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("keeps preview builds resource-neutral and injects the production KV binding", async () => {
  const [wrangler, deployWorkflow] = await Promise.all([
    source("wrangler.jsonc"),
    source(".github/workflows/cloudflare-deploy.yml"),
  ]);

  assert.doesNotMatch(wrangler, /00000000000000000000000000000000/);
  assert.doesNotMatch(wrangler, /"binding"\s*:\s*"EDITOR_KV"/);

  assert.match(deployWorkflow, /EDITOR_KV_ID/);
  assert.match(deployWorkflow, /config\.kv_namespaces \?\?= \[\]/);
  assert.match(deployWorkflow, /binding:\s*"EDITOR_KV"/);
  assert.match(deployWorkflow, /id:\s*process\.env\.EDITOR_KV_ID/);
});
