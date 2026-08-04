import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://www.desorden.cat/",
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
