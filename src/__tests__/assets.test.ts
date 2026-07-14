import { existsSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { GET } from "@/app/apps/[slug]/assets/[...file]/route";
import { getAppsDir } from "@/lib/manifest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("assets route", () => {
  const okotisDir = join(getAppsDir(), "okotis");
  const testFile = join(okotisDir, "testasset.txt");

  beforeAll(() => {
    if (existsSync(okotisDir)) {
      writeFileSync(testFile, "hello assets");
    }
  });

  afterAll(() => {
    if (existsSync(testFile)) {
      rmSync(testFile);
    }
  });

  it("serves asset file with correct content type", async () => {
    if (!existsSync(okotisDir)) return;
    const ctx = { params: Promise.resolve({ slug: "okotis", file: ["testasset.txt"] }) };
    const res = await GET(new Request("https://x/"), ctx);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("hello assets");
    expect(res.headers.get("Content-Type")).toBe("application/octet-stream");
  });

  it("returns 404 for missing file", async () => {
    const ctx = { params: Promise.resolve({ slug: "okotis", file: ["doesnotexist.txt"] }) };
    const res = await GET(new Request("https://x/"), ctx);
    expect(res.status).toBe(404);
  });

  it("returns 403 for directory traversal attempt", async () => {
    const ctx = {
      params: Promise.resolve({
        slug: "okotis",
        file: ["..", "yt-video-downloader", "manifest.json"],
      }),
    };
    const res = await GET(new Request("https://x/"), ctx);
    expect(res.status).toBe(403);
  });
});
