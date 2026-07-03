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
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
};

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=31536000, immutable",
} as const;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; file: string[] }> },
) {
  const { slug, file } = await params;
  if (file === undefined || file.length === 0) {
    return new Response("Not found", { status: 404 });
  }
  const filename = file.join("/");
  const dir = join(getAppsDir(), slug);
  const filepath = join(dir, filename);

  // Security check: ensure path doesn't escape the app's directory
  if (!filepath.startsWith(dir)) {
    return new Response("Forbidden", { status: 403 });
  }

  if (existsSync(filepath)) {
    const buf = await readFile(filepath);
    const ext = filename.slice(filename.lastIndexOf("."));
    const type = extToType[ext] ?? "application/octet-stream";
    return new Response(new Uint8Array(buf), {
      headers: { "Content-Type": type, ...CACHE_HEADERS },
    });
  }

  return new Response("Not found", { status: 404 });
}
