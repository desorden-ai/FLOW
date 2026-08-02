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

const IMAGE_ROUTE = /^\/_image\/(480|768|1024|1440)\/(avif|webp|jpeg)\/([a-z0-9/_-]+\.(?:jpg|jpeg|png|webp))$/i;
const OUTPUT_MIME = { avif: "image/avif", webp: "image/webp", jpeg: "image/jpeg" } as const;

async function serveOptimizedImage(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/_image/")) return null;
  if (url.search) return new Response("Image query parameters are not supported.", { status: 400 });

  const match = IMAGE_ROUTE.exec(url.pathname);
  if (!match) return new Response("Invalid image request.", { status: 400 });

  const [, widthToken, formatTokenRaw, assetPath] = match;
  const formatToken = formatTokenRaw.toLowerCase() as keyof typeof OUTPUT_MIME;
  const normalizedAssetPath = assetPath.replace(/^media\//i, "");
  const sourceUrl = new URL(`/media/${normalizedAssetPath}`, request.url);
  const sourceResponse = await env.ASSETS.fetch(new Request(sourceUrl, { method: "GET" }));

  if (!sourceResponse.ok || !sourceResponse.body) return sourceResponse;

  const transformed = (
    await env.IMAGES.input(sourceResponse.body)
      .transform({ width: Number(widthToken) })
      .output({ format: OUTPUT_MIME[formatToken], quality: formatToken === "jpeg" ? 82 : 76 })
  ).response();

  const headers = new Headers(transformed.headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");

  return new Response(transformed.body, { status: transformed.status, headers });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const optimizedImage = await serveOptimizedImage(request, env);
      if (optimizedImage) return optimizedImage;
      return handler.fetch(request, env, ctx);
    } catch (error) {
      console.error(JSON.stringify({
        event: "request_failed",
        url: request.url,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
      return new Response("Internal server error.", { status: 500 });
    }
  },
};
