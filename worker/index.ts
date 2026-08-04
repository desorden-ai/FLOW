import handler from "vinext/server/app-router-entry";

interface ImageOutput {
  response(): Response;
}

interface ImagePipeline {
  transform(options: { width: number }): ImagePipeline;
  output(options: { format: string; quality: number }): Promise<ImageOutput>;
}

interface ImagesBinding {
  input(stream: ReadableStream): ImagePipeline;
}

interface Env {
  ASSETS: Fetcher;
  IMAGES: ImagesBinding;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const IMAGE_ROUTE =
  /^\/_image\/(480|768|1024|1440)\/(avif|webp|jpeg|png)\/([a-z0-9/_-]+\.(?:jpg|jpeg|png|webp|gif|avif))$/i;
const OUTPUT_MIME = {
  avif: "image/avif",
  webp: "image/webp",
  jpeg: "image/jpeg",
  png: "image/png",
} as const;
const OUTPUT_QUALITY = { avif: 76, webp: 82, jpeg: 82, png: 100 } as const;

async function serveOptimizedImage(request: Request, env: Env, ctx: ExecutionContext): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/_image/")) return null;
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed.", {
      status: 405,
      headers: { Allow: "GET, HEAD" },
    });
  }
  if (url.search) return new Response("Image query parameters are not supported.", { status: 400 });

  const match = IMAGE_ROUTE.exec(url.pathname);
  if (!match) return new Response("Invalid image request.", { status: 400 });

  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: "GET" });
  const cachedResponse = await cache.match(cacheKey);

  if (cachedResponse) {
    if (request.method === "HEAD") {
      return new Response(null, { headers: cachedResponse.headers });
    }
    return cachedResponse;
  }

  const [, widthToken, formatTokenRaw, assetPath] = match;
  const formatToken = formatTokenRaw.toLowerCase() as keyof typeof OUTPUT_MIME;
  const normalizedAssetPath = assetPath.replace(/^media\//i, "");
  const sourceUrl = new URL(`/media/${normalizedAssetPath}`, request.url);
  const sourceResponse = await env.ASSETS.fetch(
    new Request(sourceUrl, {
      method: "GET",
      headers: { Accept: "image/avif,image/webp,image/*,*/*;q=0.8" },
    }),
  );

  if (!sourceResponse.ok) return sourceResponse;

  const sourceType = sourceResponse.headers.get("Content-Type") ?? "";
  if (!sourceType.toLowerCase().startsWith("image/")) {
    return Response.json(
      { error: "invalid_image_source", source: sourceUrl.pathname, contentType: sourceType },
      { status: 502 },
    );
  }

  const sourceBytes = await sourceResponse.arrayBuffer();
  if (sourceBytes.byteLength === 0) {
    return Response.json(
      { error: "empty_image_source", source: sourceUrl.pathname },
      { status: 502 },
    );
  }

  const sourceStream = new Response(sourceBytes).body;
  if (!sourceStream) {
    return Response.json(
      { error: "unreadable_image_source", source: sourceUrl.pathname },
      { status: 502 },
    );
  }

  try {
    const transformed = (
      await env.IMAGES.input(sourceStream)
        .transform({ width: Number(widthToken) })
        .output({ format: OUTPUT_MIME[formatToken], quality: OUTPUT_QUALITY[formatToken] })
    ).response();

    const headers = new Headers(transformed.headers);
    headers.set("Content-Type", OUTPUT_MIME[formatToken]);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("Cross-Origin-Resource-Policy", "same-origin");
    headers.set("X-Content-Type-Options", "nosniff");

    const responseToCache = new Response(transformed.body, {
      status: transformed.status,
      statusText: transformed.statusText,
      headers,
    });

    // clone the response before caching
    const responseToReturn = responseToCache.clone();

    ctx.waitUntil(cache.put(cacheKey, responseToCache));

    if (request.method === "HEAD") {
        return new Response(null, {
            status: responseToReturn.status,
            statusText: responseToReturn.statusText,
            headers: responseToReturn.headers
        });
    }

    return responseToReturn;

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown image transformation error";
    console.error(
      JSON.stringify({
        event: "image_transform_failed",
        path: url.pathname,
        source: sourceUrl.pathname,
        sourceType,
        sourceBytes: sourceBytes.byteLength,
        message,
      }),
    );
    return Response.json(
      { error: "image_transform_failed" },
      { status: 502 },
    );
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const optimizedImage = await serveOptimizedImage(request, env, ctx);
      if (optimizedImage) return optimizedImage;
      return handler.fetch(request, env, ctx);
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "request_failed",
          url: request.url,
          error: error instanceof Error ? error.message : "Unknown error",
        }),
      );
      return new Response("Internal server error.", { status: 500 });
    }
  },
};
