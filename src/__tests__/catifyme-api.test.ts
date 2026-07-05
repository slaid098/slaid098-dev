// @vitest-environment happy-dom

import {
  analyzeSelfie,
  buildImageUrl,
  fetchImageBlob,
  generateCat,
  isAbortError,
  isNetworkError,
  normalizeImageToJPEG,
} from "@/apps/okotis/api";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
    fillRect: vi.fn(),
    fillStyle: "",
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

function mockFetchForDataUrlAndApi(apiResponse: unknown = validCatData, apiStatus = 200) {
  const mockBlob = { size: 100, type: "image/png" };
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, opts?: RequestInit) => {
      // normalizeImageToJPEG calls fetch(dataUrl) to get a blob
      if (typeof url === "string" && url.startsWith("data:")) {
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(mockBlob),
        });
      }
      // /api/analyze POST
      if (url === "/api/analyze") {
        return Promise.resolve({
          ok: apiStatus === 200,
          status: apiStatus,
          json: () => Promise.resolve(apiResponse),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    }),
  );
}

describe("okotis api", () => {
  beforeEach(() => {
    mockImageLoaded();
    mockCanvas();
    vi.stubGlobal("createImageBitmap", undefined);
    mockFetchForDataUrlAndApi();
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
          return {
            width: 0,
            height: 0,
            getContext: () => null,
            toDataURL: vi.fn(),
          } as unknown as HTMLCanvasElement;
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
      mockFetchForDataUrlAndApi({});
      await expect(analyzeSelfie("data:image/jpeg;base64,abc")).rejects.toThrow(
        /Incomplete AI response/,
      );
    });

    it("throws on incomplete JSON missing cat_breed", async () => {
      mockFetchForDataUrlAndApi({ img_prompt: "x", cat_name: "Y" });
      await expect(analyzeSelfie("data:image/jpeg;base64,abc")).rejects.toThrow(
        /Incomplete AI response/,
      );
    });

    it("throws when no image provided", async () => {
      await expect(analyzeSelfie("")).rejects.toThrow(/No image provided/);
    });

    it("throws quota message on 429", async () => {
      mockFetchForDataUrlAndApi(
        { message: "Твоя миска пуста. Приходи завтра за новой порцией презрения." },
        429,
      );
      await expect(analyzeSelfie("data:image/jpeg;base64,abc")).rejects.toThrow(/миска пуста/);
    });

    it("throws on 502 server error", async () => {
      mockFetchForDataUrlAndApi({ error: "ai-unavailable" }, 502);
      await expect(analyzeSelfie("data:image/jpeg;base64,abc")).rejects.toThrow(/analyze-http-502/);
    });

    it("defaults catName to Кот when missing", async () => {
      mockFetchForDataUrlAndApi({ cat_breed: "Бомж", img_prompt: "x" });
      const result = await analyzeSelfie("data:image/jpeg;base64,abc");
      expect(result.catName).toBe("Кот");
      expect(result.personality).toBe("");
      expect(result.funFact).toBe("");
    });
  });

  describe("buildImageUrl", () => {
    it("builds a Pollinations URL with encoded prompt and required params", () => {
      const url = buildImageUrl("a cute cat");
      expect(url).toContain("https://image.pollinations.ai/prompt/");
      expect(url).toContain("a%20cute%20cat");
      expect(url).toContain("width=1024");
      expect(url).toContain("height=1024");
      expect(url).toContain("model=flux");
      expect(url).toContain("nologo=true");
    });
  });

  describe("generateCat", () => {
    it("returns a URL using the provided imgPrompt", async () => {
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

  describe("isAbortError", () => {
    it("returns true for AbortError DOMException", () => {
      const err = new DOMException("aborted", "AbortError");
      expect(isAbortError(err)).toBe(true);
    });

    it("returns false for regular Error", () => {
      expect(isAbortError(new Error("not abort"))).toBe(false);
    });

    it("returns false for non-Error values", () => {
      expect(isAbortError(null)).toBe(false);
      expect(isAbortError("string")).toBe(false);
      expect(isAbortError(undefined)).toBe(false);
    });
  });

  describe("isNetworkError", () => {
    it("returns true for TypeError (fetch network error)", () => {
      expect(isNetworkError(new TypeError("Failed to fetch"))).toBe(true);
    });

    it("returns false for regular Error", () => {
      expect(isNetworkError(new Error("not network"))).toBe(false);
    });
  });

  describe("fetchImageBlob", () => {
    function mockFetchForImage(opts?: {
      ok?: boolean;
      status?: number;
      blobType?: string;
      blobSize?: number;
    }) {
      const { ok = true, status = 200, blobType = "image/jpeg", blobSize = 1024 } = opts ?? {};
      const mockBlob = new Blob([new Uint8Array(blobSize ?? 0)], { type: blobType });
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok,
          status,
          blob: () => Promise.resolve(mockBlob),
        }),
      );
    }

    function mockFetchReject(err: unknown) {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(err));
    }

    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    beforeEach(() => {
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    });

    afterEach(() => {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      vi.unstubAllGlobals();
    });

    it("returns a blob URL on success", async () => {
      mockFetchForImage();
      const result = await fetchImageBlob("https://example.com/cat.jpg");
      expect(result).toBe("blob:mock");
    });

    it("throws image-http-* on non-ok response", async () => {
      mockFetchForImage({ ok: false, status: 502 });
      await expect(fetchImageBlob("https://example.com/cat.jpg")).rejects.toThrow(/image-http-502/);
    });

    it("throws image-bad-type when blob is not an image", async () => {
      mockFetchForImage({ blobType: "text/html" });
      await expect(fetchImageBlob("https://example.com/cat.jpg")).rejects.toThrow(/image-bad-type/);
    });

    it("throws AbortError immediately when signal is already aborted", async () => {
      mockFetchForImage();
      const controller = new AbortController();
      controller.abort();
      await expect(
        fetchImageBlob("https://example.com/cat.jpg", controller.signal),
      ).rejects.toThrow(/aborted/);
    });

    it("throws AbortError when signal aborts during fetch", async () => {
      const controller = new AbortController();
      mockFetchReject(new DOMException("aborted", "AbortError"));
      const promise = fetchImageBlob("https://example.com/cat.jpg", controller.signal);
      controller.abort();
      await expect(promise).rejects.toThrow(/aborted/);
    });

    it("throws image-timeout when fetch exceeds timeout", async () => {
      vi.useFakeTimers();
      mockFetchReject(new DOMException("aborted", "AbortError"));
      const promise = fetchImageBlob("https://example.com/cat.jpg");
      vi.advanceTimersByTime(31_000);
      await expect(promise).rejects.toThrow(/image-timeout/);
      vi.useRealTimers();
    });
  });
});
