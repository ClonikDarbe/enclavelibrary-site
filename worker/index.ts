/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
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

    if (url.pathname === "/api/steam-summary") {
      return handleSteamSummaryRequest(request, env, ctx);
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

async function handleSteamSummaryRequest(request: Request, env: Env, ctx: ExecutionContext) {
  if (request.method !== "GET") return new Response("Method Not Allowed", { status: 405 });
  const url = new URL(request.url);

  const key = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;
  const token = readCookie(request.headers.get("cookie") || "", "enclave_access");
  if (!env.SUPABASE_URL || !key || !token) return new Response("Oturum gerekli.", { status: 401 });

  const userResponse = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
  });
  if (!userResponse.ok) return new Response("Oturum gerekli.", { status: 401 });

  const match = url.searchParams.get("gameKey")?.match(/^steam:(\d{1,12})$/i);
  if (!match) return Response.json({ summary: null }, { status: 200 });
  const appId = match[1];
  const cacheKey = new Request(`${url.origin}/__enclave_steam_summary/${appId}`);
  const edgeCache = (caches as CacheStorage & { default: Cache }).default;
  const cached = await edgeCache.match(cacheKey);
  if (cached) return cached;

  const endpoint = `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=tr&filters=basic`;
  const [turkishResponse, englishResponse] = await Promise.all([
    fetch(`${endpoint}&l=turkish`, { headers: { "Accept-Language": "tr-TR,tr;q=0.9" } }),
    fetch(`${endpoint}&l=english`, { headers: { "Accept-Language": "en-US,en;q=0.9" } }),
  ]);
  const [turkishPayload, englishPayload] = await Promise.all([
    turkishResponse.ok ? turkishResponse.json().catch(() => null) : null,
    englishResponse.ok ? englishResponse.json().catch(() => null) : null,
  ]);
  const turkish = steamDescription(turkishPayload, appId);
  const english = steamDescription(englishPayload, appId);
  const summary = turkish && (!english || normalizeText(turkish) !== normalizeText(english)) ? turkish : null;

  const response = Response.json({ summary }, {
    headers: { "Cache-Control": "private, max-age=604800", "X-Content-Type-Options": "nosniff" },
  });
  const cacheResponse = new Response(response.clone().body, response);
  cacheResponse.headers.set("Cache-Control", "public, max-age=604800");
  ctx.waitUntil(edgeCache.put(cacheKey, cacheResponse));
  return response;
}

function steamDescription(payload: unknown, appId: string) {
  const entry = payload && typeof payload === "object" ? (payload as Record<string, unknown>)[appId] : null;
  const data = entry && typeof entry === "object" ? (entry as { success?: boolean; data?: unknown }).data : null;
  if (!data || typeof data !== "object") return "";
  const record = data as { short_description?: unknown; detailed_description?: unknown };
  const value = typeof record.short_description === "string" ? record.short_description : typeof record.detailed_description === "string" ? record.detailed_description : "";
  return decodeHtml(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function normalizeText(value: string) {
  return value.toLocaleLowerCase("tr").replace(/[^a-z0-9çğıöşü]+/gi, " ").trim();
}

function decodeHtml(value: string) {
  const entities: Record<string, string> = { amp: "&", quot: "\"", apos: "'", lt: "<", gt: ">", nbsp: " " };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity: string) => {
    if (entity[0] === "#") {
      const hex = entity[1]?.toLowerCase() === "x";
      const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    }
    return entities[entity.toLowerCase()] ?? "";
  });
}

function readCookie(header: string, name: string) {
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return "";
}
