import type { MetadataRoute } from "next";

const origin = "https://enclavelibrary.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${origin}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${origin}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${origin}/kvkk`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${origin}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${origin}/contact`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
