// @vitest-environment happy-dom

import {
  analyzeSelfie,
  buildImageUrl,
  generateCat,
  normalizeImageToJPEG,
} from "@/apps/catifyme/api";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const validJsonResponse = (data: Record<string, unknown>) => ({
  choices: [{ message: { content: JSON.stringify(data) } }],
});

const validCatData = {
  cat_breed: "Токсичный капибас",
  cat_name: "Бомжик",
  personality: "Дерзкий и ленивый.",
  fun_fact: "Спит 20 часов в сутки.",
  img_prompt: "a cat in cyberpunk style",
};

const originalFetch = global.fetch;

function mockImageLoaded() {
  const FakeImage = vi.fn().mockImplementation(() => {
    const img = {
      width: 100,
      height: 100,
      src: "",
      onload: null as (() => void) | null,
      onerror: null as (() => void) | null,
    };
    Object.defineProperty(img, "src", {
      set(value: string) {
        this._src = value;
        if (this.onload) this.onload();
      },
      get() {
        return this._src;
      },
    });
    return img;
  });
  vi.stubGlobal("Image", FakeImage);
}

function mockCanvas() {
  const ctx = {
    drawImage: vi.fn(),
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ctx),
    toDataURL: vi.fn(() => "data:image/jpeg;base64,mock"),
  };
  vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
    if (tag === "canvas") return canvas as unknown as HTMLCanvasElement;
    return {} as HTMLCanvasElement;
  });
}

describe("catifyme api", () => {
  beforeEach(() => {
    mockImageLoaded();
    mockCanvas();
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(validJsonResponse(validCatData)),
        }),
      ),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    global.fetch = originalFetch;
  });

  describe("normalizeImageToJPEG", () => {
    it("returns a data URL starting with data:image/jpeg", async () => {
      const result = await normalizeImageToJPEG("data:image/png;base64,iVBORw0KGgo=");
      expect(result).toMatch(/^data:image\/jpeg/);
    });

    it("throws when canvas context unavailable", async () => {
      vi.spyOn(document, "createElement").mockRestore();
      vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
        if (tag === "canvas") {
          return { width: 0, height: 0, getContext: () => null, toDataURL: vi.fn() } as unknown as HTMLCanvasElement;
        }
        return {} as HTMLCanvasElement;
      });
      await expect(normalizeImageToJPEG("data:image/png;base64,abc")).rejects.toThrow(
        /canvas-context-failed/,
      );
    });
  });

  describe("analyzeSelfie", () => {
    it("returns parsed CatAnalysis on happy path", async () => {
      const result = await analyzeSelfie("data:image/jpeg;base64,abc");
      expect(result.catBreed).toBe("Токсичный капибас");
      expect(result.catName).toBe("Бомжик");
      expect(result.personality).toBe("Дерзкий и ленивый.");
      expect(result.funFact).toBe("Спит 20 часов в сутки.");
      expect(result.imgPrompt).toBe("a cat in cyberpunk style");
    });

    it("throws on empty AI response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ choices: [{ message: { content: "" } }] }),
          }),
        ),
      );
      await expect(analyzeSelfie("data:image/jpeg;base64,abc")).rejects.toThrow(
        /Empty AI response/,
      );
    });

    it("throws on incomplete JSON missing cat_breed", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(validJsonResponse({ img_prompt: "x", cat_name: "Y" })),
          }),
        ),
      );
      await expect(analyzeSelfie("data:image/jpeg;base64,abc")).rejects.toThrow(
        /Incomplete AI response/,
      );
    });

    it("throws when no image provided", async () => {
      await expect(analyzeSelfie("")).rejects.toThrow(/No image provided/);
    });

    it("throws on non-ok HTTP response (429)", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() => Promise.resolve({ ok: false, status: 429, json: () => Promise.resolve({}) })),
      );
      await expect(analyzeSelfie("data:image/jpeg;base64,abc")).rejects.toThrow(/vision-http-429/);
    });

    it("defaults catName to Кот when missing", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() =>
          Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve(
                validJsonResponse({
                  cat_breed: "Бомж",
                  img_prompt: "x",
                }),
              ),
          }),
        ),
      );
      const result = await analyzeSelfie("data:image/jpeg;base64,abc");
      expect(result.catName).toBe("Кот");
      expect(result.personality).toBe("");
      expect(result.funFact).toBe("");
    });
  });

  describe("buildImageUrl", () => {
    it("builds a pollinations URL with encoded prompt and required params", () => {
      const url = buildImageUrl("a cute cat");
      expect(url).toContain("https://image.pollinations.ai/prompt/");
      expect(url).toContain("a%20cute%20cat");
      expect(url).toContain("width=1024");
      expect(url).toContain("height=1024");
      expect(url).toContain("model=flux");
      expect(url).toContain("nologo=true");
      expect(url).toContain("referrer=slaid098.dev");
    });
  });

  describe("generateCat", () => {
    it("returns a URL string using the provided imgPrompt", async () => {
      const url = await generateCat("custom prompt here", "Tabby");
      expect(url).toContain("image.pollinations.ai");
      expect(url).toContain("custom%20prompt%20here");
    });

    it("falls back to breed-based prompt when imgPrompt empty", async () => {
      const url = await generateCat("", "Siamese");
      expect(url).toContain("image.pollinations.ai");
      expect(url).toContain("Siamese");
    });
  });
});
