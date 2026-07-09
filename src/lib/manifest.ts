import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export type Manifest = {
  slug: string;
  title: string;
  description: string;
  tags?: string[];
  type?: "interactive" | "showcase";
  releaseUrl?: string;
  releaseLabel?: string;
  sourceUrl?: string;
  features?: string[];
  ogImage?: string;
  created?: string;
};

export function getAppsDir(): string {
  return join(process.cwd(), "src", "apps");
}

export function getAllSlugs(): string[] {
  return readdirSync(getAppsDir(), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => isSlugDir(name))
    .sort();
}

function isSlugDir(name: string): boolean {
  try {
    readFileSync(join(getAppsDir(), name, "manifest.json"));
    return true;
  } catch {
    return false;
  }
}

export function readManifest(slug: string): Manifest | null {
  const file = join(getAppsDir(), slug, "manifest.json");
  try {
    const raw = readFileSync(file, "utf8");
    const data = JSON.parse(raw) as Manifest;
    return normalizeManifest(data, slug);
  } catch {
    return null;
  }
}

export function readAllManifests(): Manifest[] {
  return getAllSlugs()
    .map((s) => readManifest(s))
    .filter((m): m is Manifest => m !== null)
    .sort(byCreated);
}

export function getNeighbors(slug: string): { prev: string | null; next: string | null } {
  const slugs = readAllManifests().map((m) => m.slug);
  const index = slugs.indexOf(slug);
  if (index === -1) return { prev: null, next: null };
  const prev = index > 0 ? (slugs[index - 1] ?? null) : null;
  const next = index < slugs.length - 1 ? (slugs[index + 1] ?? null) : null;
  return { prev, next };
}

export function byCreated(a: Manifest, b: Manifest): number {
  const ca = a.created ?? "9999-12-31";
  const cb = b.created ?? "9999-12-31";
  if (ca === cb) return a.slug.localeCompare(b.slug);
  return ca < cb ? -1 : 1;
}

function normalizeManifest(data: Partial<Manifest>, fallbackSlug: string): Manifest {
  const out: Manifest = {
    slug: data.slug ?? fallbackSlug,
    title: data.title ?? "",
    description: data.description ?? "",
    tags: data.tags ?? [],
  };
  if (data.ogImage !== undefined) {
    out.ogImage = data.ogImage;
  }
  if (data.type !== undefined) {
    out.type = data.type;
  }
  if (data.releaseUrl !== undefined) {
    out.releaseUrl = data.releaseUrl;
  }
  if (data.releaseLabel !== undefined) {
    out.releaseLabel = data.releaseLabel;
  }
  if (data.sourceUrl !== undefined) {
    out.sourceUrl = data.sourceUrl;
  }
  if (data.features !== undefined) {
    out.features = data.features;
  }
  if (data.created !== undefined) {
    out.created = data.created;
  }
  return out;
}
