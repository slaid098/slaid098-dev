// @vitest-environment happy-dom

import BomzhApp from "@/apps/bomzh/app";
import type { Manifest } from "@/lib/manifest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockPlay = vi.fn();
const mockToggleMute = vi.fn();

vi.mock("@/hooks/use-audio", () => ({
  useAudio: () => ({
    play: mockPlay,
    muted: false,
    toggleMute: mockToggleMute,
  }),
}));

const mockManifest: Manifest = {
  slug: "bomzh",
  title: "Бомж",
  description: "Тыкни, чтобы не лыбился.",
  tags: ["развлечения"],
  created: "2026-07-04",
};

describe("BomzhApp", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    mockPlay.mockClear();
    mockToggleMute.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("renders counter starting at 0", () => {
    render(<BomzhApp manifest={mockManifest} />);
    expect(screen.getByText("0")).toBeDefined();
  });

  it("increments counter on button click", () => {
    render(<BomzhApp manifest={mockManifest} />);
    const buttons = screen.getAllByLabelText(/нажми на бомж/i);
    expect(buttons.length).toBeGreaterThanOrEqual(1);
    const button = buttons[0] as HTMLElement;
    act(() => {
      fireEvent.click(button);
    });
    expect(screen.getByText("1")).toBeDefined();
  });

  it("persists count to localStorage", () => {
    render(<BomzhApp manifest={mockManifest} />);
    const buttons = screen.getAllByLabelText(/нажми на бомж/i);
    const button = buttons[0] as HTMLElement;
    act(() => {
      fireEvent.click(button);
    });
    expect(localStorage.getItem("clicker_bomzh_count")).toBe("1");
  });

  it("loads saved count from localStorage on mount", () => {
    localStorage.setItem("clicker_bomzh_count", "5");
    render(<BomzhApp manifest={mockManifest} />);
    expect(screen.getByText("5")).toBeDefined();
  });

  it("resets to 0 if saved count >= explosion threshold", () => {
    localStorage.setItem("clicker_bomzh_count", "10");
    render(<BomzhApp manifest={mockManifest} />);
    expect(screen.getByText("0")).toBeDefined();
  });

  it("triggers explosion at 10 clicks and resets after 5s", () => {
    render(<BomzhApp manifest={mockManifest} />);
    const buttons = screen.getAllByLabelText(/нажми на бомж/i);
    const button = buttons[0] as HTMLElement;
    for (let i = 0; i < 9; i++) {
      act(() => fireEvent.click(button));
    }
    expect(screen.getByText("9")).toBeDefined();
    act(() => fireEvent.click(button));
    expect(screen.getByText("БОМЖ ВЗОРВАЛСЯ!")).toBeDefined();
    expect(mockPlay).toHaveBeenCalledWith("explosion", 1.0);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText("0")).toBeDefined();
  });
});
