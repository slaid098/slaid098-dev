import { buildFallbackImgPrompt, buildVisionPrompt } from "./prompts";

const VISION_ENDPOINT = "https://text.pollinations.ai/openai";
const IMAGE_ENDPOINT = "https://image.pollinations.ai/prompt";
const IMAGE_MODEL = "flux";
const NORMALIZE_MAX = 1536;
const REFERRER = "slaid098.dev";

export type CatAnalysis = {
  catBreed: string;
  catName: string;
  personality: string;
  funFact: string;
  imgPrompt: string;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image-decode-failed"));
    img.src = src;
  });
}

export async function normalizeImageToJPEG(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, NORMALIZE_MAX / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas-context-failed");
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.92);
}

function stripCodeFences(text: string): string {
  return text
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

function parseJSON(text: string): Record<string, unknown> {
  const cleaned = stripCodeFences(text);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in response");
  }
  return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
}

function extractText(response: unknown): string {
  if (response == null) return "";
  if (typeof response === "string") return response;
  const r = response as {
    message?: unknown;
    content?: unknown;
    choices?: Array<{ message?: { content?: unknown } }>;
    toString?: () => string;
  };
  if (r.choices?.[0]?.message?.content !== undefined) {
    const c = r.choices[0].message.content;
    return typeof c === "string" ? c : "";
  }
  const msg = r.message ?? r;
  if (typeof msg === "string") return msg;
  if (typeof msg === "object" && msg !== null) {
    const m = msg as { content?: unknown };
    if (typeof m.content === "string") return m.content;
  }
  if (typeof r.toString === "function") {
    const s = r.toString();
    if (s && s !== "[object Object]") return s;
  }
  return "";
}

export async function analyzeSelfie(imageDataUrl: string): Promise<CatAnalysis> {
  if (!imageDataUrl) throw new Error("No image provided");

  const normalized = await normalizeImageToJPEG(imageDataUrl).catch(() => imageDataUrl);
  const body = buildVisionPrompt(normalized);

  const res = await fetch(VISION_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`vision-http-${res.status}`);
  }

  const json = await res.json();
  const text = extractText(json);
  if (!text) throw new Error("Empty AI response");

  const data = parseJSON(text);
  const catBreed = data.cat_breed;
  const imgPrompt = data.img_prompt;
  if (typeof catBreed !== "string" || typeof imgPrompt !== "string" || !catBreed || !imgPrompt) {
    throw new Error(`Incomplete AI response: ${text.slice(0, 200)}`);
  }

  return {
    catBreed,
    catName: typeof data.cat_name === "string" ? data.cat_name : "Кот",
    personality: typeof data.personality === "string" ? data.personality : "",
    funFact: typeof data.fun_fact === "string" ? data.fun_fact : "",
    imgPrompt,
  };
}

export function buildImageUrl(prompt: string): string {
  const encoded = encodeURIComponent(prompt);
  const params = new URLSearchParams({
    width: "1024",
    height: "1024",
    model: IMAGE_MODEL,
    nologo: "true",
    referrer: REFERRER,
  });
  return `${IMAGE_ENDPOINT}/${encoded}?${params.toString()}`;
}

export async function generateCat(imgPrompt: string, breed: string): Promise<string> {
  const prompt = imgPrompt || buildFallbackImgPrompt(breed);
  return buildImageUrl(prompt);
}

export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}
