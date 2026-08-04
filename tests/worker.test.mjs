import test, { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { serveOptimizedImage } from "../worker/image.ts";

describe("serveOptimizedImage", () => {
  let env;
  let ctx;
  let cacheMap;

  beforeEach(() => {
    cacheMap = new Map();
    globalThis.caches = {
      default: {
        match: async (req) => cacheMap.get(req.url),
        put: async (req, res) => { cacheMap.set(req.url, res); },
      }
    };

    env = {
      ASSETS: {
        fetch: async () => new Response(new Uint8Array([1, 2, 3]), {
          headers: { "Content-Type": "image/jpeg" }
        })
      },
      IMAGES: {
        input: () => ({
          transform: () => ({
            output: async () => ({
              response: () => new Response("optimized", {
                status: 200,
                statusText: "OK",
                headers: { "X-Test": "transformed" }
              })
            })
          })
        })
      }
    };

    ctx = {
      waitUntil: (promise) => { promise.catch(() => {}); },
      passThroughOnException: () => {}
    };
  });

  it("should be set up correctly", () => {
    assert.ok(serveOptimizedImage);
    assert.ok(env);
    assert.ok(ctx);
  });

  it("should return null for non-image paths", async () => {
    const request = new Request("http://localhost/not-image");
    const response = await serveOptimizedImage(request, env, ctx);
    assert.equal(response, null);
  });

  it("should return 405 for unsupported methods", async () => {
    const request = new Request("http://localhost/_image/480/jpeg/test.jpg", { method: "POST" });
    const response = await serveOptimizedImage(request, env, ctx);
    assert.equal(response.status, 405);
    assert.equal(await response.text(), "Method not allowed.");
  });

  it("should return 400 for query parameters", async () => {
    const request = new Request("http://localhost/_image/480/jpeg/test.jpg?foo=bar");
    const response = await serveOptimizedImage(request, env, ctx);
    assert.equal(response.status, 400);
    assert.equal(await response.text(), "Image query parameters are not supported.");
  });

  it("should return 400 for invalid image routes", async () => {
    const request = new Request("http://localhost/_image/invalid/route.jpg");
    const response = await serveOptimizedImage(request, env, ctx);
    assert.equal(response.status, 400);
    assert.equal(await response.text(), "Invalid image request.");
  });

  it("should forward error if ASSETS.fetch is not ok", async () => {
    env.ASSETS.fetch = async () => new Response("Not found", { status: 404 });
    const request = new Request("http://localhost/_image/480/jpeg/test.jpg");
    const response = await serveOptimizedImage(request, env, ctx);
    assert.equal(response.status, 404);
    assert.equal(await response.text(), "Not found");
  });

  it("should return 502 for non-image source type", async () => {
    env.ASSETS.fetch = async () => new Response("<html>", {
      headers: { "Content-Type": "text/html" }
    });
    const request = new Request("http://localhost/_image/480/jpeg/test.jpg");
    const response = await serveOptimizedImage(request, env, ctx);
    assert.equal(response.status, 502);
    const json = await response.json();
    assert.equal(json.error, "invalid_image_source");
    assert.equal(json.contentType, "text/html");
  });

  it("should return 502 for empty source bytes", async () => {
    env.ASSETS.fetch = async () => new Response(new Uint8Array([]), {
      headers: { "Content-Type": "image/jpeg" }
    });
    const request = new Request("http://localhost/_image/480/jpeg/test.jpg");
    const response = await serveOptimizedImage(request, env, ctx);
    assert.equal(response.status, 502);
    const json = await response.json();
    assert.equal(json.error, "empty_image_source");
  });

  it("should successfully transform and cache image", async () => {
    let waitUntilCalled = false;
    ctx.waitUntil = () => { waitUntilCalled = true; };

    const request = new Request("http://localhost/_image/480/jpeg/test.jpg");
    const response = await serveOptimizedImage(request, env, ctx);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Type"), "image/jpeg");
    assert.equal(response.headers.get("Cache-Control"), "public, max-age=31536000, immutable");
    assert.equal(response.headers.get("X-Test"), "transformed");
    assert.equal(waitUntilCalled, true);

    // Check cache map
    const cacheKey = "http://localhost/_image/480/jpeg/test.jpg";
    assert.ok(cacheMap.has(cacheKey));
  });

  it("should return cached response on subsequent requests", async () => {
    const cachedResp = new Response("cached", { headers: { "X-Cached": "true" } });
    cacheMap.set("http://localhost/_image/480/jpeg/test.jpg", cachedResp);

    const request = new Request("http://localhost/_image/480/jpeg/test.jpg");
    const response = await serveOptimizedImage(request, env, ctx);

    assert.equal(response.headers.get("X-Cached"), "true");
    assert.equal(await response.text(), "cached");
  });

  it("should return null for HEAD request on cached response", async () => {
    const cachedResp = new Response("cached", { headers: { "X-Cached": "true" } });
    cacheMap.set("http://localhost/_image/480/jpeg/test.jpg", cachedResp);

    const request = new Request("http://localhost/_image/480/jpeg/test.jpg", { method: "HEAD" });
    const response = await serveOptimizedImage(request, env, ctx);

    assert.equal(response.headers.get("X-Cached"), "true");
    assert.equal(await response.text(), "");
  });

  it("should return 502 when image transformation fails", async () => {
    env.IMAGES.input = () => { throw new Error("Transform failed") };
    const request = new Request("http://localhost/_image/480/jpeg/test.jpg");

    const originalConsoleError = console.error;
    let loggedError = "";
    console.error = (msg) => { loggedError = msg; };

    const response = await serveOptimizedImage(request, env, ctx);

    console.error = originalConsoleError;

    assert.equal(response.status, 502);
    const json = await response.json();
    assert.equal(json.error, "image_transform_failed");
    assert.ok(loggedError.includes("image_transform_failed"));
  });
});
