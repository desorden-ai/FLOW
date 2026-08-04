import handler from "vinext/server/app-router-entry";
import { serveOptimizedImage, type Env, type ExecutionContext } from "./image.ts";

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const optimizedImage = await serveOptimizedImage(request, env, ctx);
      if (optimizedImage) return optimizedImage;
      // @ts-expect-error - external handler types might differ
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

export default worker;
