import { buildFallbackImgPrompt, buildVisionPrompt } from "./prompts";

const VISION_ENDPOINT = "https://text.pollinations.ai/openai";
const IMAGE_ENDPOINT = "https://image.pollinations.ai/prompt";
const VISION_MODEL = "openai";
const IMAGE_MODEL = "flux";
const NORMALIZE_MAX = 1536;
const JPEG_QUALITY = 0.92;
const IMAGE_WIDTH = 1024;
const IMAGE_HEIGHT = 1024;
const REFERRER = "slaid098.dev";

export type CatAnalysis = {
  catBreed: string;
  catName: string;
  personality: string;
  funFact: string;
  imgPrompt: string;
};

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type VisionResponse = {
  choices?: Array<{ message?: { content?: string | ContentPart[] } }>;
  message?: { content?: string | ContentPart[] };
  content?: string | ContentPart[];
};

function contentToString(content: string | ContentPart[] | undefined): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter(
        (p): p is { type: "text"; text: string } => p.type === "text" && typeof p.text === "string",
      )
      .map((p) => p.text)
      .join("");
  }
  return "";
}

function extractText(response: unknown): string {
  if (response == null) return "";
  if (typeof response === "string") return response;
  const r = response as VisionResponse;
  if (r.choices?.[0]?.message?.content !== undefined) {
    return contentToString(r.choices[0].message.content);
  }
  if (r.message?.content !== undefined) {
    return contentToString(r.message.content);
  }
  if (r.content !== undefined) {
    return contentToString(r.content);
  }
  return "";
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
  const parsed: unknown = JSON.parse(cleaned.slice(start, end + 1));
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("AI response is not a JSON object");
  }
  return parsed as Record<string, unknown>;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image-decode-failed"));
    img.src = src;
  });
}

async function normalizeViaImageBitmap(blob: Blob): Promise<string> {
  const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
  const scale = Math.min(1, NORMALIZE_MAX / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas-context-failed");
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

async function normalizeViaCanvas(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, NORMALIZE_MAX / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas-context-failed");
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

export async function normalizeImageToJPEG(dataUrl: string): Promise<string> {
  if (typeof createImageBitmap === "function") {
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      return await normalizeViaImageBitmap(blob);
    } catch {
      // fallback to canvas method
    }
  }
  return normalizeViaCanvas(dataUrl);
}

export async function analyzeSelfie(
  imageDataUrl: string,
  signal?: AbortSignal,
): Promise<CatAnalysis> {
  if (!imageDataUrl) throw new Error("No image provided");

  const normalized = await normalizeImageToJPEG(imageDataUrl).catch(() => imageDataUrl);
  const body = buildVisionPrompt(normalized);

  const res = await fetch(VISION_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    ...(signal ? { signal } : {}),
  });

  if (!res.ok) {
    throw new Error(`vision-http-${res.status}`);
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error("vision-bad-response");
  }

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
    width: String(IMAGE_WIDTH),
    height: String(IMAGE_HEIGHT),
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

export function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError;
}
