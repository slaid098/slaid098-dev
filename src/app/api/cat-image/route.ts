const IMAGE_ENDPOINT = "https://image.pollinations.ai/prompt";
const IMAGE_WIDTH = 1024;
const IMAGE_HEIGHT = 1024;
const IMAGE_MODEL = "flux";
const TIMEOUT_MS = 30_000;
const RETRY_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: Request): Promise<Response> {
  const apiKey = process.env.POLLINATIONS_API_KEY;
  const url = new URL(request.url);
  const prompt = url.searchParams.get("prompt");

  if (!prompt) {
    return new Response("Missing prompt parameter", { status: 400 });
  }

  const params = new URLSearchParams({
    width: String(IMAGE_WIDTH),
    height: String(IMAGE_HEIGHT),
    model: IMAGE_MODEL,
    nologo: "true",
  });

  if (apiKey) {
    params.set("token", apiKey);
  }

  const imageUrl = `${IMAGE_ENDPOINT}/${encodeURIComponent(prompt)}?${params.toString()}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await sleep(RETRY_DELAY_MS);

    try {
      const res = await fetchWithTimeout(imageUrl, TIMEOUT_MS);
      if (!res.ok) continue;

      const contentType = res.headers.get("content-type") ?? "image/jpeg";
      const cacheControl = res.headers.get("cache-control") ?? "public, max-age=86400";
      const arrayBuffer = await res.arrayBuffer();

      return new Response(arrayBuffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": cacheControl,
        },
      });
    } catch {
      // retry
    }
  }

  return new Response("Image generation failed", { status: 502 });
}
