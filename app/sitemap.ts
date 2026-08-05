import type { MetadataRoute } from "next";

const siteUrl = "https://www.desorden.cat";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${siteUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/ia-automatitzacio`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${siteUrl}/disseny-web`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${siteUrl}/drons`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${siteUrl}/ajuts`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/preus`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/sobre-nosaltres`, changeFrequency: "monthly", priority: 0.7 },
  ];
}
