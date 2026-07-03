import { GET } from "@/app/apps/[slug]/cover/route";
import { describe, expect, it } from "vitest";

describe("cover route", () => {
  it("returns deterministic svg for slug without cover file", async () => {
    const ctx = { params: Promise.resolve({ slug: "cucumber" }) };
    const r1 = await GET(new Request("https://x/"), ctx);
    const r2 = await GET(new Request("https://x/"), ctx);
    const t1 = await r1.text();
    const t2 = await r2.text();
    expect(r1.headers.get("Content-Type")).toBe("image/svg+xml");
    expect(t1).toBe(t2);
    expect(t1).toContain("С");
  });

  it("produces different svg for different slugs", async () => {
    const a = await GET(new Request("https://x/"), {
      params: Promise.resolve({ slug: "cucumber" }),
    });
    const b = await GET(new Request("https://x/"), {
      params: Promise.resolve({ slug: "other-slug" }),
    });
    expect(await a.text()).not.toBe(await b.text());
  });
});
