import { NextResponse } from "next/server";
import { ACCESS_COOKIE, ACTIVITY_COOKIE, INACTIVITY_SECONDS, REFRESH_COOKIE, authHeaders, safeReturnTo, supabaseConfig } from "@/lib/enclave-auth";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME = /^[\p{L}\p{N}_.-]{3,24}$/u;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 8_192) return new NextResponse("İstek çok büyük.", { status: 413 });

  const config = supabaseConfig();
  if (!config) return redirectError("Giriş servisi şu anda yapılandırılmamış.");

  const form = await request.formData();
  const identifier = String(form.get("identifier") || "").trim();
  const password = String(form.get("password") || "");
  const returnTo = safeReturnTo(String(form.get("returnTo") || "/library"));
  if ((!EMAIL.test(identifier.toLowerCase()) && !USERNAME.test(identifier)) || password.length < 8 || password.length > 128) {
    return redirectError("Bilgilerini kontrol edip tekrar dene.", returnTo);
  }

  let email = identifier.toLowerCase();
  if (!EMAIL.test(email)) {
    const resolve = await fetch(`${config.url}/rest/v1/rpc/resolve_enclave_login`, {
      method: "POST", headers: authHeaders(config.key), body: JSON.stringify({ login_identifier: identifier }), cache: "no-store",
    });
    if (!resolve.ok) return redirectError("Bilgilerini kontrol edip tekrar dene.", returnTo);
    const result = await resolve.json().catch(() => null);
    if (typeof result !== "string" || !EMAIL.test(result)) return redirectError("Bilgilerini kontrol edip tekrar dene.", returnTo);
    email = result.toLowerCase();
  }

  const tokenResponse = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: authHeaders(config.key), body: JSON.stringify({ email, password }), cache: "no-store",
  });
  const session = await tokenResponse.json().catch(() => null) as { access_token?: string; refresh_token?: string; expires_in?: number } | null;
  if (!tokenResponse.ok || !session?.access_token || !session.refresh_token) return redirectError("Bilgilerini kontrol edip tekrar dene.", returnTo);

  const response = NextResponse.redirect(new URL(returnTo, request.url), 303);
  const secure = new URL(request.url).protocol === "https:";
  response.cookies.set(ACCESS_COOKIE, session.access_token, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: Math.max(60, session.expires_in ?? 3600) });
  response.cookies.set(REFRESH_COOKIE, session.refresh_token, { httpOnly: true, secure, sameSite: "strict", path: "/api/auth", maxAge: 60 * 60 * 24 * 30 });
  response.cookies.set(ACTIVITY_COOKIE, "active", { httpOnly: true, secure, sameSite: "strict", path: "/", maxAge: INACTIVITY_SECONDS });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function redirectError(message: string, returnTo = "/library") {
  const url = new URL("/login", "https://enclave.local");
  url.searchParams.set("error", message);
  if (returnTo !== "/library") url.searchParams.set("return_to", safeReturnTo(returnTo));
  return new NextResponse(null, {
    status: 303,
    headers: {
      Location: `${url.pathname}${url.search}`,
      "Cache-Control": "no-store",
    },
  });
}
