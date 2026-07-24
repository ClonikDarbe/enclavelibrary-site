/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  STEAMGRIDDB_API_KEY?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
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
    if (url.hostname === "www.enclavelibrary.com" || url.hostname === "enclave-order.dogukanunlu06.workers.dev") {
      const canonicalUrl = new URL(`${url.pathname}${url.search}`, "https://enclavelibrary.com");
      return new Response(null, {
        status: 308,
        headers: { Location: canonicalUrl.toString(), "Cache-Control": "public, max-age=86400" },
      });
    }

    // vinext route handlers read server-only configuration through process.env.
    // Mirror the Worker bindings explicitly so dashboard secrets remain runtime
    // values and are never bundled into the public client assets.
    if (env.SUPABASE_URL) process.env.SUPABASE_URL = env.SUPABASE_URL;
    if (env.SUPABASE_PUBLISHABLE_KEY) process.env.SUPABASE_PUBLISHABLE_KEY = env.SUPABASE_PUBLISHABLE_KEY;
    if (env.SUPABASE_ANON_KEY) process.env.SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;
    if (env.TURNSTILE_SITE_KEY) process.env.TURNSTILE_SITE_KEY = env.TURNSTILE_SITE_KEY;
    if (env.TURNSTILE_SECRET_KEY) process.env.TURNSTILE_SECRET_KEY = env.TURNSTILE_SECRET_KEY;

    if (url.pathname === "/api/steam-summary") {
      return handleSteamSummaryRequest(request, env, ctx);
    }

    if (url.pathname === "/api/game-art") {
      return handleGameArtworkRequest(request, env, ctx);
    }

    if (url.pathname === "/download/windows") {
      return handleWindowsDownload(request, ctx);
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
      "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'; img-src 'self' data: blob: https:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com; upgrade-insecure-requests",
    );
    if (url.pathname.startsWith("/api/auth") || url.pathname === "/library") {
      secured.headers.set("Cache-Control", "no-store, private");
    }
    if (/^\/(?:admin|api|forgot-password|library|login|profile|reset-password|security|signup)(?:\/|$)/.test(url.pathname)) {
      secured.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    return secured;
  },
};

export default worker;

async function handleGameArtworkRequest(request: Request, env: Env, ctx: ExecutionContext) {
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method Not Allowed", { status: 405 });

  const url = new URL(request.url);
  const title = (url.searchParams.get("title") || "").replace(/\s+/g, " ").trim();
  if (!title || title.length > 120) return new Response("Not Found", { status: 404 });

  const normalizedTitle = normalizeGameTitle(title);
  const artworkSource = env.STEAMGRIDDB_API_KEY ? "steamgriddb" : "steam";
  const cacheKey = new Request(`${url.origin}/__enclave_game_art_v6/${artworkSource}/${encodeURIComponent(normalizedTitle)}`);
  const edgeCache = (caches as CacheStorage & { default: Cache }).default;
  const cached = await edgeCache.match(cacheKey);
  if (cached) return cached;

  const steamGridArtwork = env.STEAMGRIDDB_API_KEY
    ? await resolveSteamGridArtwork(title, normalizedTitle, env.STEAMGRIDDB_API_KEY)
    : "";
  if (steamGridArtwork) {
    const response = artworkRedirect(steamGridArtwork);
    ctx.waitUntil(edgeCache.put(cacheKey, response.clone()));
    return response;
  }

  const communityResponse = await fetch(`https://steamcommunity.com/actions/SearchApps/${encodeURIComponent(title)}`, {
    headers: { "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.7", "User-Agent": "Enclave-Order-Web/1.0" },
  });
  const communityResults = communityResponse.ok ? await communityResponse.json().catch(() => []) : [];
  const communityMatch = Array.isArray(communityResults) ? communityResults.find((entry: unknown) => {
    const name = entry && typeof entry === "object" ? (entry as { name?: unknown }).name : null;
    return typeof name === "string" && normalizeGameTitle(name) === normalizedTitle;
  }) as { appid?: unknown } | undefined : undefined;
  let appId = typeof communityMatch?.appid === "string" || typeof communityMatch?.appid === "number" ? String(communityMatch.appid) : "";

  if (!appId) {
    const searchUrl = new URL("https://store.steampowered.com/search/");
    searchUrl.searchParams.set("term", title);
    searchUrl.searchParams.set("ignore_preferences", "1");
    const searchResponse = await fetch(searchUrl, {
      headers: { "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.7", "User-Agent": "Enclave-Order-Web/1.0" },
    });
    const html = searchResponse.ok ? await searchResponse.text() : "";
    const matches = [...html.matchAll(/<a[^>]+data-ds-appid="([0-9,]+)"[^>]*>[\s\S]*?<span class="title">([\s\S]*?)<\/span>/gi)].slice(0, 12);
    const exact = matches.find((match) => normalizeGameTitle(decodeHtml(match[2].replace(/<[^>]*>/g, " "))) === normalizedTitle);
    appId = exact?.[1]?.split(",")[0] || "";
  }
  if (!appId || !/^\d{1,12}$/.test(appId)) {
    const miss = new Response("Not Found", { status: 404, headers: { "Cache-Control": "public, max-age=21600" } });
    ctx.waitUntil(edgeCache.put(cacheKey, miss.clone()));
    return miss;
  }

  const detailsResponse = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&filters=basic`, {
    headers: { "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.7" },
  });
  const details = detailsResponse.ok ? await detailsResponse.json().catch(() => null) : null;
  const artworkUrl = steamArtwork(details, appId) || `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900_2x.jpg`;
  const response = artworkRedirect(artworkUrl);
  ctx.waitUntil(edgeCache.put(cacheKey, response.clone()));
  return response;
}

async function resolveSteamGridArtwork(title: string, normalizedTitle: string, apiKey: string) {
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${apiKey}`,
    "User-Agent": "Enclave-Order-Web/1.0",
  };

  try {
    const searchResponse = await fetch(`https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(title)}`, { headers });
    const searchPayload = searchResponse.ok ? await searchResponse.json().catch(() => null) : null;
    const games = searchPayload && typeof searchPayload === "object" && Array.isArray((searchPayload as { data?: unknown }).data)
      ? (searchPayload as { data: Array<{ id?: unknown; name?: unknown }> }).data
      : [];
    const matchedGame = selectSteamGridGame(games, normalizedTitle);
    const gameId = typeof matchedGame?.id === "number" || typeof matchedGame?.id === "string" ? String(matchedGame.id) : "";
    if (!/^\d{1,12}$/.test(gameId)) return "";

    const gridsUrl = new URL(`https://www.steamgriddb.com/api/v2/grids/game/${gameId}`);
    gridsUrl.searchParams.set("dimensions", "600x900,342x482,660x930");
    gridsUrl.searchParams.set("types", "static");
    gridsUrl.searchParams.set("nsfw", "false");
    gridsUrl.searchParams.set("humor", "false");
    gridsUrl.searchParams.set("epilepsy", "false");
    gridsUrl.searchParams.set("limit", "20");
    const gridsResponse = await fetch(gridsUrl, { headers });
    const gridsPayload = gridsResponse.ok ? await gridsResponse.json().catch(() => null) : null;
    const grids = gridsPayload && typeof gridsPayload === "object" && Array.isArray((gridsPayload as { data?: unknown }).data)
      ? (gridsPayload as { data: Array<{ url?: unknown; score?: unknown }> }).data
      : [];
    const candidates = grids
      .filter((grid) => typeof grid.url === "string")
      .sort((left, right) => Number(right.score || 0) - Number(left.score || 0));
    for (const grid of candidates) {
      if (typeof grid.url !== "string") continue;
      const artworkUrl = new URL(grid.url);
      if (artworkUrl.protocol === "https:" && (artworkUrl.hostname === "steamgriddb.com" || artworkUrl.hostname.endsWith(".steamgriddb.com"))) {
        return artworkUrl.toString();
      }
    }
  } catch {
    // SteamGridDB is an enhancement; the official Steam resolver below remains available.
  }
  return "";
}

function selectSteamGridGame(games: Array<{ id?: unknown; name?: unknown }>, normalizedTitle: string) {
  const exact = games.find((game) => typeof game.name === "string" && normalizeGameTitle(game.name) === normalizedTitle);
  if (exact) return exact;

  const requestedTokens = new Set(normalizedTitle.split(" ").filter(Boolean));
  const ranked = games
    .filter((game): game is { id?: unknown; name: string } => typeof game.name === "string")
    .map((game) => {
      const candidate = normalizeGameTitle(game.name);
      const candidateTokens = new Set(candidate.split(" ").filter(Boolean));
      const intersection = [...requestedTokens].filter((token) => candidateTokens.has(token)).length;
      const union = new Set([...requestedTokens, ...candidateTokens]).size;
      const tokenScore = union ? intersection / union : 0;
      const containmentScore = normalizedTitle.includes(candidate) || candidate.includes(normalizedTitle)
        ? Math.min(normalizedTitle.length, candidate.length) / Math.max(normalizedTitle.length, candidate.length)
        : 0;
      return { game, score: Math.max(tokenScore, containmentScore) };
    })
    .sort((left, right) => right.score - left.score);
  const best = ranked[0];
  const runnerUp = ranked[1];
  return best && best.score >= 0.72 && (!runnerUp || best.score - runnerUp.score >= 0.12) ? best.game : undefined;
}

function artworkRedirect(location: string) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
      "Cache-Control": "public, max-age=604800",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function handleWindowsDownload(request: Request, ctx: ExecutionContext) {
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method Not Allowed", { status: 405 });

  const url = new URL(request.url);
  const repositoryUrl = "https://github.com/ClonikDarbe/EnclaveLibrary-Releases";
  const cacheKey = new Request(`${url.origin}/__enclave_latest_windows_download`);
  const edgeCache = (caches as CacheStorage & { default: Cache }).default;
  const cached = await edgeCache.match(cacheKey);
  if (cached) return cached;

  const latestRelease = await fetch("https://api.github.com/repos/ClonikDarbe/EnclaveLibrary-Releases/releases/latest", {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "Enclave-Order-Web",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!latestRelease.ok) return Response.redirect(`${repositoryUrl}/releases/latest`, 302);

  const release = await latestRelease.json().catch(() => null) as { assets?: Array<{ name?: unknown; browser_download_url?: unknown }> } | null;
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  const executable = assets
    .filter((asset) => typeof asset.name === "string" && typeof asset.browser_download_url === "string" && /\.exe$/i.test(asset.name))
    .sort((left, right) => Number(/setup/i.test(String(right.name))) - Number(/setup/i.test(String(left.name))))[0];
  if (!executable || typeof executable.browser_download_url !== "string") return Response.redirect(`${repositoryUrl}/releases/latest`, 302);

  const downloadUrl = new URL(executable.browser_download_url);
  const expectedPrefix = "/ClonikDarbe/EnclaveLibrary-Releases/releases/download/";
  if (downloadUrl.protocol !== "https:" || downloadUrl.hostname !== "github.com" || !downloadUrl.pathname.startsWith(expectedPrefix)) {
    return Response.redirect(`${repositoryUrl}/releases/latest`, 302);
  }

  const response = new Response(null, {
    status: 302,
    headers: {
      Location: downloadUrl.toString(),
      "Cache-Control": "public, max-age=600",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
  ctx.waitUntil(edgeCache.put(cacheKey, response.clone()));
  return response;
}

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

function normalizeGameTitle(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[™®©]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function steamArtwork(payload: unknown, appId: string) {
  const entry = payload && typeof payload === "object" ? (payload as Record<string, unknown>)[appId] : null;
  const data = entry && typeof entry === "object" ? (entry as { data?: unknown }).data : null;
  const header = data && typeof data === "object" ? (data as { header_image?: unknown }).header_image : null;
  if (typeof header !== "string") return "";
  try {
    const url = new URL(header);
    return url.protocol === "https:" && (url.hostname === "steamstatic.com" || url.hostname.endsWith(".steamstatic.com")) ? url.toString() : "";
  } catch {
    return "";
  }
}

function readCookie(header: string, name: string) {
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return "";
}
