/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  AI?: {
    run(model: string, input: Record<string, unknown>): Promise<unknown>;
  };
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // vinext route handlers read server-only configuration through process.env.
    // Mirror the Worker bindings explicitly so dashboard secrets remain runtime
    // values and are never bundled into the public client assets.
    if (env.SUPABASE_URL) process.env.SUPABASE_URL = env.SUPABASE_URL;
    if (env.SUPABASE_PUBLISHABLE_KEY) process.env.SUPABASE_PUBLISHABLE_KEY = env.SUPABASE_PUBLISHABLE_KEY;
    if (env.SUPABASE_ANON_KEY) process.env.SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;

    if (url.pathname === "/api/translate") {
      return handleTranslationRequest(request, env, ctx);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    const response = await handler.fetch(request, env, ctx);
    const secured = new Response(response.body, response);
    secured.headers.set("X-Content-Type-Options", "nosniff");
    secured.headers.set("X-Frame-Options", "DENY");
    secured.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    secured.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
    secured.headers.set("Cross-Origin-Opener-Policy", "same-origin");
    secured.headers.set("Cross-Origin-Resource-Policy", "same-origin");
    secured.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'; img-src 'self' data: https:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co; upgrade-insecure-requests",
    );
    if (url.pathname.startsWith("/api/auth") || url.pathname === "/library") {
      secured.headers.set("Cache-Control", "no-store, private");
    }
    return secured;
  },
};

export default worker;

async function handleTranslationRequest(request: Request, env: Env, ctx: ExecutionContext) {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  if (Number(request.headers.get("content-length") || 0) > 8_192) return new Response("İstek çok büyük.", { status: 413 });

  const url = new URL(request.url);
  if (request.headers.get("origin") !== url.origin) return new Response("Geçersiz istek.", { status: 403 });

  const key = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;
  const token = readCookie(request.headers.get("cookie") || "", "enclave_access");
  if (!env.SUPABASE_URL || !key || !token) return new Response("Oturum gerekli.", { status: 401 });

  const userResponse = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
  });
  if (!userResponse.ok) return new Response("Oturum gerekli.", { status: 401 });

  const payload = await request.json().catch(() => null) as { text?: unknown } | null;
  const source = typeof payload?.text === "string" ? payload.text.trim() : "";
  if (!source || source.length > 4_000) return new Response("Geçersiz açıklama.", { status: 400 });
  if (!env.AI) return new Response("Çeviri servisi kullanılamıyor.", { status: 503 });

  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const cacheKey = new Request(`${url.origin}/__enclave_translation/${hash}`);
  const edgeCache = (caches as CacheStorage & { default: Cache }).default;
  const cached = await edgeCache.match(cacheKey);
  if (cached) return cached;

  const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast", {
    messages: [
      { role: "system", content: "Oyun açıklamalarını doğal ve akıcı Türkiye Türkçesine çevir. Oyun, kişi, stüdyo ve marka adlarını değiştirme. Metin zaten Türkçeyse anlamını bozmadan aynen koru. Yalnızca çevrilmiş açıklamayı yaz; başlık, not, tırnak veya açıklama ekleme." },
      { role: "user", content: source },
    ],
    temperature: 0,
    max_tokens: 1_200,
  }) as { response?: unknown };
  const translation = typeof result?.response === "string" ? result.response.trim().replace(/^['\"]|['\"]$/g, "") : "";
  if (!translation) return new Response("Çeviri oluşturulamadı.", { status: 502 });

  const response = Response.json({ translation }, {
    headers: { "Cache-Control": "private, max-age=2592000", "X-Content-Type-Options": "nosniff" },
  });
  const cacheResponse = new Response(response.clone().body, response);
  cacheResponse.headers.set("Cache-Control", "public, max-age=2592000");
  ctx.waitUntil(edgeCache.put(cacheKey, cacheResponse));
  return response;
}

function readCookie(header: string, name: string) {
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return "";
}
