import { readAllManifests } from "@/lib/manifest";
import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://slaid098.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const apps = readAllManifests().map((m) => ({
    url: `${baseUrl}/${m.slug}`,
    lastModified: m.created ? new Date(m.created) : now,
    priority: 0.8,
  }));
  return [{ url: baseUrl, lastModified: now, priority: 1 }, ...apps];
}
