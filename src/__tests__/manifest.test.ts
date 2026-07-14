import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  byCreated,
  getAllSlugs,
  getAppsDir,
  getNeighbors,
  readAllManifests,
  readManifest,
} from "@/lib/manifest";
import type { Manifest } from "@/lib/manifest";
import { afterEach, describe, expect, it } from "vitest";

describe("apps manifests", () => {
  it("includes okotis slug", () => {
    expect(getAllSlugs()).toContain("okotis");
  });

  it("reads okotis manifest", () => {
    const m = readManifest("okotis");
    expect(m).not.toBeNull();
    expect(m?.title).toBe("Окотись");
    expect(m?.created).toBe("2026-07-04T15:23");
  });

  it("returns all manifests", () => {
    const all = readAllManifests();
    expect(all.length).toBeGreaterThan(0);
    expect(all.some((m) => m.slug === "okotis")).toBe(true);
  });

  it("returns null for missing slug", () => {
    expect(readManifest("does-not-exist-xyz")).toBeNull();
  });

  it("returns correct neighbors in multi-app ordering", () => {
    const okotis = getNeighbors("okotis");
    const takeBreak = getNeighbors("take-break");
    const ytVideoDownloader = getNeighbors("yt-video-downloader");
    const opencodeVoiceDictation = getNeighbors("opencode-voice-dictation");
    expect(opencodeVoiceDictation.prev).toBeNull();
    expect(opencodeVoiceDictation.next).toBe("yt-video-downloader");
    expect(ytVideoDownloader.prev).toBe("opencode-voice-dictation");
    expect(ytVideoDownloader.next).toBe("take-break");
    expect(takeBreak.prev).toBe("yt-video-downloader");
    expect(takeBreak.next).toBe("okotis");
    expect(okotis.prev).toBe("take-break");
    expect(okotis.next).toBeNull();
  });

  it("returns null neighbors for unknown slug", () => {
    const { prev, next } = getNeighbors("does-not-exist-xyz");
    expect(prev).toBeNull();
    expect(next).toBeNull();
  });
});

describe("manifest edge cases", () => {
  const tmpDir = join(getAppsDir(), "__tmp_test_app");
  const manifestFile = join(tmpDir, "manifest.json");

  function writeTmpManifest(content: string): void {
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(manifestFile, content);
  }

  function removeTmpDir(): void {
    rmSync(tmpDir, { recursive: true, force: true });
  }

  afterEach(() => {
    removeTmpDir();
  });

  it("returns null for invalid JSON manifest", () => {
    writeTmpManifest("{ not valid json");
    expect(readManifest("__tmp_test_app")).toBeNull();
  });

  it("normalizes empty manifest with defaults", () => {
    writeTmpManifest("{}");
    const m = readManifest("__tmp_test_app");
    expect(m).not.toBeNull();
    expect(m?.slug).toBe("__tmp_test_app");
    expect(m?.title).toBe("");
    expect(m?.description).toBe("");
    expect(m?.tags).toEqual([]);
  });

  it("returns null for empty manifest file", () => {
    writeTmpManifest("");
    expect(readManifest("__tmp_test_app")).toBeNull();
  });

  it("normalizes releaseLabel and sourceUrl when provided", () => {
    writeTmpManifest(
      JSON.stringify({
        releaseUrl: "https://example.com/script.user.js",
        releaseLabel: "Установить userscript",
        sourceUrl: "https://github.com/example/repo",
      }),
    );
    const m = readManifest("__tmp_test_app");
    expect(m?.releaseUrl).toBe("https://example.com/script.user.js");
    expect(m?.releaseLabel).toBe("Установить userscript");
    expect(m?.sourceUrl).toBe("https://github.com/example/repo");
  });

  it("omits releaseLabel and sourceUrl when not provided", () => {
    writeTmpManifest(JSON.stringify({ releaseUrl: "https://example.com/download" }));
    const m = readManifest("__tmp_test_app");
    expect(m?.releaseUrl).toBe("https://example.com/download");
    expect(m?.releaseLabel).toBeUndefined();
    expect(m?.sourceUrl).toBeUndefined();
  });
});

describe("byCreated sort", () => {
  const m = (slug: string, created?: string): Manifest => {
    const out: Manifest = { slug, title: slug, description: "" };
    if (created !== undefined) out.created = created;
    return out;
  };

  it("sorts newer first", () => {
    const a = m("a", "2026-03-01T10:00");
    const b = m("b", "2026-07-03T10:00");
    expect([a, b].sort(byCreated)).toEqual([b, a]);
    expect([b, a].sort(byCreated)).toEqual([b, a]);
  });

  it("sorts missing created last", () => {
    const dated = m("a", "2026-07-03T10:00");
    const undated = m("b");
    expect([dated, undated].sort(byCreated)).toEqual([dated, undated]);
    expect([undated, dated].sort(byCreated)).toEqual([dated, undated]);
  });

  it("tie-breaks by slug when dates equal", () => {
    const a = m("b", "2026-07-03T10:00");
    const b = m("a", "2026-07-03T10:00");
    expect([a, b].sort(byCreated)).toEqual([b, a]);
  });

  it("tie-breaks by slug when both missing created", () => {
    const a = m("z");
    const b = m("a");
    expect([a, b].sort(byCreated)).toEqual([b, a]);
  });
});
