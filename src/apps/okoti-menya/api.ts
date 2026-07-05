import { buildFallbackImgPrompt } from "./prompts";

const NORMALIZE_MAX = 1536;
const JPEG_QUALITY = 0.92;

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

  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: normalized }),
    ...(signal ? { signal } : {}),
  });

  if (res.status === 429) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message ?? "quota-exceeded");
  }

  if (!res.ok) {
    throw new Error(`analyze-http-${res.status}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  const catBreed = data.cat_breed;
  const imgPrompt = data.img_prompt;
  if (typeof catBreed !== "string" || typeof imgPrompt !== "string" || !catBreed || !imgPrompt) {
    throw new Error("Incomplete AI response");
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
  return `/api/cat-image?prompt=${encodeURIComponent(prompt)}`;
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
