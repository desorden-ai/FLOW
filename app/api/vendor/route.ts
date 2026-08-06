const CDN_SOURCES = {
  three: "https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.min.js",
  gsap: "https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js",
  "scroll-trigger": "https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js",
} as const;

type VendorLibrary = keyof typeof CDN_SOURCES;

function isVendorLibrary(value: string | null): value is VendorLibrary {
  return value !== null && Object.hasOwn(CDN_SOURCES, value);
}

export async function GET(request: Request) {
  const library = new URL(request.url).searchParams.get("library");

  if (!isVendorLibrary(library)) {
    return Response.json(
      { error: "unsupported_vendor_library" },
      {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const upstream = await fetch(CDN_SOURCES[library], {
    headers: {
      Accept: "application/javascript, text/javascript;q=0.9, */*;q=0.1",
    },
  });

  if (!upstream.ok) {
    return Response.json(
      {
        error: "vendor_library_unavailable",
        library,
        upstreamStatus: upstream.status,
      },
      {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=604800, stale-while-revalidate=2592000",
      "Content-Type": "application/javascript; charset=utf-8",
      "Cross-Origin-Resource-Policy": "same-origin",
      "X-Content-Type-Options": "nosniff",
      "X-Vendor-Library": library,
    },
  });
}
