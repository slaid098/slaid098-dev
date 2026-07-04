import { GET } from "@/app/apps/[slug]/cover/route";
import { describe, expect, it } from "vitest";

describe("cover route", () => {
  it("returns cover.webp when file exists", async () => {
    const ctx = { params: Promise.resolve({ slug: "bomzh" }) };
    const r = await GET(new Request("https://x/"), ctx);
    expect(r.headers.get("Content-Type")).toBe("image/webp");
    expect(r.status).toBe(200);
  });

  it("returns deterministic svg for slug without cover file", async () => {
    const ctx = { params: Promise.resolve({ slug: "other-slug" }) };
    const r1 = await GET(new Request("https://x/"), ctx);
    const r2 = await GET(new Request("https://x/"), ctx);
    const t1 = await r1.text();
    const t2 = await r2.text();
    expect(r1.headers.get("Content-Type")).toBe("image/svg+xml");
    expect(t1).toBe(t2);
  });

  it("produces different svg for different slugs", async () => {
    const a = await GET(new Request("https://x/"), {
      params: Promise.resolve({ slug: "bomzh" }),
    });
    const b = await GET(new Request("https://x/"), {
      params: Promise.resolve({ slug: "other-slug" }),
    });
    const aType = a.headers.get("Content-Type");
    const bType = b.headers.get("Content-Type");
    expect(aType).toBe("image/webp");
    expect(bType).toBe("image/svg+xml");
  });
});
