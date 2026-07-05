import { buildFallbackImgPrompt, pickPersonality } from "@/apps/okotis/prompts";
import { checkQuota, incrementQuota } from "@/lib/quota";
import { type GeminiResponse, buildGeminiSystemInstruction } from "./prompt";

const GEMINI_MODEL = "gemini-3.1-flash-lite";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const GEMINI_TIMEOUT_MS = 10_000;
const POLLINATIONS_TEXT_ENDPOINT = "https://text.pollinations.ai/openai";
const POLLINATIONS_TIMEOUT_MS = 15_000;
const RETRY_DELAYS = [800, 1500];
const RETRY_JITTER = [200, 300];

type AnalyzeRequest = {
  image?: string;
};

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitteredDelay(base: number, jitter: number): number {
  return base + Math.floor((Math.random() - 0.5) * 2 * jitter);
}

function extractBase64(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
  if (!match?.[1] || !match[2]) return null;
  return { mimeType: match[1], data: match[2] };
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function callGemini(imageData: string): Promise<GeminiResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const extracted = extractBase64(imageData);
  if (!extracted) throw new Error("Invalid image data URL");

  const systemInstruction = buildGeminiSystemInstruction();

  const body = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [
      {
        parts: [
          { text: "Проанализируй селфи и создай кота-персонажа. Верни JSON." },
          { inlineData: { mimeType: extracted.mimeType, data: extracted.data } },
        ] satisfies GeminiPart[],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 1.0,
      maxOutputTokens: 800,
    },
  };

  let lastError = "";
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    if (attempt > 0) {
      const base = RETRY_DELAYS[attempt - 1] ?? 1500;
      const jitter = RETRY_JITTER[attempt - 1] ?? 300;
      await sleep(jitteredDelay(base, jitter));
    }

    try {
      const res = await fetchWithTimeout(
        GEMINI_ENDPOINT,
        {
          method: "POST",
          headers: {
            "x-goog-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
        GEMINI_TIMEOUT_MS,
      );

      if (!res.ok) {
        lastError = `gemini-http-${res.status}`;
        if (res.status === 429 || res.status >= 500) continue;
        throw new Error(lastError);
      }

      const json = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };

      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        lastError = "gemini-empty-response";
        continue;
      }

      const parsed = JSON.parse(text) as GeminiResponse;
      if (
        typeof parsed.cat_breed !== "string" ||
        typeof parsed.img_prompt !== "string" ||
        !parsed.cat_breed ||
        !parsed.img_prompt
      ) {
        lastError = "gemini-incomplete-response";
        continue;
      }

      return parsed;
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("gemini-")) throw err;
      lastError = err instanceof Error ? err.message : "gemini-unknown-error";
    }
  }

  throw new Error(lastError || "gemini-all-retries-failed");
}

async function callPollinationsFallback(): Promise<GeminiResponse> {
  const style = buildFallbackImgPrompt("");
  const vibe = pickPersonality();

  const systemContent = `Ты — создатель дерзких кото-персонажей. Создай случайного кота (без изображения). Будь смелым, смешным. Верни ТОЛЬКО валидный JSON: {"cat_breed":"<порода на русском, дерзкая>","cat_name":"<имя 1-2 слова>","personality":"<2-3 предложения, кот ${vibe}>","fun_fact":"<факт до 15 слов>","img_prompt":"<английский промпт: ${style}>"}`;

  const res = await fetchWithTimeout(
    POLLINATIONS_TEXT_ENDPOINT,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai",
        messages: [{ role: "system", content: systemContent }],
      }),
    },
    POLLINATIONS_TIMEOUT_MS,
  );

  if (!res.ok) throw new Error(`pollinations-http-${res.status}`);

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const text = json.choices?.[0]?.message?.content;
  if (!text) throw new Error("pollinations-empty-response");

  const cleaned = text
    .replace(/```(?:json)?\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("pollinations-no-json");

  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as GeminiResponse;
  if (
    typeof parsed.cat_breed !== "string" ||
    typeof parsed.img_prompt !== "string" ||
    !parsed.cat_breed ||
    !parsed.img_prompt
  ) {
    throw new Error("pollinations-incomplete-response");
  }

  return parsed;
}

export async function POST(request: Request): Promise<Response> {
  const quota = await checkQuota();
  if (!quota.allowed) {
    return Response.json(
      {
        error: "quota-exceeded",
        message: "Твоя миска пуста. Приходи завтра за новой порцией презрения.",
      },
      { status: 429 },
    );
  }

  let body: AnalyzeRequest;
  try {
    body = (await request.json()) as AnalyzeRequest;
  } catch {
    return Response.json({ error: "invalid-body" }, { status: 400 });
  }

  if (!body.image || typeof body.image !== "string") {
    return Response.json({ error: "no-image" }, { status: 400 });
  }

  let result: GeminiResponse;
  try {
    result = await callGemini(body.image);
  } catch {
    try {
      result = await callPollinationsFallback();
    } catch {
      return Response.json({ error: "ai-unavailable" }, { status: 502 });
    }
  }

  // Only increment quota on success
  await incrementQuota();

  return Response.json(result);
}
