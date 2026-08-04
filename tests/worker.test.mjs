import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";

describe("worker index error handling", () => {
  it("should catch and return 502 when image transformation fails", async () => {
    mock.module("vinext/server/app-router-entry", {
      defaultExport: {
        fetch: async () => new Response("mocked app router"),
      },
    });

    const worker = (await import("../worker/index.ts")).default;

    const request = new Request("http://localhost/_image/480/webp/media/image.webp", { method: "GET" });

    global.caches = {
      default: {
        match: async () => null,
        put: async () => {},
      }
    };

    const mockEnv = {
      ASSETS: {
        fetch: async () => new Response("fake-image-data", {
          headers: { "Content-Type": "image/webp" }
        })
      },
      IMAGES: {
        input: () => ({
          transform: () => ({
            output: async () => {
              throw new Error("Simulated transformation error");
            }
          })
        })
      }
    };

    const mockCtx = {
      waitUntil: () => {},
      passThroughOnException: () => {}
    };

    const originalConsoleError = console.error;
    let loggedError = null;
    console.error = (msg) => { loggedError = msg; };

    try {
      const response = await worker.fetch(request, mockEnv, mockCtx);
      assert.equal(response.status, 502);

      const body = await response.json();
      assert.equal(body.error, "image_transform_failed");
      assert.equal(body.message, "Simulated transformation error");

      assert.ok(loggedError);
      const parsedLog = JSON.parse(loggedError);
      assert.equal(parsedLog.event, "image_transform_failed");
      assert.equal(parsedLog.message, "Simulated transformation error");
    } finally {
      console.error = originalConsoleError;
    }
  });

  it("should catch and return 502 when image transformation fails without Error object", async () => {
    const worker = (await import("../worker/index.ts")).default;

    const request = new Request("http://localhost/_image/480/webp/media/image.webp", { method: "GET" });

    global.caches = {
      default: {
        match: async () => null,
        put: async () => {},
      }
    };

    const mockEnv = {
      ASSETS: {
        fetch: async () => new Response("fake-image-data", {
          headers: { "Content-Type": "image/webp" }
        })
      },
      IMAGES: {
        input: () => ({
          transform: () => ({
            output: async () => {
              throw "Some string error";
            }
          })
        })
      }
    };

    const mockCtx = {
      waitUntil: () => {},
      passThroughOnException: () => {}
    };

    const originalConsoleError = console.error;
    let loggedError = null;
    console.error = (msg) => { loggedError = msg; };

    try {
      const response = await worker.fetch(request, mockEnv, mockCtx);
      assert.equal(response.status, 502);

      const body = await response.json();
      assert.equal(body.error, "image_transform_failed");
      assert.equal(body.message, "Unknown image transformation error");

      assert.ok(loggedError);
      const parsedLog = JSON.parse(loggedError);
      assert.equal(parsedLog.event, "image_transform_failed");
      assert.equal(parsedLog.message, "Unknown image transformation error");
    } finally {
      console.error = originalConsoleError;
    }
  });
});
