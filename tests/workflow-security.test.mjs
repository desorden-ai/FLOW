import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const workflows = [
  ".github/workflows/quality-audit.yml",
  ".github/workflows/cloudflare-deploy.yml",
];

test("keeps CI/CD compatible with the repository-owned-actions policy", async () => {
  for (const workflow of workflows) {
    const content = await readFile(new URL(workflow, root), "utf8");

    assert.doesNotMatch(
      content,
      /^\s*uses:\s+/m,
      `${workflow} must not invoke external or reusable GitHub Actions`,
    );

    assert.match(content, /git fetch --no-tags --depth=1 origin/);
    assert.match(content, /Select Node\.js 22 from runner toolcache/);
    assert.match(content, /RUNNER_TOOL_CACHE\/node/);
  }
});

test("deploys with the project-pinned Wrangler CLI and GitHub REST API", async () => {
  const deployWorkflow = await readFile(
    new URL(".github/workflows/cloudflare-deploy.yml", root),
    "utf8",
  );

  assert.match(deployWorkflow, /npx --no-install wrangler deploy/);
  assert.match(deployWorkflow, /\/statuses\/\$\{GITHUB_SHA\}/);
  assert.doesNotMatch(deployWorkflow, /wrangler-action|github-script/);
});
