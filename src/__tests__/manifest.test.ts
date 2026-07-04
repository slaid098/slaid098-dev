import {
  byCreated,
  getAllSlugs,
  getNeighbors,
  readAllManifests,
  readManifest,
} from "@/lib/manifest";
import type { Manifest } from "@/lib/manifest";
import { describe, expect, it } from "vitest";

describe("apps manifests", () => {
  it("includes bomzh slug", () => {
    expect(getAllSlugs()).toContain("bomzh");
  });

  it("reads bomzh manifest", () => {
    const m = readManifest("bomzh");
    expect(m).not.toBeNull();
    expect(m?.title).toBe("Бомж");
    expect(m?.created).toBe("2026-07-04");
  });

  it("returns all manifests", () => {
    const all = readAllManifests();
    expect(all.length).toBeGreaterThan(0);
    expect(all.some((m) => m.slug === "bomzh")).toBe(true);
  });

  it("returns null for missing slug", () => {
    expect(readManifest("does-not-exist-xyz")).toBeNull();
  });

  it("returns null neighbors for single app", () => {
    const { prev, next } = getNeighbors("bomzh");
    expect(prev).toBeNull();
    expect(next).toBeNull();
  });

  it("returns null neighbors for unknown slug", () => {
    const { prev, next } = getNeighbors("does-not-exist-xyz");
    expect(prev).toBeNull();
    expect(next).toBeNull();
  });
});

describe("byCreated sort", () => {
  const m = (slug: string, created?: string): Manifest => {
    const out: Manifest = { slug, title: slug, description: "" };
    if (created !== undefined) out.created = created;
    return out;
  };

  it("sorts older first", () => {
    const a = m("a", "2026-03-01");
    const b = m("b", "2026-07-03");
    expect([a, b].sort(byCreated)).toEqual([a, b]);
    expect([b, a].sort(byCreated)).toEqual([a, b]);
  });

  it("sorts missing created last", () => {
    const dated = m("a", "2026-07-03");
    const undated = m("b");
    expect([dated, undated].sort(byCreated)).toEqual([dated, undated]);
    expect([undated, dated].sort(byCreated)).toEqual([dated, undated]);
  });

  it("tie-breaks by slug when dates equal", () => {
    const a = m("b", "2026-07-03");
    const b = m("a", "2026-07-03");
    expect([a, b].sort(byCreated)).toEqual([b, a]);
  });
});
