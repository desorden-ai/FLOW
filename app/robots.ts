import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://www.desorden.cat/sitemap.xml",
    host: "https://www.desorden.cat",
  };
}
