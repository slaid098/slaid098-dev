import {
  LOADING_MESSAGES,
  buildFallbackImgPrompt,
  pickLoadingMessage,
  pickPersonality,
  pickStyle,
} from "@/apps/okoti-menya/prompts";
import { describe, expect, it } from "vitest";

describe("okoti-menya prompts", () => {
  it("pickStyle returns non-empty string from STYLES", () => {
    const style = pickStyle();
    expect(typeof style).toBe("string");
    expect(style.length).toBeGreaterThan(20);
  });

  it("pickPersonality returns non-empty string from PERSONALITY_VIBES", () => {
    const vibe = pickPersonality();
    expect(typeof vibe).toBe("string");
    expect(vibe.length).toBeGreaterThan(10);
  });

  it("buildFallbackImgPrompt contains breed and style keywords", () => {
    const prompt = buildFallbackImgPrompt("Дерзкий пенёк");
    expect(prompt).toContain("Дерзкий пенёк");
    expect(prompt).toMatch(/cat|style|composition/i);
  });

  it("buildFallbackImgPrompt falls back when breed empty", () => {
    const prompt = buildFallbackImgPrompt("");
    expect(prompt).toContain("the unknown one");
  });

  it("LOADING_MESSAGES has at least 30 entries", () => {
    expect(LOADING_MESSAGES.length).toBeGreaterThanOrEqual(30);
  });

  it("LOADING_MESSAGES entries are non-empty strings", () => {
    for (const msg of LOADING_MESSAGES) {
      expect(typeof msg).toBe("string");
      expect(msg.length).toBeGreaterThan(10);
    }
  });

  it("pickLoadingMessage returns a string from LOADING_MESSAGES", () => {
    const msg = pickLoadingMessage();
    expect(typeof msg).toBe("string");
    expect(LOADING_MESSAGES).toContain(msg);
  });

  it("pickLoadingMessage excludes the provided message", () => {
    const first = LOADING_MESSAGES[0] ?? "";
    const second = pickLoadingMessage(first);
    expect(second).not.toBe(first);
  });
});
