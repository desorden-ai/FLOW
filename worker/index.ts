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
  IMAGES?: ImagesBinding;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

type SourceImage = {
  bytes: ArrayBuffer;
  sourceType: string;
  sourceUrlPathname: string;
};

const IMAGE_ROUTE =
  /^\/_image\/(480|768|1024|1440)\/(avif|webp|jpeg|png)\/([a-z0-9/_-]+\.(?:jpg|jpeg|png|webp|gif|avif))$/i;
const OUTPUT_MIME = {
  avif: "image/avif",
  webp: "image/webp",
  jpeg: "image/jpeg",
  png: "image/png",
} as const;
const OUTPUT_QUALITY = { avif: 72, webp: 80, jpeg: 80, png: 100 } as const;
const MEDIA_CACHE_CONTROL = "public, max-age=31536000, immutable";
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self' https://wa.me https://api.whatsapp.com",
  "img-src 'self' data:",
  "font-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  "object-src 'none'",
].join("; ");

function applySecurityHeaders(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  const hostname = new URL(request.url).hostname;

  headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
  headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");

  if (hostname.endsWith(".workers.dev")) {
    headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  const hasNoBody = request.method === "HEAD" || [101, 204, 205, 304].includes(response.status);
  return new Response(hasNoBody ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function fetchSourceImage(
  env: Env,
  requestUrl: string,
  assetPath: string,
): Promise<Response | SourceImage> {
  const normalizedAssetPath = assetPath.replace(/^media\//i, "");
  const sourceUrl = new URL(`/media/${normalizedAssetPath}`, requestUrl);
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

  const bytes = await sourceResponse.arrayBuffer();
  if (bytes.byteLength === 0) {
    return Response.json(
      { error: "empty_image_source", source: sourceUrl.pathname },
      { status: 502 },
    );
  }

  return {
    bytes,
    sourceType,
    sourceUrlPathname: sourceUrl.pathname,
  };
}

function sourceFallbackResponse(requestMethod: string, source: SourceImage): Response {
  const headers = new Headers({
    "Cache-Control": MEDIA_CACHE_CONTROL,
    "Content-Type": source.sourceType,
    "Cross-Origin-Resource-Policy": "same-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Image-Transform": "source-fallback",
  });

  return new Response(requestMethod === "HEAD" ? null : source.bytes.slice(0), {
    status: 200,
    headers,
  });
}

async function transformAndCacheImage(
  env: Env,
  ctx: ExecutionContext,
  cacheKey: Request,
  requestMethod: string,
  source: SourceImage,
  widthToken: string,
  formatToken: keyof typeof OUTPUT_MIME,
  urlPathname: string,
): Promise<Response> {
  const cache = caches.default;
  const sourceStream = new Response(source.bytes.slice(0)).body;

  if (!env.IMAGES || !sourceStream) {
    return sourceFallbackResponse(requestMethod, source);
  }

  try {
    const transformed = (
      await env.IMAGES.input(sourceStream)
        .transform({ width: Number(widthToken) })
        .output({ format: OUTPUT_MIME[formatToken], quality: OUTPUT_QUALITY[formatToken] })
    ).response();

    const headers = new Headers(transformed.headers);
    headers.set("Content-Type", OUTPUT_MIME[formatToken]);
    headers.set("Cache-Control", MEDIA_CACHE_CONTROL);
    headers.set("Cross-Origin-Resource-Policy", "same-origin");
    headers.set("X-Content-Type-Options", "nosniff");

    const responseToCache = new Response(transformed.body, {
      status: transformed.status,
      statusText: transformed.statusText,
      headers,
    });

    const responseToReturn = responseToCache.clone();
    ctx.waitUntil(cache.put(cacheKey, responseToCache));

    if (requestMethod === "HEAD") {
      return new Response(null, {
        status: responseToReturn.status,
        statusText: responseToReturn.statusText,
        headers: responseToReturn.headers,
      });
    }

    return responseToReturn;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown image transformation error";
    console.error(
      JSON.stringify({
        event: "image_transform_failed",
        path: urlPathname,
        source: source.sourceUrlPathname,
        sourceType: source.sourceType,
        sourceBytes: source.bytes.byteLength,
        message,
      }),
    );
    return sourceFallbackResponse(requestMethod, source);
  }
}

function validateImageRequest(request: Request, url: URL): Response | RegExpExecArray {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed.", {
      status: 405,
      headers: { Allow: "GET, HEAD" },
    });
  }
  if (url.search) return new Response("Image query parameters are not supported.", { status: 400 });

  const match = IMAGE_ROUTE.exec(url.pathname);
  if (!match) return new Response("Invalid image request.", { status: 400 });

  return match;
}

async function serveOptimizedImage(request: Request, env: Env, ctx: ExecutionContext): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/_image/")) return null;

  const validationResult = validateImageRequest(request, url);
  if (validationResult instanceof Response) return validationResult;
  const match = validationResult;

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

  const fetchResult = await fetchSourceImage(env, request.url, assetPath);
  if (fetchResult instanceof Response) return fetchResult;

  return transformAndCacheImage(
    env,
    ctx,
    cacheKey,
    request.method,
    fetchResult,
    widthToken,
    formatToken,
    url.pathname,
  );
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const optimizedImage = await serveOptimizedImage(request, env, ctx);
      const response = optimizedImage ?? await handler.fetch(request, env, ctx);
      return applySecurityHeaders(request, response);
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "request_failed",
          url: request.url,
          error: error instanceof Error ? error.message : "Unknown error",
        }),
      );
      return applySecurityHeaders(request, new Response("Internal server error.", { status: 500 }));
    }
  },
};

export default worker;
