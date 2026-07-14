import { generateMetadata } from "@/app/[slug]/page";
import type { Metadata } from "next";
import { describe, expect, it } from "vitest";

async function getMeta(slug: string): Promise<Metadata> {
  return generateMetadata({ params: Promise.resolve({ slug }) }, {} as never);
}

describe("[slug] generateMetadata", () => {
  it("returns empty object for missing slug", async () => {
    const meta = await getMeta("does-not-exist-xyz");
    expect(meta).toEqual({});
  });

  it("returns title + description + canonical for okotis", async () => {
    const meta = await getMeta("okotis");
    expect(meta.title).toBe("Окотись");
    expect(meta.description).toBe("Загрузи селфи — получишь мультяшного кота под свой вайб.");
    expect(meta.alternates?.canonical).toBe("/okotis");
  });

  it("uses cover route as ogImage fallback (no ogImage field)", async () => {
    const meta = await getMeta("okotis");
    const ogImages = meta.openGraph?.images;
    expect(ogImages).toBeDefined();
    const first = Array.isArray(ogImages) ? ogImages[0] : ogImages;
    const url = typeof first === "string" ? first : (first as { url: string })?.url;
    expect(url).toContain("/apps/okotis/cover");
  });

  it("includes OG locale ru_RU", async () => {
    const meta = await getMeta("okotis");
    expect(meta.openGraph?.locale).toBe("ru_RU");
  });
});
