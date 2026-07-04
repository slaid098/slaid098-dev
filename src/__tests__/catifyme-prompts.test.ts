import {
  buildFallbackImgPrompt,
  buildVisionPrompt,
  pickPersonality,
  pickStyle,
} from "@/apps/catifyme/prompts";
import { describe, expect, it } from "vitest";

describe("catifyme prompts", () => {
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

  it("buildVisionPrompt returns openai model with system + user messages", () => {
    const result = buildVisionPrompt("data:image/jpeg;base64,abc");
    expect(result.model).toBe("openai");
    expect(result.messages).toHaveLength(2);
    const sys = result.messages[0];
    expect(sys?.role).toBe("system");
    expect(result.messages[1]?.role).toBe("user");
  });

  it("buildVisionPrompt system message includes Russian breed examples and edgy vibe", () => {
    const result = buildVisionPrompt("data:image/jpeg;base64,abc");
    const sys = result.messages[0];
    const systemContent = sys?.content;
    expect(typeof systemContent).toBe("string");
    expect(systemContent as string).toContain("cat_breed");
    expect(systemContent as string).toContain("img_prompt");
    expect(systemContent as string).toContain("Токсичный капибас");
  });

  it("buildVisionPrompt user message includes image_url with data URL", () => {
    const result = buildVisionPrompt("data:image/jpeg;base64,abc");
    const userContent = result.messages[1]?.content;
    expect(Array.isArray(userContent)).toBe(true);
    const parts = userContent as Array<{ type: string; image_url?: { url: string } }>;
    const imgPart = parts.find((p) => p.type === "image_url");
    expect(imgPart).toBeDefined();
    expect(imgPart?.image_url?.url).toBe("data:image/jpeg;base64,abc");
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
});
