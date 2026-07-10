// @vitest-environment happy-dom

import CatifyMeApp from "@/apps/okotis/app";
import type { Manifest } from "@/lib/manifest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockManifest: Manifest = {
  slug: "okotis",
  title: "Окотись",
  description: "Загрузи селфи — получишь мультяшного кота.",
  tags: ["развлечения"],
};

const mockTrack = { stop: vi.fn() };
const mockStream = {
  getTracks: () => [mockTrack],
  id: "mock-stream",
  active: true,
} as unknown as MediaStream;

function mockGetUserMediaSuccess() {
  const getUserMedia = vi.fn().mockResolvedValue(mockStream);
  const mediaDevices = { getUserMedia };
  vi.stubGlobal("navigator", {
    ...navigator,
    mediaDevices,
  });
  return getUserMedia;
}

function mockGetUserMediaFailure() {
  const getUserMedia = vi.fn().mockRejectedValue(new Error("NotAllowedError"));
  vi.stubGlobal("navigator", {
    ...navigator,
    mediaDevices: { getUserMedia },
  });
  return getUserMedia;
}

function mockNoMediaDevices() {
  vi.stubGlobal("navigator", {
    ...navigator,
    mediaDevices: undefined,
  });
}

function mockCanvasForCapture() {
  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
    if (tag === "canvas") {
      return {
        width: 0,
        height: 0,
        getContext: () => ({
          drawImage: vi.fn(),
          fillRect: vi.fn(),
          fillStyle: "",
        }),
        toDataURL: vi.fn(() => "data:image/jpeg;base64,mock"),
      } as unknown as HTMLCanvasElement;
    }
    return originalCreateElement(tag);
  });
}

function patchAllVideoElements() {
  const proto = HTMLVideoElement.prototype;
  const srcObjectDesc = Object.getOwnPropertyDescriptor(proto, "srcObject");
  const videoWidthDesc = Object.getOwnPropertyDescriptor(proto, "videoWidth");
  const videoHeightDesc = Object.getOwnPropertyDescriptor(proto, "videoHeight");
  Object.defineProperty(proto, "srcObject", {
    set: () => {},
    get: () => null,
    configurable: true,
  });
  Object.defineProperty(proto, "videoWidth", {
    get: () => 640,
    configurable: true,
  });
  Object.defineProperty(proto, "videoHeight", {
    get: () => 480,
    configurable: true,
  });
  return () => {
    if (srcObjectDesc) Object.defineProperty(proto, "srcObject", srcObjectDesc);
    if (videoWidthDesc) Object.defineProperty(proto, "videoWidth", videoWidthDesc);
    if (videoHeightDesc) Object.defineProperty(proto, "videoHeight", videoHeightDesc);
  };
}

describe("CatifyMeApp camera", () => {
  let restoreSrcObject: () => void;

  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    restoreSrcObject = patchAllVideoElements();
  });

  afterEach(() => {
    restoreSrcObject();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    cleanup();
  });

  it("clicking 'Сделать селфи сейчас' calls getUserMedia", async () => {
    const getUserMedia = mockGetUserMediaSuccess();
    render(<CatifyMeApp manifest={mockManifest} />);

    const btn = screen.getByText("Сделать селфи сейчас");
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(getUserMedia).toHaveBeenCalledWith({
      video: { facingMode: "user" },
      audio: false,
    });
  });

  it("shows camera overlay with video element when getUserMedia succeeds", async () => {
    mockGetUserMediaSuccess();
    render(<CatifyMeApp manifest={mockManifest} />);

    const btn = screen.getByText("Сделать селфи сейчас");
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(screen.getByLabelText("Предпросмотр камеры")).toBeDefined();
    expect(screen.getByText("Сделать фото")).toBeDefined();
    expect(screen.getByText("Отмена")).toBeDefined();
  });

  it("falls back to file picker when getUserMedia is unavailable", async () => {
    mockNoMediaDevices();
    render(<CatifyMeApp manifest={mockManifest} />);

    const fileInput = screen.getByLabelText("Сделать селфи с камеры") as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, "click");

    const btn = screen.getByText("Сделать селфи сейчас");
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(clickSpy).toHaveBeenCalledOnce();
    expect(fileInput.hasAttribute("capture")).toBe(false);
  });

  it("falls back to file picker when getUserMedia throws", async () => {
    mockGetUserMediaFailure();
    render(<CatifyMeApp manifest={mockManifest} />);

    const fileInput = screen.getByLabelText("Сделать селфи с камеры") as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, "click");

    const btn = screen.getByText("Сделать селфи сейчас");
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(clickSpy).toHaveBeenCalledOnce();
    expect(fileInput.hasAttribute("capture")).toBe(false);
  });

  it("clicking 'Отмена' stops camera and returns to hero", async () => {
    mockGetUserMediaSuccess();
    render(<CatifyMeApp manifest={mockManifest} />);

    await act(async () => {
      fireEvent.click(screen.getByText("Сделать селфи сейчас"));
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Отмена"));
    });

    expect(mockTrack.stop).toHaveBeenCalled();
    expect(screen.getByText("Загрузить селфи")).toBeDefined();
    expect(screen.queryByLabelText("Предпросмотр камеры")).toBeNull();
  });

  it("captureFrame transitions to preview screen", async () => {
    mockGetUserMediaSuccess();
    mockCanvasForCapture();
    render(<CatifyMeApp manifest={mockManifest} />);

    await act(async () => {
      fireEvent.click(screen.getByText("Сделать селфи сейчас"));
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Сделать фото"));
    });

    expect(screen.getByText("Создать кота")).toBeDefined();
    expect(screen.queryByLabelText("Предпросмотр камеры")).toBeNull();
  });

  it("stops all tracks when unmounted during camera", async () => {
    mockGetUserMediaSuccess();
    const { unmount } = render(<CatifyMeApp manifest={mockManifest} />);

    await act(async () => {
      fireEvent.click(screen.getByText("Сделать селфи сейчас"));
    });

    unmount();

    expect(mockTrack.stop).toHaveBeenCalled();
  });

  it("gallery input uses specific MIME types, not image/*", () => {
    render(<CatifyMeApp manifest={mockManifest} />);
    const galleryInput = screen.getByLabelText("Загрузить селфи с устройства") as HTMLInputElement;
    expect(galleryInput.accept).toBe("image/png,image/jpeg,image/webp,image/gif");
    expect(galleryInput.accept).not.toBe("image/*");
  });
});
