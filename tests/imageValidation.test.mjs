import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import { serveOptimizedImage } from "../worker/image.ts";

describe("serveOptimizedImage validation", () => {
  const dummyEnv = {};
  const dummyCtx = {};

  it("should return null for non-image paths", async () => {
    const request = new Request("http://localhost/something-else");
    const response = await serveOptimizedImage(request, dummyEnv, dummyCtx);
    assert.equal(response, null);
  });

  it("should return 405 for unsupported HTTP methods", async () => {
    const request = new Request("http://localhost/_image/480/webp/test.jpg", { method: "POST" });
    const response = await serveOptimizedImage(request, dummyEnv, dummyCtx);
    assert.equal(response.status, 405);
    assert.equal(await response.text(), "Method not allowed.");
  });

  it("should return 400 for requests with query parameters", async () => {
    const request = new Request("http://localhost/_image/480/webp/test.jpg?foo=bar");
    const response = await serveOptimizedImage(request, dummyEnv, dummyCtx);
    assert.equal(response.status, 400);
    assert.equal(await response.text(), "Image query parameters are not supported.");
  });

  it("should return 400 for invalid widths", async () => {
    const request = new Request("http://localhost/_image/500/webp/test.jpg");
    const response = await serveOptimizedImage(request, dummyEnv, dummyCtx);
    assert.equal(response.status, 400);
    assert.equal(await response.text(), "Invalid image request.");
  });

  it("should return 400 for invalid formats", async () => {
    const request = new Request("http://localhost/_image/480/gif/test.jpg");
    const response = await serveOptimizedImage(request, dummyEnv, dummyCtx);
    assert.equal(response.status, 400);
    assert.equal(await response.text(), "Invalid image request.");
  });

  it("should return 400 for invalid file extensions", async () => {
    const request = new Request("http://localhost/_image/480/webp/test.txt");
    const response = await serveOptimizedImage(request, dummyEnv, dummyCtx);
    assert.equal(response.status, 400);
    assert.equal(await response.text(), "Invalid image request.");
  });

  it("should return 400 for invalid characters in filename", async () => {
    const request = new Request("http://localhost/_image/480/webp/test file.jpg");
    const response = await serveOptimizedImage(request, dummyEnv, dummyCtx);
    assert.equal(response.status, 400);
    assert.equal(await response.text(), "Invalid image request.");
  });
});
