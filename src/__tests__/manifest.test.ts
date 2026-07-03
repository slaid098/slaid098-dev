import { getAllSlugs, readAllManifests, readManifest } from "@/lib/manifest";
import { describe, expect, it } from "vitest";

describe("apps manifests", () => {
  it("includes cucumber slug", () => {
    expect(getAllSlugs()).toContain("cucumber");
  });

  it("reads cucumber manifest", () => {
    const m = readManifest("cucumber");
    expect(m).not.toBeNull();
    expect(m?.title).toBe("Справка об огурце");
    expect(m?.engine).toBe("static");
  });

  it("returns all manifests", () => {
    const all = readAllManifests();
    expect(all.length).toBeGreaterThan(0);
    expect(all.some((m) => m.slug === "cucumber")).toBe(true);
  });

  it("returns null for missing slug", () => {
    expect(readManifest("does-not-exist-xyz")).toBeNull();
  });
});
