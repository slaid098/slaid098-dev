// @vitest-environment happy-dom

import { useAudio } from "@/hooks/use-audio";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function createMockAudioContext() {
  const ctx = {
    state: "running",
    destination: {},
    createBufferSource: vi.fn(() => ({ buffer: null, connect: vi.fn(), start: vi.fn() })),
    createGain: vi.fn(() => ({ gain: { value: 1 }, connect: vi.fn() })),
    decodeAudioData: vi.fn(() => Promise.resolve({})),
    resume: vi.fn(),
    close: vi.fn(() => Promise.resolve()),
  };
  return ctx;
}

describe("useAudio", () => {
  let mockCtx: ReturnType<typeof createMockAudioContext>;
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockCtx = createMockAudioContext();
    vi.stubGlobal(
      "AudioContext",
      vi.fn(() => mockCtx),
    );
    vi.stubGlobal("webkitAudioContext", undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        }),
      ),
    );
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    global.fetch = originalFetch;
  });

  it("starts unmuted", () => {
    const { result } = renderHook(() => useAudio("bomzh", { scream: "scream.mp3" }, "test_muted"));
    expect(result.current.muted).toBe(false);
  });

  it("reads muted state from localStorage on mount", () => {
    localStorage.setItem("test_muted", "true");
    const { result } = renderHook(() => useAudio("bomzh", { scream: "scream.mp3" }, "test_muted"));
    expect(result.current.muted).toBe(true);
  });

  it("toggleMute flips state and persists to localStorage", () => {
    const { result } = renderHook(() => useAudio("bomzh", { scream: "scream.mp3" }, "test_muted"));
    act(() => {
      result.current.toggleMute();
    });
    expect(result.current.muted).toBe(true);
    expect(localStorage.getItem("test_muted")).toBe("true");

    act(() => {
      result.current.toggleMute();
    });
    expect(result.current.muted).toBe(false);
    expect(localStorage.getItem("test_muted")).toBe("false");
  });

  it("play does not throw when buffer not loaded yet", () => {
    const { result } = renderHook(() => useAudio("bomzh", { scream: "scream.mp3" }, "test_muted"));
    expect(() => act(() => result.current.play("scream", 0.4))).not.toThrow();
  });

  it("closes AudioContext on unmount", async () => {
    const { result, unmount } = renderHook(() =>
      useAudio("bomzh", { scream: "scream.mp3" }, "test_muted"),
    );
    act(() => result.current.play("scream", 0.4));
    unmount();
    expect(mockCtx.close).toHaveBeenCalled();
  });
});
