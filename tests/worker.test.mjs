import test, { mock } from "node:test";
import assert from "node:assert/strict";

mock.module("vinext/server/app-router-entry", {
  defaultExport: {
    fetch: async (req, env, ctx) => {
      if (req.url.includes("fail")) {
        throw new Error("Simulated app router error");
      }
      return new Response("App router response", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });
    },
  },
});

const worker = (await import("../worker/index.ts")).default;

test("Worker fetch handler", async (t) => {
  const env = {};
  const ctx = {
    waitUntil: () => {},
    passThroughOnException: () => {},
  };

  // Mock caches global used in worker
  global.caches = {
    default: {
      match: async () => undefined,
      put: async () => undefined,
    }
  };

  await t.test("delegates to app router and adds security headers", async () => {
    const req = new Request("http://localhost/");
    const res = await worker.fetch(req, env, ctx);

    assert.equal(res.status, 200);
    assert.equal(await res.text(), "App router response");

    // Check security headers
    assert.ok(res.headers.has("Content-Security-Policy"));
    assert.equal(res.headers.get("X-Frame-Options"), "DENY");
    assert.equal(res.headers.get("X-Content-Type-Options"), "nosniff");
    assert.equal(res.headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
  });

  await t.test("handles internal server errors gracefully", async () => {
    const req = new Request("http://localhost/fail");

    // Intercept console.error to avoid test output noise
    const originalConsoleError = console.error;
    let errorLog = null;
    console.error = (msg) => { errorLog = msg; };

    const res = await worker.fetch(req, env, ctx);

    console.error = originalConsoleError;

    assert.equal(res.status, 500);
    assert.equal(await res.text(), "Internal server error.");

    // Check security headers are still applied
    assert.ok(res.headers.has("Content-Security-Policy"));
    assert.equal(res.headers.get("X-Frame-Options"), "DENY");

    // Check error was logged
    assert.ok(errorLog);
    const parsedLog = JSON.parse(errorLog);
    assert.equal(parsedLog.event, "request_failed");
    assert.equal(parsedLog.error, "Simulated app router error");
  });

  await t.test("adds noindex for .workers.dev domains", async () => {
    const req = new Request("https://my-app.workers.dev/");
    const res = await worker.fetch(req, env, ctx);

    assert.equal(res.headers.get("X-Robots-Tag"), "noindex, nofollow");
  });

  await t.test("strips body for HEAD requests", async () => {
    const req = new Request("http://localhost/", { method: "HEAD" });
    const res = await worker.fetch(req, env, ctx);

    assert.equal(res.status, 200);
    assert.equal(res.body, null);
  });

  await t.test("handles image requests via fetchSourceImage", async () => {
    const envWithAssets = {
      ASSETS: {
        fetch: async () => new Response(new ArrayBuffer(10), {
          headers: { "Content-Type": "image/webp" }
        })
      }
    };
    const req = new Request("http://localhost/_image/480/webp/test.webp");
    const res = await worker.fetch(req, envWithAssets, ctx);

    assert.equal(res.status, 200);
    assert.equal(res.headers.get("Content-Type"), "image/webp");
    assert.equal(res.headers.get("X-Image-Transform"), "source-fallback");
  });
});
