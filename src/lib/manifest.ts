import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ReactNode } from "react";

export type EngineName = "static" | "canvas" | "quiz" | "clicker";

export type Manifest = {
  slug: string;
  title: string;
  description: string;
  engine?: EngineName;
  tags?: string[];
  ogImage?: string;
  content?: string;
};

export type Engine = (ctx: { manifest: Manifest; folder: string }) => ReactNode;

const __dirname = dirname(fileURLToPath(import.meta.url));
const appsDir = join(__dirname, "..", "apps");

export function getAppsDir(): string {
  return appsDir;
}

export function getAllSlugs(): string[] {
  return readdirSync(appsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => isSlugDir(name))
    .sort();
}

function isSlugDir(name: string): boolean {
  try {
    readFileSync(join(appsDir, name, "manifest.json"));
    return true;
  } catch {
    return false;
  }
}

export function readManifest(slug: string): Manifest | null {
  const file = join(appsDir, slug, "manifest.json");
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
    .filter((m): m is Manifest => m !== null);
}

export function getNeighbors(slug: string): { prev: string | null; next: string | null } {
  const slugs = getAllSlugs();
  const index = slugs.indexOf(slug);
  if (index === -1) return { prev: null, next: null };
  const prev = index > 0 ? (slugs[index - 1] ?? null) : null;
  const next = index < slugs.length - 1 ? (slugs[index + 1] ?? null) : null;
  return { prev, next };
}

function normalizeManifest(data: Partial<Manifest>, fallbackSlug: string): Manifest {
  const out: Manifest = {
    slug: data.slug ?? fallbackSlug,
    title: data.title ?? "",
    description: data.description ?? "",
    engine: data.engine ?? "static",
    tags: data.tags ?? [],
  };
  if (data.ogImage !== undefined) {
    out.ogImage = data.ogImage;
  }
  if (data.content !== undefined) {
    out.content = data.content;
  }
  return out;
}
