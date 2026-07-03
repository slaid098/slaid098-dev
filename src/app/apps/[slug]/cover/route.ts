import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getAppsDir, readManifest } from "@/lib/manifest";

const extToType: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=31536000, immutable",
} as const;

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dir = join(getAppsDir(), slug);
  for (const ext of Object.keys(extToType)) {
    const candidate = join(dir, `cover${ext}`);
    if (existsSync(candidate)) {
      const buf = await readFile(candidate);
      const type = extToType[ext] ?? "application/octet-stream";
      return new Response(new Uint8Array(buf), {
        headers: { "Content-Type": type, ...CACHE_HEADERS },
      });
    }
  }
  const svg = svgFallback(slug);
  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml", ...CACHE_HEADERS },
  });
}

function svgFallback(slug: string): string {
  const manifest = readManifest(slug);
  const title = manifest?.title ?? slug;
  const hue = hashHue(slug);
  const letter = firstLetter(title);
  const bgFrom = `hsl(${hue}, 65%, 11%)`;
  const bgTo = `hsl(${(hue + 40) % 360}, 65%, 5%)`;
  const ink = `hsl(${hue}, 90%, 68%)`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bgFrom}"/><stop offset="1" stop-color="${bgTo}"/></linearGradient></defs><rect width="1200" height="675" fill="url(#g)"/><text x="600" y="337" font-family="ui-sans-serif, system-ui, sans-serif" font-size="300" font-weight="700" fill="${ink}" text-anchor="middle" dominant-baseline="central">${letter}</text></svg>`;
}

function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

function firstLetter(title: string): string {
  const trimmed = title.trim();
  const ch = trimmed.charAt(0);
  if (ch.length === 0) return "•";
  const safe = ch.replace(/[<>&"']/g, "");
  return safe.length > 0 ? safe.toUpperCase() : "•";
}
