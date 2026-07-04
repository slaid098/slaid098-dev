// @vitest-environment happy-dom

import { AppError } from "@/components/app-error";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

function Boom(): never {
  throw new Error("boom");
}

describe("AppError", () => {
  it("renders children when no error", () => {
    render(
      <AppError title="Test">
        <p>Content OK</p>
      </AppError>,
    );
    expect(screen.getByText("Content OK")).toBeDefined();
  });

  it("renders fallback when child throws", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <AppError title="TestApp">
        <Boom />
      </AppError>,
    );
    expect(screen.getByText(/временно недоступно/i)).toBeDefined();
    expect(screen.getByText("На главную")).toBeDefined();
    spy.mockRestore();
  });
});
