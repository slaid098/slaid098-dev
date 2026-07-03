import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getAppsDir } from "@/lib/manifest";

const extToType: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dir = join(getAppsDir(), slug);
  let chosen: string | null = null;
  for (const ext of Object.keys(extToType)) {
    const candidate = join(dir, `cover${ext}`);
    if (existsSync(candidate)) {
      chosen = candidate;
      break;
    }
  }
  if (chosen === null) {
    return new Response("Not found", { status: 404 });
  }
  const buf = await readFile(chosen);
  const dot = chosen.slice(chosen.lastIndexOf("."));
  const type = extToType[dot] ?? "application/octet-stream";
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
