import { cookies } from "next/headers";

const COOKIE_NAME = "cat_quota";
const MAX_DAILY = 3;
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24h

type QuotaPayload = {
  count: number;
  date: string; // YYYY-MM-DD
};

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function base64UrlEncode(data: Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function strToBytes(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

async function getSecret(): Promise<string> {
  const key = process.env.QUOTA_SECRET;
  if (!key) throw new Error("QUOTA_SECRET is not set");
  return key;
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  const bytes = strToBytes(secret);
  return crypto.subtle.importKey("raw", bytes, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

async function sign(payload: QuotaPayload): Promise<string> {
  const secret = await getSecret();
  const key = await getHmacKey(secret);
  const header = base64UrlEncode(strToBytes(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = base64UrlEncode(strToBytes(JSON.stringify(payload)));
  const data = `${header}.${body}`;
  const sig = await crypto.subtle.sign("HMAC", key, strToBytes(data));
  return `${data}.${base64UrlEncode(new Uint8Array(sig))}`;
}

async function verify(token: string): Promise<QuotaPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  if (!header || !body || !sig) return null;
  try {
    const secret = await getSecret();
    const key = await getHmacKey(secret);
    const data = `${header}.${body}`;
    const sigBytes = base64UrlDecode(sig);
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, strToBytes(data));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(body))) as QuotaPayload;
    if (typeof payload.count !== "number" || typeof payload.date !== "string") return null;
    return payload;
  } catch {
    return null;
  }
}

export async function checkQuota(): Promise<
  { allowed: true; remaining: number } | { allowed: false }
> {
  const store = await cookies();
  const cookie = store.get(COOKIE_NAME);
  const today = todayUTC();

  if (!cookie?.value) {
    return { allowed: true, remaining: MAX_DAILY };
  }

  const payload = await verify(cookie.value);
  if (!payload) {
    return { allowed: true, remaining: MAX_DAILY };
  }

  // Reset on new day
  if (payload.date !== today) {
    return { allowed: true, remaining: MAX_DAILY };
  }

  if (payload.count >= MAX_DAILY) {
    return { allowed: false };
  }

  return { allowed: true, remaining: MAX_DAILY - payload.count };
}

export async function incrementQuota(): Promise<void> {
  const store = await cookies();
  const cookie = store.get(COOKIE_NAME);
  const today = todayUTC();

  let payload: QuotaPayload;
  if (!cookie?.value) {
    payload = { count: 1, date: today };
  } else {
    const existing = await verify(cookie.value);
    if (!existing || existing.date !== today) {
      payload = { count: 1, date: today };
    } else {
      payload = { count: existing.count + 1, date: today };
    }
  }

  const token = await sign(payload);
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}
