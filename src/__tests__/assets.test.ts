import { existsSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { GET } from "@/app/apps/[slug]/assets/[...file]/route";
import { getAppsDir } from "@/lib/manifest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("assets route", () => {
  const hoboDir = join(getAppsDir(), "hobo");
  const testFile = join(hoboDir, "testasset.txt");

  beforeAll(() => {
    // Create test file if hobo dir exists
    if (existsSync(hoboDir)) {
      writeFileSync(testFile, "hello assets");
    }
  });

  afterAll(() => {
    if (existsSync(testFile)) {
      rmSync(testFile);
    }
  });

  it("serves asset file with correct content type", async () => {
    if (!existsSync(hoboDir)) return; // skip if hobo dir somehow not created yet
    const ctx = { params: Promise.resolve({ slug: "hobo", file: ["testasset.txt"] }) };
    const res = await GET(new Request("https://x/"), ctx);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("hello assets");
    expect(res.headers.get("Content-Type")).toBe("application/octet-stream");
  });

  it("returns 404 for missing file", async () => {
    const ctx = { params: Promise.resolve({ slug: "hobo", file: ["doesnotexist.txt"] }) };
    const res = await GET(new Request("https://x/"), ctx);
    expect(res.status).toBe(404);
  });

  it("returns 403 for directory traversal attempt", async () => {
    const ctx = {
      params: Promise.resolve({ slug: "hobo", file: ["..", "cucumber", "manifest.json"] }),
    };
    const res = await GET(new Request("https://x/"), ctx);
    expect(res.status).toBe(403);
  });
});
